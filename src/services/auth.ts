/**
 * Autenticación y permisos.
 * ---------------------------------------------------------------------------
 * La sesión la gestiona Supabase Auth (correo + contraseña). Los permisos
 * reales viven en las políticas RLS del servidor; lo que hay aquí sirve para
 * que la interfaz no ofrezca acciones que la base de datos va a rechazar.
 */

import { supabase } from './supabase';
import { COORDINATOR_ROLES, type Staff, type StaffRole } from '@/types';

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

export const isCoordinator = (staff: Staff | null): boolean =>
  !!staff && COORDINATOR_ROLES.includes(staff.role);

/** Un equipo es visible si está asignado o si eres coordinación del club. */
export const canSeeTeam = (staff: Staff | null, teamId: string): boolean =>
  !!staff && (isCoordinator(staff) || staff.teamIds.includes(teamId));

/** Modificar jugadoras, sesiones, partidos y convocatorias del equipo. */
export const canEditTeam = (staff: Staff | null, teamId: string): boolean => canSeeTeam(staff, teamId);

/** Ver teléfonos y datos de familias. */
export const canSeePersonalData = (staff: Staff | null): boolean =>
  !!staff && (isCoordinator(staff) || staff.role === 'entrenadora' || staff.role === 'segunda-entrenadora');

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
