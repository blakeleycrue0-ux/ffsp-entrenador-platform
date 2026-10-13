/**
 * LAS CARTAS.
 * ---------------------------------------------------------------------------
 * Blanco y negro, una columna, y ninguna imagen de la que dependa entenderlo:
 * la mitad de los clientes de correo no cargan imágenes hasta que se lo pides,
 * y un correo que sin fotos no se entiende es un correo que no se entiende.
 *
 * Tablas y estilos escritos dentro de cada etiqueta, que es feo y es lo que
 * funciona: Outlook y Gmail recortan las hojas de estilo y no entienden
 * flexbox. Esto no es una página web, es un correo.
 *
 * ── EL PIE NO ES DECORACIÓN ────────────────────────────────────────────────
 * En un correo comercial la ley pide tres cosas: quién lo manda —con nombre e
 * identificador fiscal, los mismos que en el aviso legal y en las facturas—,
 * por qué lo recibes, y una forma sencilla y gratuita de no recibir más. Las
 * tres van en `pieComercial()`, que no se puede olvidar porque la construye
 * la misma función que arma la carta.
 *
 * El correo de servicio lleva otro pie, sin baja: de la guía del alta no te
 * puedes dar de baja porque no es una lista, es una sola carta.
 */

import { SITIO } from './_correo.mts';

/** El mismo titular que el aviso legal y las facturas. Si cambia, cambia ahí. */
const TITULAR = {
  nombre: 'Leon Bryn Blakeley',
  nif: 'X2453564Q',
  correo: 'playoff360.info@gmail.com',
} as const;

const TINTA = '#10131A';
const GRIS = '#5A6170';
const LINEA = '#D7DAE0';
const FUENTE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const escapa = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** El nombre de pila, que es como se escribe a alguien. Sin nombre, nada. */
const saludo = (nombre: string | null) => {
  const pila = (nombre ?? '').trim().split(/\s+/)[0];
  return pila ? `Hola, ${escapa(pila)}:` : 'Hola:';
};

const boton = (href: string, texto: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;">
    <tr><td style="background:${TINTA}; border-radius:10px;">
      <a href="${href}" style="display:inline-block; padding:13px 24px; font-family:${FUENTE};
         font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none;">${texto}</a>
    </td></tr>
  </table>`;

const pieComercial = (token: string) => {
  const baja = `${SITIO}/.netlify/functions/baja-correo?t=${encodeURIComponent(token)}`;
  return `
  <tr><td style="padding:0 32px 32px;">
    <hr style="border:0; border-top:1px solid ${LINEA}; margin:8px 0 18px;" />
    <p style="margin:0 0 8px; font-family:${FUENTE}; font-size:12px; line-height:1.6; color:${GRIS};">
      Recibes este correo porque diste permiso para recibir novedades al crear tu
      cuenta en Playoff360, o lo activaste después en Ajustes.
      <a href="${baja}" style="color:${TINTA}; font-weight:600;">Darte de baja</a> — un clic,
      sin entrar y sin dar explicaciones.
    </p>
    <p style="margin:0; font-family:${FUENTE}; font-size:12px; line-height:1.6; color:${GRIS};">
      ${TITULAR.nombre} · NIF ${TITULAR.nif} · ${TITULAR.correo} ·
      <a href="${SITIO}/legal" style="color:${GRIS};">Aviso legal y privacidad</a>
    </p>
  </td></tr>`;
};

const pieServicio = () => `
  <tr><td style="padding:0 32px 32px;">
    <hr style="border:0; border-top:1px solid ${LINEA}; margin:8px 0 18px;" />
    <p style="margin:0; font-family:${FUENTE}; font-size:12px; line-height:1.6; color:${GRIS};">
      Este correo va una sola vez, al crear la cuenta, y explica cómo funciona lo
      que acabas de abrir. No es una lista de correo.<br />
      ${TITULAR.nombre} · NIF ${TITULAR.nif} · ${TITULAR.correo} ·
      <a href="${SITIO}/legal" style="color:${GRIS};">Aviso legal y privacidad</a>
    </p>
  </td></tr>`;

/** El sobre: el mismo marco para todas, para que no se separen con el tiempo. */
const sobre = (titulo: string, cuerpo: string, pie: string) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapa(titulo)}</title></head>
<body style="margin:0; padding:0; background:#F4F5F7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#F4F5F7; padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px; background:#FFFFFF; border:1px solid ${LINEA}; border-radius:14px;">
        <tr><td style="padding:30px 32px 0;">
          <!-- ── LA MARCA, Y POR QUÉ ES OTRO ARCHIVO ──────────────────────
               playoff360.png es BLANCO con transparencia, porque en la
               aplicación se usa como máscara CSS y el color sale de
               currentColor. Un correo no sabe enmascarar —Outlook y Gmail
               recortan media hoja de estilo—, así que aquí sólo cabe una
               etiqueta img, y el blanco sobre el fondo blanco del correo es
               un cuadrado vacío. playoff360-tinta.png se deriva del otro con
               presentacion/marca-tinta.mjs, para que no se separen.

               Lleva alt con el nombre a propósito: la mitad de los clientes
               de correo no cargan imágenes hasta que se lo pides, y con el
               texto alternativo se sigue sabiendo de quién es. -->
          <img src="${SITIO}/playoff360-tinta.png" alt="Playoff360" width="30" height="30"
               style="display:block; width:30px; height:30px; border:0; margin:0 0 12px;" />
          <p style="margin:0 0 22px; font-family:${FUENTE}; font-size:13px; font-weight:700;
                    letter-spacing:0.08em; text-transform:uppercase; color:${TINTA};">Playoff360</p>
        </td></tr>
        ${cuerpo}
        ${pie}
      </table>
    </td></tr>
  </table>
</body></html>`;

const parrafo = (t: string) =>
  `<p style="margin:0 0 14px; font-family:${FUENTE}; font-size:15px; line-height:1.65; color:${TINTA};">${t}</p>`;

export interface Carta { asunto: string; html: string; texto: string }

/* ══════════════════════════════════════════════════════════════════════════
   1 · LA BIENVENIDA, CON LA GUÍA
   ══════════════════════════════════════════════════════════════════════════

   SE ESCRIBIÓ MIRANDO LO QUE PASA DE VERDAD. Los dos clubes que se dieron de
   alta esta semana hicieron lo mismo: crearon el club, crearon el equipo y se
   pararon ahí, con cero jugadoras. Así que esta carta no dice «bienvenido a
   la familia»: dice cuál es el siguiente paso y cuánto cuesta darlo. */
export function bienvenida(nombre: string | null, guiaUrl: string): Carta {
  const cuerpo = `
    <tr><td style="padding:0 32px;">
      <h1 style="margin:0 0 16px; font-family:${FUENTE}; font-size:23px; line-height:1.3;
                 font-weight:700; color:${TINTA};">Ya tienes tu club montado</h1>
      ${parrafo(saludo(nombre))}
      ${parrafo('Te adjunto la guía en PDF: lo que hace la herramienta y cómo se hace cada cosa. Está pensada para leerla de una sentada o para tenerla abierta al lado la primera semana.')}
      ${parrafo('<strong>Lo siguiente son tus jugadoras.</strong> Hasta que estén, el resto de la aplicación no tiene a quién convocar, a quién pasar lista ni a quién puntuar. Se añaden una a una con el nombre y el dorsal, y una plantilla entera son diez minutos.')}
      ${boton(`${SITIO}/app/equipo`, 'Añadir a mis jugadoras')}
      ${parrafo(`Si prefieres leer la guía en el navegador, está <a href="${guiaUrl}" style="color:${TINTA}; font-weight:600;">aquí</a>.`)}
      ${parrafo(`¿Algo no funciona o no se entiende? Responde a este correo y lo leo yo.`)}
    </td></tr>`;
  return {
    asunto: 'Tu club ya está montado — y lo que viene ahora',
    html: sobre('Bienvenido a Playoff360', cuerpo, pieServicio()),
    texto: [
      saludo(nombre).replace(/<[^>]+>/g, ''),
      '',
      'Te adjunto la guía en PDF: lo que hace la herramienta y cómo se hace cada cosa.',
      '',
      'Lo siguiente son tus jugadoras. Hasta que estén, el resto de la aplicación',
      'no tiene a quién convocar, a quién pasar lista ni a quién puntuar.',
      '',
      `Añadirlas: ${SITIO}/app/equipo`,
      `La guía en el navegador: ${guiaUrl}`,
      '',
      '¿Algo no funciona o no se entiende? Responde a este correo y lo leo yo.',
      '',
      `${TITULAR.nombre} · NIF ${TITULAR.nif} · ${TITULAR.correo}`,
    ].join('\n'),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · EL AVISO POR INACTIVIDAD
   ══════════════════════════════════════════════════════════════════════════

   NO ES ALEATORIO, Y ESA FUE UNA DECISIÓN. Un correo que llega porque sí es
   lo que enseña a la gente a marcar como spam, y el spam no lo paga quien lo
   manda: lo paga el dominio, que deja de llegar a la bandeja de entrada de
   todos los demás, incluidos los correos de confirmar el alta.

   Va uno. A los catorce días sin entrar, una sola vez, y sólo a quien dio
   permiso. Si vuelve y se va otra vez, no se le insiste: el tipo queda
   apuntado en `emails_enviados` para siempre. */
export function teEchamosDeMenos(
  nombre: string | null, token: string, dias: number, pendiente: string,
): Carta {
  const cuerpo = `
    <tr><td style="padding:0 32px;">
      <h1 style="margin:0 0 16px; font-family:${FUENTE}; font-size:23px; line-height:1.3;
                 font-weight:700; color:${TINTA};">Tu club sigue ahí</h1>
      ${parrafo(saludo(nombre))}
      ${parrafo(`Hace ${dias} días que no entras, así que esto es un recordatorio y nada más: lo que tenías guardado sigue donde lo dejaste.`)}
      ${parrafo(`<strong>${pendiente}</strong>`)}
      ${boton(`${SITIO}/app`, 'Entrar')}
      ${parrafo('Si lo probaste y no era para ti, no pasa nada — responde contándome qué te faltó, que es más útil de lo que parece. Y si no quieres más correos, el enlace de abajo los corta.')}
    </td></tr>`;
  return {
    asunto: 'Tu club sigue ahí',
    html: sobre('Tu club sigue ahí', cuerpo, pieComercial(token)),
    texto: [
      saludo(nombre).replace(/<[^>]+>/g, ''),
      '',
      `Hace ${dias} días que no entras. Lo que tenías guardado sigue donde lo dejaste.`,
      '',
      pendiente,
      '',
      `Entrar: ${SITIO}/app`,
      '',
      'Si lo probaste y no era para ti, responde contándome qué te faltó.',
      '',
      `${TITULAR.nombre} · NIF ${TITULAR.nif} · ${TITULAR.correo}`,
      `Darte de baja: ${SITIO}/.netlify/functions/baja-correo?t=${token}`,
    ].join('\n'),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · LAS NOVEDADES
   ══════════════════════════════════════════════════════════════════════════

   No se manda sola: la dispara una persona cuando hay algo que contar. Por
   eso recibe el texto en vez de traerlo escrito. Lo que sí trae puesto es el
   pie, que es la parte que no se puede olvidar. */
export function novedades(
  nombre: string | null, token: string, titulo: string, parrafos: string[],
): Carta {
  const cuerpo = `
    <tr><td style="padding:0 32px;">
      <h1 style="margin:0 0 16px; font-family:${FUENTE}; font-size:23px; line-height:1.3;
                 font-weight:700; color:${TINTA};">${escapa(titulo)}</h1>
      ${parrafo(saludo(nombre))}
      ${parrafos.map((p) => parrafo(escapa(p))).join('')}
      ${boton(`${SITIO}/app`, 'Verlo en la aplicación')}
    </td></tr>`;
  return {
    asunto: titulo,
    html: sobre(titulo, cuerpo, pieComercial(token)),
    texto: [
      saludo(nombre).replace(/<[^>]+>/g, ''), '', ...parrafos, '',
      `${SITIO}/app`, '',
      `${TITULAR.nombre} · NIF ${TITULAR.nif} · ${TITULAR.correo}`,
      `Darte de baja: ${SITIO}/.netlify/functions/baja-correo?t=${token}`,
    ].join('\n'),
  };
}
