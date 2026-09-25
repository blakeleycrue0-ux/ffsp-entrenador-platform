/**
 * Selectores — toda la lógica derivada vive aquí, no en los componentes.
 * El filtrado por permisos ya lo ha hecho el servidor (RLS): lo que llega en
 * `data` es exactamente lo que la usuaria puede ver.
 */

import type {
  AttendanceMark, AttendanceRecord, Callup, ClubData, Match, Player, Staff, Team, TrainingSession,
} from '@/types';
import { normalize, pct, shortDate, toISODate, today } from '@/lib/utils';
import { planEfectivo, type PlanTier } from '@/services/billing';

export const currentStaff = (data: ClubData): Staff | null => data.profile;

/**
 * Nombre del club para los marcadores y las convocatorias. Hasta que exista un
 * club, se dice «Nuestro equipo»: es preferible a inventarse un nombre.
 */
export const clubShortName = (data: ClubData): string =>
  data.club?.shortName || data.club?.name || 'Nuestro equipo';

export const clubName = (data: ClubData): string => data.club?.name || 'Tu club';

/** Puede administrar el club: crear equipos, invitar y cambiar cargos. */
export const isClubAdmin = (data: ClubData): boolean => data.club?.role === 'admin';

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

/**
 * Regla de la casa: el porcentaje de asistencia se calcula **sólo sobre las
 * sesiones en las que la jugadora podía estar y se pasó lista**. Una falta
 * justificada, una lesión o una sesión sin registrar no cuentan como cero: no
 * hay dato, y así se dice. Por eso el porcentaje puede ser `null`.
 */

/** Marcas que entran en el cálculo: estar o no estar pudiendo estar. */
const CUENTAN: AttendanceMark[] = ['presente', 'tarde', 'ausente'];
/** Marcas que se consideran «ha venido». */
const PRESENTES: AttendanceMark[] = ['presente', 'tarde'];

export const summarizeRecord = (record: AttendanceRecord | undefined, squadSize: number) => {
  const marks = Object.values(record?.marks ?? {}).map((m) => m.mark);
  const count = (list: AttendanceMark[]) => marks.filter((m) => list.includes(m)).length;
  const present = count(['presente']);
  const late = count(['tarde']);
  const justified = count(['justificada']);
  const injured = count(['lesionada']);
  const absent = count(['ausente']);
  const registered = present + late + justified + injured + absent;
  const computable = count(CUENTAN);
  return {
    total: squadSize,
    present,
    late,
    justified,
    injured,
    absent,
    /** Jugadoras de las que nadie ha dicho nada todavía. */
    unregistered: Math.max(0, squadSize - registered),
    /** `null` cuando no hay ninguna marca sobre la que calcular. */
    rate: computable === 0 ? null : pct(present + late, computable),
  };
};

/** Asistencia media del equipo. `null` si todavía no hay nada registrado. */
export const teamAttendanceRate = (data: ClubData, teamId: string, lastN = 6): number | null => {
  const records = data.attendance
    .filter((a) => a.teamId === teamId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, lastN);
  let present = 0;
  let computable = 0;
  for (const r of records) {
    for (const entry of Object.values(r.marks)) {
      if (!CUENTAN.includes(entry.mark)) continue;
      computable += 1;
      if (PRESENTES.includes(entry.mark)) present += 1;
    }
  }
  return computable === 0 ? null : pct(present, computable);
};

export interface PlayerAttendance {
  player: Player;
  present: number;
  late: number;
  justified: number;
  injured: number;
  absent: number;
  /** Sesiones sobre las que se ha podido calcular. */
  computable: number;
  /** `null` mientras no haya ninguna sesión que contar. */
  rate: number | null;
  /** Ausencias consecutivas más recientes, sin contar las justificadas. */
  streak: number;
}

export const playerAttendance = (data: ClubData, teamId: string, lastN = 10): PlayerAttendance[] => {
  const records = data.attendance
    .filter((a) => a.teamId === teamId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, lastN);
  return squadOf(data, teamId).map((player) => {
    const marks = records.map((r) => r.marks[player.id]?.mark ?? 'sin_registrar');
    const count = (list: AttendanceMark[]) => marks.filter((m) => list.includes(m)).length;
    const present = count(['presente']);
    const late = count(['tarde']);
    const computable = count(CUENTAN);

    let streak = 0;
    for (const m of marks) {
      if (m === 'ausente') streak += 1;
      else if (m === 'sin_registrar') continue; // una sesión sin lista no rompe la racha
      else break;
    }

    return {
      player,
      present,
      late,
      justified: count(['justificada']),
      injured: count(['lesionada']),
      absent: count(['ausente']),
      computable,
      rate: computable === 0 ? null : pct(present + late, computable),
      streak,
    };
  });
};

export const attendanceTrend = (data: ClubData, teamId: string, weeks = 6) => {
  const records = data.attendance
    .filter((a) => a.teamId === teamId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-weeks);
  const out: { date: string; rate: number }[] = [];
  for (const r of records) {
    const marks = Object.values(r.marks).map((m) => m.mark);
    const computable = marks.filter((m) => CUENTAN.includes(m)).length;
    // Una sesión sin lista no se dibuja: no es un cero, es que no hay dato.
    if (computable === 0) continue;
    out.push({ date: r.date, rate: pct(marks.filter((m) => PRESENTES.includes(m)).length, computable) });
  }
  return out;
};

/* ─────────────────────────────── Panel del equipo ────────────────────────── */

export interface TeamOverview {
  team: Team;
  squadSize: number;
  attendanceRate: number | null;
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

/* ────────────────────────────── Plan del club ─────────────────────────────── */

/**
 * Lo que se enseña aquí es un REFLEJO del plan, para poder avisar antes de
 * intentar guardar. Quien decide de verdad es la base de datos: estas funciones
 * no autorizan nada, sólo evitan que alguien rellene un formulario entero para
 * que el servidor se lo rechace al final.
 */
export const planActual = (data: ClubData): PlanTier => planEfectivo(data.subscription);

/** Equipos que permite su plan. `null` es sin límite. */
export const limiteDeEquipos = (data: ClubData): number | null =>
  data.plans.find((p) => p.tier === planActual(data))?.maxTeams ?? null;

/** ¿Le cabe un equipo más? */
export const cabeOtroEquipo = (data: ClubData): boolean => {
  const limite = limiteDeEquipos(data);
  return limite === null || data.teams.length < limite;
};
