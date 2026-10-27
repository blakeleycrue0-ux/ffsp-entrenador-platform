import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, Search, Upload } from 'lucide-react';
import { useClub } from '@/store/store';
import { playerAttendance, visibleTeams } from '@/store/selectors';
import {
  Avatar, Button, EmptyState, Input, LinkButton, PageHeader, Panel, Segmented, Select, Tag,
} from '@/components/ui';
import { ImportPlayers } from './ImportPlayers';
import { AVAILABILITY, AvailabilityDot, disponibilidad, colorDeLinea } from '@/components/domain/StatusBits';
import { useDeporte } from '@/services/useDeporte';
import { lineaDePosicion, type Deporte } from '@/services/deportes';
import { cn, age, normalize } from '@/lib/utils';
import type { AvailabilityStatus } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';

/* LOS FILTROS SALEN DEL DEPORTE. Aquí había una tercera copia de las
   posiciones de fútbol, repartidas en cuatro grupos a mano y con las
   etiquetas en femenino —«Porteras», «Delanteras»— mientras las posiciones
   que comparaba estaban en masculino: el filtro de porteras no devolvía
   ninguna. Ahora las líneas son las de `sports`, así que un club de
   baloncesto filtra por exterior, alero e interior, y uno de natación no ve
   el desplegable porque allí no hay puestos. */

export default function PlayersPage() {
  /* El ancho lo decide la tarea, no la pantalla. */
  useAnchura('ancho');
  const { data, teamId, setTeamId } = useClub();
  const teams = visibleTeams(data);

  const [query, setQuery] = useState('');
  const deporte = useDeporte();
  const [group, setGroup] = useState('todas');
  const [status, setStatus] = useState<'todas' | AvailabilityStatus>('todas');
  const [view, setView] = useState<'lista' | 'fichas'>('lista');
  const [importing, setImporting] = useState(false);

  const attendance = useMemo(() => playerAttendance(data, teamId), [data, teamId]);

  const players = useMemo(() => {
    const positions = deporte.lineas.find((l) => l.id === group)?.posiciones ?? [];
    return data.players
      .filter((p) => p.teamId === teamId)
      /* Por la línea de la posición y no por la lista a secas: así un puesto
         con la grafía vieja sigue entrando en su filtro. */
      .filter((p) => (positions.length ? lineaDePosicion(deporte, p.position)?.linea.id === group : true))
      .filter((p) => (status === 'todas' ? true : p.availability.status === status))
      .filter((p) => (query.trim() ? normalize(p.name).includes(normalize(query)) : true))
      .sort((a, b) => a.number - b.number);
  }, [data.players, teamId, group, status, query, deporte]);

  const rate = (id: string) => attendance.find((r) => r.player.id === id)?.rate ?? 0;
  const team = teams.find((t) => t.id === teamId);

  return (
    <>
      <PageHeader
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
              Añadir jugador
            </LinkButton>
          </>
        }
      />

      <ImportPlayers open={importing} onClose={() => setImporting(false)} teamId={teamId} />

      {/* UNA FILA DE FILTROS, NO DOS.
          Había un buscador, dos desplegables, y debajo —tras una línea
          divisoria— cinco botones de demarcación con su icono de embudo: once
          cosas que atender antes de ver a la primera jugador. Y la
          demarcación y el estado son la misma clase de pregunta —«enséñame
          sólo las que…»—, así que no hay motivo para que una sea un
          desplegable y la otra cinco botones.

          Las cinco demarcaciones son ahora un desplegable más, igual que el
          estado. Cuatro decisiones menos y el mismo filtro. */}
      <div className="mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jugador por nombre…"
              className="pl-10"
            />
          </div>
          {/* Los filtros se deslizan si no caben: partirlos en dos renglones
              dejaba la cuenta de jugadores pegada a un desplegable. */}
          <div className="-mx-[var(--pagina-x)] flex gap-2.5 overflow-x-auto px-[var(--pagina-x)] no-scrollbar sm:mx-0 sm:px-0">
            {/* El equipo sólo se pregunta cuando hay más de uno. */}
            {teams.length > 1 && (
              <Select variante="filtro" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
            {deporte.lineas.length > 0 && (
              <Select variante="filtro" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="todas">Cualquier puesto</option>
                {deporte.lineas.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </Select>
            )}
            <Select variante="filtro" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="todas">Cualquier estado</option>
              {(Object.keys(AVAILABILITY) as AvailabilityStatus[]).map((s) => (
                <option key={s} value={s}>
                  {AVAILABILITY[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* La cuenta, sólo cuando un filtro está escondiendo a alguien: con la
            plantilla entera a la vista, «16 de 16 jugadores» es una línea para
            decir que no falta nadie. */}
        {players.length !== data.players.filter((p) => p.teamId === teamId).length && (
          <p className="mt-2.5 text-sm text-ink-500">
            {players.length} de {data.players.filter((p) => p.teamId === teamId).length} jugadores
          </p>
        )}
      </div>

      {players.length === 0 ? (
        <Panel>
          <EmptyState size="pleno"
           
            title={
              data.players.filter((p) => p.teamId === teamId).length === 0
                ? 'Tu plantilla todavía está vacía'
                : 'Ninguna jugador coincide con el filtro'
            }
            description={
              data.players.filter((p) => p.teamId === teamId).length === 0
                ? 'Añade a tus jugadores una a una. Con el nombre y el dorsal ya puedes empezar a pasar asistencia y a convocar.'
                : 'Prueba a limpiar la búsqueda o a seleccionar otra demarcación.'
            }
            action={
              <>
                <LinkButton to="/app/plantilla/nueva" size="sm">
                  Añadir jugador
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
          <div className="hidden border-b border-ink-100 bg-ink-50/50 px-5 py-2.5 text-2xs font-medium uppercase tracking-wide text-ink-500 sm:flex">
            <span className="flex-1">Jugador</span>
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
                  <p className="mt-0.5 hidden text-xs text-ink-500 sm:block">
                    {p.birthDate ? `${age(p.birthDate)} años · ` : ''}{p.foot}
                  </p>
                </div>
                <div className="hidden w-40 sm:block">
                  <PosicionEtiqueta position={p.position} deporte={deporte} />
                  {p.secondaryPosition && <p className="mt-0.5 truncate text-xs text-ink-500">{p.secondaryPosition}</p>}
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
                  <p className="text-2xs text-ink-500">asistencia</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800 tabular-nums">{p.stats.matches}</p>
                  <p className="text-2xs text-ink-500">partidos</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800 tabular-nums">{p.stats.goals}</p>
                  <p className="text-2xs text-ink-500">goles</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-5 text-xs text-ink-500">
        {team?.name} · Los datos de contacto de las jugadores y sus familias son privados y sólo se muestran en la
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
function PosicionEtiqueta({ position, deporte }: { position: string; deporte: Deporte }) {
  const encontrada = lineaDePosicion(deporte, position);
  if (!position) return <p className="truncate text-sm text-ink-500">Sin posición</p>;
  /* Una posición que el deporte no reconoce se enseña igual, en texto y sin
     color: puede venir de una importación o de un club que cambió de
     deporte. Esconderla sería perderla de vista teniéndola guardada. */
  if (!encontrada) return <p className="truncate text-sm text-ink-700">{position}</p>;
  const color = colorDeLinea(encontrada.indice);
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-2 py-0.5 text-xs font-medium',
        color.chip,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', color.dot)} aria-hidden />
      <span className="truncate">{position}</span>
    </span>
  );
}
