/**
 * EL CORREO: QUIÉN LO MANDA, A QUIÉN, Y QUIÉN NO QUIERE RECIBIRLO.
 * ---------------------------------------------------------------------------
 * Esto se ejecuta EN EL SERVIDOR. Aquí vive la clave de Brevo, que no puede
 * aparecer en el navegador: quien la tuviera podría mandar correo firmado con
 * el dominio de la casa, que es la forma más barata de suplantar a alguien.
 *
 * ── POR QUÉ BREVO Y NO OTRO ────────────────────────────────────────────────
 * Porque el aviso legal dice, con todas las letras, que no hay transferencias
 * fuera del Espacio Económico Europeo. Supabase está en Irlanda y Brevo es
 * francesa con servidores en la UE, así que la frase sigue siendo verdad. Con
 * un proveedor americano habría que cambiar el aviso legal el mismo día, y un
 * texto legal que no cuadra con lo que hace el programa no sirve de nada.
 *
 * ── DOS CLASES DE CORREO, Y NO SE MEZCLAN ──────────────────────────────────
 * `servicio`   — va sin pedir permiso. Es parte de prestar el servicio: la
 *                guía de quien acaba de darse de alta. Una vez, y se acabó.
 * `comercial`  — novedades y avisos por inactividad. Necesita consentimiento
 *                previo (LSSI art. 21) y sale sólo a quien lo haya dado.
 *
 * `envia()` no decide esto: lo decide `destinatarios()`, que es quien mira el
 * permiso. Separarlo es lo que evita que un correo comercial acabe saliendo
 * por la puerta de los de servicio el día que alguien tenga prisa.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

function exige(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}

/**
 * DE DÓNDE SALE EL CORREO, Y POR QUÉ NO PUEDE SALIR DE UN GMAIL.
 * ───────────────────────────────────────────────────────────────────────────
 * Estaba puesto `playoff360.info@gmail.com` por defecto y eso habría mandado
 * todos los correos a la carpeta de spam, o los habría hecho rebotar.
 *
 * Google publica una política DMARC para gmail.com que dice, en resumen: «si
 * un correo dice venir de @gmail.com y no lo ha mandado Google, recházalo».
 * Brevo no es Google. Así que un correo firmado por Brevo que diga venir de
 * un gmail falla la comprobación en el servidor de destino, y lo hace de
 * forma silenciosa para quien lo manda: aquí se vería «enviado».
 *
 * El remitente tiene que ser del dominio que se verifica en Brevo, que es
 * `playoff360.site`. Para eso están sus registros DNS: son los que le dan
 * permiso a Brevo para firmar en nombre del dominio.
 *
 * EL DE RESPUESTA SÍ PUEDE SER EL GMAIL, y por eso van separados. El correo
 * invita a responder —«responde a este correo y lo leo yo»— y esa respuesta
 * tiene que llegar a un buzón que exista de verdad. Montar un buzón en
 * playoff360.site es otra tarea; mientras no la haya, el `reply-to` manda la
 * respuesta al gmail de siempre. DMARC no mira el `reply-to`.
 */
export const REMITENTE = {
  nombre: 'Playoff360',
  correo: process.env.CORREO_REMITENTE ?? 'hola@playoff360.site',
};

/** A dónde va la respuesta. Un buzón que exista, no el remitente. */
export const RESPONDER_A = process.env.CORREO_RESPUESTA ?? 'playoff360.info@gmail.com';

/** La dirección pública del sitio, para los enlaces de los correos. */
export const SITIO = process.env.URL ?? 'https://playoff360.site';

export type Clase = 'servicio' | 'comercial';

export interface Carta {
  a: string;
  nombre: string | null;
  asunto: string;
  html: string;
  texto: string;
  /** Adjuntos por dirección: los descarga Brevo, no esta función. */
  adjuntos?: { url: string; name: string }[];
}

/**
 * Manda una carta. Devuelve el identificador de Brevo o lanza.
 *
 * NO MIRA PERMISOS. Para eso está `destinatarios()`. Si esta función mirara
 * el permiso, haría falta pasarle la clase, y entonces el día que alguien se
 * confundiera de clase el correo saldría igual. Así no puede: quien no está
 * en la lista no llega hasta aquí.
 */
export async function envia(carta: Carta): Promise<string> {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': exige('BREVO_API_KEY'),
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: REMITENTE.nombre, email: REMITENTE.correo },
      replyTo: { email: RESPONDER_A, name: REMITENTE.nombre },
      to: [{ email: carta.a, ...(carta.nombre ? { name: carta.nombre } : {}) }],
      subject: carta.asunto,
      htmlContent: carta.html,
      textContent: carta.texto,
      ...(carta.adjuntos?.length ? { attachment: carta.adjuntos } : {}),
    }),
  });

  if (!r.ok) {
    /* El cuerpo del error de Brevo dice cuál de las dos cosas pasa: la clave
       no vale, o el dominio no está verificado. Son arreglos distintos y sin
       el mensaje no se distinguen. */
    const cuerpo = await r.text().catch(() => '');
    throw new Error(`Brevo respondió ${r.status}: ${cuerpo.slice(0, 300)}`);
  }
  const { messageId } = (await r.json()) as { messageId?: string };
  return messageId ?? 'sin-id';
}

/* ─────────────────────────── A quién se le manda ──────────────────────────── */

export interface Persona {
  id: string;
  email: string;
  full_name: string | null;
  unsubscribe_token: string;
}

/**
 * Quita de la lista a quien no ha dado permiso, para los correos comerciales.
 *
 * Para los de servicio devuelve la lista tal cual: no hay nada que filtrar,
 * porque no hacen falta permisos para explicarle a alguien lo que acaba de
 * crear.
 */
export const destinatarios = <T extends { marketing_consent?: boolean }>(
  gente: T[], clase: Clase,
): T[] => (clase === 'servicio' ? gente : gente.filter((p) => p.marketing_consent === true));

/* ──────────────────────── Que no salga dos veces ──────────────────────────── */

/**
 * Manda un correo UNA sola vez por persona y tipo.
 *
 * El renglón se apunta ANTES de mandar, no después, y ahí está el truco: la
 * clave primaria de `emails_enviados` es la que decide quién gana cuando la
 * bienvenida se dispara a la vez desde el navegador y desde la ronda
 * programada. El segundo recibe un error de clave duplicada y se va sin
 * mandar nada. Apuntándolo después, los dos verían la tabla vacía y los dos
 * mandarían.
 *
 * Si el envío falla se borra el renglón, para que el siguiente intento pueda
 * volver a probar. Un correo que no salió no está enviado.
 */
export async function unaVez(
  db: SupabaseClient, profileId: string, tipo: string, hacer: () => Promise<unknown>,
): Promise<'enviado' | 'ya-estaba'> {
  const { error } = await db
    .from('emails_enviados')
    .insert({ profile_id: profileId, tipo });

  /* 23505 es «clave duplicada»: ya salió. No es un fallo. */
  if (error) {
    if (error.code === '23505') return 'ya-estaba';
    throw error;
  }

  try {
    await hacer();
    return 'enviado';
  } catch (e) {
    await db.from('emails_enviados')
      .delete()
      .eq('profile_id', profileId)
      .eq('tipo', tipo);
    throw e;
  }
}
