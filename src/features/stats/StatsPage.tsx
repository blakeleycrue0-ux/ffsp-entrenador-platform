import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useClub } from '@/store/store';
import {
  attendanceTrend, playerAttendance, squadOf, teamAttendanceRate, visibleTeams,
} from '@/store/selectors';
import { Avatar, Badge, Card, EmptyState, PageHeader, ProgressBar, Select, Stat } from '@/components/ui';
import { BarTrend, LineTrend, Ring } from '@/components/domain/Charts';
import { cn, dayShort, shortDate } from '@/lib/utils';

export default function StatsPage() {
  const { data, teamId, setTeamId } = useClub();
  const teams = visibleTeams(data);

  const squad = useMemo(() => squadOf(data, teamId), [data, teamId]);
  const rows = useMemo(() => playerAttendance(data, teamId), [data, teamId]);
  const trend = useMemo(() => attendanceTrend(data, teamId, 8), [data, teamId]);
  const rate = teamAttendanceRate(data, teamId);

  const best = [...rows].sort((a, b) => b.rate - a.rate).slice(0, 5);
  const worst = [...rows].filter((r) => r.total > 0).sort((a, b) => a.rate - b.rate).slice(0, 5);
  const risk = rows.filter((r) => r.streak >= 2 || r.rate < 60);

  const records = useMemo(
    () => data.attendance.filter((a) => a.teamId === teamId).sort((a, b) => a.date.localeCompare(b.date)),
    [data.attendance, teamId],
  );

  const team = teams.find((t) => t.id === teamId);
  const unavailable = squad.filter((p) => !['disponible', 'duda'].includes(p.availability.status));

  if (records.length === 0) {
    return (
      <>
        <PageHeader title="Estadísticas" description="Asistencia, evolución y jugadoras a las que prestar atención." />
        <Card>
          <EmptyState
            icon={<TrendingUp size={26} />}
            title="Todavía no hay datos suficientes"
            description="Registra la asistencia de un par de entrenamientos y aquí aparecerá la evolución del equipo."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Estadísticas"
        description="Sólo lo que ayuda a decidir: asistencia, evolución y jugadoras en riesgo."
        actions={
          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-auto min-w-[180px]">
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        }
      />

      {/* Cifras principales */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-4 p-5">
          <Ring value={rate} size={68} stroke={6} />
          <Stat label="Asistencia media" value={`${rate}%`} hint={`${records.length} sesiones registradas`} />
        </Card>
        <Card className="p-5">
          <Stat label="Plantilla" value={squad.length} hint={`${unavailable.length} no disponibles`} />
        </Card>
        <Card className="p-5">
          <Stat
            label="Mejor asistencia"
            value={best[0] ? `${best[0].rate}%` : '—'}
            hint={best[0]?.player.shortName ?? ''}
            tone="success"
          />
        </Card>
        <Card className="p-5">
          <Stat
            label="Jugadoras en riesgo"
            value={risk.length}
            hint="ausencias seguidas o menos del 60 %"
            tone={risk.length > 0 ? 'warning' : 'success'}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Evolución */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-[15px] font-semibold">Evolución semanal de la asistencia</h2>
          <p className="mt-1 text-[13px] text-ink-500">Porcentaje de presentes sobre la plantilla en cada sesión.</p>
          <LineTrend points={trend} className="mt-5" height={140} />
        </Card>

        {/* Sesión a sesión */}
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Sesión a sesión</h2>
          <p className="mt-1 text-[13px] text-ink-500">Últimos entrenamientos registrados.</p>
          <BarTrend
            className="mt-5"
            data={records.slice(-6).map((r) => {
              const marks = Object.values(r.marks);
              const present = marks.filter((m) => m.mark === 'presente').length;
              return {
                label: dayShort(r.date),
                value: Math.round((present / (marks.length || 1)) * 100),
              };
            })}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Mejor asistencia */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Trophy size={16} className="text-sun" /> Mayor asistencia
          </h2>
          <ul className="mt-4 space-y-3">
            {best.map((r, i) => (
              <li key={r.player.id}>
                <Link to={`/app/jugadoras/${r.player.id}`} className="group flex items-center gap-3">
                  <span className="w-5 text-center text-[12.5px] font-semibold text-ink-400 tabular-nums">{i + 1}</span>
                  <Avatar name={r.player.name} size={34} number={r.player.number} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink-800 group-hover:text-brand-800">
                      {r.player.shortName}
                    </span>
                    <ProgressBar value={r.rate} tone="success" className="mt-1.5" height={5} />
                  </span>
                  <span className="w-12 text-right text-[13.5px] font-semibold text-[#1F6B44] tabular-nums">
                    {r.rate}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {/* Más ausencias */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <TrendingDown size={16} className="text-danger" /> Menor asistencia
          </h2>
          <ul className="mt-4 space-y-3">
            {worst.map((r, i) => (
              <li key={r.player.id}>
                <Link to={`/app/jugadoras/${r.player.id}`} className="group flex items-center gap-3">
                  <span className="w-5 text-center text-[12.5px] font-semibold text-ink-400 tabular-nums">{i + 1}</span>
                  <Avatar name={r.player.name} size={34} number={r.player.number} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink-800 group-hover:text-brand-800">
                      {r.player.shortName}
                    </span>
                    <span className="block text-[12px] text-ink-400">
                      {r.absent} {r.absent === 1 ? 'ausencia' : 'ausencias'} · {r.justified}{' '}
                      {r.justified === 1 ? 'justificada' : 'justificadas'}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'w-12 text-right text-[13.5px] font-semibold tabular-nums',
                      r.rate >= 70 ? 'text-[#9A6412]' : 'text-danger',
                    )}
                  >
                    {r.rate}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Jugadores en riesgo */}
      {risk.length > 0 && (
        <Card className="mt-4 border-sun/30 bg-sun/5 p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#8A5A10]">
            <AlertTriangle size={16} /> Merecen una conversación
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#8A5A10]/85">
            Jugadoras con dos o más ausencias seguidas, o por debajo del 60 % de asistencia. Antes de tomar decisiones
            deportivas suele merecer la pena hablar con ellas o con sus familias.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {risk.map((r) => (
              <Link
                key={r.player.id}
                to={`/app/jugadoras/${r.player.id}`}
                className="flex items-center gap-3 rounded-xl border border-sun/25 bg-white p-3 transition-colors hover:border-sun/50"
              >
                <Avatar name={r.player.name} size={34} number={r.player.number} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink-800">{r.player.shortName}</span>
                  <span className="block text-[12px] text-ink-500">
                    {r.streak >= 2 ? `${r.streak} ausencias seguidas` : `Asistencia ${r.rate}%`}
                  </span>
                </span>
                {r.player.availability.status !== 'disponible' && (
                  <Badge tone="neutral" size="sm">
                    {r.player.availability.status}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Detalle por sesión */}
      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold">Detalle por sesión</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-500">{team?.name} · temporada {team?.season}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13.5px]">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-[11.5px] uppercase tracking-wide text-ink-400">
                <th className="px-5 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-3 py-2.5 text-right font-medium">Presentes</th>
                <th className="px-3 py-2.5 text-right font-medium">Justificadas</th>
                <th className="px-3 py-2.5 text-right font-medium">Ausentes</th>
                <th className="px-5 py-2.5 text-right font-medium">Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {[...records].reverse().map((r) => {
                const marks = Object.values(r.marks);
                const present = marks.filter((m) => m.mark === 'presente').length;
                const justified = marks.filter((m) => m.mark === 'justificada').length;
                const absent = marks.filter((m) => m.mark === 'ausente').length;
                const pctv = Math.round((present / (marks.length || 1)) * 100);
                return (
                  <tr key={r.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-2.5 text-ink-700">
                      {shortDate(r.date)} <span className="text-ink-400">· {dayShort(r.date)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#1F6B44] tabular-nums">{present}</td>
                    <td className="px-3 py-2.5 text-right text-[#9A6412] tabular-nums">{justified}</td>
                    <td className="px-3 py-2.5 text-right text-danger tabular-nums">{absent}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-ink-800 tabular-nums">{pctv}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
