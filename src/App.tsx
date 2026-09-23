import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useClub } from '@/store/store';
import { isCoordinator } from '@/services/auth';
import { Crest } from '@/components/ui/Brand';

// Rutas con carga diferida: la primera pantalla llega antes y cada módulo
// (pizarra, analíticas, constructor de sesiones…) se descarga sólo si se usa.
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
const AvailabilityPage = lazy(() => import('@/features/availability/AvailabilityPage'));
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'));
const SessionsPage = lazy(() => import('@/features/sessions/SessionsPage'));
const SessionDetail = lazy(() => import('@/features/sessions/SessionDetail'));
const SessionBuilder = lazy(() => import('@/features/sessions/SessionBuilder'));
const DrillsPage = lazy(() => import('@/features/drills/DrillsPage'));
const DrillDetail = lazy(() => import('@/features/drills/DrillDetail'));
const DrillEditor = lazy(() => import('@/features/drills/DrillEditor'));
const BoardPage = lazy(() => import('@/features/board/BoardPage'));
const MatchesPage = lazy(() => import('@/features/matches/MatchesPage'));
const MatchDetail = lazy(() => import('@/features/matches/MatchDetail'));
const MatchEditor = lazy(() => import('@/features/matches/MatchEditor'));
const AttendancePage = lazy(() => import('@/features/attendance/AttendancePage'));
const StatsPage = lazy(() => import('@/features/stats/StatsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ProfilePage = lazy(() => import('@/features/settings/ProfilePage'));
const LegalPage = lazy(() => import('@/features/legal/LegalPage'));

/** Pantalla de arranque mientras se comprueba la sesión y se cargan los datos. */
function Booting() {
  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Crest size={52} />
        <div className="h-0.5 w-24 overflow-hidden rounded-full bg-navy-100">
          <div className="skeleton h-full w-full" />
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

/** Administración del club: crear equipos y gestionar el cuerpo técnico. */
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
        <Route path="/aviso-legal" element={<LegalPage />} />
        <Route path="/privacidad" element={<LegalPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />

          <Route path="calendario" element={<CalendarPage />} />

          <Route path="plantilla" element={<PlayersPage />} />
          <Route path="plantilla/nueva" element={<PlayerEditor />} />
          <Route path="plantilla/:playerId" element={<PlayerDetail />} />
          <Route path="plantilla/:playerId/editar" element={<PlayerEditor />} />

          <Route path="disponibilidad" element={<AvailabilityPage />} />

          <Route path="entrenamientos" element={<SessionsPage />} />
          <Route path="entrenamientos/nuevo" element={<SessionBuilder />} />
          <Route path="entrenamientos/:sessionId" element={<SessionDetail />} />
          <Route path="entrenamientos/:sessionId/editar" element={<SessionBuilder />} />
          <Route path="entrenamientos/:sessionId/asistencia" element={<AttendancePage />} />

          <Route path="ejercicios" element={<DrillsPage />} />
          <Route path="ejercicios/nuevo" element={<DrillEditor />} />
          <Route path="ejercicios/:drillId" element={<DrillDetail />} />
          <Route path="ejercicios/:drillId/editar" element={<DrillEditor />} />

          <Route path="pizarra" element={<BoardPage />} />
          <Route path="pizarra/:playId" element={<BoardPage />} />

          <Route path="partidos" element={<MatchesPage />} />
          <Route path="partidos/nuevo" element={<MatchEditor />} />
          <Route path="partidos/:matchId" element={<MatchDetail />} />
          <Route path="partidos/:matchId/editar" element={<MatchEditor />} />

          <Route path="analiticas" element={<StatsPage />} />

          <Route path="equipo-tecnico" element={<TeamsPage />} />
          <Route path="equipo-tecnico/:teamId" element={<TeamDetail />} />
          <Route
            path="equipo-tecnico/nuevo-equipo"
            element={
              <RequireCoordinator>
                <TeamEditor />
              </RequireCoordinator>
            }
          />
          <Route
            path="equipo-tecnico/:teamId/editar"
            element={
              <RequireCoordinator>
                <TeamEditor />
              </RequireCoordinator>
            }
          />
          <Route
            path="equipo-tecnico/club"
            element={
              <RequireCoordinator>
                <ClubAdminPage />
              </RequireCoordinator>
            }
          />

          <Route path="ajustes" element={<SettingsPage />} />
          <Route path="perfil" element={<ProfilePage />} />

          {/* Direcciones anteriores */}
          <Route path="jugadoras/*" element={<Navigate to="/app/plantilla" replace />} />
          <Route path="jugadores/*" element={<Navigate to="/app/plantilla" replace />} />
          <Route path="planificaciones/*" element={<Navigate to="/app/entrenamientos" replace />} />
          <Route path="equipos/*" element={<Navigate to="/app/equipo-tecnico" replace />} />
          <Route path="club" element={<Navigate to="/app/equipo-tecnico/club" replace />} />
          <Route path="asistencia" element={<Navigate to="/app/entrenamientos" replace />} />
          <Route path="estadisticas" element={<Navigate to="/app/analiticas" replace />} />
          <Route path="configuracion" element={<Navigate to="/app/ajustes" replace />} />
          <Route path="mensajes/*" element={<Navigate to="/app" replace />} />
          <Route path="asistente" element={<Navigate to="/app" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
