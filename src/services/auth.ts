/**
 * Autenticación y permisos.
 * ---------------------------------------------------------------------------
 * Sesión simulada sobre el staff del club. La regla de negocio importante —
 * "un entrenador sólo ve los equipos que tiene asignados" — se aplica aquí y
 * en los selectores, no en los componentes.
 */

import type { Permission, Staff } from '@/types';

const SESSION_KEY = 'ffsp-vle:session:v1';

export interface Session {
  staffId: string;
  startedAt: string;
}

export const auth = {
  current(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },

  async signIn(staffId: string): Promise<Session> {
    await new Promise((r) => setTimeout(r, 420));
    const session: Session = { staffId, startedAt: new Date().toISOString() };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* no-op */
    }
    return session;
  },

  signOut(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* no-op */
    }
  },
};

export const can = (staff: Staff | null, permission: Permission): boolean =>
  !!staff && staff.permissions.includes(permission);

export const canSeeTeam = (staff: Staff | null, teamId: string): boolean =>
  !!staff && (staff.permissions.includes('club.admin') || staff.teamIds.includes(teamId));

export const ROLE_LABEL: Record<Staff['role'], string> = {
  entrenador: 'Entrenador',
  'segundo-entrenador': 'Segundo entrenador',
  'preparador-fisico': 'Preparador físico',
  'director-deportivo': 'Director deportivo',
  coordinador: 'Coordinador',
  'admin-club': 'Administrador del club',
};
