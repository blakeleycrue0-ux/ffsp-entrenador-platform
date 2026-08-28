/**
 * Selectores — toda la lógica derivada vive aquí, no en los componentes.
 * El filtrado por permisos ya lo ha hecho el servidor (RLS): lo que llega en
 * `data` es exactamente lo que la usuaria puede ver.
 */

import type {
  AttendanceRecord, Callup, ClubData, Match, Player, Staff, Team, TrainingSession,
} from '@/types';
import { normalize, pct, shortDate, toISODate, today } from '@/lib/utils';

export const currentStaff = (data: ClubData): Staff | null => data.profile;

/** Equipos visibles. Con RLS activo, `data.teams` ya viene filtrado. */
export const visibleTeams = (data: ClubData): Team[] => data.teams;

export const teamById = (data: ClubData, id: string) => data.teams.find((t) => t.id === id);

export const squadOf = (data: ClubData, teamId: string): Player[] =>
  data.players.filter((p) => p.teamId === teamId).sort((a, b) => a.number - b.number);

export const playerById = (data: ClubData, id: string) => data.players.find((p) => p.id === id);

export const staffOfTeam = (data: ClubData, teamId: string): Staff[] => {
  const ids = data.teamStaff.filter((l) => l.teamId === teamId).map((l) => l.profileId);
  return data.staff.filter((s) => ids.includes(s.id));
};

/* ─────────────────────────────── Próximos eventos ────────────────────────── */

const iso = () => toISODate(today());

export const upcomingSessions = (data: ClubData, teamIds: string[]): TrainingSession[] =>
  data.sessions
    .filter((s) => teamIds.includes(s.teamId) && s.date >= iso())
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

export const nextSession = (data: ClubData, teamIds: string[]) => upcomingSessions(data, teamIds)[0];

export const upcomingMatches = (data: ClubData, teamIds: string[]): Match[] =>
  data.matches
    .filter((m) => teamIds.includes(m.teamId) && m.status === 'programado' && m.date >= iso())
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

export const nextMatch = (data: ClubData, teamIds: string[]) => upcomingMatches(data, teamIds)[0];

export const callupOfMatch = (data: ClubData, matchId?: string): Callup | undefined =>
  matchId ? data.callups.find((c) => c.matchId === matchId) : undefined;

/* ─────────────────────────────────── Asistencia ──────────────────────────── */

export const summarizeRecord = (record: AttendanceRecord | undefined, squadSize: number) => {
  const marks = Object.values(record?.marks ?? {});
  const present = marks.filter((m) => m.mark === 'presente').length;
  const justified = marks.filter((m) => m.mark === 'justificada').length;
  const absent = marks.filter((m) => m.mark === 'ausente').length;
  const counted = present + justified + absent;
  return {
    total: squadSize,
    present,
    justified,
    absent,
    pending: Math.max(0, squadSize - counted),
    rate: pct(present, counted || squadSize),
  };
};

export const teamAttendanceRate = (data: ClubData, teamId: string, lastN = 6): number => {
  const records = data.attendance
    .filter((a) => a.teamId === teamId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, lastN);
  if (!records.length) return 0;
  const totals = records.reduce(
    (acc, r) => {
      const marks = Object.values(r.marks);
      acc.present += marks.filter((m) => m.mark === 'presente').length;
      acc.counted += marks.length;
      return acc;
    },
    { present: 0, counted: 0 },
  );
  return pct(totals.present, totals.counted);
};

export interface PlayerAttendance {
  player: Player;
  present: number;
  justified: number;
  absent: number;
  total: number;
  rate: number;
  /** Ausencias consecutivas más recientes. */
  streak: number;
}

export const playerAttendance = (data: ClubData, teamId: string, lastN = 10): PlayerAttendance[] => {
  const records = data.attendance
    .filter((a) => a.teamId === teamId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, lastN);
  return squadOf(data, teamId).map((player) => {
    const marks = records.map((r) => r.marks[player.id]?.mark ?? 'pendiente');
    const present = marks.filter((m) => m === 'presente').length;
    const justified = marks.filter((m) => m === 'justificada').length;
    const absent = marks.filter((m) => m === 'ausente').length;
    let streak = 0;
    for (const m of marks) {
      if (m === 'ausente') streak++;
      else break;
    }
    const total = present + justified + absent;
    return { player, present, justified, absent, total, rate: pct(present, total || 1), streak };
  });
};

export const attendanceTrend = (data: ClubData, teamId: string, weeks = 6) => {
  const records = data.attendance
    .filter((a) => a.teamId === teamId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-weeks);
  return records.map((r) => {
    const marks = Object.values(r.marks);
    const present = marks.filter((m) => m.mark === 'presente').length;
    return { date: r.date, rate: pct(present, marks.length || 1) };
  });
};

/* ─────────────────────────────── Panel del equipo ────────────────────────── */

export interface TeamOverview {
  team: Team;
  squadSize: number;
  attendanceRate: number;
  nextSession?: TrainingSession;
  nextMatch?: Match;
  callup?: Callup;
  confirmed: number;
  pending: number;
  unavailable: number;
}

export const teamOverview = (data: ClubData, team: Team): TeamOverview => {
  const squad = squadOf(data, team.id);
  const ns = nextSession(data, [team.id]);
  const nm = nextMatch(data, [team.id]);
  const callup = callupOfMatch(data, nm?.id);
  const selected = callup?.entries.filter((e) => e.selected) ?? [];
  return {
    team,
    squadSize: squad.length,
    attendanceRate: teamAttendanceRate(data, team.id),
    nextSession: ns,
    nextMatch: nm,
    callup,
    confirmed: selected.filter((e) => e.response === 'confirmada').length,
    pending: selected.filter((e) => e.response === 'pendiente').length,
    unavailable: squad.filter((p) => !['disponible', 'duda'].includes(p.availability.status)).length,
  };
};

/* ──────────────────────────────── Búsqueda global ────────────────────────── */

export interface SearchHit {
  id: string;
  kind: 'jugadora' | 'equipo' | 'entrenamiento' | 'ejercicio' | 'partido' | 'mensaje';
  title: string;
  subtitle: string;
  meta?: string;
  to: string;
}

export function globalSearch(data: ClubData, query: string): SearchHit[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  const teamName = (id: string) => data.teams.find((t) => t.id === id)?.name ?? '';

  data.players
    .filter((p) => normalize(p.name).includes(q))
    .slice(0, 6)
    .forEach((p) =>
      hits.push({
        id: p.id,
        kind: 'jugadora',
        title: p.name,
        subtitle: `${teamName(p.teamId)}${p.position ? ` · ${p.position}` : ''}`,
        meta: `Dorsal ${p.number}`,
        to: `/app/jugadoras/${p.id}`,
      }),
    );

  data.teams
    .filter((t) => normalize(t.name).includes(q))
    .forEach((t) =>
      hits.push({ id: t.id, kind: 'equipo', title: t.name, subtitle: t.competition || t.category, to: `/app/equipos/${t.id}` }),
    );

  data.sessions
    .filter((s) => normalize(s.title).includes(q) || normalize(s.objective).includes(q))
    .slice(0, 5)
    .forEach((s) =>
      hits.push({
        id: s.id,
        kind: 'entrenamiento',
        title: s.title,
        subtitle: `${teamName(s.teamId)} · ${shortDate(s.date)}`,
        to: `/app/planificaciones/${s.id}`,
      }),
    );

  data.drills
    .filter(
      (d) =>
        normalize(d.name).includes(q) ||
        normalize(d.objective).includes(q) ||
        d.tags.some((t) => normalize(t).includes(q)),
    )
    .slice(0, 5)
    .forEach((d) =>
      hits.push({ id: d.id, kind: 'ejercicio', title: d.name, subtitle: d.tags.join(' · '), meta: `${d.duration}′`, to: `/app/ejercicios/${d.id}` }),
    );

  data.matches
    .filter((m) => normalize(m.opponent).includes(q))
    .slice(0, 5)
    .forEach((m) =>
      hits.push({
        id: m.id,
        kind: 'partido',
        title: `${m.home ? 'vs' : 'en'} ${m.opponent}`,
        subtitle: `${teamName(m.teamId)} · ${shortDate(m.date)}`,
        to: `/app/partidos/${m.id}`,
      }),
    );

  data.messages
    .filter((m) => normalize(m.subject).includes(q))
    .slice(0, 4)
    .forEach((m) => hits.push({ id: m.id, kind: 'mensaje', title: m.subject, subtitle: teamName(m.teamId), to: '/app/mensajes' }));

  return hits;
}
