import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Filter, Plus, Search, Users } from 'lucide-react';
import { useClub } from '@/store/store';
import { playerAttendance, visibleTeams } from '@/store/selectors';
import { Avatar, Badge, Card, EmptyState, Input, LinkButton, PageHeader, SegmentedControl, Select } from '@/components/ui';
import { AVAILABILITY, AvailabilityDot } from '@/components/domain/StatusBits';
import { cn, age, normalize } from '@/lib/utils';
import type { AvailabilityStatus, PlayerPosition } from '@/types';

const POSITION_GROUPS: { id: string; label: string; positions: PlayerPosition[] }[] = [
  { id: 'todas', label: 'Todas', positions: [] },
  { id: 'por', label: 'Porteras', positions: ['Portera'] },
  { id: 'def', label: 'Defensas', positions: ['Central', 'Lateral derecha', 'Lateral izquierda'] },
  { id: 'med', label: 'Medios', positions: ['Pivote', 'Interior', 'Mediapunta'] },
  { id: 'del', label: 'Delanteras', positions: ['Extremo derecha', 'Extremo izquierda', 'Delantera'] },
];

export default function PlayersPage() {
  const { data, teamId, setTeamId } = useClub();
  const teams = visibleTeams(data);

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('todas');
  const [status, setStatus] = useState<'todas' | AvailabilityStatus>('todas');
  const [view, setView] = useState<'lista' | 'fichas'>('lista');

  const attendance = useMemo(() => playerAttendance(data, teamId), [data, teamId]);

  const players = useMemo(() => {
    const positions = POSITION_GROUPS.find((g) => g.id === group)?.positions ?? [];
    return data.players
      .filter((p) => p.teamId === teamId)
      .filter((p) => (positions.length ? positions.includes(p.position as PlayerPosition) : true))
      .filter((p) => (status === 'todas' ? true : p.availability.status === status))
      .filter((p) => (query.trim() ? normalize(p.name).includes(normalize(query)) : true))
      .sort((a, b) => a.number - b.number);
  }, [data.players, teamId, group, status, query]);

  const rate = (id: string) => attendance.find((r) => r.player.id === id)?.rate ?? 0;
  const team = teams.find((t) => t.id === teamId);

  return (
    <>
      <PageHeader
        title="Jugadoras"
        description="Fichas, posiciones, disponibilidad y asistencia de la plantilla."
        actions={
          <>
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { id: 'lista', label: 'Lista' },
                { id: 'fichas', label: 'Fichas' },
              ]}
            />
            <LinkButton to="/app/jugadoras/nueva" size="sm" icon={<Plus size={16} />}>
              Añadir jugadora
            </LinkButton>
          </>
        }
      />

      {/* Filtros */}
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jugadora por nombre…"
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-auto min-w-[150px]">
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-auto min-w-[150px]">
              <option value="todas">Cualquier estado</option>
              {(Object.keys(AVAILABILITY) as AvailabilityStatus[]).map((s) => (
                <option key={s} value={s}>
                  {AVAILABILITY[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Filter size={14} className="mr-1 text-ink-400" />
          {POSITION_GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                group === g.id ? 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200' : 'text-ink-500 hover:bg-ink-100',
              )}
            >
              {g.label}
            </button>
          ))}
          <span className="ml-auto text-[12.5px] text-ink-400">
            {players.length} de {data.players.filter((p) => p.teamId === teamId).length} jugadoras
          </span>
        </div>
      </Card>

      {players.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={26} />}
            title={
              data.players.filter((p) => p.teamId === teamId).length === 0
                ? 'Tu plantilla todavía está vacía'
                : 'Ninguna jugadora coincide con el filtro'
            }
            description={
              data.players.filter((p) => p.teamId === teamId).length === 0
                ? 'Añade a tus jugadoras una a una. Con el nombre y el dorsal ya puedes empezar a pasar asistencia y a convocar.'
                : 'Prueba a limpiar la búsqueda o a seleccionar otra demarcación.'
            }
            action={
              <LinkButton to="/app/jugadoras/nueva" size="sm">
                Añadir jugadora
              </LinkButton>
            }
          />
        </Card>
      ) : view === 'lista' ? (
        <Card className="overflow-hidden">
          <div className="hidden border-b border-ink-100 bg-ink-50/50 px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-wide text-ink-400 sm:flex">
            <span className="flex-1">Jugadora</span>
            <span className="w-40">Posición</span>
            <span className="w-24 text-right">Asistencia</span>
            <span className="w-32 pl-4">Estado</span>
            <span className="w-6" />
          </div>
          <div className="divide-y divide-ink-100">
            {players.map((p) => (
              <Link
                key={p.id}
                to={`/app/jugadoras/${p.id}`}
                className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-brand-50/40 sm:px-5"
              >
                <Avatar name={p.name} size={38} number={p.number} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink-900">{p.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-500 sm:hidden">
                    {p.position} · {rate(p.id)}%
                  </p>
                  <p className="mt-0.5 hidden text-[12.5px] text-ink-400 sm:block">
                    {p.birthDate ? `${age(p.birthDate)} años · ` : ''}{p.foot}
                  </p>
                </div>
                <div className="hidden w-40 sm:block">
                  <p className="truncate text-[13.5px] text-ink-700">{p.position}</p>
                  {p.secondaryPosition && <p className="truncate text-[12px] text-ink-400">{p.secondaryPosition}</p>}
                </div>
                <div className="hidden w-24 text-right sm:block">
                  <span
                    className={cn(
                      'text-[14px] font-semibold tabular-nums',
                      rate(p.id) >= 85 ? 'text-[#1F6B44]' : rate(p.id) >= 70 ? 'text-[#9A6412]' : 'text-danger',
                    )}
                  >
                    {rate(p.id)}%
                  </span>
                </div>
                <div className="hidden w-32 pl-4 sm:block">
                  <Badge tone={AVAILABILITY[p.availability.status].tone} size="sm" dot>
                    {AVAILABILITY[p.availability.status].label}
                  </Badge>
                </div>
                <AvailabilityDot status={p.availability.status} className="sm:hidden" />
                <ChevronRight size={16} className="shrink-0 text-ink-300" />
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p) => (
            <Link key={p.id} to={`/app/jugadoras/${p.id}`} className="card card-hover p-4">
              <div className="flex items-start justify-between">
                <Avatar name={p.name} size={48} number={p.number} />
                <Badge tone={AVAILABILITY[p.availability.status].tone} size="sm" dot>
                  {AVAILABILITY[p.availability.status].label}
                </Badge>
              </div>
              <p className="mt-3 truncate text-[14.5px] font-semibold text-ink-900">{p.shortName}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-ink-500">{p.position || 'Sin posición'}</p>
              <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center">
                <div>
                  <p className="text-[14px] font-semibold text-ink-800 tabular-nums">{rate(p.id)}%</p>
                  <p className="text-[10.5px] text-ink-400">asistencia</p>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink-800 tabular-nums">{p.stats.matches}</p>
                  <p className="text-[10.5px] text-ink-400">partidos</p>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink-800 tabular-nums">{p.stats.goals}</p>
                  <p className="text-[10.5px] text-ink-400">goles</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-5 text-[12.5px] text-ink-400">
        {team?.name} · Los datos de contacto de las jugadoras y sus familias son privados y sólo se muestran en la
        ficha individual.
      </p>
    </>
  );
}
