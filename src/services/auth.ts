/**
 * Autenticación y permisos.
 * ---------------------------------------------------------------------------
 * La sesión la gestiona Supabase Auth (correo + contraseña). Los permisos
 * reales viven en las políticas RLS del servidor; lo que hay aquí sirve para
 * que la interfaz no ofrezca acciones que la base de datos va a rechazar.
 */

import { supabase } from './supabase';
import type { Staff, StaffRole } from '@/types';

export const auth = {
  async currentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return data.user;
  },

  /**
   * Alta.
   *
   * `novedades` viaja en los metadatos y no en una actualización posterior
   * del perfil, porque en este instante el perfil TODAVÍA NO EXISTE —y si
   * hace falta confirmar el correo, tampoco hay sesión con la que escribirlo.
   * Lo copia `asegurar_perfil()` al crear la fila. Es el mismo camino que
   * sigue el nombre desde que existe el alta.
   */
  async signUp(email: string, password: string, fullName: string, novedades = false) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim(), marketing_consent: novedades } },
    });
    if (error) throw error;
    return data;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/entrar`,
    });
    if (error) throw error;
  },

  /**
   * La contraseña nueva de quien la ha olvidado.
   * ─────────────────────────────────────────────────────────────────────────
   * AQUÍ NO SE PIDE LA ANTERIOR, Y NO ES UN DESCUIDO: quien llega por este
   * camino es precisamente alguien que no la sabe. Lo que demuestra su
   * identidad es el correo —ha recibido el enlace en su buzón y Supabase ha
   * abierto la sesión con él—, igual que en cualquier recuperación.
   *
   * Está separada de `updatePassword` a propósito. Si fuera la misma función
   * con un argumento opcional, el día que alguien se dejara ese argumento sin
   * poner, la pantalla de ajustes volvería a dejar cambiar la contraseña sin
   * saber la anterior, y nadie se enteraría. Son dos caminos distintos y se
   * llaman distinto.
   */
  async setPasswordAfterRecovery(nueva: string) {
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw error;
  },

  /**
   * Cambia la contraseña, pero sólo después de comprobar la que había.
   * ─────────────────────────────────────────────────────────────────────────
   * ANTES BASTABA CON ESCRIBIR UNA NUEVA. Una sesión abierta en un móvil que
   * anda de mano en mano —que es exactamente el caso de un entrenador en un
   * campo— era todo lo que hacía falta para quedarse con la cuenta del club:
   * cambias la contraseña y quien la tenía ya no entra. Eso también vale para
   * un móvil perdido y para alguien que lo coge dos minutos.
   *
   * La comprobación la hace el servidor, no esta pantalla: `signInWithPassword`
   * con la contraseña actual. Si no es la correcta, Supabase lo rechaza y aquí
   * no se cambia nada. No es un adorno de interfaz que se pueda saltar
   * llamando a la función directamente desde la consola del navegador.
   *
   * Y deja la sesión recién renovada, que es justo lo que se quiere después de
   * tocar la contraseña.
   */
  async updatePassword(nueva: string, actual: string) {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

    const { error: mala } = await supabase.auth.signInWithPassword({
      email,
      password: actual,
    });
    if (mala) throw new Error('La contraseña actual no es correcta.');

    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw error;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  onChange(callback: (userId: string | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  },
};

/* ─────────────────────────────── Permisos ─────────────────────────────────── */
/*
 * Aviso importante: esto NO es el control de acceso. El control de acceso lo
 * aplican las políticas de la base de datos, que miran la pertenencia al club.
 * Lo de aquí sólo sirve para no ofrecer botones que el servidor va a rechazar.
 *
 * Con varios clubes en la plataforma, la autoridad viene de `club_members`
 * (ver `isClubAdmin` en los selectores), no del cargo escrito en el perfil:
 * el cargo es descriptivo y no concede nada.
 */

/** Ver teléfonos y datos de familias de las jugadores. */
export const canSeePersonalData = (staff: Staff | null): boolean =>
  !!staff && ['entrenador', 'segunda-entrenador', 'coordinadora', 'directora-deportiva', 'admin-club']
    .includes(staff.role);

/* LAS ETIQUETAS SON NEUTRAS; LAS CLAVES NO SE TOCAN.
   `segunda-entrenador`, `preparadora-fisica`, `directora-deportiva` y
   `coordinadora` están escritas así en la columna `role` de miles de filas y
   en las políticas de acceso: cambiarlas sería una migración de datos para
   arreglar un texto. Lo que se lee es esto de la derecha.

   Y SE CAMBIAN LAS DOS PALABRAS, no sólo el sustantivo. El barrido de
   lenguaje neutro dejó «Segunda entrenador» y «Preparadora física» a medias:
   un adjetivo en femenino con un sustantivo en masculino se lee peor que el
   femenino entero. */
export const ROLE_LABEL: Record<StaffRole, string> = {
  entrenador: 'Entrenador',
  'segunda-entrenador': 'Segundo entrenador',
  'preparadora-fisica': 'Preparador físico',
  'directora-deportiva': 'Director deportivo',
  coordinadora: 'Coordinador',
  'admin-club': 'Administración del club',
};

export const ASSIGNABLE_ROLES: StaffRole[] = [
  'entrenador',
  'segunda-entrenador',
  'preparadora-fisica',
  'directora-deportiva',
  'coordinadora',
  'admin-club',
];
