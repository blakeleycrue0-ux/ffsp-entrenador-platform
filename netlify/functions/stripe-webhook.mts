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
import { error, guardarSuscripcion, json, stripe } from './_comun.mts';

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
        await guardarSuscripcion(sub, sesion.client_reference_id ?? undefined);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end':
      await guardarSuscripcion(evento.data.object as Stripe.Subscription);
      break;
    default:
      // El resto de avisos no cambian el plan. Se aceptan sin hacer nada para
      // que Stripe no los reintente.
      break;
  }

  return json({ recibido: true });
};
