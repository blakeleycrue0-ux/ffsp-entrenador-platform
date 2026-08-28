import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight, Clock, MapPin, Plus, Sparkles, UserSquare2 } from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, visibleTeams } from '@/store/selectors';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Select, Tabs } from '@/components/ui';
import { cn, minutesToLabel, relativeDay, toISODate, today } from '@/lib/utils';

export default function SessionsPage() {
  const { data, session, teamId, setTeamId } = useClub();
  const staff = currentStaff(data, session?.staffId);
  const teams = visibleTeams(data, staff);
  const [tab, setTab] = useState('proximas');

  const sessions = useMemo(() => {
    const iso = toISODate(today());
    const all = data.sessions
      .filter((s) => teams.some((t) => t.id === s.teamId))
      .filter((s) => (teamId === 'todos' ? true : s.teamId === teamId));
    if (tab === 'proximas') return all.filter((s) => s.date >= iso).sort((a, b) => a.date.localeCompare(b.date));
    if (tab === 'borradores') return all.filter((s) => s.status === 'borrador');
    return all.filter((s) => s.date < iso).sort((a, b) => b.date.localeCompare(a.date));
  }, [data.sessions, teams, teamId, tab]);

  const counts = useMemo(() => {
    const iso = toISODate(today());
    const all = data.sessions.filter((s) => teams.some((t) => t.id === s.teamId));
    return {
      proximas: all.filter((s) => s.date >= iso).length,
      borradores: all.filter((s) => s.status === 'borrador').length,
      historial: all.filter((s) => s.date < iso).length,
    };
  }, [data.sessions, teams]);

  return (
    <>
      <PageHeader
        title="Planificaciones"
        description="Todas tus sesiones de entrenamiento, con su estructura y su material."
        actions={
          <>
            <LinkButton to="/app/planificaciones/nuevo?ia=1" variant="outline" size="sm" icon={<Sparkles size={15} />}>
              Crear con IA
            </LinkButton>
            <LinkButton to="/app/planificaciones/nuevo" size="sm" icon={<Plus size={16} />}>
              Crear entrenamiento
            </LinkButton>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          className="border-0"
          tabs={[
            { id: 'proximas', label: 'Próximas', count: counts.proximas },
            { id: 'borradores', label: 'Borradores', count: counts.borradores },
            { id: 'historial', label: 'Historial', count: counts.historial },
          ]}
        />
        <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-auto min-w-[160px]">
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserSquare2 size={26} />}
            title="No tienes entrenamientos creados todavía"
            description="Empieza creando tu primera sesión: constrúyela arrastrando ejercicios o pídesela al asistente."
            action={
              <div className="flex gap-2">
                <LinkButton to="/app/planificaciones/nuevo" size="sm">
                  Crear entrenamiento
                </LinkButton>
                <LinkButton to="/app/planificaciones/nuevo?ia=1" variant="outline" size="sm" icon={<Sparkles size={15} />}>
                  Crear con IA
                </LinkButton>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((s) => (
            <Link key={s.id} to={`/app/planificaciones/${s.id}`} className="card card-hover block p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-brand-700">
                    {data.teams.find((t) => t.id === s.teamId)?.name}
                  </p>
                  <h3 className="mt-0.5 text-[16px] font-semibold leading-tight">{s.title}</h3>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {s.generatedByAI && (
                    <Badge tone="brand" size="sm">
                      <Sparkles size={11} /> IA
                    </Badge>
                  )}
                  <Badge tone={s.status === 'borrador' ? 'warning' : s.status === 'completado' ? 'neutral' : 'success'} size="sm">
                    {s.status}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-500">{s.objective}</p>

              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-500">
                <span className="flex items-center gap-1.5">
                  <CalendarClock size={13} className="text-ink-400" /> {relativeDay(s.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="text-ink-400" /> {s.start} · {minutesToLabel(s.duration)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-ink-400" /> {s.venue}
                </span>
              </div>

              {/* Línea de tiempo compacta */}
              <div className="mt-4 flex gap-1">
                {s.blocks.map((b) => (
                  <div
                    key={b.id}
                    title={`${b.title} · ${b.duration}′`}
                    className={cn('h-1.5 rounded-full', b.tags.includes('Calentamiento') ? 'bg-brand-200' : 'bg-brand-400')}
                    style={{ flex: b.duration }}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-ink-400">{s.blocks.length} bloques · {s.expectedPlayers} jugadores</span>
                <ChevronRight size={15} className="text-ink-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
