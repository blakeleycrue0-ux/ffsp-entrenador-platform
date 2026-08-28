import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Cake, Footprints, MessageSquare, Phone, Save, Shield, Target, TrendingUp, User,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, playerAttendance, visibleTeams } from '@/store/selectors';
import { can } from '@/services/auth';
import {
  Avatar, Badge, Button, Card, Field, Input, Modal, Select, Stat, Tabs, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { ATTENDANCE, AVAILABILITY } from '@/components/domain/StatusBits';
import { BarTrend, Ring } from '@/components/domain/Charts';
import { age, cn, dayShort, longDate, shortDate } from '@/lib/utils';
import type { AvailabilityStatus, PlayerPosition } from '@/types';

const POSITIONS: PlayerPosition[] = [
  'Portero', 'Central', 'Lateral derecho', 'Lateral izquierdo', 'Pivote', 'Interior',
  'Mediapunta', 'Extremo derecho', 'Extremo izquierdo', 'Delantero',
];

export default function PlayerDetail() {
  const { playerId = '' } = useParams();
  const { data, session, dispatch, log } = useClub();
  const toast = useToast();
  const staff = currentStaff(data, session?.staffId);
  const [tab, setTab] = useState('asistencia');
  const [editing, setEditing] = useState(false);

  const player = data.players.find((p) => p.id === playerId);
  const allowed = player && visibleTeams(data, staff).some((t) => t.id === player.teamId);

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

  if (!player || !allowed) return <Navigate to="/app/jugadores" replace />;

  const team = data.teams.find((t) => t.id === player.teamId);
  const canEdit = can(staff, 'players.write');
  const canSeeContact = can(staff, 'players.read.sensitive');

  return (
    <>
      <Link
        to="/app/jugadores"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-brand-800"
      >
        <ArrowLeft size={15} /> Jugadores
      </Link>

      {/* Encabezado de ficha */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
          <Avatar name={player.name} size={84} number={player.number} className="shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] font-semibold leading-tight">{player.name}</h1>
              <Badge tone={AVAILABILITY[player.availability.status].tone} dot>
                {AVAILABILITY[player.availability.status].label}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-ink-500">
              <span className="flex items-center gap-1.5">
                <Shield size={14} className="text-ink-400" /> {team?.name}
              </span>
              <span className="flex items-center gap-1.5">
                <Target size={14} className="text-ink-400" /> {player.position}
                {player.secondaryPosition && <span className="text-ink-400">· {player.secondaryPosition}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <Cake size={14} className="text-ink-400" /> {age(player.birthDate)} años
              </span>
              <span className="flex items-center gap-1.5">
                <Footprints size={14} className="text-ink-400" /> {player.foot}
              </span>
            </div>

            {player.availability.note && (
              <div
                className={cn(
                  'mt-4 rounded-xl border px-3.5 py-2.5 text-[13px]',
                  player.availability.status === 'disponible'
                    ? 'border-ink-200 bg-ink-50 text-ink-600'
                    : 'border-sun/30 bg-sun/5 text-[#8A5A10]',
                )}
              >
                <strong className="font-medium">{AVAILABILITY[player.availability.status].label}:</strong>{' '}
                {player.availability.note}
                {player.availability.until && ` · retorno estimado ${shortDate(player.availability.until)}`}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Editar ficha
                </Button>
              )}
              <Link
                to="/app/mensajes/nuevo"
                state={{ playerId: player.id, teamId: player.teamId }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-[13px] font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-800"
              >
                <MessageSquare size={15} /> Enviar mensaje
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 gap-6 border-t border-ink-100 pt-4 sm:border-0 sm:pt-0">
            <Ring value={row?.rate ?? 0} size={78} label="asistencia" />
          </div>
        </div>

        {/* Estadísticas de temporada */}
        <div className="grid grid-cols-3 divide-x divide-ink-100 border-t border-ink-100 sm:grid-cols-6">
          {[
            ['Partidos', player.stats.matches],
            ['Minutos', player.stats.minutes],
            ['Goles', player.stats.goals],
            ['Asistencias', player.stats.assists],
            ['Amarillas', player.stats.yellow],
            ['Rojas', player.stats.red],
          ].map(([label, value]) => (
            <div key={label as string} className="px-4 py-3.5 text-center">
              <p className="text-[18px] font-semibold text-ink-900 tabular-nums">{value as number}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-400">{label as string}</p>
            </div>
          ))}
        </div>
      </Card>

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
            <Card className="p-5">
              <Stat label="Asistencia" value={`${row?.rate ?? 0}%`} hint={`${row?.total ?? 0} sesiones registradas`} />
              <div className="mt-4 space-y-2.5">
                {[
                  ['Presente', row?.present ?? 0, 'bg-pitch'],
                  ['Justificado', row?.justified ?? 0, 'bg-sun'],
                  ['Ausente', row?.absent ?? 0, 'bg-danger'],
                ].map(([label, n, color]) => (
                  <div key={label as string} className="flex items-center gap-2.5">
                    <span className={cn('h-2 w-2 rounded-full', color as string)} />
                    <span className="flex-1 text-[13.5px] text-ink-600">{label as string}</span>
                    <span className="text-[13.5px] font-medium text-ink-800 tabular-nums">{n as number}</span>
                  </div>
                ))}
              </div>
              {(row?.streak ?? 0) >= 2 && (
                <p className="mt-4 rounded-xl border border-sun/30 bg-sun/5 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#8A5A10]">
                  Acumula {row!.streak} ausencias consecutivas. Puede ser buen momento para hablar con él o su familia.
                </p>
              )}
            </Card>

            <Card className="p-5 lg:col-span-2">
              <h3 className="text-[15px] font-semibold">Últimos entrenamientos</h3>
              <p className="mt-1 text-[13px] text-ink-500">Del más reciente al más antiguo.</p>
              <div className="mt-4 space-y-1">
                {records.map((r) => {
                  const mark = r.marks[player.id]?.mark ?? 'pendiente';
                  const m = ATTENDANCE[mark];
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-ink-50">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', m.bg)} />
                      <span className="w-24 shrink-0 text-[13px] font-medium text-ink-700">{shortDate(r.date)}</span>
                      <span className="w-10 shrink-0 text-[12.5px] text-ink-400">{dayShort(r.date)}</span>
                      <span className="flex-1 text-[13px] text-ink-600">{m.label}</span>
                      {r.marks[player.id]?.reason && (
                        <span className="truncate text-[12.5px] text-ink-400">{r.marks[player.id]!.reason}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === 'evolucion' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <TrendingUp size={16} className="text-brand-600" /> Asistencia por sesión
              </h3>
              <p className="mt-1 text-[13px] text-ink-500">100 % = presente, 50 % = justificado, 0 % = ausente.</p>
              <BarTrend
                className="mt-5"
                data={[...records].reverse().map((r) => {
                  const mark = r.marks[player.id]?.mark ?? 'pendiente';
                  return {
                    label: shortDate(r.date).split(' ')[0],
                    value: mark === 'presente' ? 100 : mark === 'justificado' ? 50 : 0,
                  };
                })}
              />
            </Card>

            <Card className="p-5">
              <h3 className="text-[15px] font-semibold">Rendimiento en competición</h3>
              <p className="mt-1 text-[13px] text-ink-500">Datos acumulados de la temporada {team?.season}.</p>
              <div className="mt-5 space-y-4">
                {[
                  ['Minutos por partido', Math.round(player.stats.minutes / Math.max(1, player.stats.matches)), 90],
                  ['Goles', player.stats.goals, 10],
                  ['Asistencias', player.stats.assists, 10],
                ].map(([label, value, max]) => (
                  <div key={label as string}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13.5px] text-ink-600">{label as string}</span>
                      <span className="text-[15px] font-semibold text-ink-900 tabular-nums">{value as number}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
                        style={{ width: `${Math.min(100, ((value as number) / (max as number)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[12.5px] leading-relaxed text-ink-400">
                Las métricas se limitan a lo que el club registra de verdad. Evitamos gráficos que no ayuden a decidir.
              </p>
            </Card>
          </div>
        )}

        {tab === 'contacto' && (
          <Card className="p-5 sm:p-6">
            {canSeeContact ? (
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="section-title">Datos del jugador</p>
                  <dl className="mt-3 space-y-2.5 text-[13.5px]">
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-500">Fecha de nacimiento</dt>
                      <dd className="font-medium text-ink-800">{longDate(player.birthDate)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-500">Dorsal</dt>
                      <dd className="font-medium text-ink-800">{player.number}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-500">Alta en el club</dt>
                      <dd className="font-medium text-ink-800">{shortDate(player.joinedAt)}</dd>
                    </div>
                    {player.phone && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-500">Teléfono</dt>
                        <dd className="font-medium text-ink-800">{player.phone}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <p className="section-title">Familia / tutores</p>
                  {player.guardians.length === 0 ? (
                    <p className="mt-3 text-[13.5px] text-ink-500">
                      Jugador mayor de edad: la comunicación se hace directamente con él.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {player.guardians.map((g) => (
                        <li key={g.phone} className="rounded-xl border border-ink-200 p-3.5">
                          <p className="text-[13.5px] font-medium text-ink-800">{g.name}</p>
                          <p className="mt-0.5 text-[12.5px] text-ink-500">{g.relation}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-700">
                            <Phone size={13} className="text-ink-400" /> {g.phone}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-[12.5px] leading-relaxed text-ink-400 sm:col-span-2">
                  Estos datos son personales y están sujetos a la política de protección de datos del club. Se muestran
                  únicamente a los perfiles con permiso explícito.
                </p>
              </div>
            ) : (
              <div className="py-8 text-center">
                <User size={26} className="mx-auto text-ink-300" />
                <p className="mt-3 text-[14px] font-medium text-ink-700">Datos de contacto restringidos</p>
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">
                  Tu rol no tiene permiso para ver la información personal de los jugadores ni la de sus familias.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Edición de ficha */}
      <EditPlayerModal
        open={editing}
        onClose={() => setEditing(false)}
        player={player}
        onSave={(updated) => {
          dispatch({ type: 'player/update', player: updated });
          log({ kind: 'jugador', text: `Has actualizado la ficha de ${updated.shortName}.`, link: `/app/jugadores/${updated.id}` });
          toast.success('Ficha actualizada correctamente');
          setEditing(false);
        }}
      />
    </>
  );
}

function EditPlayerModal({
  open, onClose, player, onSave,
}: {
  open: boolean;
  onClose: () => void;
  player: NonNullable<ReturnType<typeof useClub>['data']['players'][number]>;
  onSave: (p: typeof player) => void;
}) {
  const [form, setForm] = useState(player);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Editar ficha · ${player.shortName}`}
      subtitle="Los cambios afectan a convocatorias, asistencia y a lo que ve el asistente."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={<Save size={16} />} onClick={() => onSave(form)}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dorsal">
          <Input
            type="number"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
          />
        </Field>
        <Field label="Pie dominante">
          <Select value={form.foot} onChange={(e) => setForm({ ...form, foot: e.target.value as typeof form.foot })}>
            <option>Diestro</option>
            <option>Zurdo</option>
            <option>Ambidiestro</option>
          </Select>
        </Field>
        <Field label="Posición principal">
          <Select
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value as PlayerPosition })}
          >
            {POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Posición secundaria">
          <Select
            value={form.secondaryPosition ?? ''}
            onChange={(e) =>
              setForm({ ...form, secondaryPosition: (e.target.value || undefined) as PlayerPosition | undefined })
            }
          >
            <option value="">Sin posición secundaria</option>
            {POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>

        <Field label="Disponibilidad" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(AVAILABILITY) as AvailabilityStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setForm({ ...form, availability: { ...form.availability, status: s } })}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-[13.5px] font-medium transition-all',
                  form.availability.status === s
                    ? 'border-brand-400 bg-brand-50 text-brand-800 ring-2 ring-brand-100'
                    : 'border-ink-200 text-ink-600 hover:border-brand-200',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', AVAILABILITY[s].dot)} />
                {AVAILABILITY[s].label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Motivo / observaciones" className="sm:col-span-2" hint="Se muestra en la convocatoria y en la ficha.">
          <Textarea
            value={form.availability.note ?? ''}
            onChange={(e) => setForm({ ...form, availability: { ...form.availability, note: e.target.value } })}
            placeholder="Ej.: esguince de tobillo grado I, retorno estimado en dos semanas."
            className="min-h-[80px]"
          />
        </Field>

        <Field label="Retorno estimado" className="sm:col-span-2">
          <Input
            type="date"
            value={form.availability.until ?? ''}
            onChange={(e) => setForm({ ...form, availability: { ...form.availability, until: e.target.value } })}
          />
        </Field>
      </div>
    </Modal>
  );
}
