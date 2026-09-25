/**
 * Invitaciones al cuerpo técnico.
 * ---------------------------------------------------------------------------
 * El flujo es real: quien administra el club crea la invitación, se comparte el
 * enlace y quien lo recibe la acepta con su cuenta. La aceptación la valida el
 * servidor (correo, caducidad, que no esté ya usada ni revocada), no la
 * interfaz.
 *
 * La plataforma **no envía correos**: entrega el enlace para que lo comparta
 * quien invita. Decir lo contrario sería simular un envío que no ocurre.
 */

import { supabase } from './supabase';

export type ClubRole = 'admin' | 'entrenadora' | 'asistente';

export const CLUB_ROLE_LABEL: Record<ClubRole, string> = {
  admin: 'Administración del club',
  entrenadora: 'Entrenadora',
  asistente: 'Asistente técnico',
};

export interface InvitationPeek {
  found: boolean;
  email?: string;
  role?: ClubRole;
  clubName?: string;
  teamName?: string | null;
  expired?: boolean;
  accepted?: boolean;
  revoked?: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: ClubRole;
  token: string;
  teamId: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

type Row = Record<string, unknown>;

const toInvitation = (r: Row): Invitation => ({
  id: r.id as string,
  email: r.email as string,
  role: r.role as ClubRole,
  token: r.token as string,
  teamId: (r.team_id as string) ?? null,
  expiresAt: r.expires_at as string,
  acceptedAt: (r.accepted_at as string) ?? null,
  revokedAt: (r.revoked_at as string) ?? null,
  createdAt: r.created_at as string,
});

/** El estado en el que está una invitación, para decirlo con palabras. */
export const invitationState = (i: Invitation): 'aceptada' | 'revocada' | 'caducada' | 'pendiente' => {
  if (i.acceptedAt) return 'aceptada';
  if (i.revokedAt) return 'revocada';
  if (new Date(i.expiresAt) < new Date()) return 'caducada';
  return 'pendiente';
};

export const invitationLink = (token: string) =>
  `${window.location.origin}/entrar?invitacion=${token}`;

export const invitations = {
  /** Consulta pública: qué hay detrás de un enlace, sin necesidad de sesión. */
  async peek(token: string): Promise<InvitationPeek> {
    const { data, error } = await supabase.rpc('peek_invitation', { invite_token: token });
    if (error) throw error;
    const raw = (data ?? {}) as Record<string, unknown>;
    return {
      found: !!raw.found,
      email: raw.email as string | undefined,
      role: raw.role as ClubRole | undefined,
      clubName: raw.club_name as string | undefined,
      teamName: (raw.team_name as string) ?? null,
      expired: !!raw.expired,
      accepted: !!raw.accepted,
      revoked: !!raw.revoked,
    };
  },

  /** Acepta la invitación con la sesión abierta. El servidor decide. */
  async accept(token: string): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('accept_invitation', { invite_token: token });
    if (error) throw error;
    const raw = (data ?? {}) as Record<string, unknown>;
    return { ok: !!raw.ok, error: raw.error as string | undefined };
  },

  async listByClub(clubId: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Row[]).map(toInvitation);
  },

  async create(input: {
    clubId: string;
    email: string;
    role: ClubRole;
    teamId?: string | null;
    userId: string;
  }): Promise<Invitation> {
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        club_id: input.clubId,
        email: input.email.trim().toLowerCase(),
        role: input.role,
        team_id: input.teamId ?? null,
        invited_by: input.userId,
      })
      .select()
      .single();
    if (error) throw error;
    return toInvitation(data as Row);
  },

  async revoke(id: string): Promise<void> {
    const { error } = await supabase
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

/** Mensajes claros para cada motivo de rechazo del servidor. */
export const ACCEPT_ERROR: Record<string, string> = {
  sin_sesion: 'Entra con tu cuenta para aceptar la invitación.',
  no_encontrada: 'Ese enlace de invitación no existe.',
  revocada: 'Esta invitación fue anulada por el club.',
  ya_aceptada: 'Esta invitación ya se había aceptado.',
  caducada: 'Esta invitación ha caducado. Pide una nueva al club.',
  correo_distinto:
    'La invitación es para otro correo. Entra con el correo al que se envió o pide una invitación nueva.',
};
