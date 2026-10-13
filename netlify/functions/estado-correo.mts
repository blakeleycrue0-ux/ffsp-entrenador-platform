/**
 * ¿ESTÁ EL CORREO BIEN PUESTO? ABRE ESTA DIRECCIÓN Y TE LO DICE.
 * ---------------------------------------------------------------------------
 * Montar el envío tiene tres pasos que se hacen en tres sitios distintos —la
 * clave en Netlify, el dominio en Brevo, los registros en el DNS— y hasta
 * ahora la única forma de saber si estaban los tres era darse de alta con una
 * cuenta de prueba y esperar a ver si llegaba algo. Cuando no llegaba, no
 * había manera de saber cuál de los tres faltaba.
 *
 * Esto lo pregunta y lo contesta en una frase por paso.
 *
 * NO ENSEÑA LA CLAVE, y es la regla que manda sobre todo lo demás. Dice si
 * está puesta y si Brevo la acepta; nunca su valor, ni un trozo, ni su
 * longitud. Esta dirección es pública: cualquiera puede abrirla.
 *
 * Y tampoco deja usarla para hacer de intermediario contra Brevo: no recibe
 * ningún parámetro, así que lo único que puede hacer quien la abra es
 * preguntar por el estado de esta cuenta. Lo mismo que ya se ve si el correo
 * llega o no llega.
 *
 * Es hermana de `estado-pago`, que hace esto mismo con Stripe.
 *
 *   https://playoff360.site/.netlify/functions/estado-correo
 */

import { protegido, json } from './_comun.mts';
import { REMITENTE, RESPONDER_A, SITIO } from './_correo.mts';

const dominioDe = (correo: string) => correo.split('@')[1] ?? '';

export default protegido('estado-correo', async (): Promise<Response> => {
  const clave = process.env.BREVO_API_KEY;
  const dominio = dominioDe(REMITENTE.correo);

  const pasos: { paso: string; bien: boolean; dice: string }[] = [];

  /* ── 1 · La clave ─────────────────────────────────────────────────────── */
  if (!clave) {
    pasos.push({
      paso: '1 · La clave de Brevo',
      bien: false,
      dice: 'Falta BREVO_API_KEY en las variables de entorno de Netlify. '
        + 'Sin ella no sale ningún correo.',
    });
    return json({ listo: false, remitente: REMITENTE.correo, pasos });
  }
  pasos.push({ paso: '1 · La clave de Brevo', bien: true, dice: 'Puesta en Netlify.' });

  /* ── 2 · ¿La acepta Brevo? ────────────────────────────────────────────── */
  const cuenta = await fetch('https://api.brevo.com/v3/account', {
    headers: { 'api-key': clave, accept: 'application/json' },
  });
  if (!cuenta.ok) {
    pasos.push({
      paso: '2 · Brevo la reconoce',
      bien: false,
      dice: cuenta.status === 401
        ? 'Brevo dice que la clave no vale. Puede estar mal copiada, o ser de otra cuenta.'
        : `Brevo respondió ${cuenta.status}.`,
    });
    return json({ listo: false, remitente: REMITENTE.correo, pasos });
  }
  const datos = (await cuenta.json()) as { email?: string; plan?: { credits?: number }[] };
  const credito = datos.plan?.find((p) => typeof p.credits === 'number')?.credits;
  pasos.push({
    paso: '2 · Brevo la reconoce',
    bien: true,
    dice: `Cuenta de ${datos.email ?? 'Brevo'}`
      + (credito === undefined ? '.' : `, ${credito} correos disponibles.`),
  });

  /* ── 3 · El dominio del remitente, verificado ─────────────────────────── */
  /* Es el paso que más cuesta y el que más silenciosamente falla: sin los
     registros DNS, Brevo acepta el envío y el servidor de destino lo tira a
     spam. «Enviado» no quiere decir «llegado». */
  const dom = await fetch('https://api.brevo.com/v3/senders/domains', {
    headers: { 'api-key': clave, accept: 'application/json' },
  });
  if (!dom.ok) {
    pasos.push({
      paso: `3 · El dominio ${dominio}`,
      bien: false,
      dice: `No se ha podido consultar (Brevo respondió ${dom.status}). `
        + 'Míralo en Brevo → Senders, Domains & Dedicated IPs.',
    });
  } else {
    const { domains = [] } = (await dom.json()) as {
      domains?: { domain_name?: string; authenticated?: boolean; verified?: boolean }[];
    };
    const suyo = domains.find((d) => d.domain_name === dominio);
    if (!suyo) {
      pasos.push({
        paso: `3 · El dominio ${dominio}`,
        bien: false,
        dice: `No está dado de alta en Brevo. Mientras no lo esté, los correos que `
          + `digan venir de ${REMITENTE.correo} acabarán en spam o rebotarán.`,
      });
    } else if (!suyo.authenticated) {
      pasos.push({
        paso: `3 · El dominio ${dominio}`,
        bien: false,
        dice: 'Dado de alta pero SIN autenticar: faltan los registros DNS (DKIM y DMARC). '
          + 'Hasta que estén, los correos salen pero no llegan a la bandeja de entrada.',
      });
    } else {
      pasos.push({
        paso: `3 · El dominio ${dominio}`,
        bien: true,
        dice: 'Autenticado. Brevo puede firmar en nombre del dominio.',
      });
    }
  }

  /* ── 4 · Que el remitente no sea un buzón ajeno ───────────────────────── */
  /* Un gmail como remitente falla DMARC siempre, esté el resto bien o mal:
     Google dice que lo que diga venir de gmail.com y no lo mande Google, se
     rechaza. Se avisa aparte porque no es un paso que falte, es uno mal
     hecho, y los dos se arreglan de forma distinta. */
  const ajeno = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];
  if (ajeno.includes(dominio)) {
    pasos.push({
      paso: '4 · El remitente',
      bien: false,
      dice: `${REMITENTE.correo} no puede ser el remitente: ${dominio} rechaza el correo `
        + 'que no haya mandado su propio servidor. Pon CORREO_REMITENTE con una dirección '
        + `de ${new URL(SITIO).hostname}. La respuesta puede seguir yendo al gmail.`,
    });
  } else {
    pasos.push({
      paso: '4 · El remitente',
      bien: true,
      dice: `Sale de ${REMITENTE.correo} y las respuestas van a ${RESPONDER_A}.`,
    });
  }

  return json({
    listo: pasos.every((p) => p.bien),
    remitente: REMITENTE.correo,
    responder_a: RESPONDER_A,
    pasos,
  });
});
