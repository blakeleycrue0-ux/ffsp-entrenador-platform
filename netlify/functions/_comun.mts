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
    headers: { 'content-type': 'application/json' },
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
 * Ahora el motivo sale en la pantalla. Y SE ELIGE QUÉ SE CUENTA:
 *
 *   · Lo que dice Stripe se enseña tal cual. Sus mensajes están escritos para
 *     que los lea una persona —«the price is archived», «no such price»— y no
 *     llevan nada de la cuenta ni de la clave.
 *   · El permiso tiene mensaje propio, porque es el fallo que da una clave
 *     restringida recién creada y la pantalla puede decir exactamente qué hay
 *     que marcar en Stripe para arreglarlo.
 *   · Cualquier otra cosa se queda en una frase genérica. Un fallo que no
 *     viene de Stripe puede llevar dentro detalles del servidor, y esto es un
 *     punto público.
 *
 * Y TODO SE REGISTRA ENTERO, pase lo que pase: la pantalla da lo justo para
 * saber qué hacer, el registro de la función da lo necesario para depurarlo.
 */
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
    return error(`Stripe ha rechazado la operación: ${e.message}`, 502);
  }

  /* `exige` falla con el nombre de la variable que falta, nunca con su valor:
     decirlo ahorra media hora de buscar a ciegas y no enseña ningún secreto. */
  if (e instanceof Error && e.message.startsWith('Falta la variable de entorno')) {
    return error(`${e.message}. Hay que definirla en el panel de Netlify.`, 500);
  }

  return error('No hemos podido abrir la pasarela de pago. Inténtalo de nuevo en un momento.', 500);
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
