import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Filter, Plus, Search, Upload } from 'lucide-react';
import { useClub } from '@/store/store';
import { playerAttendance, visibleTeams } from '@/store/selectors';
import {
  Avatar, Button, EmptyState, Input, LinkButton, PageHeader, Panel, Segmented, Select, Tag,
} from '@/components/ui';
import { ImportPlayers } from './ImportPlayers';
import { AVAILABILITY, AvailabilityDot, disponibilidad, LINEA, lineaDe } from '@/components/domain/StatusBits';
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
  const [importing, setImporting] = useState(false);

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
        title="Plantilla"
        description="Fichas, posiciones, disponibilidad y asistencia de la plantilla."
        actions={
          <>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { id: 'lista', label: 'Lista' },
                { id: 'fichas', label: 'Fichas' },
              ]}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload size={15} />}
              onClick={() => setImporting(true)}
              disabled={!teamId}
            >
              Importar
            </Button>
            <LinkButton to="/app/plantilla/nueva" size="sm" icon={<Plus size={16} />}>
              Añadir jugadora
            </LinkButton>
          </>
        }
      />

      <ImportPlayers open={importing} onClose={() => setImporting(false)} teamId={teamId} />

      {/* Filtros */}
      <Panel className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
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
          <Filter size={14} className="mr-1 text-navy-400" />
          {POSITION_GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                group === g.id ? 'bg-navy-50 text-navy-900 ring-1 ring-inset ring-navy-200' : 'text-muted hover:bg-navy-100',
              )}
            >
              {g.label}
            </button>
          ))}
          <span className="ml-auto text-[12.5px] text-navy-400">
            {players.length} de {data.players.filter((p) => p.teamId === teamId).length} jugadoras
          </span>
        </div>
      </Panel>

      {players.length === 0 ? (
        <Panel>
          <EmptyState
           
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
              <>
                <LinkButton to="/app/plantilla/nueva" size="sm">
                  Añadir jugadora
                </LinkButton>
                <Button variant="secondary" size="sm" onClick={() => setImporting(true)} disabled={!teamId}>
                  Importar desde un archivo
                </Button>
              </>
            }
          />
        </Panel>
      ) : view === 'lista' ? (
        <Panel className="overflow-hidden">
          <div className="hidden border-b border-navy-100 bg-navy-50/50 px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-wide text-navy-400 sm:flex">
            <span className="flex-1">Jugadora</span>
            <span className="w-40">Posición</span>
            <span className="w-24 text-right">Asistencia</span>
            <span className="w-32 pl-4">Estado</span>
            <span className="w-6" />
          </div>
          <div className="divide-y divide-navy-100">
            {players.map((p) => (
              <Link
                key={p.id}
                to={`/app/plantilla/${p.id}`}
                className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-navy-50/40 sm:px-5"
              >
                <Avatar name={p.name} size={38} badge={p.number} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-navy-900">{p.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted sm:hidden">
                    {p.position} · {rate(p.id)}%
                  </p>
                  <p className="mt-0.5 hidden text-[12.5px] text-navy-400 sm:block">
                    {p.birthDate ? `${age(p.birthDate)} años · ` : ''}{p.foot}
                  </p>
                </div>
                <div className="hidden w-40 sm:block">
                  <PosicionEtiqueta position={p.position} />
                  {p.secondaryPosition && <p className="mt-0.5 truncate text-[12px] text-navy-400">{p.secondaryPosition}</p>}
                </div>
                <div className="hidden w-24 text-right sm:block">
                  <span
                    className={cn(
                      'text-[14px] font-semibold tabular-nums',
                      rate(p.id) >= 85 ? 'text-[#1F6B44]' : rate(p.id) >= 70 ? 'text-[#9A6412]' : 'text-bad',
                    )}
                  >
                    {rate(p.id)}%
                  </span>
                </div>
                <div className="hidden w-32 pl-4 sm:block">
                  <Tag tone={disponibilidad(p.availability.status).tone} size="sm" dot>
                    {disponibilidad(p.availability.status).label}
                  </Tag>
                </div>
                <AvailabilityDot status={p.availability.status} className="sm:hidden" />
                <ChevronRight size={16} className="shrink-0 text-navy-300" />
              </Link>
            ))}
          </div>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p) => (
            <Link key={p.id} to={`/app/plantilla/${p.id}`} className="panel panel-hover p-4">
              <div className="flex items-start justify-between">
                <Avatar name={p.name} size={48} badge={p.number} />
                <Tag tone={disponibilidad(p.availability.status).tone} size="sm" dot>
                  {disponibilidad(p.availability.status).label}
                </Tag>
              </div>
              <p className="mt-3 truncate text-[14.5px] font-semibold text-navy-900">{p.shortName}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-muted">{p.position || 'Sin posición'}</p>
              <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-navy-100 pt-3 text-center">
                <div>
                  <p className="text-[14px] font-semibold text-navy-800 tabular-nums">{rate(p.id)}%</p>
                  <p className="text-[10.5px] text-navy-400">asistencia</p>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-navy-800 tabular-nums">{p.stats.matches}</p>
                  <p className="text-[10.5px] text-navy-400">partidos</p>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-navy-800 tabular-nums">{p.stats.goals}</p>
                  <p className="text-[10.5px] text-navy-400">goles</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-5 text-[12.5px] text-navy-400">
        {team?.name} · Los datos de contacto de las jugadoras y sus familias son privados y sólo se muestran en la
        ficha individual.
      </p>
    </>
  );
}

/**
 * La posición, con el color de su línea.
 * ---------------------------------------------------------------------------
 * Escrita en gris, una plantilla de veinte nombres hay que leerla entera para
 * saber cuántas defensas hay. Con el color de la línea detrás, se ve sin leer.
 * El color nunca va solo: siempre acompaña a la palabra, porque una etiqueta
 * que sólo es un color no la puede usar quien no distingue esos tonos.
 */
function PosicionEtiqueta({ position }: { position: string }) {
  const linea = lineaDe(position);
  if (!position) return <p className="truncate text-[13px] text-navy-400">Sin posición</p>;
  if (!linea) return <p className="truncate text-[13.5px] text-navy-700">{position}</p>;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 truncate rounded border px-1.5 py-0.5 text-[12px] font-medium',
        LINEA[linea].chip,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', LINEA[linea].dot)} aria-hidden />
      <span className="truncate">{position}</span>
    </span>
  );
}
