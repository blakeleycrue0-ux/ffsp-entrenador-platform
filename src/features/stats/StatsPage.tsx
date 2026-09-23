/**
 * Analíticas.
 * ---------------------------------------------------------------------------
 * Todo lo que aparece aquí sale de lo que habéis registrado. Nada se estima,
 * nada se predice y **lo que falta no se convierte en un cero**: si no hay dato
 * se escribe «sin datos» y se explica por qué.
 *
 * Cada cifra dice cómo se calcula, para que nadie tome una decisión sobre un
 * número que no entiende.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClub } from '@/store/store';
import {
  attendanceTrend, playerAttendance, squadOf, summarizeRecord, teamAttendanceRate, visibleTeams,
  type PlayerAttendance,
} from '@/store/selectors';
import {
  EmptyState, Figure, PageHeader, Panel, PanelHeader, Segmented, Select, Tooltip,
} from '@/components/ui';
import { Avatar, Meter } from '@/components/ui';
import { BarTrend, LineTrend } from '@/components/domain/Charts';
import { cn, dayShort, shortDate } from '@/lib/utils';

/** Un porcentaje que puede no existir. Nunca se dibuja como 0 %. */
const Pct = ({ value, className }: { value: number | null; className?: string }) =>
  value === null ? (
    <span className={cn('text-navy-400', className)}>Sin datos</span>
  ) : (
    <span className={cn('tabular-nums', className)}>{value}%</span>
  );

type Periodo = '4' | '8' | 'todo';

export default function StatsPage() {
  const { data, teamId, setTeamId } = useClub();
  const teams = visibleTeams(data);
  const [periodo, setPeriodo] = useState<Periodo>('8');

  const team = teams.find((t) => t.id === teamId);
  const squad = useMemo(() => squadOf(data, teamId).filter((p) => !p.archivedAt), [data, teamId]);

  const records = useMemo(
    () => data.attendance.filter((a) => a.teamId === teamId).sort((a, b) => a.date.localeCompare(b.date)),
    [data.attendance, teamId],
  );

  const n = periodo === 'todo' ? records.length : Number(periodo);
  const rows = useMemo(() => playerAttendance(data, teamId, n), [data, teamId, n]);
  const trend = useMemo(() => attendanceTrend(data, teamId, n), [data, teamId, n]);

  const rate = teamAttendanceRate(data, teamId, n);
  /** Mismo número de sesiones, pero las anteriores: sirve para comparar. */
  const previous = useMemo(() => {
    const older = records.slice(0, Math.max(0, records.length - n));
    if (older.length === 0) return null;
    let present = 0;
    let computable = 0;
    for (const r of older.slice(-n)) {
      for (const e of Object.values(r.marks)) {
        if (!['presente', 'tarde', 'ausente'].includes(e.mark)) continue;
        computable += 1;
        if (e.mark === 'presente' || e.mark === 'tarde') present += 1;
      }
    }
    return computable === 0 ? null : Math.round((present / computable) * 100);
  }, [records, n]);

  const delta = rate !== null && previous !== null ? rate - previous : null;

  const medibles = rows.filter((r) => r.computable > 0);
  const best = [...medibles].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).slice(0, 5);
  const worst = [...medibles].sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)).slice(0, 5);
  /** Sólo por ausencias sin justificar: una lesión no pone a nadie «en riesgo». */
  const atencion = rows.filter((r) => r.streak >= 2 || (r.rate !== null && r.computable >= 3 && r.rate < 60));
  const sinDatos = rows.filter((r) => r.computable === 0);

  const selector = (
    <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-auto min-w-[170px]">
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </Select>
  );

  if (records.length === 0) {
    return (
      <>
        <PageHeader
          title="Analíticas"
          description="Lo que se puede calcular con lo que habéis registrado."
          actions={selector}
        />
        <Panel>
          <EmptyState
            title="Todavía no hay asistencia registrada"
            description="Pasa lista en un par de entrenamientos y aquí aparecerá la evolución del equipo. No mostramos cifras hasta que existan."
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analíticas"
        description="Asistencia y participación, calculadas sobre lo que habéis registrado."
        actions={
          <>
            <Segmented<Periodo>
              value={periodo}
              onChange={setPeriodo}
              options={[
                { id: '4', label: 'Últimas 4' },
                { id: '8', label: 'Últimas 8' },
                { id: 'todo', label: 'Todo' },
              ]}
            />
            {selector}
          </>
        }
      />

      {/* Cifras principales */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-4">
          <Figure
            label="Asistencia media"
            value={<Pct value={rate} />}
            hint={
              <>
                {records.length === 1 ? '1 sesión registrada' : `${records.length} sesiones registradas`}
                {delta !== null && (
                  <>
                    {' · '}
                    <span className={delta >= 0 ? 'text-ok' : 'text-bad'}>
                      {delta >= 0 ? '+' : ''}
                      {delta} puntos respecto al periodo anterior
                    </span>
                  </>
                )}
              </>
            }
          />
        </Panel>
        <Panel className="p-4">
          <Figure
            label="En plantilla"
            value={squad.length}
            hint={`${squad.filter((p) => !['disponible', 'duda'].includes(p.availability.status)).length} no disponibles hoy`}
          />
        </Panel>
        <Panel className="p-4">
          <Figure
            label="Mejor asistencia"
            value={best[0] ? <Pct value={best[0].rate} /> : '—'}
            hint={best[0]?.player.shortName ?? 'Sin datos suficientes'}
          />
        </Panel>
        <Panel className="p-4">
          <Figure
            label="Con ausencias repetidas"
            value={atencion.length}
            hint="Dos faltas seguidas sin justificar, o menos del 60 % con tres sesiones o más"
            tone={atencion.length > 0 ? 'warn' : undefined}
          />
        </Panel>
      </div>

      <Panel className="mt-3 px-4 py-3">
        <p className="text-sm leading-relaxed text-navy-700">
          <strong className="font-medium">Cómo se calcula.</strong> El porcentaje es «veces que vino»
          entre «veces que se pasó lista y podía venir». Las faltas justificadas, las lesiones y las
          sesiones sin lista no cuentan ni a favor ni en contra: quedan fuera del cálculo. Llegar
          tarde cuenta como haber venido.
        </p>
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Evolución de la asistencia"
            description="Cada punto es una sesión con lista pasada."
          />
          <div className="p-4">
            {trend.length < 2 ? (
              <p className="py-10 text-center text-base text-muted">
                Hacen falta al menos dos sesiones con lista para dibujar una evolución.
              </p>
            ) : (
              <LineTrend points={trend} height={150} />
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Sesión a sesión" description="Las últimas registradas." />
          <div className="p-4">
            <BarTrend
              data={records
                .slice(-6)
                .map((r) => ({ r, s: summarizeRecord(r, squad.length) }))
                .filter(({ s }) => s.rate !== null)
                .map(({ r, s }) => ({ label: dayShort(r.date), value: s.rate as number }))}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <RankingPanel title="Mayor asistencia" rows={best} tone="ok" />
        <RankingPanel title="Menor asistencia" rows={worst} tone="bad" detail />
      </div>

      {atencion.length > 0 && (
        <Panel className="mt-3 border-warn/40">
          <PanelHeader
            title="Merecen una conversación"
            description="Dos o más faltas seguidas sin justificar, o menos del 60 % con al menos tres sesiones. Es un punto de partida para hablar, no una conclusión."
          />
          <ul className="divide-y divide-line">
            {atencion.map((r) => (
              <li key={r.player.id}>
                <Link
                  to={`/app/plantilla/${r.player.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface"
                >
                  <Avatar name={r.player.name} size={30} badge={r.player.number} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-navy-900">
                      {r.player.shortName}
                    </span>
                    <span className="block text-sm text-muted">
                      {r.streak >= 2
                        ? `${r.streak} faltas seguidas`
                        : `${r.absent} de ${r.computable} sesiones sin venir`}
                    </span>
                  </span>
                  <Pct value={r.rate} className="text-base font-semibold" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {sinDatos.length > 0 && (
        <Panel className="mt-3 px-4 py-3">
          <p className="text-sm leading-relaxed text-navy-700">
            <strong className="font-medium">Sin datos en este periodo:</strong>{' '}
            {sinDatos.map((r) => r.player.shortName).join(', ')}. No aparecen en los porcentajes
            porque no se ha pasado lista con ellas, o porque constaban justificadas o lesionadas. No
            significa que su asistencia sea del 0 %.
          </p>
        </Panel>
      )}

      {/* Detalle por sesión */}
      <Panel className="mt-3 overflow-hidden">
        <PanelHeader
          title="Detalle por sesión"
          description={`${team?.name ?? ''}${team?.season ? ` · temporada ${team.season}` : ''}`}
        />
        <div className="overflow-x-auto">
          <table className="grid-table min-w-[600px]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th className="text-right">Presentes</th>
                <th className="text-right">Tarde</th>
                <th className="text-right">Justificadas</th>
                <th className="text-right">Ausentes</th>
                <th className="text-right">Sin registrar</th>
                <th className="text-right">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {[...records].reverse().map((r) => {
                const s = summarizeRecord(r, squad.length);
                return (
                  <tr key={r.id}>
                    <td className="text-navy-700">
                      {shortDate(r.date)} <span className="text-navy-400">· {dayShort(r.date)}</span>
                    </td>
                    <td className="text-right tabular-nums text-ok">{s.present}</td>
                    <td className="text-right tabular-nums">{s.late || <span className="text-navy-300">—</span>}</td>
                    <td className="text-right tabular-nums">{s.justified || <span className="text-navy-300">—</span>}</td>
                    <td className="text-right tabular-nums text-bad">{s.absent}</td>
                    <td className="text-right tabular-nums text-navy-400">{s.unregistered}</td>
                    <td className="text-right font-semibold">
                      <Pct value={s.rate} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
        Estas cifras describen la asistencia, no el rendimiento. La plataforma no calcula carga
        física, riesgo de lesión ni proyecciones: sólo cuenta lo que habéis anotado.
      </p>
    </>
  );
}

function RankingPanel({
  title, rows, tone, detail,
}: { title: string; rows: PlayerAttendance[]; tone: 'ok' | 'bad'; detail?: boolean }) {
  return (
    <Panel>
      <PanelHeader title={title} />
      {rows.length === 0 ? (
        <EmptyState title="Sin datos suficientes" description="Hace falta al menos una sesión con lista pasada." />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.player.id}>
              <Link
                to={`/app/plantilla/${r.player.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface"
              >
                <span className="w-4 text-center text-sm font-semibold tabular-nums text-navy-400">{i + 1}</span>
                <Avatar name={r.player.name} size={30} badge={r.player.number} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-navy-900">
                    {r.player.shortName}
                  </span>
                  {detail ? (
                    <span className="block text-sm text-muted">
                      {r.absent} de {r.computable} sin venir
                      {r.justified > 0 && ` · ${r.justified} justificada${r.justified === 1 ? '' : 's'}`}
                    </span>
                  ) : (
                    <Meter value={r.rate ?? 0} tone={tone} className="mt-1.5" height={4} />
                  )}
                </span>
                <Tooltip label={`${r.present + r.late} de ${r.computable} sesiones`}>
                  <Pct value={r.rate} className="text-base font-semibold" />
                </Tooltip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
