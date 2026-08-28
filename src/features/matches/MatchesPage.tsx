import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight, Clock, MapPin, Plus, Swords, Users } from 'lucide-react';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Select, Tabs } from '@/components/ui';
import { CLUB_NAME, cn, longDate, relativeDay, toISODate, today } from '@/lib/utils';

export default function MatchesPage() {
  const { data, teamId, setTeamId } = useClub();
  const teams = visibleTeams(data);
  const [tab, setTab] = useState('proximos');

  const matches = useMemo(() => {
    const iso = toISODate(today());
    const all = data.matches
      .filter((m) => teams.some((t) => t.id === m.teamId))
      .filter((m) => (teamId === 'todos' ? true : m.teamId === teamId));
    return tab === 'proximos'
      ? all.filter((m) => m.date >= iso && m.status === 'programado').sort((a, b) => a.date.localeCompare(b.date))
      : all.filter((m) => m.status === 'jugado' || m.date < iso).sort((a, b) => b.date.localeCompare(a.date));
  }, [data.matches, teams, teamId, tab]);

  const counts = useMemo(() => {
    const iso = toISODate(today());
    const all = data.matches.filter((m) => teams.some((t) => t.id === m.teamId));
    return {
      proximos: all.filter((m) => m.date >= iso && m.status === 'programado').length,
      jugados: all.filter((m) => m.status === 'jugado' || m.date < iso).length,
    };
  }, [data.matches, teams]);

  return (
    <>
      <PageHeader
        title="Partidos"
        description="Calendario de competición, convocatorias y resultados."
        actions={
          <LinkButton to="/app/partidos/nuevo" size="sm" icon={<Plus size={16} />}>
            Crear partido
          </LinkButton>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          className="border-0"
          tabs={[
            { id: 'proximos', label: 'Próximos', count: counts.proximos },
            { id: 'jugados', label: 'Jugados', count: counts.jugados },
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

      {matches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Swords size={26} />}
            title={tab === 'proximos' ? 'No tienes partidos programados' : 'Todavía no hay partidos jugados'}
            description={
              tab === 'proximos'
                ? 'Añade el próximo encuentro para poder preparar la convocatoria y avisar a las familias.'
                : 'Cuando registres resultados aparecerán aquí.'
            }
            action={
              tab === 'proximos' && (
                <LinkButton to="/app/partidos/nuevo" size="sm">
                  Crear partido
                </LinkButton>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const callup = data.callups.find((c) => c.matchId === m.id);
            const selected = callup?.entries.filter((e) => e.selected) ?? [];
            const confirmed = selected.filter((e) => e.response === 'confirmada').length;
            const pending = selected.filter((e) => e.response === 'pendiente').length;

            return (
              <Link key={m.id} to={`/app/partidos/${m.id}`} className="card card-hover block overflow-hidden">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  {/* Fecha */}
                  <div className="flex shrink-0 items-center gap-4 sm:w-40 sm:flex-col sm:items-start sm:gap-0">
                    <div>
                      <p className="text-[13px] font-semibold text-brand-700">{relativeDay(m.date)}</p>
                      <p className="mt-0.5 text-[12px] text-ink-400">{longDate(m.date)}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-[12.5px] text-ink-500 sm:mt-2">
                      <Clock size={12} /> {m.start}
                    </span>
                  </div>

                  {/* Enfrentamiento */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1 text-right">
                      <p className="truncate text-[15px] font-semibold text-ink-900">
                        {m.home ? CLUB_NAME : m.opponent}
                      </p>
                    </div>
                    {m.result ? (
                      <span className="shrink-0 rounded-lg bg-ink-100 px-3 py-1.5 text-[15px] font-bold text-ink-900 tabular-nums">
                        {m.home ? m.result.own : m.result.rival} – {m.home ? m.result.rival : m.result.own}
                      </span>
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
                        vs
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink-900">
                        {m.home ? m.opponent : CLUB_NAME}
                      </p>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex shrink-0 items-center gap-3 sm:w-56 sm:justify-end">
                    {m.status === 'programado' ? (
                      callup ? (
                        <div className="text-right">
                          <p className="text-[13.5px] font-medium text-ink-800 tabular-nums">
                            {confirmed} / {selected.length} confirmadas
                          </p>
                          <p className={cn('text-[12px]', pending > 0 ? 'text-[#9A6412]' : 'text-ink-400')}>
                            {pending > 0 ? `${pending} pendientes` : 'Convocatoria completa'}
                          </p>
                        </div>
                      ) : (
                        <Badge tone="warning" size="sm">
                          <Users size={11} /> Sin convocatoria
                        </Badge>
                      )
                    ) : (
                      <Badge tone="neutral" size="sm">
                        Jugado
                      </Badge>
                    )}
                    <ChevronRight size={16} className="text-ink-300" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-ink-100 bg-ink-50/40 px-5 py-2.5 text-[12.5px] text-ink-500">
                  <span>{data.teams.find((t) => t.id === m.teamId)?.name}</span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock size={12} /> {m.competition}
                    {m.matchday && ` · J${m.matchday}`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} /> {m.venue}
                  </span>
                  <Badge tone={m.home ? 'brand' : 'neutral'} size="sm" className="ml-auto">
                    {m.home ? 'Local' : 'Visitante'}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
