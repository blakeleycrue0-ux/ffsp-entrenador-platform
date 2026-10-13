/**
 * Lo que comparten las funciones de cobro.
 * ---------------------------------------------------------------------------
 * Esto se ejecuta EN EL SERVIDOR. Aquí viven la clave secreta de Stripe y la
 * clave de servicio de Supabase, y ninguna de las dos puede aparecer jamás en
 * el navegador: quien las tuviera podría cobrar en nombre del club o leer la
 * base de datos entera saltándose las políticas de acceso.
 *
 * Por eso el cliente nunca dice de qué plan es. Sólo pide «llévame a pagar», y
 * quien escribe la suscripción es el webhook, con el aviso firmado de Stripe.
 */

import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Falla al arrancar y no a mitad de un cobro, que es peor momento. */
function exige(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}

export const stripe = () => new Stripe(exige('STRIPE_SECRET_KEY'));

/** Cliente con clave de servicio: se salta las políticas, así que sólo aquí. */
export const admin = (): SupabaseClient =>
  createClient(exige('SUPABASE_URL'), exige('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    /* `charset=utf-8` y no `application/json` a secas. Sin él, el navegador
       que abre la respuesta a pelo adivina la codificación y suele acertar
       con Latin-1: «1 · La clave» sale como «1 Â· La clave». La aplicación
       no lo notaba porque `response.json()` decodifica en UTF-8 pase lo que
       pase, así que esto sólo se veía al abrir una función en una pestaña —
       que es exactamente para lo que está `estado-correo`. */
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const error = (mensaje: string, status = 400) => json({ error: mensaje }, status);

/**
 * CUANDO LA PASARELA FALLA, QUE SE SEPA POR QUÉ.
 * ---------------------------------------------------------------------------
 * Las llamadas a Stripe estaban sin recoger. Si Stripe decía que no —por un
 * permiso, por un precio archivado, por lo que fuera—, la excepción subía sin
 * tocar, Netlify devolvía un 500 con un cuerpo que no es JSON, el navegador no
 * conseguía leer ningún `error` y la pantalla acababa diciendo lo único que
 * sabía: «No hemos podido conectar con la pasarela de pago».
 *
 * Esa frase es falsa y además es un callejón sin salida: la conexión había
 * funcionado perfectamente, el que se había negado era Stripe. El motivo real
 * quedaba enterrado en el registro de la función, que es el último sitio donde
 * va a mirar quien está intentando pagar.
 *
 * Ahora el motivo sale en la pantalla, SIEMPRE Y SEA EL QUE SEA.
 *
 * La primera versión de esto se guardaba los fallos que no venían de Stripe
 * «por prudencia» y contestaba una frase genérica. Eso dejó la pantalla
 * exactamente igual de muda que antes: se veía «No hemos podido abrir la
 * pasarela, inténtalo de nuevo» ante un fallo que no se arreglaba
 * intentándolo de nuevo nunca, porque no era pasajero. La prudencia, cuando
 * esconde la única pista que hay, no protege a nadie: deja a quien intenta
 * pagar y a quien tiene que arreglarlo con la misma nada.
 *
 * Así que se dice el motivo, y lo que se hace con lo delicado es LIMPIARLO,
 * no callarlo: `sinClaves` tacha de cualquier mensaje lo que tenga forma de
 * clave —de Stripe, de un webhook o de un testigo JWT— antes de que salga de
 * aquí. Un mensaje tachado sigue siendo útil; uno que no existe, no.
 *
 * Y TODO SE REGISTRA ENTERO, sin tachar, pase lo que pase: la pantalla da lo
 * justo para saber qué hacer, el registro da lo necesario para depurarlo.
 */

/**
 * Tacha de un texto cualquier cosa con forma de clave.
 *
 * No se fía de que los mensajes de otras librerías nunca incluyan la clave
 * que acaban de rechazar: algunos la incluyen. Son tres formas —`sk_`/`rk_`/
 * `pk_` de Stripe, `whsec_` de un webhook, y un JWT de tres tramos— y cubren
 * todo lo que este servidor maneja.
 */
const sinClaves = (texto: string): string =>
  texto
    .replace(/\b[sprk]k_(live|test)_[A-Za-z0-9]{8,}/g, '«clave»')
    .replace(/\bwhsec_[A-Za-z0-9]{8,}/g, '«clave»')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '«clave»');

export function fallo(e: unknown, donde: string): Response {
  console.error(`Fallo en ${donde}:`, e);

  if (e instanceof Stripe.errors.StripeError) {
    if (e.type === 'StripePermissionError' || e.statusCode === 403) {
      return error(
        'La clave de Stripe configurada no tiene permiso para esto. Si es una clave '
        + 'restringida (rk_live_…), dale permiso de escritura sobre Checkout Sessions, '
        + 'Customers, Subscriptions y Billing Portal, o usa la clave secreta normal.',
        502,
      );
    }
    if (e.type === 'StripeAuthenticationError') {
      return error('La clave de Stripe configurada no es válida.', 502);
    }
    return error(`Stripe ha rechazado la operación: ${sinClaves(e.message)}`, 502);
  }

  /* `exige` falla con el nombre de la variable que falta, nunca con su valor:
     decirlo ahorra media hora de buscar a ciegas y no enseña ningún secreto. */
  if (e instanceof Error && e.message.startsWith('Falta la variable de entorno')) {
    return error(`${e.message}. Hay que definirla en el panel de Netlify.`, 500);
  }

  /* TODO LO DEMÁS, CON SU NOMBRE Y SU MENSAJE. Es lo que queda cuando falla
     algo que no es Stripe —la red, Supabase, un fallo de programación— y es
     justo lo que hace falta para saber por dónde seguir. Tachado de claves y
     cortado a 300 caracteres: un mensaje de pantalla, no un volcado. */
  const detalle = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return error(`Fallo en «${donde}» — ${sinClaves(detalle).slice(0, 300)}`, 500);
}

/**
 * NINGUNA FUNCIÓN DE COBRO PUEDE CAERSE SIN CONTESTAR.
 * ---------------------------------------------------------------------------
 * Recoger la llamada a Stripe no bastaba. Antes de llegar a Stripe hay media
 * docena de pasos que también pueden fallar —leer quién llama, comprobar que
 * administra el club, buscar el plan, leer la suscripción previa— y cada uno
 * habla con Supabase por la red. Si uno de ésos revienta, la excepción sube
 * sin recoger, Netlify contesta un 502 con un cuerpo que no es JSON y el
 * navegador se queda sin motivo que enseñar: vuelve la pantalla muda, sólo
 * que ahora con un número al lado.
 *
 * Esto envuelve el manejador entero. A partir de aquí, pase lo que pase
 * dentro, la respuesta SIEMPRE es un JSON con su `error` dentro, y el detalle
 * completo queda en el registro de la función. Un punto que cobra dinero no
 * puede tener una forma de fallar que no sepa contar.
 */
export const protegido =
  (nombre: string, manejador: (req: Request) => Promise<Response>) =>
    async (req: Request): Promise<Response> => {
      try {
        return await manejador(req);
      } catch (e) {
        return fallo(e, nombre);
      }
    };

/**
 * Quién llama, comprobado contra Supabase — no contra lo que diga el cuerpo de
 * la petición. Devuelve el id de la persona o `null` si el testigo no vale.
 */
export async function quienLlama(req: Request): Promise<string | null> {
  const cabecera = req.headers.get('authorization') ?? '';
  const token = cabecera.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error: e } = await admin().auth.getUser(token);
  return e || !data.user ? null : data.user.id;
}

/**
 * ¿Administra ese club? Se comprueba en el servidor, contra `club_members`.
 * Que el botón esté visible no autoriza nada.
 */
export async function administraElClub(profileId: string, clubId: string): Promise<boolean> {
  const { data } = await admin()
    .from('club_members')
    .select('role')
    .eq('profile_id', profileId)
    .eq('club_id', clubId)
    .maybeSingle();
  return data?.role === 'admin';
}

export interface Plan {
  tier: string;
  name: string;
  trial_days: number;
  stripe_price_monthly: string | null;
  stripe_price_yearly: string | null;
}

/** Los niveles de pago. `free` no se contrata: es lo que hay sin pagar. */
export const NIVELES_DE_PAGO = ['pro', 'max'] as const;

export async function plan(tier: string): Promise<Plan | null> {
  const { data } = await admin()
    .from('plans')
    .select('tier, name, trial_days, stripe_price_monthly, stripe_price_yearly')
    .eq('tier', tier)
    .maybeSingle();
  return (data as Plan | null) ?? null;
}

/* ──────────────────────────── La suscripción ─────────────────────────────
   ESTO VIVE AQUÍ Y NO EN EL WEBHOOK, y el motivo es una factura cobrada.

   Escribir la suscripción era cosa sólo del aviso de Stripe. Mientras el
   aviso llegue, perfecto. El día que no llega —y no llegó— el club ha
   pagado, Stripe lo tiene todo apuntado y la aplicación no se entera de
   nada: sigue en el plan gratis, con un equipo, y encima sin poder abrir el
   portal para cancelar, porque el portal necesita el cliente de Stripe que
   está justo en la fila que no se escribió.

   Un cobro no puede depender de que una petición de un tercero llegue a la
   primera. Así que el mismo guardado lo usan dos caminos: el aviso de
   Stripe, que es el rápido, y `sincronizar`, que va a preguntárselo a Stripe
   cuando hace falta. Los dos escriben exactamente lo mismo, porque son la
   misma función. */

/** Los estados de Stripe, tal cual, para poder cuadrarlos con su panel. */
const ESTADOS = new Set([
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete',
]);

const enSegundos = (t: number | null | undefined) =>
  typeof t === 'number' ? new Date(t * 1000).toISOString() : null;

/**
 * Deja en la base lo que Stripe dice de esta suscripción.
 *
 * Devuelve el club al que se ha aplicado, o `null` si el aviso no traía
 * ninguno: sin club no se puede aplicar a nadie.
 */
export async function guardarSuscripcion(
  sub: Stripe.Subscription,
  clubDeRespaldo?: string,
): Promise<string | null> {
  const clubId = (sub.metadata?.club_id as string | undefined) ?? clubDeRespaldo;
  if (!clubId) {
    /* Se registra y se acepta: devolver un error haría que Stripe reintentara
       este aviso para siempre. */
    console.error('Aviso de Stripe sin club_id', sub.id);
    return null;
  }

  const estado = ESTADOS.has(sub.status) ? sub.status : 'incomplete';
  const item = sub.items.data[0] as
    (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;

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

  if (e) {
    console.error('No se ha podido guardar la suscripción', clubId, e.message);
    throw new Error(`No se ha podido guardar la suscripción: ${e.message}`);
  }
  return clubId;
}
