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
  trial_days: number;
  stripe_price_monthly: string | null;
  stripe_price_yearly: string | null;
}

export async function planPro(): Promise<Plan | null> {
  const { data } = await admin()
    .from('plans')
    .select('tier, trial_days, stripe_price_monthly, stripe_price_yearly')
    .eq('tier', 'pro')
    .maybeSingle();
  return (data as Plan | null) ?? null;
}
