import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Download, MapPin, Plus, Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, visibleTeams } from '@/store/selectors';
import { buildEvents, downloadICS } from '@/services/calendar';
import {
  Badge, Button, Card, EmptyState, Modal, PageHeader, SegmentedControl, Select,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { EVENT_KIND } from '@/components/domain/StatusBits';
import {
  addDays, cap, cn, isSameDay, longDate, monthName, startOfWeek, toISODate, today,
} from '@/lib/utils';
import type { CalendarEvent, EventKind } from '@/types';

type View = 'dia' | 'semana' | 'mes';
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarPage() {
  const { data, session } = useClub();
  const toast = useToast();
  const staff = currentStaff(data, session?.staffId);
  const teams = visibleTeams(data, staff);

  const [view, setView] = useState<View>('semana');
  const [cursor, setCursor] = useState(() => today());
  const [teamFilter, setTeamFilter] = useState('todos');
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

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
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={15} />}
              onClick={() => {
                downloadICS(events, 'ffsp-vle-calendario.ics');
                toast.success('Calendario exportado', 'Archivo .ics listo para importar en Google Calendar o Apple Calendar.');
              }}
            >
              Sincronizar con mi calendario
            </Button>
            <Button
              size="sm"
              icon={<Plus size={16} />}
              onClick={() =>
                toast.info(
                  'Añade el evento desde «Crear»',
                  'Entrenamiento, partido, convocatoria, mensaje o ejercicio: todo entra en el calendario automáticamente.',
                )
              }
            >
              Nuevo evento
            </Button>
          </>
        }
      />

      {/* Controles */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => move(-1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-700"
            aria-label="Anterior"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={() => move(1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-700"
            aria-label="Siguiente"
          >
            <ChevronRight size={17} />
          </button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(today())}>
            Hoy
          </Button>
          <p className="ml-2 text-[15px] font-semibold text-ink-900">{cap(periodLabel())}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="w-auto min-w-[150px]">
            <option value="todos">Todos los equipos</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { id: 'dia', label: 'Día' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' },
            ]}
          />
        </div>
      </Card>

      {/* Leyenda */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
        {(Object.keys(EVENT_KIND) as EventKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[12.5px] text-ink-500">
            <span className={cn('h-2 w-2 rounded-full', EVENT_KIND[k].dot)} />
            {EVENT_KIND[k].label}
          </span>
        ))}
      </div>

      {view === 'dia' && <DayView date={cursor} events={eventsOn(cursor)} onOpen={setDetail} />}
      {view === 'semana' && <WeekView cursor={cursor} events={events} onOpen={setDetail} />}
      {view === 'mes' && <MonthView cursor={cursor} events={events} onOpen={setDetail} onPickDay={(d) => { setCursor(d); setView('dia'); }} />}

      <EventModal event={detail} onClose={() => setDetail(null)} />
    </>
  );
}

/* ──────────────────────────────── Vista día ──────────────────────────────── */

function DayView({ date, events, onOpen }: { date: Date; events: CalendarEvent[]; onOpen: (e: CalendarEvent) => void }) {
  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarDays size={26} />}
          title={`Sin nada programado el ${longDate(toISODate(date)).toLowerCase()}`}
          description="Aprovecha para preparar la próxima sesión o cerrar la convocatoria."
        />
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {events.map((e) => (
        <button key={e.id} onClick={() => onOpen(e)} className="card card-hover flex w-full items-stretch gap-0 overflow-hidden text-left">
          <span className={cn('w-1.5 shrink-0', EVENT_KIND[e.kind].bar)} />
          <span className="flex flex-1 items-center gap-4 p-4">
            <span className="w-16 shrink-0 text-center">
              <span className="block text-[17px] font-semibold text-ink-900 tabular-nums">{e.start}</span>
              {e.end && <span className="block text-[12px] text-ink-400 tabular-nums">{e.end}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-ink-900">{e.title}</span>
              <span className="mt-0.5 block truncate text-[13px] text-ink-500">{e.subtitle}</span>
              {e.venue && (
                <span className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-400">
                  <MapPin size={12} /> {e.venue}
                </span>
              )}
            </span>
            <Badge tone="neutral" size="sm">
              {EVENT_KIND[e.kind].label}
            </Badge>
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
      {days.map((d, i) => {
        const list = events.filter((e) => e.date === toISODate(d));
        const isToday = isSameDay(d, today());
        return (
          <div
            key={i}
            className={cn(
              'rounded-2xl border bg-white p-3 transition-colors',
              isToday ? 'border-brand-300 bg-brand-50/30' : 'border-ink-200',
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className={cn('text-[12px] font-medium', isToday ? 'text-brand-700' : 'text-ink-400')}>
                {DAY_LABELS[i]}
              </span>
              <span className={cn('text-[16px] font-semibold tabular-nums', isToday ? 'text-brand-800' : 'text-ink-700')}>
                {d.getDate()}
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              {list.length === 0 ? (
                <p className="py-3 text-center text-[11.5px] text-ink-300">Libre</p>
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
                    <span className="block text-[11px] font-semibold tabular-nums opacity-80">{e.start}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-medium leading-tight">{e.title}</span>
                    {e.subtitle && <span className="block truncate text-[10.5px] opacity-70">{e.subtitle}</span>}
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
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/60">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11.5px] font-medium uppercase tracking-wide text-ink-400">
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
                  'grid h-6 w-6 place-items-center rounded-full text-[12px] font-medium tabular-nums transition-colors',
                  isToday ? 'bg-brand-700 text-white' : other ? 'text-ink-300' : 'text-ink-600 hover:bg-ink-100',
                )}
              >
                {d.getDate()}
              </button>
              <div className="mt-1 space-y-1">
                {list.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onOpen(e)}
                    className={cn('block w-full truncate rounded border px-1.5 py-0.5 text-left text-[10.5px] font-medium', EVENT_KIND[e.kind].chip)}
                  >
                    {e.start} {e.title}
                  </button>
                ))}
                {list.length > 2 && (
                  <button onClick={() => onPickDay(d)} className="px-1.5 text-[10.5px] text-ink-400 hover:text-brand-700">
                    +{list.length - 2} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
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
      ? `/app/planificaciones/${event.refId}`
      : event.kind === 'partido'
        ? `/app/partidos/${event.refId}`
        : '/app/partidos';

  return (
    <Modal
      open
      onClose={onClose}
      title={event.title}
      subtitle={`${EVENT_KIND[event.kind].label} · ${longDate(event.date)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Link
            to={link}
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl bg-brand-700 px-4 text-[14px] font-medium text-white shadow-brand transition-colors hover:bg-brand-800"
          >
            Abrir {EVENT_KIND[event.kind].label.toLowerCase()}
          </Link>
        </>
      }
    >
      <dl className="space-y-3.5">
        {[
          [<Clock key="c" size={16} />, 'Horario', event.end ? `${event.start} – ${event.end}` : event.start],
          [<Users key="u" size={16} />, 'Equipo', `${team?.name ?? '—'} · ${squad} jugadores`],
          [<MapPin key="m" size={16} />, 'Ubicación', event.venue ?? 'Sin definir'],
        ].map(([icon, label, value], i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-0.5 text-ink-400">{icon as React.ReactNode}</span>
            <div>
              <dt className="text-[12px] uppercase tracking-wide text-ink-400">{label as string}</dt>
              <dd className="mt-0.5 text-[14px] text-ink-800">{value as string}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
