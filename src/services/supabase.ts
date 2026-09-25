/**
 * Cliente de Supabase.
 * ---------------------------------------------------------------------------
 * La clave `anon` es pública por diseño: va en el navegador y no concede
 * acceso a nada por sí sola. Lo que protege los datos es la seguridad por
 * filas (RLS) de las migraciones: sin sesión no se lee ni una fila, y con
 * sesión sólo se ve el club al que se pertenece.
 *
 * Para apuntar a otro proyecto se definen VITE_SUPABASE_URL y
 * VITE_SUPABASE_ANON_KEY.
 */

import { createClient } from '@supabase/supabase-js';

const POR_DEFECTO = {
  url: 'https://snywuosknlaewkynrtdc.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueXd1b3NrbmxhZXdreW5ydGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDg3MjYsImV4cCI6MjEwMDgyNDcyNn0.wxFDfRsMJNQzOIxm0FK0CvxmcYxENGO1uYYnyoOeJ-g',
};

/**
 * Una variable de entorno definida pero vacía es peor que no definirla: con
 * `??` pasaba el filtro y el cliente acababa apuntando a ninguna parte, con el
 * único síntoma de un «Load failed» en el navegador. Aquí una cadena vacía o
 * con espacios cuenta como no definida.
 */
const leer = (valor: string | undefined, respaldo: string): string => {
  const limpio = (valor ?? '').trim();
  return limpio === '' ? respaldo : limpio;
};

const url = leer(import.meta.env.VITE_SUPABASE_URL, POR_DEFECTO.url).replace(/\/+$/, '');
const anonKey = leer(import.meta.env.VITE_SUPABASE_ANON_KEY, POR_DEFECTO.anonKey);

/** Si la dirección no es utilizable, se dice ahora y no con un error opaco. */
export const configuracionValida = /^https:\/\/[^\s/]+\.[^\s/]+/.test(url) && anonKey.split('.').length === 3;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_URL = url;

/* ─────────────────────────── Errores comprensibles ─────────────────────────── */

/**
 * Cada navegador nombra de una forma el mismo fallo: no se ha podido llegar al
 * servidor. Safari dice «Load failed», Chrome «Failed to fetch» y Firefox
 * «NetworkError…». Los tres significan lo mismo y merecen el mismo mensaje.
 */
const ES_FALLO_DE_RED = /Load failed|Failed to fetch|NetworkError|fetch failed|ERR_NETWORK|ERR_INTERNET|Network request failed|TypeError: cancelled/i;

export const MENSAJE_SIN_CONEXION =
  'No hemos podido contactar con el servidor de datos. Suele deberse a una de tres cosas: ' +
  'no hay conexión, el proyecto de Supabase está en pausa (los proyectos gratuitos se pausan ' +
  'solos tras unos días sin uso y se reanudan desde su panel), o la dirección configurada no ' +
  'es correcta.';

/**
 * Convierte el error técnico de Supabase en algo que una entrenadora pueda
 * entender. Regla del producto: nunca mostrar códigos crudos.
 */
export function humanError(error: unknown): string {
  const raw = (error as { message?: string } | null)?.message ?? '';
  const code = (error as { code?: string } | null)?.code ?? '';
  const status = (error as { status?: number } | null)?.status;

  // Lo primero, porque es lo que más despista cuando ocurre.
  if (ES_FALLO_DE_RED.test(raw) || status === 0) return MENSAJE_SIN_CONEXION;

  if (/Invalid login credentials/i.test(raw)) return 'El correo o la contraseña no son correctos.';
  if (/Email not confirmed/i.test(raw)) return 'Todavía no has confirmado tu correo. Revisa la bandeja de entrada.';
  if (/User already registered|already been registered/i.test(raw)) return 'Ya existe una cuenta con ese correo.';
  if (/Password should be at least/i.test(raw)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/Signups not allowed|signup is disabled/i.test(raw)) {
    return 'El registro de cuentas nuevas está desactivado en Supabase. Actívalo en Authentication → Sign In / Providers, o pide una invitación.';
  }
  if (/rate limit|too many/i.test(raw)) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';

  if (code === '42P01' || /relation .* does not exist/i.test(raw)) {
    return 'A la base de datos le faltan tablas. Ejecuta las migraciones de supabase/migrations en el editor SQL de Supabase, por orden.';
  }
  if (code === '42883' || /function .* does not exist/i.test(raw)) {
    return 'A la base de datos le falta alguna función. Ejecuta la migración 0003_aislamiento_por_club.sql en el editor SQL de Supabase.';
  }
  /**
   * PostgreSQL responde lo mismo para «no puedes» que para «esta fila no
   * cumple la política», y son dos cosas muy distintas. Si el rechazo es al
   * ESCRIBIR una fila nueva, lo más probable es que le falte algún dato —el
   * club, el equipo— y no que falte permiso: mandar a pedir permiso a quien
   * administra el club, siendo a menudo quien lo lee, despista una tarde
   * entera. Se distingue por el texto, que PostgREST devuelve tal cual.
   */
  if (/new row violates row-level security/i.test(raw)) {
    return (
      'El servidor ha rechazado estos datos por incompletos: normalmente falta el club o el equipo ' +
      'al que pertenece. Recarga la página y vuelve a intentarlo; si sigue igual, es un fallo nuestro.'
    );
  }
  if (code === '42501' || /row-level security/i.test(raw)) {
    return 'No tienes permiso para hacer eso. Si crees que es un error, pídeselo a quien administra el club.';
  }
  if (code === '23505') return 'Ese registro ya existe.';

  if (status === 503 || status === 502 || /service unavailable|bad gateway/i.test(raw)) {
    return 'El servidor de datos no responde ahora mismo. Si el proyecto de Supabase está en pausa, reanúdalo desde su panel.';
  }
  if (status === 500 || /Database error/i.test(raw)) {
    return 'El servidor ha fallado al guardar. Suele ser que faltan migraciones por ejecutar en Supabase.';
  }

  return raw || 'Algo no ha salido bien. Inténtalo de nuevo.';
}

/**
 * Comprueba si se llega al servidor, para poder decirlo antes de que la
 * usuaria rellene un formulario entero.
 */
export async function compruebaConexion(): Promise<{ ok: boolean; motivo?: string }> {
  if (!configuracionValida) {
    return { ok: false, motivo: 'La dirección del servidor de datos no está bien configurada.' };
  }
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout?.(8000),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, motivo: 'La clave de acceso al servidor de datos no es válida.' };
    }
    return { ok: false, motivo: MENSAJE_SIN_CONEXION };
  } catch {
    return { ok: false, motivo: MENSAJE_SIN_CONEXION };
  }
}
