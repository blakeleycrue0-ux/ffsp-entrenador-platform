/**
 * Jugadas de la pizarra táctica.
 * ---------------------------------------------------------------------------
 * Se cargan bajo demanda, no con el resto del espacio de trabajo: una jugada
 * puede pesar bastante y sólo hace falta al abrir la pizarra. Como en el resto
 * de la aplicación, quién puede ver o modificar cada jugada lo decide RLS.
 */

import { supabase } from './supabase';
import { parseScene, type Scene } from '@/features/board/scene';

export interface PlaySummary {
  id: string;
  name: string;
  description: string;
  teamId: string | null;
  durationMs: number;
  updatedAt: string;
  createdBy: string | null;
}

export interface Play extends PlaySummary {
  scene: Scene;
}

type Row = Record<string, unknown>;

const toSummary = (r: Row): PlaySummary => ({
  id: r.id as string,
  name: (r.name as string) ?? 'Jugada sin nombre',
  description: (r.description as string) ?? '',
  teamId: (r.team_id as string) ?? null,
  durationMs: (r.duration_ms as number) ?? 6000,
  updatedAt: (r.updated_at as string) ?? (r.created_at as string),
  createdBy: (r.created_by as string) ?? null,
});

const toPlay = (r: Row): Play => ({ ...toSummary(r), scene: parseScene(r.scene) });

export const plays = {
  async list(): Promise<PlaySummary[]> {
    const { data, error } = await supabase
      .from('plays')
      .select('id,name,description,team_id,duration_ms,updated_at,created_at,created_by')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return ((data ?? []) as Row[]).map(toSummary);
  },

  async get(id: string): Promise<Play | null> {
    const { data, error } = await supabase.from('plays').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPlay(data as Row) : null;
  },

  async save(input: {
    id?: string;
    name: string;
    description?: string;
    teamId?: string | null;
    clubId?: string | null;
    scene: Scene;
    userId: string;
  }): Promise<Play> {
    const payload: Row = {
      name: input.name.trim() || 'Jugada sin nombre',
      description: input.description?.trim() || null,
      team_id: input.teamId ?? null,
      club_id: input.clubId ?? null,
      pitch: input.scene.pitch,
      scene: input.scene,
      duration_ms: input.scene.durationMs,
      created_by: input.userId,
      updated_at: new Date().toISOString(),
    };
    if (input.id) payload.id = input.id;

    const { data, error } = await supabase.from('plays').upsert(payload).select().single();
    if (error) throw error;
    return toPlay(data as Row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('plays').delete().eq('id', id);
    if (error) throw error;
  },
};
