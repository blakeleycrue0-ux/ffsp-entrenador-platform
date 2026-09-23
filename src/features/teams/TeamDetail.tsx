import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarClock, ChevronRight, ClipboardList, MapPin, Send, Swords, Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import {
  attendanceTrend, callupOfMatch, nextMatch, nextSession, playerAttendance, staffOfTeam,
  squadOf, teamAttendanceRate, upcomingMatches, upcomingSessions, visibleTeams,
} from '@/store/selectors';
import { ROLE_LABEL, isCoordinator } from '@/services/auth';
import { Avatar, Tag, Panel, EmptyState, LinkButton, PageHeader, Figure, Tabs } from '@/components/ui';
import { LineTrend, Ring } from '@/components/domain/Charts';
import { AvailabilityDot, AVAILABILITY } from '@/components/domain/StatusBits';
import { cn, longDate, minutesToLabel, relativeDay, shortDate } from '@/lib/utils';

export default function TeamDetail() {
  const { teamId = '' } = useParams();
  const { data } = useClub();
  const staff = data.profile;
  const [tab, setTab] = useState('resumen');

  const teams = visibleTeams(data);
  const team = teams.find((t) => t.id === teamId);

  const squad = useMemo(() => (team ? squadOf(data, team.id) : []), [data, team]);
  const rows = useMemo(() => (team ? playerAttendance(data, team.id) : []), [data, team]);
  const sessions = useMemo(() => (team ? upcomingSessions(data, [team.id]) : []), [data, team]);
  const matches = useMemo(() => (team ? upcomingMatches(data, [team.id]) : []), [data, team]);
  const trend = useMemo(() => (team ? attendanceTrend(data, team.id) : []), [data, team]);

  // Permisos: si el equipo no está asignado al usuario, no se muestra nada.
  if (!team) return <Navigate to="/app/equipo-tecnico" replace />;

  const ns = nextSession(data, [team.id]);
  const nm = nextMatch(data, [team.id]);
  const callup = callupOfMatch(data, nm?.id);
  const selected = callup?.entries.filter((e) => e.selected) ?? [];
  const confirmed = selected.filter((e) => e.response === 'confirmada').length;
  const pending = selected.filter((e) => e.response === 'pendiente').length;
  const unavailable = squad.filter((p) => !['disponible', 'duda'].includes(p.availability.status));
  const coaches = staffOfTeam(data, team.id);

  return (
    <>
      <Link
        to="/app/equipo-tecnico"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted transition-colors hover:text-navy-900"
      >
        <ArrowLeft size={15} /> Mis equipos
      </Link>

      <PageHeader
        eyebrow={
          <>
            <span>{team.competition}</span>
            <span className="text-navy-300">·</span>
            <span>{team.season}</span>
          </>
        }
        title={team.name}
        description={
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-navy-400" /> {team.venue}
          </span>
        }
        actions={
          <>
            <LinkButton to="/app/entrenamientos" variant="secondary" size="sm" icon={<ClipboardList size={15} />}>
              Pasar asistencia
            </LinkButton>
            {isCoordinator(staff) && (
              <LinkButton to={`/app/equipo-tecnico/${team.id}/editar`} variant="ghost" size="sm">
                Editar equipo
              </LinkButton>
            )}
            <LinkButton to="/app/entrenamientos/nuevo" size="sm">
              Crear entrenamiento
            </LinkButton>
          </>
        }
      />

      {/* Panel del equipo */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="flex items-center gap-4 p-5">
          <Ring value={teamAttendanceRate(data, team.id)} size={64} stroke={6} />
          <Figure label="Asistencia media" value={`${teamAttendanceRate(data, team.id)}%`} hint="últimas 6 sesiones" />
        </Panel>
        <Panel className="p-5">
          <Figure label="Jugadoras" value={squad.length} hint={`${unavailable.length} no disponibles`} />
        </Panel>
        <Panel className="p-5">
          <Figure
            label="Próximo entrenamiento"
            value={ns ? relativeDay(ns.date) : '—'}
            hint={ns ? `${ns.start} · ${ns.venue}` : 'sin planificar'}
          />
        </Panel>
        <Panel className="p-5">
          <Figure
            label="Convocadas"
            value={callup ? `${confirmed} / ${selected.length}` : '—'}
            hint={callup ? `${pending} pendientes de confirmar` : 'sin convocatoria'}
            tone={pending > 0 ? 'warn' : 'ok'}
          />
        </Panel>
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
            <Panel className="p-5 lg:col-span-2">
              <h3 className="text-[15px] font-semibold">Evolución de la asistencia</h3>
              <p className="mt-1 text-[13px] text-muted">Porcentaje de presentes en cada sesión registrada.</p>
              <LineTrend points={trend} className="mt-4" />
            </Panel>

            <Panel className="p-5">
              <h3 className="text-[15px] font-semibold">Enfermería y disponibilidad</h3>
              {unavailable.length === 0 ? (
                <p className="mt-3 text-[13.5px] text-muted">Plantilla al completo. Nadie con parte médico abierto.</p>
              ) : (
                <ul className="mt-3.5 space-y-3">
                  {unavailable.map((p) => (
                    <li key={p.id}>
                      <Link to={`/app/plantilla/${p.id}`} className="flex items-start gap-3 group">
                        <Avatar name={p.name} size={34} badge={p.number} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-navy-800 group-hover:text-navy-900">
                            {p.shortName}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                            <AvailabilityDot status={p.availability.status} />
                            {AVAILABILITY[p.availability.status].label}
                            {p.availability.until && ` · vuelve ${shortDate(p.availability.until)}`}
                          </p>
                          {p.availability.note && (
                            <p className="mt-0.5 truncate text-[12px] text-navy-400">{p.availability.note}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="p-5 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold">Jugadoras con menor asistencia</h3>
                <Link to="/app/analiticas" className="text-[12.5px] font-medium text-navy-900 hover:text-navy-900">
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
                      to={`/app/plantilla/${r.player.id}`}
                      className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-navy-300 hover:bg-navy-50/40"
                    >
                      <Avatar name={r.player.name} size={34} badge={r.player.number} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-navy-800">{r.player.shortName}</p>
                        <p className="text-[12px] text-navy-400">{r.player.position}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-[14px] font-semibold tabular-nums',
                          r.rate >= 85 ? 'text-[#1F6B44]' : r.rate >= 70 ? 'text-[#9A6412]' : 'text-bad',
                        )}
                      >
                        {r.rate}%
                      </span>
                    </Link>
                  ))}
              </div>
            </Panel>
          </div>
        )}

        {tab === 'plantilla' && (
          <Panel className="overflow-hidden">
            <div className="divide-y divide-navy-100">
              {squad.map((p) => {
                const row = rows.find((r) => r.player.id === p.id);
                return (
                  <Link
                    key={p.id}
                    to={`/app/plantilla/${p.id}`}
                    className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-navy-50/40 sm:px-5"
                  >
                    <Avatar name={p.name} size={38} badge={p.number} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-navy-900">{p.name}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {p.position}
                        {p.secondaryPosition && ` · ${p.secondaryPosition}`}
                      </p>
                    </div>
                    <div className="hidden w-24 text-right sm:block">
                      <p className="text-[13.5px] font-medium text-navy-700 tabular-nums">{row?.rate ?? 0}%</p>
                      <p className="text-[11.5px] text-navy-400">asistencia</p>
                    </div>
                    <div className="hidden w-28 sm:block">
                      <Tag tone={AVAILABILITY[p.availability.status].tone} size="sm" dot>
                        {AVAILABILITY[p.availability.status].label}
                      </Tag>
                    </div>
                    <AvailabilityDot status={p.availability.status} className="sm:hidden" />
                    <ChevronRight size={16} className="shrink-0 text-navy-300" />
                  </Link>
                );
              })}
            </div>
          </Panel>
        )}

        {tab === 'agenda' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="overflow-hidden">
              <div className="border-b border-navy-100 px-5 py-3.5">
                <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
                  <CalendarClock size={16} className="text-navy-800" /> Próximos entrenamientos
                </h3>
              </div>
              {sessions.length === 0 ? (
                <EmptyState
                 
                  title="No hay entrenamientos planificados"
                  description="Crea la próxima sesión para este equipo."
                  action={<LinkButton to="/app/entrenamientos/nuevo" size="sm">Crear entrenamiento</LinkButton>}
                />
              ) : (
                <ul className="divide-y divide-navy-100">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <Link to={`/app/entrenamientos/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50/40">
                        <span className="w-16 shrink-0">
                          <span className="block text-[13px] font-semibold text-navy-900">{relativeDay(s.date)}</span>
                          <span className="block text-[11.5px] text-navy-400">{s.start}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-navy-800">{s.title}</span>
                          <span className="block text-[12px] text-navy-400">
                            {minutesToLabel(s.duration)} · {s.blocks.length} bloques
                          </span>
                        </span>
                        <Tag tone={s.status === 'borrador' ? 'warn' : 'neutral'} size="sm">
                          {s.status}
                        </Tag>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="overflow-hidden">
              <div className="border-b border-navy-100 px-5 py-3.5">
                <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
                  <Swords size={16} className="text-navy-800" /> Próximos partidos
                </h3>
              </div>
              {matches.length === 0 ? (
                <EmptyState
                 
                  title="No hay partidos programados"
                  action={<LinkButton to="/app/partidos/nuevo" size="sm">Crear partido</LinkButton>}
                />
              ) : (
                <ul className="divide-y divide-navy-100">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <Link to={`/app/partidos/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50/40">
                        <span className="w-16 shrink-0">
                          <span className="block text-[13px] font-semibold text-navy-900">{relativeDay(m.date)}</span>
                          <span className="block text-[11.5px] text-navy-400">{m.start}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-navy-800">
                            {m.home ? 'vs' : 'en'} {m.opponent}
                          </span>
                          <span className="block truncate text-[12px] text-navy-400">{m.venue}</span>
                        </span>
                        <Tag tone={m.home ? 'solid' : 'neutral'} size="sm">
                          {m.home ? 'Local' : 'Visitante'}
                        </Tag>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {nm && callup && (
              <Panel className="p-5 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold">
                      Convocatoria · {nm.home ? 'vs' : 'en'} {nm.opponent}
                    </h3>
                    <p className="mt-1 text-[13px] text-muted">
                      {longDate(nm.date)} · {nm.start} · citación {callup.meetingTime}
                    </p>
                  </div>
                  <LinkButton to={`/app/partidos/${nm.id}`} size="sm" icon={<Send size={15} />}>
                    Gestionar convocatoria
                  </LinkButton>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag tone="ok">{confirmed} confirmadas</Tag>
                  <Tag tone="warn">{pending} pendientes</Tag>
                  <Tag tone="bad">{selected.length - confirmed - pending} no pueden</Tag>
                </div>
              </Panel>
            )}
          </div>
        )}

        {tab === 'cuerpo' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((c) => (
              <Panel key={c.id} className="flex items-start gap-3.5 p-5">
                <Avatar name={c.name} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-medium text-navy-900">{c.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{ROLE_LABEL[c.role]}</p>
                  {c.licence && (
                    <Tag tone="solid" size="sm" className="mt-2">
                      {c.licence}
                    </Tag>
                  )}
                </div>
              </Panel>
            ))}
            <Panel className="grid place-items-center border-dashed p-5">
              <div className="text-center">
                <Users size={22} className="mx-auto text-navy-300" />
                <p className="mt-2 text-[13px] text-muted">
                  Los cambios en el cuerpo técnico los gestiona la coordinadora del club.
                </p>
              </div>
            </Panel>
          </div>
        )}
      </div>

    </>
  );
}
