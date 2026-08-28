/**
 * Estado de la aplicación.
 * ---------------------------------------------------------------------------
 * Cada acción hace dos cosas en este orden: escribe en Supabase y, sólo si la
 * escritura ha ido bien, actualiza el estado local. Así la interfaz nunca
 * muestra como guardado algo que la base de datos ha rechazado.
 *
 * Los componentes no importan `supabase` ni `db`: usan `useClub().actions`.
 */

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import type {
  ActivityItem, AttendanceRecord, Callup, ClubData, CoachTask, Drill, Match, MessageThread,
  Player, Staff, Team, TrainingSession,
} from '@/types';
import { EMPTY_CLUB_DATA } from '@/types';
import { db, loadWorkspace } from '@/services/db';
import { auth } from '@/services/auth';
import { humanError } from '@/services/supabase';

/* ────────────────────────────── Estado local ──────────────────────────────── */

type Action =
  | { type: 'hydrate'; data: ClubData }
  | { type: 'reset' }
  | { type: 'team/put'; team: Team }
  | { type: 'team/remove'; id: string }
  | { type: 'teamStaff/put'; teamId: string; profileId: string; role: Staff['role'] }
  | { type: 'teamStaff/remove'; teamId: string; profileId: string }
  | { type: 'player/put'; player: Player }
  | { type: 'player/remove'; id: string }
  | { type: 'drill/put'; drill: Drill }
  | { type: 'drill/remove'; id: string }
  | { type: 'drill/favorite'; id: string; favorite: boolean }
  | { type: 'session/put'; session: TrainingSession }
  | { type: 'session/remove'; id: string }
  | { type: 'match/put'; match: Match }
  | { type: 'match/remove'; id: string }
  | { type: 'callup/put'; callup: Callup }
  | { type: 'attendance/put'; record: AttendanceRecord }
  | { type: 'message/put'; message: MessageThread }
  | { type: 'task/put'; task: CoachTask }
  | { type: 'task/remove'; id: string }
  | { type: 'notification/read'; id: string }
  | { type: 'notification/readAll' }
  | { type: 'activity/put'; item: ActivityItem };

const put = <T extends { id: string }>(list: T[], item: T): T[] => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const copy = [...list];
  copy[i] = item;
  return copy;
};

function reducer(state: ClubData, action: Action): ClubData {
  switch (action.type) {
    case 'hydrate':
      return action.data;
    case 'reset':
      return EMPTY_CLUB_DATA;
    case 'team/put':
      return { ...state, teams: put(state.teams, action.team) };
    case 'team/remove':
      return {
        ...state,
        teams: state.teams.filter((t) => t.id !== action.id),
        teamStaff: state.teamStaff.filter((l) => l.teamId !== action.id),
        players: state.players.filter((p) => p.teamId !== action.id),
      };
    case 'teamStaff/put': {
      const rest = state.teamStaff.filter(
        (l) => !(l.teamId === action.teamId && l.profileId === action.profileId),
      );
      const teamStaff = [...rest, { teamId: action.teamId, profileId: action.profileId, role: action.role }];
      return {
        ...state,
        teamStaff,
        staff: state.staff.map((s) =>
          s.id === action.profileId && !s.teamIds.includes(action.teamId)
            ? { ...s, teamIds: [...s.teamIds, action.teamId] }
            : s,
        ),
        profile:
          state.profile?.id === action.profileId && !state.profile.teamIds.includes(action.teamId)
            ? { ...state.profile, teamIds: [...state.profile.teamIds, action.teamId] }
            : state.profile,
      };
    }
    case 'teamStaff/remove': {
      const strip = (s: Staff) =>
        s.id === action.profileId ? { ...s, teamIds: s.teamIds.filter((t) => t !== action.teamId) } : s;
      return {
        ...state,
        teamStaff: state.teamStaff.filter(
          (l) => !(l.teamId === action.teamId && l.profileId === action.profileId),
        ),
        staff: state.staff.map(strip),
        profile: state.profile ? strip(state.profile) : null,
      };
    }
    case 'player/put':
      return { ...state, players: put(state.players, action.player) };
    case 'player/remove':
      return { ...state, players: state.players.filter((p) => p.id !== action.id) };
    case 'drill/put':
      return { ...state, drills: put(state.drills, action.drill) };
    case 'drill/remove':
      return { ...state, drills: state.drills.filter((d) => d.id !== action.id) };
    case 'drill/favorite':
      return {
        ...state,
        drills: state.drills.map((d) => (d.id === action.id ? { ...d, favorite: action.favorite } : d)),
      };
    case 'session/put':
      return { ...state, sessions: put(state.sessions, action.session) };
    case 'session/remove':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };
    case 'match/put':
      return { ...state, matches: put(state.matches, action.match) };
    case 'match/remove':
      return {
        ...state,
        matches: state.matches.filter((m) => m.id !== action.id),
        callups: state.callups.filter((c) => c.matchId !== action.id),
      };
    case 'callup/put':
      return { ...state, callups: put(state.callups, action.callup) };
    case 'attendance/put':
      return { ...state, attendance: put(state.attendance, action.record) };
    case 'message/put':
      return { ...state, messages: put(state.messages, action.message) };
    case 'task/put':
      return { ...state, tasks: put(state.tasks, action.task) };
    case 'task/remove':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'notification/read':
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      };
    case 'notification/readAll':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case 'activity/put':
      return { ...state, activity: [action.item, ...state.activity].slice(0, 40) };
    default:
      return state;
  }
}

/* ─────────────────────────────── Contexto ─────────────────────────────────── */

export interface ClubActions {
  saveTeam: (team: Team) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;
  assignStaff: (teamId: string, profileId: string, role: Staff['role']) => Promise<void>;
  unassignStaff: (teamId: string, profileId: string) => Promise<void>;
  updateProfile: (id: string, patch: { full_name?: string; phone?: string; licence?: string; role?: Staff['role'] }) => Promise<void>;

  savePlayer: (player: Player) => Promise<Player>;
  deletePlayer: (id: string) => Promise<void>;

  saveDrill: (drill: Drill) => Promise<Drill>;
  deleteDrill: (id: string) => Promise<void>;
  toggleFavorite: (drill: Drill) => Promise<void>;

  saveSession: (session: TrainingSession) => Promise<TrainingSession>;
  deleteSession: (id: string) => Promise<void>;

  saveMatch: (match: Match) => Promise<Match>;
  deleteMatch: (id: string) => Promise<void>;
  saveCallup: (callup: Callup) => Promise<Callup>;

  saveAttendance: (record: AttendanceRecord) => Promise<AttendanceRecord>;
  saveMessage: (message: MessageThread) => Promise<MessageThread>;

  saveTask: (task: CoachTask) => Promise<CoachTask>;
  toggleTask: (task: CoachTask) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  readNotification: (id: string) => Promise<void>;
  readAllNotifications: () => Promise<void>;

  log: (item: Omit<ActivityItem, 'id' | 'at'>) => Promise<void>;
  refresh: () => Promise<void>;
}

interface ClubContextValue {
  data: ClubData;
  loading: boolean;
  /** Error de carga inicial, ya traducido a lenguaje comprensible. */
  loadError: string | null;
  userId: string | null;
  teamId: string;
  setTeamId: (id: string) => void;
  actions: ClubActions;
  signOut: () => Promise<void>;
}

const ClubContext = createContext<ClubContextValue | null>(null);
const TEAM_KEY = 'ffsp:equipo-activo';

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, EMPTY_CLUB_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [teamId, setTeamIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(TEAM_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const uid = useRef<string | null>(null);

  const hydrate = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const workspace = await loadWorkspace(id);
      dispatch({ type: 'hydrate', data: workspace });
    } catch (e) {
      setLoadError(humanError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Sesión de Supabase: al iniciar y en cada cambio (login, logout, refresco).
  useEffect(() => {
    let alive = true;

    auth.currentUserId().then((id) => {
      if (!alive) return;
      uid.current = id;
      setUserId(id);
      if (id) hydrate(id);
      else setLoading(false);
    });

    const unsubscribe = auth.onChange((id) => {
      if (!alive) return;
      if (id === uid.current) return;
      uid.current = id;
      setUserId(id);
      if (id) {
        hydrate(id);
      } else {
        dispatch({ type: 'reset' });
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [hydrate]);

  // El equipo activo siempre debe ser uno visible.
  useEffect(() => {
    if (loading) return;
    const visible = data.teams.map((t) => t.id);
    if (visible.length === 0) {
      if (teamId) setTeamIdState('');
      return;
    }
    if (!visible.includes(teamId)) {
      setTeamIdState(visible[0]);
      try {
        localStorage.setItem(TEAM_KEY, visible[0]);
      } catch {
        /* almacenamiento no disponible */
      }
    }
  }, [data.teams, teamId, loading]);

  const setTeamId = useCallback((id: string) => {
    setTeamIdState(id);
    try {
      localStorage.setItem(TEAM_KEY, id);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const requireUser = useCallback((): string => {
    const id = uid.current;
    if (!id) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');
    return id;
  }, []);

  const actions = useMemo<ClubActions>(
    () => ({
      async saveTeam(team) {
        const saved = await db.saveTeam(team, requireUser());
        dispatch({ type: 'team/put', team: saved });
        return saved;
      },
      async deleteTeam(id) {
        await db.deleteTeam(id);
        dispatch({ type: 'team/remove', id });
      },
      async assignStaff(teamIdArg, profileId, role) {
        await db.assignStaff(teamIdArg, profileId, role);
        dispatch({ type: 'teamStaff/put', teamId: teamIdArg, profileId, role });
      },
      async unassignStaff(teamIdArg, profileId) {
        await db.unassignStaff(teamIdArg, profileId);
        dispatch({ type: 'teamStaff/remove', teamId: teamIdArg, profileId });
      },
      async updateProfile(id, patch) {
        await db.updateProfile(id, patch);
        await hydrate(requireUser());
      },

      async savePlayer(player) {
        const saved = await db.savePlayer(player);
        dispatch({ type: 'player/put', player: saved });
        return saved;
      },
      async deletePlayer(id) {
        await db.deletePlayer(id);
        dispatch({ type: 'player/remove', id });
      },

      async saveDrill(drill) {
        const saved = await db.saveDrill(drill, requireUser());
        dispatch({ type: 'drill/put', drill: { ...saved, favorite: drill.favorite } });
        return saved;
      },
      async deleteDrill(id) {
        await db.deleteDrill(id);
        dispatch({ type: 'drill/remove', id });
      },
      async toggleFavorite(drill) {
        const favorite = !drill.favorite;
        await db.setFavorite(drill.id, requireUser(), favorite);
        dispatch({ type: 'drill/favorite', id: drill.id, favorite });
      },

      async saveSession(session) {
        const saved = await db.saveSession(session, requireUser());
        dispatch({ type: 'session/put', session: saved });
        return saved;
      },
      async deleteSession(id) {
        await db.deleteSession(id);
        dispatch({ type: 'session/remove', id });
      },

      async saveMatch(match) {
        const saved = await db.saveMatch(match, requireUser());
        dispatch({ type: 'match/put', match: saved });
        return saved;
      },
      async deleteMatch(id) {
        await db.deleteMatch(id);
        dispatch({ type: 'match/remove', id });
      },
      async saveCallup(callup) {
        const saved = await db.saveCallup(callup);
        dispatch({ type: 'callup/put', callup: saved });
        return saved;
      },

      async saveAttendance(record) {
        const saved = await db.saveAttendance(record, requireUser());
        dispatch({ type: 'attendance/put', record: saved });
        return saved;
      },
      async saveMessage(message) {
        const saved = await db.saveMessage(message, requireUser());
        dispatch({ type: 'message/put', message: saved });
        return saved;
      },

      async saveTask(task) {
        const saved = await db.saveTask(task, requireUser());
        dispatch({ type: 'task/put', task: saved });
        return saved;
      },
      async toggleTask(task) {
        const next = { ...task, done: !task.done };
        dispatch({ type: 'task/put', task: next }); // respuesta inmediata
        try {
          await db.saveTask(next, requireUser());
        } catch (e) {
          dispatch({ type: 'task/put', task }); // se revierte si falla
          throw e;
        }
      },
      async deleteTask(id) {
        await db.deleteTask(id);
        dispatch({ type: 'task/remove', id });
      },

      async readNotification(id) {
        dispatch({ type: 'notification/read', id });
        await db.markNotificationRead(id);
      },
      async readAllNotifications() {
        dispatch({ type: 'notification/readAll' });
        await db.markAllNotificationsRead(requireUser());
      },

      async log(item) {
        try {
          const saved = await db.logActivity(item, requireUser());
          dispatch({ type: 'activity/put', item: saved });
        } catch {
          // El registro de actividad nunca debe romper la acción principal.
        }
      },

      async refresh() {
        await hydrate(requireUser());
      },
    }),
    [hydrate, requireUser],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    uid.current = null;
    setUserId(null);
    dispatch({ type: 'reset' });
  }, []);

  const value = useMemo<ClubContextValue>(
    () => ({ data, loading, loadError, userId, teamId, setTeamId, actions, signOut }),
    [data, loading, loadError, userId, teamId, setTeamId, actions, signOut],
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub debe usarse dentro de <ClubProvider>');
  return ctx;
}
