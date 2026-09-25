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

export type PlanTier = 'free' | 'pro';

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
  /** Si no hay precio en Stripe, no se puede contratar todavía. */
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
  tier: r.tier as PlanTier,
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

export const billing = {
  async planes(): Promise<Plan[]> {
    const { data, error } = await supabase.from('plans').select('*').order('tier');
    if (error) throw error;
    return (data as Row[]).map(parsePlan);
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
      tier: r.tier as PlanTier,
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
  async irAPagar(clubId: string, periodo: 'mensual' | 'anual'): Promise<string> {
    return llamar('/.netlify/functions/pagar', { clubId, periodo });
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
