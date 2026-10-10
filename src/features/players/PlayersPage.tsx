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
import { useAnchura } from '@/components/layout/AppShell';

const POSITION_GROUPS: { id: string; label: string; positions: PlayerPosition[] }[] = [
  { id: 'todas', label: 'Todas', positions: [] },
  { id: 'por', label: 'Porteras', positions: ['Portera'] },
  { id: 'def', label: 'Defensas', positions: ['Central', 'Lateral derecha', 'Lateral izquierda'] },
  { id: 'med', label: 'Medios', positions: ['Pivote', 'Interior', 'Mediapunta'] },
  { id: 'del', label: 'Delanteras', positions: ['Extremo derecha', 'Extremo izquierda', 'Delantera'] },
];

export default function PlayersPage() {
  /* El ancho lo decide la tarea, no la pantalla. */
  useAnchura('ancho');
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

      {/* Filtros. SIN CAJA: un recuadro alrededor de un buscador y dos
          desplegables no agrupa nada que no se viera ya —están juntos—, y en un
          móvil se comía cien píxeles de alto en bordes y relleno para no decir
          nada. Lo que separa esto de la lista es una línea. */}
      <div className="mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jugadora por nombre…"
              className="pl-10"
            />
          </div>
          <div className="flex gap-2.5">
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full sm:w-[170px]">
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full sm:w-[200px]">
              <option value="todas">Cualquier estado</option>
              {(Object.keys(AVAILABILITY) as AvailabilityStatus[]).map((s) => (
                <option key={s} value={s}>
                  {AVAILABILITY[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* LOS FILTROS NO SE PARTEN EN DOS LÍNEAS: SE DESLIZAN.
            Con `flex-wrap`, en 390 px «Delanteras» caía a un segundo renglón
            y la cuenta de jugadoras —que lleva `ml-auto`— se le pegaba al
            lado: dos cosas distintas pegadas y ninguna de las dos en su
            sitio. Cinco filtros en fila deslizable se recorren con el pulgar,
            que es como se usa un filtro en un móvil, y la cuenta se va
            debajo hasta que hay ancho de sobra. */}
        <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 sm:flex-row sm:items-center">
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Filter size={14} className="mr-1 shrink-0 text-ink-400" />
            {POSITION_GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                  group === g.id
                    ? 'bg-marca-600/16 text-ink-900 ring-1 ring-inset ring-marca-500/40'
                    : 'text-muted hover:bg-panel',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-sm text-ink-500 sm:ml-auto sm:pl-3">
            {players.length} de {data.players.filter((p) => p.teamId === teamId).length} jugadoras
          </span>
        </div>
      </div>

      {players.length === 0 ? (
        <Panel>
          <EmptyState size="pleno"
           
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
          <div className="hidden border-b border-ink-100 bg-ink-50/50 px-5 py-2.5 text-2xs font-medium uppercase tracking-wide text-ink-400 sm:flex">
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
                to={`/app/plantilla/${p.id}`}
                className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-ink-50/40 sm:px-5"
              >
                <Avatar name={p.name} size={38} badge={p.number} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                  <p className="mt-0.5 text-xs text-muted sm:hidden">
                    {p.position} · {rate(p.id)}%
                  </p>
                  <p className="mt-0.5 hidden text-xs text-ink-400 sm:block">
                    {p.birthDate ? `${age(p.birthDate)} años · ` : ''}{p.foot}
                  </p>
                </div>
                <div className="hidden w-40 sm:block">
                  <PosicionEtiqueta position={p.position} />
                  {p.secondaryPosition && <p className="mt-0.5 truncate text-xs text-ink-400">{p.secondaryPosition}</p>}
                </div>
                <div className="hidden w-24 text-right sm:block">
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      /* Una columna donde casi todo sale verde no señala
                          nada. Blanco por defecto, y color sólo cuando el dato
                          pide mirarlo: por debajo del 70 % hay un problema. */
                      rate(p.id) >= 85 ? 'text-ink-900' : rate(p.id) >= 70 ? 'text-warn' : 'text-bad',
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
                <ChevronRight size={16} className="shrink-0 text-ink-300" />
              </Link>
            ))}
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p) => (
            <Link key={p.id} to={`/app/plantilla/${p.id}`} className="panel panel-hover p-4">
              <div className="flex items-start justify-between">
                <Avatar name={p.name} size={48} badge={p.number} />
                <Tag tone={disponibilidad(p.availability.status).tone} size="sm" dot>
                  {disponibilidad(p.availability.status).label}
                </Tag>
              </div>
              <p className="mt-3 truncate text-base font-semibold text-ink-900">{p.shortName}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{p.position || 'Sin posición'}</p>
              <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center">
                <div>
                  <p className="text-sm font-semibold text-ink-800 tabular-nums">{rate(p.id)}%</p>
                  <p className="text-2xs text-ink-400">asistencia</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800 tabular-nums">{p.stats.matches}</p>
                  <p className="text-2xs text-ink-400">partidos</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800 tabular-nums">{p.stats.goals}</p>
                  <p className="text-2xs text-ink-400">goles</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-5 text-xs text-ink-400">
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
  if (!position) return <p className="truncate text-sm text-ink-400">Sin posición</p>;
  if (!linea) return <p className="truncate text-sm text-ink-700">{position}</p>;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-2 py-0.5 text-xs font-medium',
        LINEA[linea].chip,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', LINEA[linea].dot)} aria-hidden />
      <span className="truncate">{position}</span>
    </span>
  );
}
