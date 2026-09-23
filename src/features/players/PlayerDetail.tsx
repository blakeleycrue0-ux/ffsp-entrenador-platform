import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Cake, Footprints, MessageSquare, PencilLine, Phone, Shield, Target, TrendingUp, User,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { playerAttendance, visibleTeams } from '@/store/selectors';
import { canSeePersonalData } from '@/services/auth';
import { Avatar, Tag, Panel, LinkButton, Figure, Tabs } from '@/components/ui';
import { ATTENDANCE, AVAILABILITY } from '@/components/domain/StatusBits';
import { BarTrend, Ring } from '@/components/domain/Charts';
import { age, cn, dayShort, longDate, shortDate } from '@/lib/utils';

export default function PlayerDetail() {
  const { playerId = '' } = useParams();
  const { data } = useClub();
  const [tab, setTab] = useState('asistencia');

  const player = data.players.find((p) => p.id === playerId);
  const allowed = player && visibleTeams(data).some((t) => t.id === player.teamId);

  const records = useMemo(
    () =>
      player
        ? data.attendance
            .filter((a) => a.teamId === player.teamId)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 10)
        : [],
    [data.attendance, player],
  );

  const row = useMemo(
    () => (player ? playerAttendance(data, player.teamId).find((r) => r.player.id === player.id) : undefined),
    [data, player],
  );

  if (!player || !allowed) return <Navigate to="/app/jugadoras" replace />;

  const team = data.teams.find((t) => t.id === player.teamId);
  const canSeeContact = canSeePersonalData(data.profile);

  return (
    <>
      <Link
        to="/app/jugadoras"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted transition-colors hover:text-navy-900"
      >
        <ArrowLeft size={15} /> Jugadoras
      </Link>

      {/* Encabezado de ficha */}
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
          <Avatar name={player.name} size={84} badge={player.number} className="shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] font-semibold leading-tight">{player.name}</h1>
              <Tag tone={AVAILABILITY[player.availability.status].tone} dot>
                {AVAILABILITY[player.availability.status].label}
              </Tag>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-muted">
              <span className="flex items-center gap-1.5">
                <Shield size={14} className="text-navy-400" /> {team?.name}
              </span>
              <span className="flex items-center gap-1.5">
                <Target size={14} className="text-navy-400" /> {player.position}
                {player.secondaryPosition && <span className="text-navy-400">· {player.secondaryPosition}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <Cake size={14} className="text-navy-400" /> {player.birthDate ? `${age(player.birthDate)} años` : 'Edad sin registrar'}
              </span>
              <span className="flex items-center gap-1.5">
                <Footprints size={14} className="text-navy-400" /> {player.foot}
              </span>
            </div>

            {player.availability.note && (
              <div
                className={cn(
                  'mt-4 rounded-xl border px-3.5 py-2.5 text-[13px]',
                  player.availability.status === 'disponible'
                    ? 'border-line bg-navy-50 text-navy-600'
                    : 'border-warn/30 bg-warn/5 text-[#8A5A10]',
                )}
              >
                <strong className="font-medium">{AVAILABILITY[player.availability.status].label}:</strong>{' '}
                {player.availability.note}
                {player.availability.until && ` · retorno estimado ${shortDate(player.availability.until)}`}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton
                to={`/app/jugadoras/${player.id}/editar`}
                size="sm"
                variant="secondary"
                icon={<PencilLine size={15} />}
              >
                Editar ficha
              </LinkButton>
              <Link
                to="/app/mensajes/nuevo"
                state={{ playerId: player.id, teamId: player.teamId }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium text-navy-700 transition-colors hover:border-navy-300 hover:text-navy-900"
              >
                <MessageSquare size={15} /> Enviar mensaje
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 gap-6 border-t border-navy-100 pt-4 sm:border-0 sm:pt-0">
            <Ring value={row?.rate ?? 0} size={78} label="asistencia" />
          </div>
        </div>

        {/* Estadísticas de temporada */}
        <div className="grid grid-cols-3 divide-x divide-navy-100 border-t border-navy-100 sm:grid-cols-6">
          {[
            ['Partidos', player.stats.matches],
            ['Minutos', player.stats.minutes],
            ['Goles', player.stats.goals],
            ['Asistencias', player.stats.assists],
            ['Amarillas', player.stats.yellow],
            ['Rojas', player.stats.red],
          ].map(([label, value]) => (
            <div key={label as string} className="px-4 py-3.5 text-center">
              <p className="text-[18px] font-semibold text-navy-900 tabular-nums">{value as number}</p>
              <p className="mt-0.5 text-[11.5px] text-navy-400">{label as string}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'asistencia', label: 'Asistencia' },
          { id: 'evolucion', label: 'Evolución' },
          { id: 'contacto', label: 'Contacto' },
        ]}
      />

      <div className="mt-6">
        {tab === 'asistencia' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="p-5">
              <Figure label="Asistencia" value={`${row?.rate ?? 0}%`} hint={`${row?.total ?? 0} sesiones registradas`} />
              <div className="mt-4 space-y-2.5">
                {[
                  ['Presente', row?.present ?? 0, 'bg-ok'],
                  ['Justificada', row?.justified ?? 0, 'bg-warn'],
                  ['Ausente', row?.absent ?? 0, 'bg-bad'],
                ].map(([label, n, color]) => (
                  <div key={label as string} className="flex items-center gap-2.5">
                    <span className={cn('h-2 w-2 rounded-full', color as string)} />
                    <span className="flex-1 text-[13.5px] text-navy-600">{label as string}</span>
                    <span className="text-[13.5px] font-medium text-navy-800 tabular-nums">{n as number}</span>
                  </div>
                ))}
              </div>
              {(row?.streak ?? 0) >= 2 && (
                <p className="mt-4 rounded-xl border border-warn/30 bg-warn/5 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#8A5A10]">
                  Acumula {row!.streak} ausencias consecutivas. Puede ser buen momento para hablar con ella o con su
                  familia.
                </p>
              )}
            </Panel>

            <Panel className="p-5 lg:col-span-2">
              <h3 className="text-[15px] font-semibold">Últimos entrenamientos</h3>
              <p className="mt-1 text-[13px] text-muted">Del más reciente al más antiguo.</p>
              <div className="mt-4 space-y-1">
                {records.map((r) => {
                  const mark = r.marks[player.id]?.mark ?? 'pendiente';
                  const m = ATTENDANCE[mark];
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-navy-50">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', m.bg)} />
                      <span className="w-24 shrink-0 text-[13px] font-medium text-navy-700">{shortDate(r.date)}</span>
                      <span className="w-10 shrink-0 text-[12.5px] text-navy-400">{dayShort(r.date)}</span>
                      <span className="flex-1 text-[13px] text-navy-600">{m.label}</span>
                      {r.marks[player.id]?.reason && (
                        <span className="truncate text-[12.5px] text-navy-400">{r.marks[player.id]!.reason}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {tab === 'evolucion' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <TrendingUp size={16} className="text-navy-800" /> Asistencia por sesión
              </h3>
              <p className="mt-1 text-[13px] text-muted">100 % = presente, 50 % = justificada, 0 % = ausente.</p>
              <BarTrend
                className="mt-5"
                data={[...records].reverse().map((r) => {
                  const mark = r.marks[player.id]?.mark ?? 'pendiente';
                  return {
                    label: shortDate(r.date).split(' ')[0],
                    value: mark === 'presente' ? 100 : mark === 'justificada' ? 50 : 0,
                  };
                })}
              />
            </Panel>

            <Panel className="p-5">
              <h3 className="text-[15px] font-semibold">Rendimiento en competición</h3>
              <p className="mt-1 text-[13px] text-muted">Datos acumulados de la temporada {team?.season}.</p>
              <div className="mt-5 space-y-4">
                {[
                  ['Minutos por partido', Math.round(player.stats.minutes / Math.max(1, player.stats.matches)), 90],
                  ['Goles', player.stats.goals, 10],
                  ['Asistencias', player.stats.assists, 10],
                ].map(([label, value, max]) => (
                  <div key={label as string}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13.5px] text-navy-600">{label as string}</span>
                      <span className="text-[15px] font-semibold text-navy-900 tabular-nums">{value as number}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-100">
                      <div
                        className="h-full rounded-full bg-navy-700 transition-[width] duration-500"
                        style={{ width: `${Math.min(100, ((value as number) / (max as number)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[12.5px] leading-relaxed text-navy-400">
                Las métricas se limitan a lo que el club registra de verdad. Evitamos gráficos que no ayuden a decidir.
              </p>
            </Panel>
          </div>
        )}

        {tab === 'contacto' && (
          <Panel className="p-5 sm:p-6">
            {canSeeContact ? (
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="section-title">Datos de la jugadora</p>
                  <dl className="mt-3 space-y-2.5 text-[13.5px]">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Fecha de nacimiento</dt>
                      <dd className="font-medium text-navy-800">{player.birthDate ? longDate(player.birthDate) : '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Dorsal</dt>
                      <dd className="font-medium text-navy-800">{player.number}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Alta en el club</dt>
                      <dd className="font-medium text-navy-800">{player.joinedAt ? shortDate(player.joinedAt) : '—'}</dd>
                    </div>
                    {player.phone && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Teléfono</dt>
                        <dd className="font-medium text-navy-800">{player.phone}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <p className="section-title">Familia / tutores</p>
                  {player.guardians.length === 0 ? (
                    <p className="mt-3 text-[13.5px] text-muted">
                      Jugadora mayor de edad: la comunicación se hace directamente con ella.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {player.guardians.map((g) => (
                        <li key={g.phone} className="rounded-xl border border-line p-3.5">
                          <p className="text-[13.5px] font-medium text-navy-800">{g.name}</p>
                          <p className="mt-0.5 text-[12.5px] text-muted">{g.relation}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-navy-700">
                            <Phone size={13} className="text-navy-400" /> {g.phone}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-[12.5px] leading-relaxed text-navy-400 sm:col-span-2">
                  Estos datos son personales y están sujetos a la política de protección de datos del club. Sólo los ven los
                  perfiles con permiso explícito y nunca aparecen en listados ni exportaciones.
                </p>
              </div>
            ) : (
              <div className="py-8 text-center">
                <User size={26} className="mx-auto text-navy-300" />
                <p className="mt-3 text-[14px] font-medium text-navy-700">Datos de contacto restringidos</p>
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
                  Tu rol no tiene permiso para ver la información personal de las jugadoras ni la de sus familias.
                </p>
              </div>
            )}
          </Panel>
        )}
      </div>

    </>
  );
}
