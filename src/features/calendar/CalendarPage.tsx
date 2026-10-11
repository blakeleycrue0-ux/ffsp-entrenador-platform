import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarPlus, ChevronLeft, ChevronRight, Clock, Download, Layers, MapPin, Swords, Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { clubShortName, visibleTeams } from '@/store/selectors';
import { buildEvents, downloadICS } from '@/services/calendar';
import {
  Tag, Button, LinkButton, Panel, EmptyState, Modal, PageHeader, Segmented, Select,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { EVENT_KIND } from '@/components/domain/StatusBits';
import { ImportarEntrenos } from './ImportarEntrenos';
import {
  addDays, cap, cn, isSameDay, longDate, monthName, startOfWeek, toISODate, today,
} from '@/lib/utils';
import type { CalendarEvent, EventKind } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';

/**
 * LOS TIPOS QUE SALEN EN LA LEYENDA SON LOS QUE PUEDEN SALIR EN EL CALENDARIO.
 *
 * Eran cinco: entrenamiento, partido, convocatoria, reunión y evento. Las dos
 * últimas no las producía nada —`buildEvents` sólo mira sesiones, partidos y
 * convocatorias—, así que la leyenda anunciaba dos colores que nunca salían, y
 * quien la leía se pasaba un rato buscando dónde se añade una reunión. Ya no
 * existen en `EventKind`, así que la leyenda no puede volver a desincronizarse:
 * sale lo que hay en la tabla, y en la tabla está lo que se puede crear.
 */
const TIPOS_REALES = Object.keys(EVENT_KIND) as EventKind[];

type View = 'dia' | 'semana' | 'mes';
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarPage() {
  /* El ancho lo decide la tarea, no la pantalla. */
  useAnchura('ancho');
  const { data } = useClub();
  const toast = useToast();
  const teams = visibleTeams(data);

  const [view, setView] = useState<View>('semana');
  const [cursor, setCursor] = useState(() => today());
  const [teamFilter, setTeamFilter] = useState('todos');
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [importar, setImportar] = useState(false);

  /* `?importar=1` abre la hoja directamente: así el menú de «Crear» puede
     traer aquí a quien quiere meter la temporada entera, y llega con la hoja
     abierta en vez de llegar al calendario a ver qué hace. El parámetro se
     quita de la barra de direcciones para que recargar no la vuelva a abrir. */
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('importar') !== '1') return;
    setImportar(true);
    const limpio = new URLSearchParams(params);
    limpio.delete('importar');
    setParams(limpio, { replace: true });
  }, [params, setParams]);

  const events = useMemo(() => {
    const all = buildEvents(data, teams.map((t) => t.id));
    return teamFilter === 'todos' ? all : all.filter((e) => e.teamId === teamFilter);
  }, [data, teams, teamFilter]);

  const eventsOn = (d: Date) => events.filter((e) => e.date === toISODate(d));

  const move = (dir: -1 | 1) => {
    setCursor((c) => {
      if (view === 'dia') return addDays(c, dir);
      if (view === 'semana') return addDays(c, dir * 7);
      const n = new Date(c);
      n.setMonth(n.getMonth() + dir, 1);
      return n;
    });
  };

  const periodLabel = () => {
    if (view === 'dia') return longDate(toISODate(cursor));
    if (view === 'semana') {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      return `${s.getDate()} – ${e.getDate()} de ${monthName(e.getMonth())}`;
    }
    return `${cap(monthName(cursor.getMonth()))} ${cursor.getFullYear()}`;
  };

  return (
    <>
      <PageHeader
        title="Calendario"
        description="Entrenamientos, partidos y convocatorias de todos tus equipos en una sola agenda."
        /* LOS BOTONES CREAN COSAS. El que había aquí —«Nuevo evento»— no creaba
           nada: enseñaba un aviso mandando al menú de «Crear», y en ese menú la
           opción «Evento» traía otra vez al calendario. Quien quería meter un
           entrenamiento daba vueltas entre dos pantallas sin que ninguna lo
           dejara. Ahora el primero lleva al formulario, el segundo mete muchos
           de una vez y el tercero añade un partido. */
        actions={
          <>
            <LinkButton to="/app/entrenamientos/nuevo" size="sm" icon={<CalendarPlus size={15} />}>
              Nuevo entrenamiento
            </LinkButton>
            <Button variant="secondary" size="sm" icon={<Layers size={15} />} onClick={() => setImportar(true)}>
              Añadir varios
            </Button>
            <LinkButton to="/app/partidos/nuevo" variant="secondary" size="sm" icon={<Swords size={15} />}>
              Partido
            </LinkButton>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download size={15} />}
              onClick={() => {
                downloadICS(events, clubShortName(data), `${clubShortName(data).toLowerCase().replace(/\s+/g, '-')}-calendario.ics`);
                toast.success('Calendario exportado', 'Archivo .ics listo para importar en Google Calendar o Apple Calendar.');
              }}
            >
              Exportar .ics
            </Button>
          </>
        }
      />

      {/* Controles. Sin caja, igual que en Plantilla: un recuadro alrededor de
          unos mandos que ya están juntos no agrupa nada y se lleva un buen
          trozo de alto en un móvil. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => move(-1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-ink-300 hover:text-ink-900"
            aria-label="Anterior"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={() => move(1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-ink-300 hover:text-ink-900"
            aria-label="Siguiente"
          >
            <ChevronRight size={17} />
          </button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(today())}>
            Hoy
          </Button>
          <p className="ml-2 text-base font-semibold text-ink-900">{cap(periodLabel())}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select variante="filtro" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="todos">Todos los equipos</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { id: 'dia', label: 'Día' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' },
            ]}
          />
        </div>
      </div>

      {/* Leyenda. Es lo único de esta pantalla cuyo color SÍ lleva información
          —de qué tipo es cada evento—, así que se queda; pero más pequeña y
          más apagada, porque se consulta una vez y ya no se vuelve a mirar.

          Y EN EL MÓVIL NO SALE. Cinco etiquetas con su punto no caben en una
          línea de 358 px: se partían en dos y se comían medio día de la
          semana para explicar unos colores que de todas formas van junto al
          nombre del evento en cada fila. Se consulta una vez en la vida y
          esa vez se puede hacer en el ordenador. */}
      <div className="mb-5 hidden flex-wrap gap-x-3.5 gap-y-1.5 sm:flex">
        {TIPOS_REALES.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-ink-500">
            <span className={cn('h-1.5 w-1.5 rounded-full', EVENT_KIND[k].dot)} />
            {EVENT_KIND[k].label}
          </span>
        ))}
      </div>

      {view === 'dia' && <DayView date={cursor} events={eventsOn(cursor)} onOpen={setDetail} onImportar={() => setImportar(true)} />}
      {view === 'semana' && <WeekView cursor={cursor} events={events} onOpen={setDetail} />}
      {view === 'mes' && <MonthView cursor={cursor} events={events} onOpen={setDetail} onPickDay={(d) => { setCursor(d); setView('dia'); }} />}

      <EventModal event={detail} onClose={() => setDetail(null)} />
      <ImportarEntrenos abierto={importar} onCerrar={() => setImportar(false)} />
    </>
  );
}

/* ──────────────────────────────── Vista día ──────────────────────────────── */

function DayView({
  date, events, onOpen, onImportar,
}: {
  date: Date;
  events: CalendarEvent[];
  onOpen: (e: CalendarEvent) => void;
  onImportar: () => void;
}) {
  if (events.length === 0) {
    return (
      <Panel>
        {/* Un día vacío es justo el momento en el que alguien quiere añadir
            algo, así que aquí van los dos botones: uno para ese día —la fecha
            viaja en la dirección y el formulario llega con ella puesta— y
            otro para meter el horario de la temporada de golpe. */}
        <EmptyState
          size="pleno"
          title={`Sin nada programado el ${longDate(toISODate(date)).toLowerCase()}`}
          description="Puedes crear el entrenamiento de ese día, o repartir el horario del equipo en todo el trimestre."
          action={
            <>
              <LinkButton to={`/app/entrenamientos/nuevo?fecha=${toISODate(date)}`} size="sm">
                Crear entrenamiento
              </LinkButton>
              <Button variant="secondary" size="sm" onClick={onImportar}>
                Añadir varios
              </Button>
            </>
          }
        />
      </Panel>
    );
  }
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <button key={e.id} onClick={() => onOpen(e)} className="panel panel-hover flex w-full items-stretch gap-0 overflow-hidden text-left">
          <span className={cn('w-1.5 shrink-0', EVENT_KIND[e.kind].bar)} />
          <span className="flex flex-1 items-center gap-4 p-4">
            <span className="w-16 shrink-0 text-center">
              <span className="block text-lg font-semibold text-ink-900 tabular-nums">{e.start}</span>
              {e.end && <span className="block text-xs text-ink-400 tabular-nums">{e.end}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium text-ink-900">{e.title}</span>
              <span className="mt-0.5 block truncate text-sm text-muted">{e.subtitle}</span>
              {e.venue && (
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-400">
                  <MapPin size={12} /> {e.venue}
                </span>
              )}
            </span>
            <Tag tone="neutral" size="sm">
              {EVENT_KIND[e.kind].label}
            </Tag>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────── Vista semana ────────────────────────────── */

function WeekView({ cursor, events, onOpen }: { cursor: Date; events: CalendarEvent[]; onOpen: (e: CalendarEvent) => void }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
      {days.map((d, i) => {
        const list = events.filter((e) => e.date === toISODate(d));
        const isToday = isSameDay(d, today());
        return (
          <div
            key={i}
            className={cn(
              'rounded-2xl border bg-panel transition-colors',
              /* Un día sin nada no necesita el mismo alto que uno lleno: en
                 una semana tranquila eran siete cajas de 190 px para decir
                 «Libre» siete veces. Vacío, es una línea. */
              list.length === 0 ? 'px-3 py-2.5 lg:p-3' : 'p-3',
              isToday ? 'border-ink-300 bg-ink-50/30' : 'border-line',
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className={cn('text-xs font-medium', isToday ? 'text-ink-900' : 'text-ink-400')}>
                {DAY_LABELS[i]}
              </span>
              {list.length === 0 && <span className="flex-1 text-xs text-ink-400 lg:hidden">Libre</span>}
              <span className={cn('text-md font-semibold tabular-nums', isToday ? 'text-ink-900' : 'text-ink-700')}>
                {d.getDate()}
              </span>
            </div>

            <div className={cn(list.length === 0 ? '' : 'mt-3', 'space-y-1.5')}>
              {list.length === 0 ? (
                <p className="hidden py-3 text-center text-2xs text-ink-300 lg:block">Libre</p>
              ) : (
                list.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onOpen(e)}
                    className={cn(
                      'w-full rounded-lg border px-2 py-1.5 text-left transition-transform hover:-translate-y-px',
                      EVENT_KIND[e.kind].chip,
                    )}
                  >
                    <span className="block text-2xs font-semibold tabular-nums opacity-80">{e.start}</span>
                    <span className="mt-0.5 block truncate text-xs font-medium leading-tight">{e.title}</span>
                    {e.subtitle && <span className="block truncate text-2xs opacity-70">{e.subtitle}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────── Vista mes ──────────────────────────────── */

function MonthView({
  cursor, events, onOpen, onPickDay,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onOpen: (e: CalendarEvent) => void;
  onPickDay: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <Panel className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/60">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2.5 text-center text-2xs font-medium uppercase tracking-wide text-ink-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const list = events.filter((e) => e.date === toISODate(d));
          const other = d.getMonth() !== cursor.getMonth();
          const isToday = isSameDay(d, today());
          return (
            <div
              key={i}
              className={cn(
                'min-h-[96px] border-b border-r border-ink-100 p-1.5 transition-colors last:border-r-0',
                other && 'bg-ink-50/40',
                i % 7 === 6 && 'border-r-0',
              )}
            >
              <button
                onClick={() => onPickDay(d)}
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-xs font-medium tabular-nums transition-colors',
                  isToday ? 'bg-ink-900 text-ink-0' : other ? 'text-ink-300' : 'text-ink-600 hover:bg-ink-100',
                )}
              >
                {d.getDate()}
              </button>
              <div className="mt-1 space-y-1">
                {list.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onOpen(e)}
                    className={cn('block w-full truncate rounded border px-1.5 py-0.5 text-left text-2xs font-medium', EVENT_KIND[e.kind].chip)}
                  >
                    {e.start} {e.title}
                  </button>
                ))}
                {list.length > 2 && (
                  <button onClick={() => onPickDay(d)} className="px-1.5 text-2xs text-ink-400 hover:text-ink-900">
                    +{list.length - 2} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ─────────────────────────── Detalle de un evento ────────────────────────── */

function EventModal({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  const { data } = useClub();
  if (!event) return null;

  const team = data.teams.find((t) => t.id === event.teamId);
  const squad = data.players.filter((p) => p.teamId === event.teamId).length;
  const link =
    event.kind === 'entrenamiento'
      ? `/app/entrenamientos/${event.refId}`
      : event.kind === 'partido'
        ? `/app/partidos/${event.refId}`
        : '/app/partidos';

  return (
    <Modal
      open
      onClose={onClose}
      title={event.title}
      description={`${EVENT_KIND[event.kind].label} · ${longDate(event.date)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Link
            to={link}
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl bg-ink-900 px-4 text-sm font-medium text-ink-0 shadow-raised transition-colors hover:bg-ink-900"
          >
            Abrir {EVENT_KIND[event.kind].label.toLowerCase()}
          </Link>
        </>
      }
    >
      <dl className="space-y-3.5">
        {[
          [<Clock key="c" size={16} />, 'Horario', event.end ? `${event.start} – ${event.end}` : event.start],
          [<Users key="u" size={16} />, 'Equipo', `${team?.name ?? '—'} · ${squad} jugadoras`],
          [<MapPin key="m" size={16} />, 'Ubicación', event.venue ?? 'Sin definir'],
        ].map(([icon, label, value], i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-0.5 text-ink-400">{icon as React.ReactNode}</span>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">{label as string}</dt>
              <dd className="mt-0.5 text-sm text-ink-800">{value as string}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
