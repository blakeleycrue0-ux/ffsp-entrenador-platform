/**
 * Cliente de Supabase.
 * ---------------------------------------------------------------------------
 * La clave `anon` es pública por diseño: va en el navegador y no concede
 * acceso a nada por sí sola. Lo que protege los datos es la seguridad por
 * filas (RLS) definida en supabase/migrations/0001_esquema_inicial.sql:
 * sin sesión iniciada no se lee ni una fila, y con sesión sólo se ven los
 * equipos asignados.
 *
 * Para apuntar a otro proyecto basta con definir VITE_SUPABASE_URL y
 * VITE_SUPABASE_ANON_KEY en un fichero .env.
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://sqhavilwnypxxoqmrpkf.supabase.co';

const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxaGF2aWx3bnlweHhvcW1ycGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MDgyMjQsImV4cCI6MjEwMzQ4NDIyNH0.box09jIYI-nessL3Ug5u02qjENo4631LnW3xLR0kOVA';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_URL = url;

/**
 * Convierte el error técnico de Supabase en algo que una entrenadora pueda
 * entender. Regla del producto: nunca mostrar códigos crudos.
 */
export function humanError(error: unknown): string {
  const raw = (error as { message?: string } | null)?.message ?? '';
  const code = (error as { code?: string } | null)?.code ?? '';

  if (/Invalid login credentials/i.test(raw)) return 'El correo o la contraseña no son correctos.';
  if (/Email not confirmed/i.test(raw)) return 'Todavía no has confirmado tu correo. Revisa la bandeja de entrada.';
  if (/User already registered/i.test(raw)) return 'Ya existe una cuenta con ese correo.';
  if (/Password should be at least/i.test(raw)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit|too many/i.test(raw)) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  if (code === '42P01' || /relation .* does not exist/i.test(raw)) {
    return 'La base de datos todavía no tiene las tablas creadas. Ejecuta el fichero supabase/migrations/0001_esquema_inicial.sql en el editor SQL de Supabase.';
  }
  if (code === '42501' || /row-level security/i.test(raw)) {
    return 'No tienes permiso para hacer eso. Si crees que es un error, pídeselo a la coordinadora del club.';
  }
  if (code === '23505') return 'Ese registro ya existe.';
  if (/Failed to fetch|NetworkError|fetch failed/i.test(raw)) {
    return 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }
  return raw || 'Algo no ha salido bien. Inténtalo de nuevo.';
}
