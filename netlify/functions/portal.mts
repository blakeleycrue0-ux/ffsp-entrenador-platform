/**
 * Portal de cliente de Stripe: cambiar tarjeta, ver facturas, cancelar.
 * ---------------------------------------------------------------------------
 * Cancelar no puede exigir escribir un correo y esperar respuesta. Esto lleva
 * al portal de Stripe, donde el club lo hace solo y en dos clics.
 */

import {
  administraElClub, admin, error, json, protegido, quienLlama, stripe,
} from './_comun.mts';

export default protegido('portal', async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return error('Sólo POST', 405);

  const quien = await quienLlama(req);
  if (!quien) return error('Sesión no válida. Vuelve a entrar.', 401);

  let cuerpo: { clubId?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return error('Petición ilegible');
  }
  const { clubId } = cuerpo;
  if (!clubId) return error('Falta el club');
  if (!(await administraElClub(quien, clubId))) {
    return error('Sólo quien administra el club puede gestionar el pago.', 403);
  }

  const { data } = await admin()
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('club_id', clubId)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    return error('Este club todavía no tiene ningún pago que gestionar.', 409);
  }

  /* Igual que en `pagar`: lo que diga Stripe sale por `protegido`. */
  const sesion = await stripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    /* Con `?pago=hecho` también a la vuelta del portal: quien acaba de
       cancelar o de cambiar la tarjeta tiene que ver el cambio al instante,
       sin depender de que llegue el aviso de Stripe. */
    return_url: `${new URL(req.url).origin}/app/ajustes/plan?pago=hecho`,
    locale: 'es',
  });
  return json({ url: sesion.url });
});
