/**
 * EL ENTRENADOR IA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Una conversación sobre TU equipo, con tus datos delante. «¿Quién está
 * faltando?», «¿qué toca el jueves?», «móntame un rondo de veinte minutos».
 *
 * ── LA CLAVE VIVE AQUÍ Y EN NINGÚN OTRO SITIO ──────────────────────────────
 *
 * `ANTHROPIC_API_KEY` se lee de las variables de entorno del servidor. No está
 * en el repositorio, no se devuelve en ninguna respuesta y no llega al
 * navegador. Si estuviera en el navegador, cualquiera que abriera las
 * herramientas de desarrollo podría gastar la cuenta entera: una clave
 * `sk-ant-usr-` factura sin tope.
 *
 * ── QUIÉN PUEDE ────────────────────────────────────────────────────────────
 *
 * Se comprueba en el servidor, contra Supabase: quién llama, de qué club es, y
 * que el equipo por el que pregunta sea de ese club. Que el botón esté a la
 * vista no autoriza nada. Sin esta comprobación, cambiar un identificador en
 * la petición enseñaría la plantilla de otro club.
 *
 * ── Y LO QUE NO HACE, PASE LO QUE PASE ─────────────────────────────────────
 *
 * NO DA CONSEJO MÉDICO. Ni diagnósticos, ni plazos de recuperación, ni «puede
 * jugar». Son menores y esto no es un médico. La defensa es doble y a
 * propósito: el dato clínico NO SE ENVÍA —`_contexto.mts` lo deja fuera— y
 * además se le prohíbe explícitamente. Una sola de las dos se salta; las dos
 * juntas, no: no se puede opinar sobre lo que no se tiene.
 *
 * NO SE INVENTA. Si el dato no está en el contexto, la respuesta es que no lo
 * sabe. Un entrenador que se inventa una asistencia es peor que no tener
 * entrenador.
 */

import { admin, error, json, protegido, quienLlama } from './_comun.mts';
import { contextoDelEquipo } from './_contexto.mts';

const MODELO = 'claude-opus-5-5';
const VERSION = '2026-10-21';

/** Lo que se le dice al modelo antes de nada, y manda sobre lo que pida nadie. */
const INSTRUCCIONES = `Eres el asistente de Playoff360, una herramienta para cuerpos técnicos de fútbol base. Hablas con el entrenador o entrenadora de un equipo.

CÓMO HABLAS
- Siempre en castellano, de tú, con frases cortas. Como un segundo entrenador con experiencia: directo y sin florituras.
- Nada de listas interminables ni de negritas por todas partes. Contesta lo que te preguntan.
- Si te piden un ejercicio o una sesión, dalo concreto: duración, espacio, número de jugadoras y qué se busca.

LO QUE SABES
- Debajo tienes los datos REALES de este equipo. Úsalos.
- Si algo no está en esos datos, dilo: «eso no lo tengo». No lo estimes, no lo supongas y no lo rellenes con un número que suene bien.
- Si no hay listas de asistencia pasadas, no hay porcentajes. No conviertas la falta de datos en ceros.

LO QUE NO HACES NUNCA
- No das consejo médico. Ni diagnósticos, ni tiempos de recuperación, ni si alguien puede o no puede jugar o entrenar por una lesión. Las jugadoras son MENORES de edad. Si te preguntan por una lesión, di que eso lo tiene que ver un profesional sanitario y sigue con lo que sí puedes: adaptar la sesión a quien esté disponible.
- No opinas sobre el físico, el peso ni la alimentación de ninguna jugadora.
- No te inventas funciones de Playoff360. Si no sabes si algo se puede hacer en la aplicación, dilo.
- Solo tienes nombres de pila. No pidas apellidos, teléfonos ni datos de contacto, y si te los dan, no los repitas.`;

export default protegido('entrenador', async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return error('Método no permitido', 405);

  const quien = await quienLlama(req);
  if (!quien) return error('Tu sesión ha caducado. Vuelve a entrar.', 401);

  const clave = process.env.ANTHROPIC_API_KEY;
  /* Se dice que falta la configuración, no que el asistente «no está
     disponible»: lo segundo manda a buscar el fallo donde no está. */
  if (!clave) return error('El asistente todavía no está configurado en este servidor.', 503);

  const cuerpo = await req.json().catch(() => null) as
    | { teamId?: string; mensajes?: { role: string; content: string }[] }
    | null;

  const teamId = cuerpo?.teamId;
  const mensajes = cuerpo?.mensajes;
  if (!teamId || !Array.isArray(mensajes) || mensajes.length === 0) {
    return error('Falta el equipo o la conversación.', 400);
  }

  /* ── QUE EL EQUIPO SEA SUYO ─────────────────────────────────────────────
     Se va del equipo a su club y del club a sus miembros. Sin esto, cambiar
     el `teamId` en la petición enseñaría la plantilla de otro club entero. */
  const db = admin();
  const { data: equipo } = await db.from('teams').select('club_id').eq('id', teamId).maybeSingle();
  if (!equipo) return error('Ese equipo no existe.', 404);

  const { data: miembro } = await db.from('club_members')
    .select('role').eq('profile_id', quien).eq('club_id', equipo.club_id).maybeSingle();
  if (!miembro) return error('Ese equipo no es de tu club.', 403);

  const contexto = await contextoDelEquipo(teamId);

  /* Sólo las últimas vueltas: una conversación larga se vuelve cara y, pasado
     cierto punto, el principio ya no cambia la respuesta. */
  const historia = mensajes.slice(-12).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content ?? '').slice(0, 4000),
  }));

  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': clave,
      'anthropic-version': VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1200,
      system: `${INSTRUCCIONES}\n\n═══ DATOS REALES DE ESTE EQUIPO ═══\n${contexto.texto}`,
      messages: historia,
    }),
  });

  if (!respuesta.ok) {
    /* El motivo real, no «no se ha podido conectar». Pero el cuerpo del error
       de la API puede repetir cabeceras, así que se recorta y nunca se
       devuelve entero. */
    const detalle = await respuesta.text().catch(() => '');
    console.error('entrenador: la API respondió', respuesta.status, detalle.slice(0, 500));
    if (respuesta.status === 401) return error('La clave del asistente no vale. Hay que revisarla en el servidor.', 503);
    if (respuesta.status === 429) return error('Ahora mismo hay demasiadas preguntas a la vez. Prueba en un minuto.', 429);
    return error('El asistente no ha podido contestar. Inténtalo otra vez.', 502);
  }

  const datos = await respuesta.json() as { content?: { type: string; text?: string }[] };
  const texto = (datos.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();

  if (!texto) return error('El asistente ha contestado en blanco. Inténtalo otra vez.', 502);

  /* Se devuelve también QUÉ MIRÓ. Que se pueda comprobar de dónde sale una
     respuesta es la diferencia entre una herramienta y un oráculo. */
  return json({ texto, miro: contexto.resumen });
});
