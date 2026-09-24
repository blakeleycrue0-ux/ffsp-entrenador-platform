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

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
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

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
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

/** Ver teléfonos y datos de familias de las jugadoras. */
export const canSeePersonalData = (staff: Staff | null): boolean =>
  !!staff && ['entrenadora', 'segunda-entrenadora', 'coordinadora', 'directora-deportiva', 'admin-club']
    .includes(staff.role);

export const ROLE_LABEL: Record<StaffRole, string> = {
  entrenadora: 'Entrenadora',
  'segunda-entrenadora': 'Segunda entrenadora',
  'preparadora-fisica': 'Preparadora física',
  'directora-deportiva': 'Directora deportiva',
  coordinadora: 'Coordinadora',
  'admin-club': 'Administración del club',
};

export const ASSIGNABLE_ROLES: StaffRole[] = [
  'entrenadora',
  'segunda-entrenadora',
  'preparadora-fisica',
  'directora-deportiva',
  'coordinadora',
  'admin-club',
];
