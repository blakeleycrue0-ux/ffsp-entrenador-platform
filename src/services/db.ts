/**
 * Capa de acceso a datos.
 * ---------------------------------------------------------------------------
 * Único punto de la aplicación que habla con la base de datos. Traduce entre
 * el modelo de dominio (camelCase, tipos de `@/types`) y el esquema de
 * PostgreSQL (snake_case). Ningún componente importa `supabase` directamente.
 *
 * La seguridad NO se implementa aquí: la aplican las políticas RLS del
 * servidor. Estas consultas simplemente piden todo lo que el usuario puede
 * ver; la base de datos decide qué devuelve.
 */

import { supabase } from './supabase';
import type {
  ActivityItem, AttendanceRecord, Callup, ClubData, CoachTask, Drill, Match, MessageTemplate,
  MessageThread, Notification, Player, Staff, Team, TeamStaffLink, TrainingSession,
} from '@/types';
import { EMPTY_CLUB_DATA } from '@/types';

/* ─────────────────────────────── Traductores ──────────────────────────────── */

type Row = Record<string, unknown>;

const toStaff = (r: Row, teamIds: string[] = []): Staff => ({
  id: r.id as string,
  name: (r.full_name as string) || (r.email as string) || 'Sin nombre',
  email: (r.email as string) ?? '',
  phone: (r.phone as string) ?? undefined,
  licence: (r.licence as string) ?? undefined,
  role: r.role as Staff['role'],
  avatar: (r.avatar_url as string) ?? undefined,
  teamIds,
  createdAt: r.created_at as string,
});

const toTeam = (r: Row): Team => ({
  id: r.id as string,
  name: r.name as string,
  category: (r.category as string) ?? '',
  season: (r.season as string) ?? '',
  competition: (r.competition as string) ?? '',
  venue: (r.venue as string) ?? '',
  trainingSlots: (r.training_slots as Team['trainingSlots']) ?? [],
  createdBy: (r.created_by as string) ?? undefined,
});

const fromTeam = (t: Team, userId?: string) => ({
  id: t.id || undefined,
  name: t.name,
  category: t.category,
  season: t.season,
  competition: t.competition,
  venue: t.venue,
  training_slots: t.trainingSlots,
  created_by: t.createdBy ?? userId ?? null,
});

const toPlayer = (r: Row): Player => ({
  id: r.id as string,
  teamId: r.team_id as string,
  name: r.name as string,
  shortName: (r.short_name as string) || (r.name as string),
  number: (r.number as number) ?? 0,
  position: (r.position as Player['position']) ?? '',
  secondaryPosition: (r.secondary_position as Player['secondaryPosition']) ?? undefined,
  foot: (r.foot as Player['foot']) ?? 'Diestra',
  birthDate: (r.birth_date as string) ?? undefined,
  phone: (r.phone as string) ?? undefined,
  email: (r.email as string) ?? undefined,
  photo: (r.photo_url as string) ?? undefined,
  guardians: (r.guardians as Player['guardians']) ?? [],
  availability: {
    status: r.availability_status as Player['availability']['status'],
    note: (r.availability_note as string) ?? undefined,
    since: (r.availability_since as string) ?? undefined,
    until: (r.availability_until as string) ?? undefined,
  },
  stats: (r.stats as Player['stats']) ?? { matches: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0 },
  notes: (r.notes as string) ?? undefined,
  joinedAt: (r.joined_at as string) ?? '',
});

const fromPlayer = (p: Player) => ({
  id: p.id || undefined,
  team_id: p.teamId,
  name: p.name,
  short_name: p.shortName,
  number: p.number,
  position: p.position,
  secondary_position: p.secondaryPosition ?? null,
  foot: p.foot,
  birth_date: p.birthDate || null,
  phone: p.phone || null,
  email: p.email || null,
  photo_url: p.photo || null,
  guardians: p.guardians,
  availability_status: p.availability.status,
  availability_note: p.availability.note || null,
  availability_since: p.availability.since || null,
  availability_until: p.availability.until || null,
  stats: p.stats,
  notes: p.notes || null,
  joined_at: p.joinedAt || new Date().toISOString().slice(0, 10),
});

const toDrill = (r: Row, favorites: Set<string>): Drill => ({
  id: r.id as string,
  name: r.name as string,
  objective: (r.objective as string) ?? '',
  tags: (r.tags as Drill['tags']) ?? [],
  ageRange: (r.age_range as string) ?? '',
  players: (r.players_range as string) ?? '',
  duration: (r.duration as number) ?? 15,
  material: (r.material as string[]) ?? [],
  description: (r.description as string) ?? '',
  progressions: (r.progressions as string[]) ?? [],
  tactic: (r.tactic as Drill['tactic']) ?? [],
  favorite: favorites.has(r.id as string),
  createdBy: (r.created_by as string) ?? undefined,
});

const fromDrill = (d: Drill, userId?: string) => ({
  id: d.id || undefined,
  name: d.name,
  objective: d.objective,
  tags: d.tags,
  age_range: d.ageRange,
  players_range: d.players,
  duration: d.duration,
  material: d.material,
  description: d.description,
  progressions: d.progressions,
  tactic: d.tactic,
  created_by: d.createdBy ?? userId ?? null,
});

const toSession = (r: Row): TrainingSession => ({
  id: r.id as string,
  teamId: r.team_id as string,
  title: r.title as string,
  date: r.date as string,
  start: (r.start_time as string) ?? '19:00',
  duration: (r.duration as number) ?? 0,
  venue: (r.venue as string) ?? '',
  objective: (r.objective as string) ?? '',
  expectedPlayers: (r.expected_players as number) ?? 0,
  material: (r.material as string[]) ?? [],
  notes: (r.notes as string) ?? undefined,
  blocks: (r.blocks as TrainingSession['blocks']) ?? [],
  status: r.status as TrainingSession['status'],
  generatedByAI: (r.generated_by_ai as boolean) ?? false,
});

const fromSession = (s: TrainingSession, userId?: string) => ({
  id: s.id || undefined,
  team_id: s.teamId,
  title: s.title,
  date: s.date,
  start_time: s.start,
  duration: s.duration,
  venue: s.venue,
  objective: s.objective,
  expected_players: s.expectedPlayers,
  material: s.material,
  notes: s.notes || null,
  blocks: s.blocks,
  status: s.status,
  generated_by_ai: s.generatedByAI ?? false,
  created_by: userId ?? null,
});

const toMatch = (r: Row): Match => ({
  id: r.id as string,
  teamId: r.team_id as string,
  opponent: r.opponent as string,
  competition: (r.competition as string) ?? '',
  date: r.date as string,
  start: (r.start_time as string) ?? '',
  venue: (r.venue as string) ?? '',
  home: (r.home as boolean) ?? true,
  matchday: (r.matchday as number) ?? undefined,
  status: r.status as Match['status'],
  result:
    r.result_own !== null && r.result_own !== undefined
      ? { own: r.result_own as number, rival: (r.result_rival as number) ?? 0 }
      : undefined,
  formation: (r.formation as string) ?? undefined,
  notes: (r.notes as string) ?? undefined,
});

const fromMatch = (m: Match, userId?: string) => ({
  id: m.id || undefined,
  team_id: m.teamId,
  opponent: m.opponent,
  competition: m.competition,
  date: m.date,
  start_time: m.start,
  venue: m.venue,
  home: m.home,
  matchday: m.matchday ?? null,
  status: m.status,
  result_own: m.result?.own ?? null,
  result_rival: m.result?.rival ?? null,
  formation: m.formation || null,
  notes: m.notes || null,
  created_by: userId ?? null,
});

const toCallup = (r: Row): Callup => ({
  id: r.id as string,
  matchId: r.match_id as string,
  teamId: r.team_id as string,
  slots: (r.slots as number) ?? 16,
  meetingTime: (r.meeting_time as string) ?? '',
  meetingPlace: (r.meeting_place as string) ?? '',
  kit: (r.kit as string) ?? '',
  notes: (r.notes as string) ?? undefined,
  entries: (r.entries as Callup['entries']) ?? [],
  sentAt: (r.sent_at as string) ?? undefined,
  status: r.status as Callup['status'],
});

const fromCallup = (c: Callup) => ({
  id: c.id || undefined,
  match_id: c.matchId,
  team_id: c.teamId,
  slots: c.slots,
  meeting_time: c.meetingTime,
  meeting_place: c.meetingPlace,
  kit: c.kit,
  notes: c.notes || null,
  entries: c.entries,
  status: c.status,
  sent_at: c.sentAt || null,
});

const toAttendance = (r: Row): AttendanceRecord => ({
  id: r.id as string,
  sessionId: r.session_id as string,
  teamId: r.team_id as string,
  date: r.date as string,
  marks: (r.marks as AttendanceRecord['marks']) ?? {},
  savedAt: (r.saved_at as string) ?? undefined,
});

const fromAttendance = (a: AttendanceRecord, userId?: string) => ({
  id: a.id || undefined,
  session_id: a.sessionId,
  team_id: a.teamId,
  date: a.date,
  marks: a.marks,
  saved_at: a.savedAt ?? new Date().toISOString(),
  created_by: userId ?? null,
});

const toMessage = (r: Row): MessageThread => ({
  id: r.id as string,
  channel: (r.channel as MessageThread['channel']) ?? 'whatsapp',
  kind: r.kind as MessageThread['kind'],
  scope: (r.scope as MessageThread['scope']) ?? 'equipo',
  teamId: r.team_id as string,
  playerId: (r.player_id as string) ?? undefined,
  subject: (r.subject as string) ?? '',
  body: (r.body as string) ?? '',
  status: r.status as MessageThread['status'],
  createdAt: r.created_at as string,
  scheduledFor: (r.scheduled_for as string) ?? undefined,
  sentAt: (r.sent_at as string) ?? undefined,
  recipients: (r.recipients as number) ?? 0,
  responses: (r.responses as MessageThread['responses']) ?? undefined,
  simulated: (r.simulated as boolean) ?? true,
});

const fromMessage = (m: MessageThread, userId?: string) => ({
  id: m.id || undefined,
  team_id: m.teamId,
  player_id: m.playerId ?? null,
  channel: m.channel,
  kind: m.kind,
  scope: m.scope,
  subject: m.subject,
  body: m.body,
  status: m.status,
  scheduled_for: m.scheduledFor ?? null,
  sent_at: m.sentAt ?? null,
  recipients: m.recipients,
  responses: m.responses ?? null,
  simulated: m.simulated,
  created_by: userId ?? null,
});

const toTemplate = (r: Row): MessageTemplate => ({
  id: r.id as string,
  kind: r.kind as MessageTemplate['kind'],
  name: r.name as string,
  description: (r.description as string) ?? '',
  body: r.body as string,
  variables: (r.variables as string[]) ?? [],
});

const toTask = (r: Row): CoachTask => ({
  id: r.id as string,
  title: r.title as string,
  detail: (r.detail as string) ?? undefined,
  done: (r.done as boolean) ?? false,
  dueDate: (r.due_date as string) ?? undefined,
  priority: (r.priority as CoachTask['priority']) ?? 'media',
  teamId: (r.team_id as string) ?? undefined,
  link: (r.link as string) ?? undefined,
});

const fromTask = (t: CoachTask, userId: string) => ({
  id: t.id || undefined,
  profile_id: userId,
  team_id: t.teamId ?? null,
  title: t.title,
  detail: t.detail ?? null,
  done: t.done,
  due_date: t.dueDate || null,
  priority: t.priority,
  link: t.link ?? null,
});

const toNotification = (r: Row): Notification => ({
  id: r.id as string,
  icon: (r.icon as Notification['icon']) ?? 'alerta',
  title: r.title as string,
  detail: (r.detail as string) ?? undefined,
  link: (r.link as string) ?? undefined,
  read: (r.read as boolean) ?? false,
  createdAt: r.created_at as string,
});

const toActivity = (r: Row): ActivityItem => ({
  id: r.id as string,
  text: r.text as string,
  at: r.created_at as string,
  teamId: (r.team_id as string) ?? undefined,
  kind: (r.kind as ActivityItem['kind']) ?? 'sesion',
  link: (r.link as string) ?? undefined,
});

/* ──────────────────────────── Carga del espacio ───────────────────────────── */

const unwrap = <T,>(res: { data: T | null; error: unknown }): T => {
  if (res.error) throw res.error;
  return (res.data ?? []) as T;
};

/**
 * Carga todo lo que la usuaria puede ver. RLS se encarga del filtrado: si no
 * tiene equipos asignados, las consultas devuelven listas vacías.
 */
export async function loadWorkspace(userId: string): Promise<ClubData> {
  const [profileRes, staffRes, teamsRes, teamStaffRes, templatesRes, tasksRes, notifsRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('profiles').select('*'),
      supabase.from('teams').select('*').order('name'),
      supabase.from('team_staff').select('*'),
      supabase.from('message_templates').select('*').order('name'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(40),
    ]);

  if (profileRes.error) throw profileRes.error;
  if (teamsRes.error) throw teamsRes.error;

  const teamStaffRows = (teamStaffRes.data ?? []) as Row[];
  const teamStaff: TeamStaffLink[] = teamStaffRows.map((r) => ({
    teamId: r.team_id as string,
    profileId: r.profile_id as string,
    role: r.role as Staff['role'],
  }));

  const teamsFor = (id: string) => teamStaff.filter((l) => l.profileId === id).map((l) => l.teamId);

  const profile = profileRes.data ? toStaff(profileRes.data as Row, teamsFor(userId)) : null;
  const staff = ((staffRes.data ?? []) as Row[]).map((r) => toStaff(r, teamsFor(r.id as string)));
  const teams = ((teamsRes.data ?? []) as Row[]).map(toTeam);
  const teamIds = teams.map((t) => t.id);

  // Sin equipos visibles no hace falta pedir nada más.
  if (teamIds.length === 0) {
    const [drillsRes, favRes] = await Promise.all([
      supabase.from('drills').select('*').order('name'),
      supabase.from('drill_favorites').select('drill_id').eq('profile_id', userId),
    ]);
    const favorites = new Set(((favRes.data ?? []) as Row[]).map((r) => r.drill_id as string));
    return {
      ...EMPTY_CLUB_DATA,
      profile,
      staff,
      teams,
      teamStaff,
      drills: ((drillsRes.data ?? []) as Row[]).map((r) => toDrill(r, favorites)),
      templates: ((templatesRes.data ?? []) as Row[]).map(toTemplate),
      tasks: ((tasksRes.data ?? []) as Row[]).map(toTask),
      notifications: ((notifsRes.data ?? []) as Row[]).map(toNotification),
    };
  }

  const [playersRes, sessionsRes, matchesRes, callupsRes, attendanceRes, messagesRes, activityRes, drillsRes, favRes] =
    await Promise.all([
      supabase.from('players').select('*').in('team_id', teamIds).order('number'),
      supabase.from('sessions').select('*').in('team_id', teamIds).order('date', { ascending: false }),
      supabase.from('matches').select('*').in('team_id', teamIds).order('date', { ascending: false }),
      supabase.from('callups').select('*').in('team_id', teamIds),
      supabase.from('attendance').select('*').in('team_id', teamIds).order('date', { ascending: false }),
      supabase.from('messages').select('*').in('team_id', teamIds).order('created_at', { ascending: false }).limit(100),
      supabase.from('activity').select('*').in('team_id', teamIds).order('created_at', { ascending: false }).limit(40),
      supabase.from('drills').select('*').order('name'),
      supabase.from('drill_favorites').select('drill_id').eq('profile_id', userId),
    ]);

  const favorites = new Set(((favRes.data ?? []) as Row[]).map((r) => r.drill_id as string));

  return {
    ...EMPTY_CLUB_DATA,
    profile,
    staff,
    teams,
    teamStaff,
    players: unwrap<Row[]>(playersRes).map(toPlayer),
    sessions: unwrap<Row[]>(sessionsRes).map(toSession),
    matches: unwrap<Row[]>(matchesRes).map(toMatch),
    callups: unwrap<Row[]>(callupsRes).map(toCallup),
    attendance: unwrap<Row[]>(attendanceRes).map(toAttendance),
    messages: unwrap<Row[]>(messagesRes).map(toMessage),
    activity: unwrap<Row[]>(activityRes).map(toActivity),
    drills: unwrap<Row[]>(drillsRes).map((r) => toDrill(r, favorites)),
    templates: ((templatesRes.data ?? []) as Row[]).map(toTemplate),
    tasks: ((tasksRes.data ?? []) as Row[]).map(toTask),
    notifications: ((notifsRes.data ?? []) as Row[]).map(toNotification),
  };
}

/* ─────────────────────────────── Escrituras ───────────────────────────────── */

const one = async <T,>(promise: PromiseLike<{ data: unknown; error: unknown }>, map: (r: Row) => T): Promise<T> => {
  const { data, error } = await promise;
  if (error) throw error;
  return map(data as Row);
};

export const db = {
  /* Equipos y cuerpo técnico — sólo coordinación (lo impone RLS) */
  saveTeam: (t: Team, userId: string) =>
    one(supabase.from('teams').upsert(fromTeam(t, userId)).select().single(), toTeam),

  deleteTeam: async (id: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  },

  assignStaff: async (teamId: string, profileId: string, role: Staff['role']) => {
    const { error } = await supabase
      .from('team_staff')
      .upsert({ team_id: teamId, profile_id: profileId, role }, { onConflict: 'team_id,profile_id' });
    if (error) throw error;
  },

  unassignStaff: async (teamId: string, profileId: string) => {
    const { error } = await supabase.from('team_staff').delete().eq('team_id', teamId).eq('profile_id', profileId);
    if (error) throw error;
  },

  updateProfile: async (id: string, patch: { full_name?: string; phone?: string; licence?: string; role?: Staff['role'] }) => {
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) throw error;
  },

  /* Jugadoras */
  savePlayer: (p: Player) => one(supabase.from('players').upsert(fromPlayer(p)).select().single(), toPlayer),

  deletePlayer: async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
  },

  /* Ejercicios */
  saveDrill: (d: Drill, userId: string) =>
    one(supabase.from('drills').upsert(fromDrill(d, userId)).select().single(), (r) => toDrill(r, new Set())),

  deleteDrill: async (id: string) => {
    const { error } = await supabase.from('drills').delete().eq('id', id);
    if (error) throw error;
  },

  setFavorite: async (drillId: string, userId: string, favorite: boolean) => {
    const { error } = favorite
      ? await supabase.from('drill_favorites').upsert({ drill_id: drillId, profile_id: userId })
      : await supabase.from('drill_favorites').delete().eq('drill_id', drillId).eq('profile_id', userId);
    if (error) throw error;
  },

  /* Entrenamientos */
  saveSession: (s: TrainingSession, userId: string) =>
    one(supabase.from('sessions').upsert(fromSession(s, userId)).select().single(), toSession),

  deleteSession: async (id: string) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) throw error;
  },

  /* Partidos y convocatorias */
  saveMatch: (m: Match, userId: string) =>
    one(supabase.from('matches').upsert(fromMatch(m, userId)).select().single(), toMatch),

  deleteMatch: async (id: string) => {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) throw error;
  },

  saveCallup: (c: Callup) =>
    one(supabase.from('callups').upsert(fromCallup(c), { onConflict: 'match_id' }).select().single(), toCallup),

  /* Asistencia */
  saveAttendance: (a: AttendanceRecord, userId: string) =>
    one(
      supabase.from('attendance').upsert(fromAttendance(a, userId), { onConflict: 'session_id' }).select().single(),
      toAttendance,
    ),

  /* Mensajes */
  saveMessage: (m: MessageThread, userId: string) =>
    one(supabase.from('messages').upsert(fromMessage(m, userId)).select().single(), toMessage),

  deleteMessage: async (id: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw error;
  },

  /* Tareas */
  saveTask: (t: CoachTask, userId: string) =>
    one(supabase.from('tasks').upsert(fromTask(t, userId)).select().single(), toTask),

  deleteTask: async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },

  /* Avisos */
  markNotificationRead: async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
  },

  markAllNotificationsRead: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('profile_id', userId)
      .eq('read', false);
    if (error) throw error;
  },

  /* Actividad — registro de lo que va ocurriendo en el equipo */
  logActivity: (item: Omit<ActivityItem, 'id' | 'at'>, userId: string) =>
    one(
      supabase
        .from('activity')
        .insert({
          team_id: item.teamId ?? null,
          profile_id: userId,
          kind: item.kind,
          text: item.text,
          link: item.link ?? null,
        })
        .select()
        .single(),
      toActivity,
    ),
};
