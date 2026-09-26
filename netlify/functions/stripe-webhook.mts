/**
 * El aviso de Stripe: lo ÚNICO que puede cambiar el plan de un club.
 * ---------------------------------------------------------------------------
 * Nadie asciende su propio club. La tabla `subscriptions` no tiene ni una
 * política de escritura, así que sólo se toca desde aquí, con la clave de
 * servicio, y sólo después de comprobar la firma del aviso.
 *
 * LA FIRMA NO ES OPCIONAL. Sin ella, cualquiera que averigüe esta dirección
 * manda un «suscripción activa» y se regala el plan. `constructEvent` falla si
 * el cuerpo no viene firmado con nuestro secreto, y por eso se lee en crudo:
 * un `req.json()` reordenaría bytes y la firma dejaría de cuadrar.
 *
 * Es idempotente: Stripe reintenta un aviso si no respondemos a tiempo, y
 * escribir dos veces el mismo estado no cambia nada.
 */

import type Stripe from 'stripe';
import { admin, error, json, NIVELES_DE_PAGO, stripe } from './_comun.mts';

/** Los estados de Stripe, tal cual, para poder cuadrarlos con su panel. */
const ESTADOS = new Set([
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete',
]);

const enSegundos = (t: number | null | undefined) =>
  typeof t === 'number' ? new Date(t * 1000).toISOString() : null;

async function guardar(sub: Stripe.Subscription, clubDeRespaldo?: string) {
  const clubId = (sub.metadata?.club_id as string | undefined) ?? clubDeRespaldo;
  if (!clubId) {
    // Sin club no se puede aplicar a nadie. Se registra y se acepta el aviso:
    // devolver un error haría que Stripe reintentara para siempre.
    console.error('Aviso de Stripe sin club_id', sub.id);
    return;
  }

  const estado = ESTADOS.has(sub.status) ? sub.status : 'incomplete';
  const item = sub.items.data[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;

  /* Qué plan ha contratado. Lo dijimos nosotros al abrir el pago y viaja en la
     suscripción, así que no hay que deducirlo del precio. Si faltara, se
     supone el más bajo de los de pago: equivocarse a la baja deja al club con
     menos de lo que pagó, que se arregla; a la alta le regala lo que no ha
     pagado, que no se entera nadie. */
  const pedido = sub.metadata?.nivel;
  const nivel = (NIVELES_DE_PAGO as readonly string[]).includes(pedido ?? '') ? pedido! : 'pro';

  const { error: e } = await admin()
    .from('subscriptions')
    .upsert(
      {
        club_id: clubId,
        // El plan lo decide que la suscripción exista, no lo que diga nadie.
        tier: estado === 'canceled' || estado === 'unpaid' ? 'free' : nivel,
        status: estado,
        trial_ends_at: enSegundos(sub.trial_end),
        current_period_end: enSegundos(item?.current_period_end),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'club_id' },
    );

  if (e) console.error('No se ha podido guardar la suscripción', clubId, e.message);
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return error('Sólo POST', 405);

  const firma = req.headers.get('stripe-signature');
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!firma || !secreto) return error('Aviso sin firmar', 400);

  // En crudo: reconstruir el JSON rompería la firma.
  const crudo = await req.text();

  let evento: Stripe.Event;
  try {
    evento = await stripe().webhooks.constructEventAsync(crudo, firma, secreto);
  } catch (e) {
    return error(`Firma no válida: ${(e as Error).message}`, 400);
  }

  const s = stripe();

  switch (evento.type) {
    case 'checkout.session.completed': {
      const sesion = evento.data.object as Stripe.Checkout.Session;
      if (typeof sesion.subscription === 'string') {
        const sub = await s.subscriptions.retrieve(sesion.subscription);
        await guardar(sub, sesion.client_reference_id ?? undefined);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end':
      await guardar(evento.data.object as Stripe.Subscription);
      break;
    default:
      // El resto de avisos no cambian el plan. Se aceptan sin hacer nada para
      // que Stripe no los reintente.
      break;
  }

  return json({ recibido: true });
};
