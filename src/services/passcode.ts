/**
 * Código de acceso (PIN de cuatro cifras).
 * ---------------------------------------------------------------------------
 * AQUÍ NO SE COMPARA NADA. El navegador no tiene el código ni el hash: manda
 * las cuatro cifras a una función del servidor y se queda con el sí o el no.
 * Comparar en el cliente sería regalar el código a quien abra las herramientas
 * de desarrollo, y el límite de intentos no valdría nada.
 *
 * Y NO ES LA AUTENTICACIÓN. La sesión sigue siendo la de Supabase Auth; esto
 * es un candado encima, para el móvil que se queda encendido encima de la
 * mesa. Por eso la pantalla de bloqueo siempre tiene salida: cerrar sesión y
 * volver a entrar con el correo y la contraseña de siempre.
 *
 * El desbloqueo NO se guarda en el servidor: vale para esta pestaña y se
 * pierde al cerrarla, que es justo lo que se quiere de un candado.
 */

import { supabase } from './supabase';

export type MotivoFallo = 'incorrecto' | 'bloqueado' | 'sin_pin';

export interface EstadoPasscode {
  /** Si la cuenta tiene código puesto. */
  tiene: boolean;
  /** Hasta cuándo no se admiten intentos, si está en espera. */
  bloqueadoHasta: Date | null;
  /** Intentos que quedan antes de la próxima espera. */
  restantes: number | null;
}

export interface Resultado {
  ok: boolean;
  motivo?: MotivoFallo;
  bloqueadoHasta?: Date | null;
  restantes?: number | null;
}

type Crudo = {
  ok?: boolean;
  tiene?: boolean;
  motivo?: string;
  bloqueado_hasta?: string | null;
  restantes?: number | null;
};

const fecha = (v: string | null | undefined): Date | null => (v ? new Date(v) : null);

const motivo = (v: string | undefined): MotivoFallo | undefined =>
  v === 'incorrecto' || v === 'bloqueado' || v === 'sin_pin' ? v : undefined;

const resultado = (raw: Crudo): Resultado => ({
  ok: raw.ok === true,
  motivo: motivo(raw.motivo),
  bloqueadoHasta: fecha(raw.bloqueado_hasta),
  restantes: raw.restantes ?? null,
});

/** Cuatro cifras. Se valida también en el servidor; esto es para avisar antes. */
export const esCodigoValido = (pin: string): boolean => /^[0-9]{4}$/.test(pin);

/**
 * Códigos que no protegen de nada porque son los primeros que prueba
 * cualquiera. No se prohíben —el candado es de la usuaria— pero se avisa.
 */
const OBVIOS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '1122', '2580', '0123']);

export const esCodigoObvio = (pin: string): boolean => OBVIOS.has(pin);

export const passcode = {
  async estado(): Promise<EstadoPasscode> {
    const { data, error } = await supabase.rpc('passcode_estado');
    if (error) throw error;
    const raw = (data ?? {}) as Crudo;
    return {
      tiene: raw.tiene === true,
      bloqueadoHasta: fecha(raw.bloqueado_hasta),
      restantes: raw.restantes ?? null,
    };
  },

  async verificar(pin: string): Promise<Resultado> {
    const { data, error } = await supabase.rpc('passcode_verificar', { p_pin: pin });
    if (error) throw error;
    return resultado((data ?? {}) as Crudo);
  },

  /** Pone el código. Para cambiarlo hay que escribir el de antes. */
  async guardar(nuevo: string, actual?: string): Promise<Resultado> {
    const { data, error } = await supabase.rpc('passcode_guardar', {
      p_nuevo: nuevo,
      p_actual: actual ?? null,
    });
    if (error) throw error;
    return resultado((data ?? {}) as Crudo);
  },

  async quitar(actual: string): Promise<Resultado> {
    const { data, error } = await supabase.rpc('passcode_quitar', { p_actual: actual });
    if (error) throw error;
    return resultado((data ?? {}) as Crudo);
  },

  /**
   * Para quien ha olvidado el código: se comprueba la CONTRASEÑA DE LA CUENTA
   * contra Supabase Auth —que es la autenticación de verdad— y sólo si ésta
   * la acepta se borra el código. Si la contraseña es incorrecta, Auth lanza
   * el error y aquí no se borra nada.
   */
  async restablecerConContrasena(email: string, contrasena: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: contrasena,
    });
    if (error) throw error;
    const { error: e2 } = await supabase.rpc('passcode_restablecer');
    if (e2) throw e2;
  },
};

/* ───────────────────────── El candado de esta pestaña ────────────────────── */
/*
 * Que la aplicación esté desbloqueada AHORA no es un dato de la base: es del
 * momento. Vive en `sessionStorage`, atado al identificador de la usuaria, y
 * desaparece al cerrar la pestaña. No sustituye a ningún permiso —los permisos
 * son de RLS— y por eso no pasa nada porque se pueda tocar desde el navegador:
 * quien pueda tocarlo ya tenía la sesión.
 */

const LLAVE = 'p360.desbloqueado';

export const marcarDesbloqueado = (userId: string) => {
  try { window.sessionStorage.setItem(LLAVE, userId); } catch { /* modo privado */ }
};

export const estaDesbloqueado = (userId: string): boolean => {
  try { return window.sessionStorage.getItem(LLAVE) === userId; } catch { return false; }
};

export const olvidarDesbloqueo = () => {
  try { window.sessionStorage.removeItem(LLAVE); } catch { /* modo privado */ }
};

/** «2 min 30 s» — para decir cuánto queda de espera sin enseñar una hora. */
export function cuantoQueda(hasta: Date | null): string | null {
  if (!hasta) return null;
  const s = Math.ceil((hasta.getTime() - Date.now()) / 1000);
  if (s <= 0) return null;
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m} min` : `${m} min ${r} s`;
}
