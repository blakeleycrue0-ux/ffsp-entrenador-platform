/**
 * Clubes.
 * ---------------------------------------------------------------------------
 * Un club agrupa equipos, plantillas, ejercicios, jugadas y cuerpo técnico.
 * Quién pertenece a cuál lo decide el servidor: aquí sólo se consulta y se
 * pide. Crear un club y quedar como su administración es una sola operación
 * en la base de datos, para que nunca quede un club sin dueña.
 */

import { supabase } from './supabase';
import type { Club } from '@/types';

type Row = Record<string, unknown>;

const toClub = (r: Row, role?: Club['role']): Club => ({
  id: r.id as string,
  name: r.name as string,
  shortName: (r.short_name as string) || (r.name as string),
  city: (r.city as string) ?? undefined,
  season: (r.season as string) ?? undefined,
  crestUrl: (r.crest_url as string) ?? undefined,
  role,
});

export const CREATE_CLUB_ERROR: Record<string, string> = {
  sin_sesion: 'Entra con tu cuenta para crear un club.',
  sin_nombre: 'El club necesita un nombre.',
};

export const clubs = {
  /** Clubes a los que pertenece quien ha iniciado sesión, con su rol. */
  async mine(): Promise<Club[]> {
    const { data, error } = await supabase
      .from('club_members')
      .select('role, clubs(id, name, short_name, city, season, crest_url)')
      .order('created_at', { ascending: true });
    if (error) throw error;

    const out: Club[] = [];
    for (const r of (data ?? []) as Row[]) {
      const c = r.clubs as Row | null;
      if (c) out.push(toClub(c, r.role as Club['role']));
    }
    return out;
  },

  /**
   * Crea el club y añade a quien lo crea como administración, en el servidor.
   * Devuelve el club ya creado o el motivo por el que no se ha podido.
   */
  async create(name: string, shortName?: string): Promise<{ ok: true; club: Club } | { ok: false; error: string }> {
    const { data, error } = await supabase.rpc('create_club', {
      club_name: name.trim(),
      club_short_name: shortName?.trim() || null,
    });
    if (error) throw error;

    const raw = (data ?? {}) as Row;
    if (!raw.ok) {
      const code = (raw.error as string) ?? '';
      return { ok: false, error: CREATE_CLUB_ERROR[code] ?? 'No hemos podido crear el club.' };
    }
    return {
      ok: true,
      club: {
        id: raw.id as string,
        name: raw.name as string,
        shortName: (raw.short_name as string) || (raw.name as string),
        role: 'admin',
      },
    };
  },

  /** Cambiar el nombre, el nombre corto, la ciudad o la temporada. */
  async update(
    id: string,
    patch: Partial<Pick<Club, 'name' | 'shortName' | 'city' | 'season' | 'crestUrl'>>,
  ): Promise<Club> {
    const payload: Row = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) payload.name = patch.name.trim();
    if (patch.shortName !== undefined) payload.short_name = patch.shortName.trim() || patch.name?.trim();
    if (patch.city !== undefined) payload.city = patch.city.trim() || null;
    if (patch.season !== undefined) payload.season = patch.season.trim() || null;
    if (patch.crestUrl !== undefined) payload.crest_url = patch.crestUrl.trim() || null;

    const { data, error } = await supabase.from('clubs').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return toClub(data as Row);
  },

  /** El club al que pertenece un equipo, si lo tiene. */
  async ofTeam(teamId: string): Promise<Club | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('clubs(id, name, short_name, city, season, crest_url)')
      .eq('id', teamId)
      .maybeSingle();
    if (error) throw error;
    const c = (data as Row | null)?.clubs as Row | null | undefined;
    return c ? toClub(c) : null;
  },
};
