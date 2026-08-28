import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight, Shield, Swords, Users } from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, teamOverview, visibleTeams } from '@/store/selectors';
import { Badge, EmptyState, PageHeader, SkeletonCard } from '@/components/ui';
import { Ring } from '@/components/domain/Charts';
import { relativeDay } from '@/lib/utils';

export default function TeamsPage() {
  const { data, session, loading } = useClub();
  const staff = currentStaff(data, session?.staffId);
  const teams = useMemo(() => visibleTeams(data, staff), [data, staff]);
  const overviews = useMemo(() => teams.map((t) => teamOverview(data, t)), [data, teams]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Mis equipos"
        description={`${teams.length} equipos asignados · temporada ${teams[0]?.season ?? '—'}`}
      />

      {teams.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Shield size={26} />}
            title="No tienes equipos asignados"
            description="Pide al coordinador del club que te asigne un equipo para empezar a trabajar."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {overviews.map((o) => (
            <Link key={o.team.id} to={`/app/equipos/${o.team.id}`} className="card card-hover block overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-ink-100 p-5">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-700 text-[14px] font-bold text-white">
                    {o.team.name.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-semibold leading-tight">{o.team.name}</h3>
                    <p className="mt-1 text-[13px] text-ink-500">{o.team.competition}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Badge tone="neutral" size="sm">
                        <Users size={11} /> {o.squadSize} jugadores
                      </Badge>
                      {o.unavailable > 0 && (
                        <Badge tone="warning" size="sm">
                          {o.unavailable} no disponibles
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Ring value={o.attendanceRate} size={62} stroke={6} label="asist." />
              </div>

              <div className="grid grid-cols-3 divide-x divide-ink-100">
                <div className="p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                    <CalendarClock size={12} /> Entrenamiento
                  </p>
                  <p className="mt-1.5 text-[13.5px] font-medium text-ink-800">
                    {o.nextSession ? relativeDay(o.nextSession.date) : '—'}
                  </p>
                  <p className="text-[12px] text-ink-400">{o.nextSession?.start ?? 'sin planificar'}</p>
                </div>
                <div className="p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                    <Swords size={12} /> Partido
                  </p>
                  <p className="mt-1.5 truncate text-[13.5px] font-medium text-ink-800">
                    {o.nextMatch ? relativeDay(o.nextMatch.date) : '—'}
                  </p>
                  <p className="truncate text-[12px] text-ink-400">{o.nextMatch?.opponent ?? 'sin programar'}</p>
                </div>
                <div className="p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                    <Users size={12} /> Convocatoria
                  </p>
                  <p className="mt-1.5 text-[13.5px] font-medium text-ink-800">
                    {o.callup ? `${o.confirmed} / ${o.callup.slots}` : '—'}
                  </p>
                  <p className="text-[12px] text-ink-400">
                    {o.callup ? `${o.pending} pendientes` : 'sin crear'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50/40 px-5 py-2.5">
                <span className="text-[12.5px] text-ink-500">{o.team.venue}</span>
                <ChevronRight size={16} className="text-ink-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
