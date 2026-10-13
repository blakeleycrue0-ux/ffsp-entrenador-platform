/**
 * LA RONDA DIARIA: lo que se quedó sin mandar, y los avisos por inactividad.
 * ---------------------------------------------------------------------------
 * Una función programada de Netlify. Se ejecuta sola una vez al día y no
 * atiende peticiones de nadie: por eso no lleva comprobación de quién llama.
 * Netlify no la expone como ruta pública.
 *
 * Hace dos cosas, y están juntas porque son el mismo barrido:
 *
 * 1 · LA GUÍA QUE NO SALIÓ. La bienvenida la dispara el navegador al terminar
 *     el alta, pero un navegador se cierra. Esto repasa las altas de los
 *     últimos siete días y manda la que falte. Siete y no todas, porque una
 *     guía que llega un mes tarde no es una bienvenida, es una molestia.
 *
 * 2 · EL AVISO POR INACTIVIDAD, UNO SOLO. A los catorce días sin entrar. Una
 *     vez en la vida de cada cuenta y sólo a quien dio permiso.
 *
 *     NO SON ALEATORIOS, Y FUE UNA DECISIÓN DELIBERADA. Un correo que llega
 *     porque sí es lo que enseña a la gente a marcar como spam, y eso no lo
 *     paga quien lo manda: lo paga el DOMINIO. Cuando un dominio se gana mala
 *     fama deja de llegar a la bandeja de entrada de todo el mundo — también
 *     los correos de confirmar el alta y los de recuperar la contraseña, que
 *     son los que de verdad no pueden fallar. Mandar poco no es timidez: es
 *     lo que mantiene el canal abierto.
 *
 * QUÉ DICE EL AVISO depende de por dónde se quedó cada uno, que es lo único
 * que lo hace útil: al que no tiene jugadoras le habla de las jugadoras, no
 * de «todo lo que te estás perdiendo».
 */

import { admin } from './_comun.mts';
import { envia, unaVez, destinatarios } from './_correo.mts';
import { bienvenida, teEchamosDeMenos } from './_plantillas.mts';
import { GUIA } from './correo-bienvenida.mts';

const DIA = 86_400_000;
/** Cuántos días sin entrar antes de escribir. */
const INACTIVO = 14;
/** Hasta cuándo tiene sentido mandar una bienvenida con retraso. */
const BIENVENIDA_TARDE = 7;

/**
 * Por dónde se ha quedado, dicho en una frase.
 *
 * Los dos clubes que se dieron de alta esta semana hicieron exactamente lo
 * mismo: club, equipo, y parados con cero jugadoras. Así que el primer caso
 * de esta lista no es una suposición.
 */
function loQueFalta(equipos: number, jugadoras: number, sesiones: number): string {
  if (equipos === 0) return 'Te quedaste sin crear el equipo, que son dos campos y treinta segundos.';
  if (jugadoras === 0) {
    return 'Te quedaste justo antes de añadir a las jugadoras. Es lo que desbloquea '
      + 'el resto: sin ellas no hay a quién convocar ni a quién pasar lista. Una '
      + 'plantilla entera son diez minutos.';
  }
  if (sesiones === 0) {
    return 'Ya tienes la plantilla. Lo siguiente es el primer entrenamiento: eliges '
      + 'día, arrastras los ejercicios y queda guardado para repetirlo.';
  }
  return 'Lo tienes todo montado y donde lo dejaste.';
}

export default async (): Promise<Response> => {
  const db = admin();
  const ahora = Date.now();
  const hecho = { guias: 0, avisos: 0, fallos: [] as string[] };

  /* ── 1 · Las guías que se quedaron por el camino ───────────────────────── */

  const { data: nuevos } = await db
    .from('profiles')
    .select('id, email, full_name, created_at')
    .gte('created_at', new Date(ahora - BIENVENIDA_TARDE * DIA).toISOString());

  for (const p of nuevos ?? []) {
    if (!p.email) continue;
    try {
      const carta = bienvenida(p.full_name, GUIA.url);
      const r = await unaVez(db, p.id, 'bienvenida', () => envia({
        a: p.email, nombre: p.full_name, asunto: carta.asunto,
        html: carta.html, texto: carta.texto, adjuntos: [GUIA],
      }));
      if (r === 'enviado') hecho.guias += 1;
    } catch (e) {
      hecho.fallos.push(`bienvenida ${p.id}: ${(e as Error).message}`);
    }
  }

  /* ── 2 · Quién lleva dos semanas sin aparecer ──────────────────────────── */

  /* `last_sign_in_at` vive en `auth.users`, que no se puede consultar con el
     cliente normal ni aunque sea la clave de servicio: hay que ir por la API
     de administración de Auth. Se piden de una vez y se cruzan aquí. */
  const { data: usuarios } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const dormidos = (usuarios?.users ?? []).filter((u) => {
    const visto = u.last_sign_in_at ?? u.created_at;
    return visto && ahora - new Date(visto).getTime() >= INACTIVO * DIA;
  });
  if (dormidos.length === 0) return respuesta(hecho);

  const { data: perfiles } = await db
    .from('profiles')
    .select('id, email, full_name, unsubscribe_token, marketing_consent')
    .in('id', dormidos.map((u) => u.id));

  /* Aquí y sólo aquí se mira el permiso: esto es comercial. */
  for (const p of destinatarios(perfiles ?? [], 'comercial')) {
    if (!p.email) continue;
    const u = dormidos.find((x) => x.id === p.id);
    const visto = u?.last_sign_in_at ?? u?.created_at;
    const dias = Math.floor((ahora - new Date(visto!).getTime()) / DIA);

    try {
      const { equipos, jugadoras, sesiones } = await porDondeVa(db, p.id);
      const carta = teEchamosDeMenos(
        p.full_name, p.unsubscribe_token, dias, loQueFalta(equipos, jugadoras, sesiones),
      );
      const r = await unaVez(db, p.id, 'inactividad', () => envia({
        a: p.email, nombre: p.full_name, asunto: carta.asunto,
        html: carta.html, texto: carta.texto,
      }));
      if (r === 'enviado') hecho.avisos += 1;
    } catch (e) {
      hecho.fallos.push(`inactividad ${p.id}: ${(e as Error).message}`);
    }
  }

  return respuesta(hecho);
};

/** Cuánto tiene montado, para saber qué contarle. */
async function porDondeVa(db: ReturnType<typeof admin>, profileId: string) {
  const { data: miembro } = await db
    .from('club_members').select('club_id').eq('profile_id', profileId);
  const clubes = (miembro ?? []).map((m) => m.club_id);
  if (clubes.length === 0) return { equipos: 0, jugadoras: 0, sesiones: 0 };

  const { data: equipos } = await db.from('teams').select('id').in('club_id', clubes);
  const ids = (equipos ?? []).map((t) => t.id);
  if (ids.length === 0) return { equipos: 0, jugadoras: 0, sesiones: 0 };

  const [{ count: jugadoras }, { count: sesiones }] = await Promise.all([
    db.from('players').select('id', { count: 'exact', head: true }).in('team_id', ids),
    db.from('sessions').select('id', { count: 'exact', head: true }).in('team_id', ids),
  ]);
  return { equipos: ids.length, jugadoras: jugadoras ?? 0, sesiones: sesiones ?? 0 };
}

const respuesta = (hecho: { guias: number; avisos: number; fallos: string[] }) => {
  console.log(`ronda de correo: ${hecho.guias} guía(s), ${hecho.avisos} aviso(s)`
    + `${hecho.fallos.length ? `, ${hecho.fallos.length} fallo(s)` : ''}`);
  for (const f of hecho.fallos) console.error(f);
  return new Response(JSON.stringify(hecho), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};

/* A las 10:20 UTC. Ni en punto ni a y media: a esas horas se amontona todo el
   mundo y el reparto se retrasa.

   Sin tipar, igual que el resto de funciones de esta carpeta: el tipo `Config`
   vive en `@netlify/functions`, que no está instalado y que no merece la pena
   traer por un objeto de un solo campo. Netlify lee esto en tiempo de
   construcción, no de ejecución. */
export const config = { schedule: '20 10 * * *' };
