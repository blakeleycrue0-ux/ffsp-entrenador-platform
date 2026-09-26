/**
 * Empieza el pago: devuelve la dirección de Stripe Checkout.
 * ---------------------------------------------------------------------------
 * El club no escribe nunca una tarjeta en nuestra web. Se le manda a la página
 * de Stripe, que es quien las trata, y se vuelve aquí cuando termina. Así no
 * pasa ni un número de tarjeta por este servidor.
 *
 * La prueba de siete días la aplica Stripe (`trial_period_days`). Pide tarjeta
 * y cobra sola al terminar si nadie cancela, por eso la aplicación tiene que
 * decirlo con todas las letras antes de llegar hasta aquí.
 */

import {
  administraElClub, admin, error, json, NIVELES_DE_PAGO, plan as buscarPlan, quienLlama, stripe,
} from './_comun.mts';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return error('Sólo POST', 405);

  const quien = await quienLlama(req);
  if (!quien) return error('Sesión no válida. Vuelve a entrar.', 401);

  let cuerpo: { clubId?: string; nivel?: string; periodo?: 'mensual' | 'anual' };
  try {
    cuerpo = await req.json();
  } catch {
    return error('Petición ilegible');
  }

  const { clubId, nivel = 'pro', periodo = 'mensual' } = cuerpo;
  if (!clubId) return error('Falta el club');

  /* El nivel llega del navegador, así que se comprueba contra una lista
     cerrada. Sin esto, un `nivel` cualquiera acabaría buscando un precio con
     lo que mandase quien llama. */
  if (!(NIVELES_DE_PAGO as readonly string[]).includes(nivel)) {
    return error('Ese plan no se puede contratar.');
  }

  if (!(await administraElClub(quien, clubId))) {
    return error('Sólo quien administra el club puede contratar el plan.', 403);
  }

  const plan = await buscarPlan(nivel);
  const price = periodo === 'anual' ? plan?.stripe_price_yearly : plan?.stripe_price_monthly;
  if (!price) {
    // Honesto: sin precio configurado no se simula un cobro que no existe.
    return error(
      `Todavía no hay precio configurado para el plan ${plan?.name ?? nivel}. Escríbenos y lo activamos.`,
      409,
    );
  }

  const sb = admin();
  const { data: club } = await sb.from('clubs').select('name').eq('id', clubId).maybeSingle();
  const { data: previa } = await sb
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('club_id', clubId)
    .maybeSingle();

  const origen = new URL(req.url).origin;
  const volverA = `${origen}/app/ajustes`;

  const s = stripe();
  const sesion = await s.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    // Un cliente por club, reutilizado: así el portal enseña todo su historial.
    customer: previa?.stripe_customer_id ?? undefined,
    client_reference_id: clubId,
    subscription_data: {
      // Sin prueba si ya la gastó: `trial_days` sólo se aplica la primera vez.
      trial_period_days: previa?.stripe_customer_id ? undefined : plan?.trial_days || undefined,
      /* `nivel` viaja con la suscripción porque es lo que el webhook leerá para
         saber si este club es Pro o Max. Sin esto habría que adivinarlo por el
         precio, y un precio se cambia en Stripe sin avisar a nadie. */
      metadata: { club_id: clubId, nivel, club_name: club?.name ?? '' },
    },
    metadata: { club_id: clubId, nivel },
    locale: 'es',
    allow_promotion_codes: true,
    success_url: `${volverA}?pago=hecho`,
    cancel_url: `${volverA}?pago=cancelado`,
  });

  if (!sesion.url) return error('Stripe no ha devuelto una dirección de pago', 502);
  return json({ url: sesion.url });
};
