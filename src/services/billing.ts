/**
 * Planes y suscripción.
 * ---------------------------------------------------------------------------
 * Aquí sólo se LEE. El plan de un club no se decide en el navegador: lo escribe
 * el webhook de Stripe en el servidor, y la base de datos no acepta que nadie
 * más toque `subscriptions`. Lo que se ve aquí es el reflejo de eso.
 *
 * Los importes pueden venir vacíos. Mientras no haya precio decidido no se
 * enseña ninguna cifra ni se deja pagar: es preferible a inventarse una.
 */

import { supabase } from './supabase';

export type PlanTier = 'free' | 'pro' | 'max';

/** De menor a mayor. Sirve para ordenar y para saber qué es «subir de plan». */
export const NIVELES: PlanTier[] = ['free', 'pro', 'max'];

/** Un nivel que la base de datos conozca y esta versión no, no tumba nada. */
export const esNivel = (v: unknown): v is PlanTier =>
  typeof v === 'string' && (NIVELES as string[]).includes(v);

export type SubscriptionStatus =
  | 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';

export interface Plan {
  tier: PlanTier;
  name: string;
  /** `null` es sin límite. */
  maxTeams: number | null;
  /** Céntimos. `null` mientras no esté decidido. */
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  trialDays: number;
  /**
   * Si se puede contratar HOY. Hacen falta dos cosas: que el plan tenga precio
   * en Stripe —eso lo mira `parsePlan`— y que el servidor tenga con qué cobrar
   * —eso lo pregunta `pasarelaAbierta()` y lo aplica `conLaCajaAbierta`—.
   * Quien lea planes por su cuenta se quedará con lo primero; para eso están
   * `billing.planes()` y la carga de `db.ts`, que ya traen las dos.
   */
  contratable: boolean;
}

export interface Subscription {
  tier: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

type Row = Record<string, unknown>;

/** Se exporta para que la carga inicial no tenga que repetir el mapeo. */
export const parsePlan = (r: Row): Plan => ({
  tier: esNivel(r.tier) ? r.tier : 'free',
  name: r.name as string,
  maxTeams: (r.max_teams as number | null) ?? null,
  priceMonthly: (r.price_monthly as number | null) ?? null,
  priceYearly: (r.price_yearly as number | null) ?? null,
  currency: (r.currency as string) ?? 'eur',
  trialDays: (r.trial_days as number) ?? 0,
  contratable: Boolean(r.stripe_price_monthly || r.stripe_price_yearly),
});

/** El plan que de verdad se está aplicando, con las mismas reglas que el servidor. */
export function planEfectivo(sub: Subscription | null): PlanTier {
  if (!sub) return 'free';
  if (sub.status === 'active') return sub.tier;
  if (sub.status === 'trialing' && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()) {
    return sub.tier;
  }
  return 'free';
}

/** Días que quedan de prueba, o `null` si no hay ninguna en curso. */
export function diasDePrueba(sub: Subscription | null): number | null {
  if (!sub || sub.status !== 'trialing' || !sub.trialEndsAt) return null;
  const restan = new Date(sub.trialEndsAt).getTime() - Date.now();
  return restan > 0 ? Math.ceil(restan / 86_400_000) : null;
}

/** Importe legible. Devuelve `null` si todavía no hay precio: no se inventa. */
export function importe(centimos: number | null, moneda: string): string | null {
  if (centimos === null) return null;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda.toUpperCase(),
    minimumFractionDigits: centimos % 100 === 0 ? 0 : 2,
  }).format(centimos / 100);
}

/**
 * ¿Hay caja abierta de verdad?
 * ---------------------------------------------------------------------------
 * Tener precio en Stripe y poder cobrar son dos cosas distintas. Los cuatro
 * precios existen y están guardados en `plans`, así que `parsePlan` ya dice
 * `contratable: true`. Pero el cobro necesita además cuatro variables de
 * entorno en el servidor —la clave de Stripe, la de servicio de Supabase, su
 * URL y el secreto del webhook— y ésas las pone una persona en el panel de
 * Netlify, no esta migración ni este código.
 *
 * Sin esta comprobación, la portada diría «se contrata desde la aplicación» y
 * cada intento de pagar moriría con «Falta la variable de entorno
 * STRIPE_SECRET_KEY». Prometer un cobro que falla es peor que decir que
 * todavía no se puede.
 *
 * SE PREGUNTA UNA VEZ POR CARGA. La respuesta cambia como mucho una vez en la
 * vida del proyecto; una ida y vuelta al servidor por cada pantalla de precios
 * sería tirar el tiempo de todo el mundo.
 *
 * Y SI NO CONTESTA, ES «NO». En desarrollo no hay funciones de Netlify
 * sirviendo, y sin red tampoco hay respuesta. En los dos casos el valor
 * prudente es el mismo: no ofrecer un pago que no se ha podido confirmar. El
 * error se equivoca hacia «todavía no», que no rompe nada; equivocarse hacia
 * «sí» deja a alguien con la tarjeta en la mano delante de un fallo.
 */
let caja: Promise<boolean> | null = null;

export function pasarelaAbierta(): Promise<boolean> {
  caja ??= fetch('/.netlify/functions/estado-pago')
    .then((r) => (r.ok ? (r.json() as Promise<{ listo?: boolean }>) : { listo: false }))
    .then((j) => j.listo === true)
    .catch(() => false);
  return caja;
}

/**
 * Los planes, con `contratable` ya pasado por la realidad del servidor.
 *
 * `contratable` significa «esto se puede contratar», y si no hay con qué
 * cobrar no se puede. Apagarlo aquí, en un solo sitio, deja honestas de golpe
 * las cuatro pantallas que lo miran —portada, alta, selector y facturación— y
 * también `entitlements`, que mientras nada sea contratable no cierra ninguna
 * función.
 */
export const conLaCajaAbierta = (planes: Plan[], abierta: boolean): Plan[] =>
  abierta ? planes : planes.map((p) => ({ ...p, contratable: false }));

export const billing = {
  pasarelaAbierta,

  async planes(): Promise<Plan[]> {
    const [{ data, error }, abierta] = await Promise.all([
      supabase.from('plans').select('*').order('tier'),
      pasarelaAbierta(),
    ]);
    if (error) throw error;
    return conLaCajaAbierta((data as Row[]).map(parsePlan), abierta);
  },

  async suscripcion(clubId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('tier, status, trial_ends_at, current_period_end, cancel_at_period_end')
      .eq('club_id', clubId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const r = data as Row;
    return {
      tier: esNivel(r.tier) ? r.tier : 'free',
      status: r.status as SubscriptionStatus,
      trialEndsAt: (r.trial_ends_at as string | null) ?? null,
      currentPeriodEnd: (r.current_period_end as string | null) ?? null,
      cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
    };
  },

  /**
   * Pide al servidor una dirección de pago y devuelve a dónde ir. El navegador
   * no habla nunca con Stripe directamente ni conoce ninguna clave.
   */
  async irAPagar(clubId: string, nivel: PlanTier, periodo: 'mensual' | 'anual'): Promise<string> {
    return llamar('/.netlify/functions/pagar', { clubId, nivel, periodo });
  },

  /** Portal de Stripe: cambiar tarjeta, ver facturas, cancelar. */
  async irAlPortal(clubId: string): Promise<string> {
    return llamar('/.netlify/functions/portal', { clubId });
  },
};

async function llamar(ruta: string, cuerpo: Record<string, unknown>): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

  const res = await fetch(ruta, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(cuerpo),
  });

  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) {
    throw new Error(json.error || 'No hemos podido conectar con la pasarela de pago.');
  }
  return json.url;
}
