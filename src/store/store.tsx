/**
 * Estado de la aplicación.
 * ---------------------------------------------------------------------------
 * Un único store con reducer tipado. Toda escritura pasa por `dispatch`, y
 * toda escritura persiste a través del repositorio. Los componentes no tocan
 * `localStorage` ni construyen datos derivados: usan `useClub()` y los
 * selectores de `store/selectors.ts`.
 */

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import type {
  ActivityItem, AttendanceRecord, Callup, ClubData, CoachTask, Drill, IntegrationId,
  Match, MessageThread, Player, TrainingSession,
} from '@/types';
import { repository } from '@/services/repository';
import { auth, type Session } from '@/services/auth';
import { uid } from '@/lib/utils';

/* ────────────────────────────────── Acciones ─────────────────────────────── */

type Action =
  | { type: 'hydrate'; data: ClubData }
  | { type: 'session/upsert'; session: TrainingSession }
  | { type: 'session/delete'; id: string }
  | { type: 'drill/upsert'; drill: Drill }
  | { type: 'drill/favorite'; id: string }
  | { type: 'match/upsert'; match: Match }
  | { type: 'callup/upsert'; callup: Callup }
  | { type: 'attendance/upsert'; record: AttendanceRecord }
  | { type: 'player/update'; player: Player }
  | { type: 'message/upsert'; message: MessageThread }
  | { type: 'task/toggle'; id: string }
  | { type: 'task/add'; task: CoachTask }
  | { type: 'task/update'; task: CoachTask }
  | { type: 'task/delete'; id: string }
  | { type: 'notification/read'; id: string }
  | { type: 'notification/readAll' }
  | { type: 'activity/add'; item: ActivityItem }
  | { type: 'integration/toggle'; id: IntegrationId; connected: boolean };

const upsert = <T extends { id: string }>(list: T[], item: T): T[] => {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const copy = [...list];
  copy[idx] = item;
  return copy;
};

function reducer(state: ClubData, action: Action): ClubData {
  switch (action.type) {
    case 'hydrate':
      return action.data;
    case 'session/upsert':
      return { ...state, sessions: upsert(state.sessions, action.session) };
    case 'session/delete':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };
    case 'drill/upsert':
      return { ...state, drills: upsert(state.drills, action.drill) };
    case 'drill/favorite':
      return {
        ...state,
        drills: state.drills.map((d) => (d.id === action.id ? { ...d, favorite: !d.favorite } : d)),
      };
    case 'match/upsert':
      return { ...state, matches: upsert(state.matches, action.match) };
    case 'callup/upsert':
      return { ...state, callups: upsert(state.callups, action.callup) };
    case 'attendance/upsert':
      return { ...state, attendance: upsert(state.attendance, action.record) };
    case 'player/update':
      return { ...state, players: state.players.map((p) => (p.id === action.player.id ? action.player : p)) };
    case 'message/upsert':
      return { ...state, messages: upsert(state.messages, action.message) };
    case 'task/toggle':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) };
    case 'task/add':
      return { ...state, tasks: [action.task, ...state.tasks] };
    case 'task/update':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)) };
    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'notification/read':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)) };
    case 'notification/readAll':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case 'activity/add':
      return { ...state, activity: [action.item, ...state.activity].slice(0, 40) };
    case 'integration/toggle':
      return {
        ...state,
        integrations: state.integrations.map((i) =>
          i.id === action.id ? { ...i, connected: action.connected } : i,
        ),
      };
    default:
      return state;
  }
}

/* ───────────────────────────────── Contexto ──────────────────────────────── */

const EMPTY: ClubData = {
  staff: [], teams: [], players: [], drills: [], sessions: [], matches: [], callups: [],
  attendance: [], messages: [], templates: [], notifications: [], tasks: [], activity: [],
  integrations: [],
};

interface ClubContextValue {
  data: ClubData;
  loading: boolean;
  session: Session | null;
  /** Equipo activo del selector de contexto (persistido). */
  teamId: string;
  setTeamId: (id: string) => void;
  dispatch: React.Dispatch<Action>;
  /** Atajo: registra actividad + persiste. */
  log: (item: Omit<ActivityItem, 'id' | 'at'>) => void;
  signIn: (staffId: string) => Promise<void>;
  signOut: () => void;
  resetDemo: () => Promise<void>;
}

const ClubContext = createContext<ClubContextValue | null>(null);

const TEAM_KEY = 'ffsp-vle:active-team';

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, EMPTY);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(() => auth.current());
  const [teamId, setTeamIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(TEAM_KEY) ?? 't_sub17';
    } catch {
      return 't_sub17';
    }
  });
  const hydrated = useRef(false);

  useEffect(() => {
    let alive = true;
    repository.load().then((d) => {
      if (!alive) return;
      dispatch({ type: 'hydrate', data: d });
      hydrated.current = true;
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persistencia automática tras cada cambio (equivalente al PATCH al backend).
  useEffect(() => {
    if (hydrated.current && data.teams.length) repository.save(data);
  }, [data]);

  const setTeamId = useCallback((id: string) => {
    setTeamIdState(id);
    try {
      localStorage.setItem(TEAM_KEY, id);
    } catch {
      /* no-op */
    }
  }, []);

  const log = useCallback((item: Omit<ActivityItem, 'id' | 'at'>) => {
    dispatch({ type: 'activity/add', item: { ...item, id: uid('ac'), at: new Date().toISOString() } });
  }, []);

  const signIn = useCallback(async (staffId: string) => {
    const s = await auth.signIn(staffId);
    setSession(s);
  }, []);

  const signOut = useCallback(() => {
    auth.signOut();
    setSession(null);
  }, []);

  const resetDemo = useCallback(async () => {
    setLoading(true);
    const fresh = await repository.reset();
    dispatch({ type: 'hydrate', data: fresh });
    setLoading(false);
  }, []);

  const value = useMemo<ClubContextValue>(
    () => ({ data, loading, session, teamId, setTeamId, dispatch, log, signIn, signOut, resetDemo }),
    [data, loading, session, teamId, setTeamId, log, signIn, signOut, resetDemo],
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub debe usarse dentro de <ClubProvider>');
  return ctx;
}
