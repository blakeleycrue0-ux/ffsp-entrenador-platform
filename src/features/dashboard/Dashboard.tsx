/**
 * Dashboard — el centro de operaciones.
 * Responde de un vistazo: qué tengo hoy, quién viene, qué me falta por hacer.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, Clock, MapPin,
  Plus, Send, Shield, Sparkles, Swords, Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import {
  callupOfMatch, currentStaff, nextMatch, nextSession, squadOf, teamOverview, visibleTeams,
} from '@/store/selectors';
import { isCoordinator } from '@/services/auth';
import { humanError } from '@/services/supabase';
import { useToast } from '@/components/ui/Toast';
import {
  Badge, Button, Card, Checkbox, EmptyState, LinkButton, ProgressBar, SkeletonCard,
} from '@/components/ui';
import { CrestWatermark } from '@/components/ui/Brand';
import { Ring, SplitBar } from '@/components/domain/Charts';
import { CLUB_NAME, cn, daysFromToday, longDate, minutesToLabel, relativeDay, relativeTime, toISODate, today } from '@/lib/utils';
import { CreateMenu } from '@/components/layout/CreateMenu';
import type { CoachTask } from '@/types';

export default function Dashboard() {
  const { data, loading, loadError, teamId, actions } = useClub();
  const navigate = useNavigate();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const staff = currentStaff(data);
  const teams = useMemo(() => visibleTeams(data), [data]);
  const teamIds = teams.map((t) => t.id);

  const overviews = useMemo(() => teams.map((t) => teamOverview(data, t)), [data, teams]);

  // Las cuatro tarjetas principales miran al equipo activo: así el día del
  // entrenador se lee de un tirón. El resto de equipos se ve más abajo.
  const activeTeam = teams.find((t) => t.id === teamId) ?? teams[0];
  const scope = activeTeam ? [activeTeam.id] : teamIds;
  const session0 = nextSession(data, scope);
  const match0 = nextMatch(data, scope);
  const callup = callupOfMatch(data, match0?.id);
  const squad = activeTeam ? squadOf(data, activeTeam.id) : [];
  const lastAttendance = useMemo(
    () =>
      data.attendance
        .filter((a) => a.teamId === activeTeam?.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0],
    [data.attendance, activeTeam],
  );

  const attCounts = useMemo(() => {
    const marks = Object.values(lastAttendance?.marks ?? {});
    return {
      present: marks.filter((m) => m.mark === 'presente').length,
      justified: marks.filter((m) => m.mark === 'justificada').length,
      absent: marks.filter((m) => m.mark === 'ausente').length,
    };
  }, [lastAttendance]);

  const selected = callup?.entries.filter((e) => e.selected) ?? [];
  const confirmed = selected.filter((e) => e.response === 'confirmada').length;
  const pendingCallup = selected.filter((e) => e.response === 'pendiente').length;
  const declined = selected.filter((e) => e.response === 'rechazada').length;

  const openTasks = data.tasks.filter((t) => !t.done);
  const firstName = staff?.name.split(' ')[0] ?? '';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // Error de carga: la base de datos todavía no está preparada o no hay red.
  if (loadError) {
    return (
      <Card className="border-danger/25 bg-danger/5 p-6">
        <h2 className="text-[16px] font-semibold text-[#A63B34]">No hemos podido cargar tus datos</h2>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[#A63B34]/90">{loadError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void actions.refresh()}>
          Reintentar
        </Button>
      </Card>
    );
  }

  // Estado inicial del club: todavía no hay equipos asignados.
  if (teams.length === 0) {
    return (
      <div className="space-y-7">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">
            Hola{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="mt-1.5 text-[14.5px] text-ink-500">{longDate(toISODate(today()))}</p>
        </div>

        <Card>
          <EmptyState
            icon={<Shield size={26} />}
            title={isCoordinator(staff) ? 'Empieza creando el primer equipo' : 'Todavía no tienes ningún equipo asignado'}
            description={
              isCoordinator(staff)
                ? 'Crea los equipos de la temporada y asigna a cada entrenadora el suyo. A partir de ahí, cada una monta su plantilla, sus entrenamientos y sus convocatorias.'
                : 'La coordinadora del club tiene que asignarte tu equipo. En cuanto lo haga, aquí verás tu día completo: entrenamiento, partido, asistencia y convocatoria.'
            }
            action={
              isCoordinator(staff) ? (
                <LinkButton to="/app/equipos/nuevo" size="sm">
                  Crear equipo
                </LinkButton>
              ) : undefined
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Saludo */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">
            Hola{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="mt-1.5 text-[14.5px] text-ink-500">
            Esto es lo que tienes preparado para hoy · {longDate(toISODate(today()))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Sparkles size={16} />} onClick={() => navigate('/app/asistente')}>
            <span className="hidden sm:inline">Preguntar a la IA</span>
            <span className="sm:hidden">IA</span>
          </Button>
          <Button icon={<Plus size={17} strokeWidth={2.3} />} onClick={() => setCreateOpen(true)}>
            Crear
          </Button>
        </div>
      </div>

      {/* Tarjetas principales */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Próximo entrenamiento */}
        {session0 ? (
          <Card className="relative overflow-hidden">
            <CrestWatermark className="-right-6 -top-8 h-40" />
            <div className="relative p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="section-title">Próximo entrenamiento</span>
                <Badge tone={daysFromToday(session0.date) === 0 ? 'brand' : 'neutral'} size="sm">
                  {relativeDay(session0.date)}
                </Badge>
              </div>

              <p className="mt-3 text-[13px] font-medium text-brand-700">
                {data.teams.find((t) => t.id === session0.teamId)?.name}
              </p>
              <h3 className="mt-0.5 text-[19px] font-semibold leading-tight">{session0.title}</h3>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-ink-600">
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-ink-400" />
                  {session0.start} · {minutesToLabel(session0.duration)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-ink-400" />
                  {session0.venue}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={15} className="text-ink-400" />
                  {session0.expectedPlayers} jugadoras
                </span>
              </div>

              {/* Línea de tiempo compacta de los bloques */}
              <div className="mt-4 flex gap-1">
                {session0.blocks.map((b) => (
                  <div
                    key={b.id}
                    title={`${b.title} · ${b.duration}′`}
                    className="h-1.5 rounded-full bg-brand-200 transition-colors hover:bg-brand-500"
                    style={{ flex: b.duration }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[12px] text-ink-400">{session0.blocks.length} bloques · {session0.objective}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <LinkButton to={`/app/planificaciones/${session0.id}`} size="sm">
                  Ver entrenamiento
                </LinkButton>
                <LinkButton to="/app/asistencia" size="sm" variant="outline" icon={<ClipboardList size={15} />}>
                  Pasar asistencia
                </LinkButton>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              compact
              icon={<CalendarClock size={24} />}
              title="No tienes entrenamientos planificados"
              description="Empieza creando tu primera sesión: puedes hacerlo desde cero o pedírsela al asistente."
              action={<LinkButton to="/app/planificaciones/nuevo" size="sm">Crear entrenamiento</LinkButton>}
            />
          </Card>
        )}

        {/* Próximo partido */}
        {match0 ? (
          <Card className="relative overflow-hidden">
            <div className="relative p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="section-title">Próximo partido</span>
                <Badge tone="brand" size="sm">
                  {relativeDay(match0.date)}
                </Badge>
              </div>

              <p className="mt-3 text-[13px] font-medium text-brand-700">
                {data.teams.find((t) => t.id === match0.teamId)?.name} · {match0.competition}
              </p>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex-1 text-right">
                  <p className="text-[16px] font-semibold leading-tight text-ink-900">
                    {match0.home ? CLUB_NAME : match0.opponent}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-400">{match0.home ? 'Local' : 'Visitante'}</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-700">
                  vs
                </span>
                <div className="flex-1">
                  <p className="text-[16px] font-semibold leading-tight text-ink-900">
                    {match0.home ? match0.opponent : CLUB_NAME}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-400">{match0.home ? 'Visitante' : 'Local'}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-ink-600">
                <span className="flex items-center gap-1.5">
                  <CalendarClock size={15} className="text-ink-400" />
                  {longDate(match0.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-ink-400" />
                  {match0.start}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-ink-400" />
                  {match0.venue}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <LinkButton to={`/app/partidos/${match0.id}`} size="sm">
                  Ver partido
                </LinkButton>
                <LinkButton
                  to={`/app/partidos/${match0.id}`}
                  size="sm"
                  variant="outline"
                  icon={<Users size={15} />}
                >
                  {callup ? 'Gestionar convocatoria' : 'Crear convocatoria'}
                </LinkButton>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              compact
              icon={<Swords size={24} />}
              title="No hay partidos programados"
              description="Añade el próximo partido para poder preparar la convocatoria."
              action={<LinkButton to="/app/partidos/nuevo" size="sm">Crear partido</LinkButton>}
            />
          </Card>
        )}

        {/* Asistencia */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="section-title">Asistencia</span>
            <Link to="/app/asistencia" className="text-[12.5px] font-medium text-brand-700 hover:text-brand-800">
              Ver asistencia
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-5">
            <Ring value={overviews.find((o) => o.team.id === activeTeam?.id)?.attendanceRate ?? 0} size={80} label="media" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink-900">{squad.length} jugadoras</p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                {activeTeam?.name} ·{' '}
                {lastAttendance ? `último registro ${relativeDay(lastAttendance.date).toLowerCase()}` : 'sin registros'}
              </p>

              <div className="mt-3 space-y-2">
                <SplitBar
                  segments={[
                    { value: attCounts.present, color: 'bg-pitch', label: 'Presentes' },
                    { value: attCounts.justified, color: 'bg-sun', label: 'Justificados' },
                    { value: attCounts.absent, color: 'bg-danger', label: 'Ausentes' },
                  ]}
                />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                  <span className="flex items-center gap-1.5 text-ink-600">
                    <span className="h-2 w-2 rounded-full bg-pitch" /> {attCounts.present} presentes
                  </span>
                  <span className="flex items-center gap-1.5 text-ink-600">
                    <span className="h-2 w-2 rounded-full bg-sun" /> {attCounts.justified} justificadas
                  </span>
                  <span className="flex items-center gap-1.5 text-ink-600">
                    <span className="h-2 w-2 rounded-full bg-danger" /> {attCounts.absent} ausentes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Convocatoria */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="section-title">Convocatoria</span>
            {match0 && (
              <Link to={`/app/partidos/${match0.id}`} className="text-[12.5px] font-medium text-brand-700 hover:text-brand-800">
                Gestionar
              </Link>
            )}
          </div>

          {callup ? (
            <>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[30px] font-semibold leading-none text-ink-900 tabular-nums">{confirmed}</span>
                <span className="text-[16px] text-ink-400">/ {selected.length} confirmadas</span>
              </div>
              <p className="mt-1 text-[12.5px] text-ink-500">
                {match0?.opponent} · {relativeDay(match0!.date).toLowerCase()} {match0?.start}
              </p>

              <ProgressBar value={(confirmed / (selected.length || 1)) * 100} className="mt-4" height={7} />

              <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                {[
                  { n: confirmed, l: 'Confirmadas', c: 'text-[#1F6B44]' },
                  { n: pendingCallup, l: 'Pendientes', c: 'text-[#9A6412]' },
                  { n: declined, l: 'No pueden', c: 'text-danger' },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl bg-ink-50 py-2.5">
                    <p className={cn('text-[18px] font-semibold leading-none tabular-nums', x.c)}>{x.n}</p>
                    <p className="mt-1 text-[11.5px] text-ink-500">{x.l}</p>
                  </div>
                ))}
              </div>

              {pendingCallup > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  block
                  className="mt-4"
                  icon={<Send size={15} />}
                  onClick={() => navigate(`/app/partidos/${match0!.id}`)}
                >
                  Recordar a los {pendingCallup} pendientes
                </Button>
              )}
            </>
          ) : (
            <EmptyState
              compact
              icon={<Users size={22} />}
              title="Sin convocatoria todavía"
              description="Selecciona a las jugadoras y envíala por WhatsApp en dos pasos."
              action={
                match0 && (
                  <LinkButton to={`/app/partidos/${match0.id}`} size="sm">
                    Crear convocatoria
                  </LinkButton>
                )
              }
            />
          )}
        </Card>
      </div>

      {/* Tareas + actividad */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <span className="section-title">Tareas pendientes</span>
            <span className="text-[12.5px] text-ink-400">{openTasks.length} abiertas</span>
          </div>

          {data.tasks.length === 0 ? (
            <EmptyState compact icon={<CheckCircle2 size={22} />} title="Sin tareas pendientes" description="Todo hecho por hoy." />
          ) : (
            <ul className="mt-3 -mx-1.5 space-y-0.5">
              {[...data.tasks].sort((a, b) => Number(a.done) - Number(b.done)).slice(0, 7).map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={() =>
                    actions.toggleTask(t).catch((e) => toast.error('No hemos podido guardar la tarea', humanError(e)))
                  }
                />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <span className="section-title">Actividad reciente</span>
          </div>
          <ul className="mt-4 space-y-3.5">
            {data.activity.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                <div className="min-w-0 flex-1">
                  {a.link ? (
                    <Link to={a.link} className="text-[13.5px] leading-snug text-ink-700 hover:text-brand-800">
                      {a.text}
                    </Link>
                  ) : (
                    <p className="text-[13.5px] leading-snug text-ink-700">{a.text}</p>
                  )}
                  <p className="mt-0.5 text-[11.5px] text-ink-400">{relativeTime(a.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Mis equipos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Mis equipos</h2>
          <Link to="/app/equipos" className="flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviews.map((o) => (
            <Link key={o.team.id} to={`/app/equipos/${o.team.id}`} className="card card-hover block p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink-900">{o.team.name}</p>
                  <p className="mt-0.5 text-[12px] text-ink-400">{o.squadSize} jugadoras</p>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-700">
                  {o.attendanceRate}%
                </span>
              </div>

              <div className="mt-3.5 space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-400">Entrenamiento</span>
                  <span className="truncate font-medium text-ink-700">
                    {o.nextSession ? `${relativeDay(o.nextSession.date)} ${o.nextSession.start}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-400">Partido</span>
                  <span className="truncate font-medium text-ink-700">
                    {o.nextMatch ? `${relativeDay(o.nextMatch.date)} ${o.nextMatch.start}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-400">Convocatoria</span>
                  <span className="font-medium text-ink-700">
                    {o.callup ? `${o.confirmed} confirmados` : 'Sin crear'}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="flex items-center gap-1.5 text-[12px]">
                  {o.unavailable > 0 ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-sun" />
                      <span className="text-ink-500">{o.unavailable} no disponibles</span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-pitch" />
                      <span className="text-ink-500">Plantilla completa</span>
                    </>
                  )}
                </span>
                <ChevronRight size={15} className="text-ink-300" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: CoachTask; onToggle: () => void }) {
  const overdue = task.dueDate && !task.done && daysFromToday(task.dueDate) < 0;
  return (
    <li>
      <div className="group flex items-start gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-ink-50">
        <span className="mt-0.5">
          <Checkbox checked={task.done} onChange={onToggle} />
        </span>
        <div className="min-w-0 flex-1">
          {task.link && !task.done ? (
            <Link to={task.link} className="block text-[13.5px] leading-snug text-ink-700 hover:text-brand-800">
              {task.title}
            </Link>
          ) : (
            <p className={cn('text-[13.5px] leading-snug', task.done ? 'text-ink-400 line-through' : 'text-ink-700')}>
              {task.title}
            </p>
          )}
          {task.dueDate && !task.done && (
            <p className={cn('mt-0.5 text-[11.5px]', overdue ? 'text-danger' : 'text-ink-400')}>
              {overdue ? 'Vencida · ' : ''}
              {relativeDay(task.dueDate)}
            </p>
          )}
        </div>
        {task.priority === 'alta' && !task.done && (
          <Badge tone="warning" size="sm" className="mt-0.5 shrink-0">
            Alta
          </Badge>
        )}
      </div>
    </li>
  );
}
