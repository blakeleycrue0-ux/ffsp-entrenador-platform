import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarClock, ChevronRight, ClipboardList, MapPin, Send, Sparkles, Swords, Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import {
  attendanceTrend, callupOfMatch, currentStaff, nextMatch, nextSession, playerAttendance,
  squadOf, teamAttendanceRate, upcomingMatches, upcomingSessions, visibleTeams,
} from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { Avatar, Badge, Card, EmptyState, LinkButton, PageHeader, Stat, Tabs } from '@/components/ui';
import { LineTrend, Ring } from '@/components/domain/Charts';
import { AvailabilityDot, AVAILABILITY } from '@/components/domain/StatusBits';
import { cn, longDate, minutesToLabel, relativeDay, shortDate } from '@/lib/utils';

export default function TeamDetail() {
  const { teamId = '' } = useParams();
  const { data, session } = useClub();
  const staff = currentStaff(data, session?.staffId);
  const [tab, setTab] = useState('resumen');

  const teams = visibleTeams(data, staff);
  const team = teams.find((t) => t.id === teamId);

  const squad = useMemo(() => (team ? squadOf(data, team.id) : []), [data, team]);
  const rows = useMemo(() => (team ? playerAttendance(data, team.id) : []), [data, team]);
  const sessions = useMemo(() => (team ? upcomingSessions(data, [team.id]) : []), [data, team]);
  const matches = useMemo(() => (team ? upcomingMatches(data, [team.id]) : []), [data, team]);
  const trend = useMemo(() => (team ? attendanceTrend(data, team.id) : []), [data, team]);

  // Permisos: si el equipo no está asignado al usuario, no se muestra nada.
  if (!team) return <Navigate to="/app/equipos" replace />;

  const ns = nextSession(data, [team.id]);
  const nm = nextMatch(data, [team.id]);
  const callup = callupOfMatch(data, nm?.id);
  const selected = callup?.entries.filter((e) => e.selected) ?? [];
  const confirmed = selected.filter((e) => e.response === 'confirmado').length;
  const pending = selected.filter((e) => e.response === 'pendiente').length;
  const unavailable = squad.filter((p) => !['disponible', 'duda'].includes(p.availability.status));
  const coaches = data.staff.filter((s) => team.staffIds.includes(s.id));

  return (
    <>
      <Link
        to="/app/equipos"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-brand-800"
      >
        <ArrowLeft size={15} /> Mis equipos
      </Link>

      <PageHeader
        eyebrow={
          <>
            <span>{team.competition}</span>
            <span className="text-ink-300">·</span>
            <span>{team.season}</span>
          </>
        }
        title={team.name}
        description={
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-ink-400" /> {team.venue}
          </span>
        }
        actions={
          <>
            <LinkButton to="/app/asistencia" variant="outline" size="sm" icon={<ClipboardList size={15} />}>
              Pasar asistencia
            </LinkButton>
            <LinkButton to="/app/planificaciones/nuevo" size="sm">
              Crear entrenamiento
            </LinkButton>
          </>
        }
      />

      {/* Panel del equipo */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-4 p-5">
          <Ring value={teamAttendanceRate(data, team.id)} size={64} stroke={6} />
          <Stat label="Asistencia media" value={`${teamAttendanceRate(data, team.id)}%`} hint="últimas 6 sesiones" />
        </Card>
        <Card className="p-5">
          <Stat label="Jugadores" value={squad.length} hint={`${unavailable.length} no disponibles`} />
        </Card>
        <Card className="p-5">
          <Stat
            label="Próximo entrenamiento"
            value={ns ? relativeDay(ns.date) : '—'}
            hint={ns ? `${ns.start} · ${ns.venue}` : 'sin planificar'}
          />
        </Card>
        <Card className="p-5">
          <Stat
            label="Convocados"
            value={callup ? `${confirmed} / ${selected.length}` : '—'}
            hint={callup ? `${pending} pendientes de confirmar` : 'sin convocatoria'}
            tone={pending > 0 ? 'warning' : 'success'}
          />
        </Card>
      </div>

      <Tabs
        className="mt-7"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'resumen', label: 'Resumen' },
          { id: 'plantilla', label: 'Plantilla', count: squad.length },
          { id: 'agenda', label: 'Agenda', count: sessions.length + matches.length },
          { id: 'cuerpo', label: 'Cuerpo técnico', count: coaches.length },
        ]}
      />

      <div className="mt-6">
        {tab === 'resumen' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-[15px] font-semibold">Evolución de la asistencia</h3>
              <p className="mt-1 text-[13px] text-ink-500">Porcentaje de presentes en cada sesión registrada.</p>
              <LineTrend points={trend} className="mt-4" />
            </Card>

            <Card className="p-5">
              <h3 className="text-[15px] font-semibold">Enfermería y disponibilidad</h3>
              {unavailable.length === 0 ? (
                <p className="mt-3 text-[13.5px] text-ink-500">Plantilla al completo. Nadie con parte médico abierto.</p>
              ) : (
                <ul className="mt-3.5 space-y-3">
                  {unavailable.map((p) => (
                    <li key={p.id}>
                      <Link to={`/app/jugadores/${p.id}`} className="flex items-start gap-3 group">
                        <Avatar name={p.name} size={34} number={p.number} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-ink-800 group-hover:text-brand-800">
                            {p.shortName}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-500">
                            <AvailabilityDot status={p.availability.status} />
                            {AVAILABILITY[p.availability.status].label}
                            {p.availability.until && ` · vuelve ${shortDate(p.availability.until)}`}
                          </p>
                          {p.availability.note && (
                            <p className="mt-0.5 truncate text-[12px] text-ink-400">{p.availability.note}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold">Jugadores con menor asistencia</h3>
                <Link to="/app/estadisticas" className="text-[12.5px] font-medium text-brand-700 hover:text-brand-800">
                  Ver estadísticas
                </Link>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[...rows]
                  .sort((a, b) => a.rate - b.rate)
                  .slice(0, 6)
                  .map((r) => (
                    <Link
                      key={r.player.id}
                      to={`/app/jugadores/${r.player.id}`}
                      className="flex items-center gap-3 rounded-xl border border-ink-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                    >
                      <Avatar name={r.player.name} size={34} number={r.player.number} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink-800">{r.player.shortName}</p>
                        <p className="text-[12px] text-ink-400">{r.player.position}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-[14px] font-semibold tabular-nums',
                          r.rate >= 85 ? 'text-[#1F6B44]' : r.rate >= 70 ? 'text-[#9A6412]' : 'text-danger',
                        )}
                      >
                        {r.rate}%
                      </span>
                    </Link>
                  ))}
              </div>
            </Card>
          </div>
        )}

        {tab === 'plantilla' && (
          <Card className="overflow-hidden">
            <div className="divide-y divide-ink-100">
              {squad.map((p) => {
                const row = rows.find((r) => r.player.id === p.id);
                return (
                  <Link
                    key={p.id}
                    to={`/app/jugadores/${p.id}`}
                    className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-brand-50/40 sm:px-5"
                  >
                    <Avatar name={p.name} size={38} number={p.number} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink-900">{p.name}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-500">
                        {p.position}
                        {p.secondaryPosition && ` · ${p.secondaryPosition}`}
                      </p>
                    </div>
                    <div className="hidden w-24 text-right sm:block">
                      <p className="text-[13.5px] font-medium text-ink-700 tabular-nums">{row?.rate ?? 0}%</p>
                      <p className="text-[11.5px] text-ink-400">asistencia</p>
                    </div>
                    <div className="hidden w-28 sm:block">
                      <Badge tone={AVAILABILITY[p.availability.status].tone} size="sm" dot>
                        {AVAILABILITY[p.availability.status].label}
                      </Badge>
                    </div>
                    <AvailabilityDot status={p.availability.status} className="sm:hidden" />
                    <ChevronRight size={16} className="shrink-0 text-ink-300" />
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {tab === 'agenda' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-3.5">
                <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
                  <CalendarClock size={16} className="text-brand-600" /> Próximos entrenamientos
                </h3>
              </div>
              {sessions.length === 0 ? (
                <EmptyState
                  compact
                  title="No hay entrenamientos planificados"
                  description="Crea la próxima sesión para este equipo."
                  action={<LinkButton to="/app/planificaciones/nuevo" size="sm">Crear entrenamiento</LinkButton>}
                />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <Link to={`/app/planificaciones/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-50/40">
                        <span className="w-16 shrink-0">
                          <span className="block text-[13px] font-semibold text-brand-700">{relativeDay(s.date)}</span>
                          <span className="block text-[11.5px] text-ink-400">{s.start}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-ink-800">{s.title}</span>
                          <span className="block text-[12px] text-ink-400">
                            {minutesToLabel(s.duration)} · {s.blocks.length} bloques
                          </span>
                        </span>
                        <Badge tone={s.status === 'borrador' ? 'warning' : 'neutral'} size="sm">
                          {s.status}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-3.5">
                <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
                  <Swords size={16} className="text-brand-600" /> Próximos partidos
                </h3>
              </div>
              {matches.length === 0 ? (
                <EmptyState
                  compact
                  title="No hay partidos programados"
                  action={<LinkButton to="/app/partidos/nuevo" size="sm">Crear partido</LinkButton>}
                />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <Link to={`/app/partidos/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-50/40">
                        <span className="w-16 shrink-0">
                          <span className="block text-[13px] font-semibold text-brand-700">{relativeDay(m.date)}</span>
                          <span className="block text-[11.5px] text-ink-400">{m.start}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-ink-800">
                            {m.home ? 'vs' : 'en'} {m.opponent}
                          </span>
                          <span className="block truncate text-[12px] text-ink-400">{m.venue}</span>
                        </span>
                        <Badge tone={m.home ? 'brand' : 'neutral'} size="sm">
                          {m.home ? 'Local' : 'Visitante'}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {nm && callup && (
              <Card className="p-5 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold">
                      Convocatoria · {nm.home ? 'vs' : 'en'} {nm.opponent}
                    </h3>
                    <p className="mt-1 text-[13px] text-ink-500">
                      {longDate(nm.date)} · {nm.start} · citación {callup.meetingTime}
                    </p>
                  </div>
                  <LinkButton to={`/app/partidos/${nm.id}`} size="sm" icon={<Send size={15} />}>
                    Gestionar convocatoria
                  </LinkButton>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="success">{confirmed} confirmados</Badge>
                  <Badge tone="warning">{pending} pendientes</Badge>
                  <Badge tone="danger">{selected.length - confirmed - pending} no pueden</Badge>
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === 'cuerpo' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((c) => (
              <Card key={c.id} className="flex items-start gap-3.5 p-5">
                <Avatar name={c.name} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-medium text-ink-900">{c.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-500">{ROLE_LABEL[c.role]}</p>
                  {c.licence && (
                    <Badge tone="brand" size="sm" className="mt-2">
                      {c.licence}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
            <Card className="grid place-items-center border-dashed p-5">
              <div className="text-center">
                <Users size={22} className="mx-auto text-ink-300" />
                <p className="mt-2 text-[13px] text-ink-500">
                  Los cambios en el cuerpo técnico los gestiona el coordinador del club.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Atajo al asistente con contexto del equipo */}
      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 border-brand-200 bg-brand-50/40 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-700">
            <Sparkles size={18} className="text-white" />
          </span>
          <div>
            <p className="text-[14.5px] font-medium text-ink-900">¿Necesitas preparar algo para el {team.name}?</p>
            <p className="mt-0.5 text-[13px] text-ink-500">
              El asistente conoce las asistencias, las lesiones y las posiciones de esta plantilla.
            </p>
          </div>
        </div>
        <LinkButton to="/app/asistente" size="sm">
          Abrir asistente
        </LinkButton>
      </Card>
    </>
  );
}
