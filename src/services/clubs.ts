/**
 * Clubes. Un club agrupa equipos, ejercicios, jugadas y al cuerpo técnico.
 * Quien pertenece a un club se resuelve en el servidor; aquí sólo se consulta.
 */

import { supabase } from './supabase';

export interface Club {
  id: string;
  name: string;
  role?: 'admin' | 'entrenadora' | 'asistente';
}

type Row = Record<string, unknown>;

export const clubs = {
  /** Clubes a los que pertenece la usuaria, con su rol en cada uno. */
  async mine(): Promise<Club[]> {
    const { data, error } = await supabase
      .from('club_members')
      .select('role, clubs(id, name)')
      .order('created_at', { ascending: true });
    if (error) throw error;
    const out: Club[] = [];
    for (const r of (data ?? []) as Row[]) {
      const c = r.clubs as Row | null;
      if (c) out.push({ id: c.id as string, name: c.name as string, role: r.role as Club['role'] });
    }
    return out;
  },

  /** El club al que pertenece un equipo, si lo tiene. */
  async ofTeam(teamId: string): Promise<Club | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('clubs(id, name)')
      .eq('id', teamId)
      .maybeSingle();
    if (error) throw error;
    const c = (data as Row | null)?.clubs as Row | null | undefined;
    return c ? { id: c.id as string, name: c.name as string } : null;
  },

  async create(name: string, userId: string): Promise<Club> {
    const { data, error } = await supabase
      .from('clubs')
      .insert({ name: name.trim(), created_by: userId })
      .select('id, name')
      .single();
    if (error) throw error;
    const club = { id: (data as Row).id as string, name: (data as Row).name as string };
    // Quien lo crea queda como administración del club.
    const { error: memberError } = await supabase
      .from('club_members')
      .insert({ club_id: club.id, profile_id: userId, role: 'admin' });
    if (memberError) throw memberError;
    return club;
  },
};
