/**
 * Disponibilidad y partes de lesión.
 * ---------------------------------------------------------------------------
 * La plataforma registra lo que el cuerpo técnico anota: fecha, estado,
 * limitaciones y previsión de vuelta. **No emite diagnósticos ni
 * recomendaciones médicas**, ni deduce nada a partir de los datos: eso es
 * competencia del personal sanitario del club.
 */

import { supabase } from './supabase';

export type InjuryState = 'disponible' | 'molestias' | 'lesionada' | 'recuperacion' | 'no_disponible';

export const INJURY_STATE: Record<InjuryState, { label: string; tone: 'ok' | 'warn' | 'bad' | 'info' }> = {
  disponible: { label: 'Disponible', tone: 'ok' },
  molestias: { label: 'Con molestias', tone: 'warn' },
  lesionada: { label: 'Lesionada', tone: 'bad' },
  recuperacion: { label: 'En recuperación', tone: 'info' },
  no_disponible: { label: 'No disponible', tone: 'bad' },
};

export const INJURY_STATES: InjuryState[] = [
  'disponible', 'molestias', 'lesionada', 'recuperacion', 'no_disponible',
];

export interface Injury {
  id: string;
  playerId: string;
  teamId: string;
  state: InjuryState;
  startedOn: string;
  expectedReturn: string | null;
  resolvedOn: string | null;
  description: string;
  restrictions: string;
  createdAt: string;
}

export interface InjuryUpdate {
  id: string;
  injuryId: string;
  notedOn: string;
  note: string;
  state: InjuryState | null;
  createdAt: string;
}

type Row = Record<string, unknown>;

const toInjury = (r: Row): Injury => ({
  id: r.id as string,
  playerId: r.player_id as string,
  teamId: r.team_id as string,
  state: r.state as InjuryState,
  startedOn: r.started_on as string,
  expectedReturn: (r.expected_return as string) ?? null,
  resolvedOn: (r.resolved_on as string) ?? null,
  description: (r.description as string) ?? '',
  restrictions: (r.restrictions as string) ?? '',
  createdAt: r.created_at as string,
});

const toUpdate = (r: Row): InjuryUpdate => ({
  id: r.id as string,
  injuryId: r.injury_id as string,
  notedOn: r.noted_on as string,
  note: (r.note as string) ?? '',
  state: (r.state as InjuryState) ?? null,
  createdAt: r.created_at as string,
});

export const injuries = {
  async listByTeam(teamId: string): Promise<Injury[]> {
    const { data, error } = await supabase
      .from('injuries')
      .select('*')
      .eq('team_id', teamId)
      .order('started_on', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Row[]).map(toInjury);
  },

  async updatesOf(injuryId: string): Promise<InjuryUpdate[]> {
    const { data, error } = await supabase
      .from('injury_updates')
      .select('*')
      .eq('injury_id', injuryId)
      .order('noted_on', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Row[]).map(toUpdate);
  },

  async save(input: Partial<Injury> & { playerId: string; teamId: string; userId: string }): Promise<Injury> {
    const payload: Row = {
      player_id: input.playerId,
      team_id: input.teamId,
      state: input.state ?? 'lesionada',
      started_on: input.startedOn ?? new Date().toISOString().slice(0, 10),
      expected_return: input.expectedReturn || null,
      resolved_on: input.resolvedOn || null,
      description: input.description?.trim() || null,
      restrictions: input.restrictions?.trim() || null,
      created_by: input.userId,
    };
    if (input.id) payload.id = input.id;
    const { data, error } = await supabase.from('injuries').upsert(payload).select().single();
    if (error) throw error;
    return toInjury(data as Row);
  },

  async addUpdate(input: {
    injuryId: string;
    note: string;
    state?: InjuryState | null;
    notedOn?: string;
    userId: string;
  }): Promise<InjuryUpdate> {
    const { data, error } = await supabase
      .from('injury_updates')
      .insert({
        injury_id: input.injuryId,
        note: input.note.trim(),
        state: input.state ?? null,
        noted_on: input.notedOn ?? new Date().toISOString().slice(0, 10),
        created_by: input.userId,
      })
      .select()
      .single();
    if (error) throw error;
    return toUpdate(data as Row);
  },

  async close(id: string, resolvedOn: string): Promise<void> {
    const { error } = await supabase
      .from('injuries')
      .update({ resolved_on: resolvedOn, state: 'disponible' })
      .eq('id', id);
    if (error) throw error;
  },
};
