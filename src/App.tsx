import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useClub } from '@/store/store';
import { isCoordinator } from '@/services/auth';
import { Crest } from '@/components/ui/Brand';

// Rutas con carga diferida: la primera pantalla llega antes y cada módulo
// (constructor, editor táctico, estadísticas…) se descarga sólo si se usa.
const Landing = lazy(() => import('@/features/landing/Landing'));
const Login = lazy(() => import('@/features/auth/Login'));
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'));
const TeamsPage = lazy(() => import('@/features/teams/TeamsPage'));
const TeamDetail = lazy(() => import('@/features/teams/TeamDetail'));
const TeamEditor = lazy(() => import('@/features/teams/TeamEditor'));
const ClubAdminPage = lazy(() => import('@/features/admin/ClubAdminPage'));
const PlayersPage = lazy(() => import('@/features/players/PlayersPage'));
const PlayerDetail = lazy(() => import('@/features/players/PlayerDetail'));
const PlayerEditor = lazy(() => import('@/features/players/PlayerEditor'));
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'));
const SessionsPage = lazy(() => import('@/features/sessions/SessionsPage'));
const SessionDetail = lazy(() => import('@/features/sessions/SessionDetail'));
const SessionBuilder = lazy(() => import('@/features/sessions/SessionBuilder'));
const DrillsPage = lazy(() => import('@/features/drills/DrillsPage'));
const DrillDetail = lazy(() => import('@/features/drills/DrillDetail'));
const DrillEditor = lazy(() => import('@/features/drills/DrillEditor'));
const MatchesPage = lazy(() => import('@/features/matches/MatchesPage'));
const MatchDetail = lazy(() => import('@/features/matches/MatchDetail'));
const MatchEditor = lazy(() => import('@/features/matches/MatchEditor'));
const AttendancePage = lazy(() => import('@/features/attendance/AttendancePage'));
const MessagesPage = lazy(() => import('@/features/messages/MessagesPage'));
const MessageComposer = lazy(() => import('@/features/messages/MessageComposer'));
const AssistantPage = lazy(() => import('@/features/assistant/AssistantPage'));
const StatsPage = lazy(() => import('@/features/stats/StatsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ProfilePage = lazy(() => import('@/features/settings/ProfilePage'));

/** Pantalla de arranque mientras se comprueba la sesión y se cargan los datos. */
function Booting() {
  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Crest size={64} className="animate-fade-in" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full w-1/2 animate-[sheen_1.2s_infinite] rounded-full bg-brand-500" />
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { userId, loading } = useClub();
  const location = useLocation();
  if (loading && !userId) return <Booting />;
  if (!userId) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** Zona de club: sólo coordinación y dirección deportiva. */
function RequireCoordinator({ children }: { children: React.ReactNode }) {
  const { data, loading } = useClub();
  if (loading) return <Booting />;
  if (!isCoordinator(data.profile)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Booting />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/entrar" element={<Login />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />

          <Route path="equipos" element={<TeamsPage />} />
          <Route
            path="equipos/nuevo"
            element={
              <RequireCoordinator>
                <TeamEditor />
              </RequireCoordinator>
            }
          />
          <Route path="equipos/:teamId" element={<TeamDetail />} />
          <Route
            path="equipos/:teamId/editar"
            element={
              <RequireCoordinator>
                <TeamEditor />
              </RequireCoordinator>
            }
          />

          <Route
            path="club"
            element={
              <RequireCoordinator>
                <ClubAdminPage />
              </RequireCoordinator>
            }
          />

          <Route path="jugadoras" element={<PlayersPage />} />
          <Route path="jugadoras/nueva" element={<PlayerEditor />} />
          <Route path="jugadoras/:playerId" element={<PlayerDetail />} />
          <Route path="jugadoras/:playerId/editar" element={<PlayerEditor />} />

          <Route path="calendario" element={<CalendarPage />} />

          <Route path="planificaciones" element={<SessionsPage />} />
          <Route path="planificaciones/nuevo" element={<SessionBuilder />} />
          <Route path="planificaciones/:sessionId" element={<SessionDetail />} />
          <Route path="planificaciones/:sessionId/editar" element={<SessionBuilder />} />

          <Route path="ejercicios" element={<DrillsPage />} />
          <Route path="ejercicios/nuevo" element={<DrillEditor />} />
          <Route path="ejercicios/:drillId" element={<DrillDetail />} />
          <Route path="ejercicios/:drillId/editar" element={<DrillEditor />} />

          <Route path="partidos" element={<MatchesPage />} />
          <Route path="partidos/nuevo" element={<MatchEditor />} />
          <Route path="partidos/:matchId" element={<MatchDetail />} />
          <Route path="partidos/:matchId/editar" element={<MatchEditor />} />

          <Route path="asistencia" element={<AttendancePage />} />

          <Route path="mensajes" element={<MessagesPage />} />
          <Route path="mensajes/nuevo" element={<MessageComposer />} />

          <Route path="asistente" element={<AssistantPage />} />
          <Route path="estadisticas" element={<StatsPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="perfil" element={<ProfilePage />} />

          {/* Rutas antiguas */}
          <Route path="jugadores" element={<Navigate to="/app/jugadoras" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
