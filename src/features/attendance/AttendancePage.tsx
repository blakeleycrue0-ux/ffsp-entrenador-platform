/**
 * Asistencia.
 * ---------------------------------------------------------------------------
 * Pantalla optimizada para el móvil, de pie en el campo, con prisa:
 * equipo → sesión → marcar → guardar. «Marcar todos como presentes» primero,
 * y luego sólo se corrigen las excepciones. Un toque por estado.
 *
 * «Sin registrar» no es una ausencia: mientras nadie haya pasado lista, así se
 * dice — no se cuenta como falta ni se convierte en un cero.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Save, Undo2 } from 'lucide-react';
import { useClub } from '@/store/store';
import { squadOf, teamAttendanceRate, visibleTeams } from '@/store/selectors';
import {
  Avatar, Tag, Button, Panel, EmptyState, PageHeader, Select, Figure,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { ATTENDANCE, AVAILABILITY, AvailabilityDot } from '@/components/domain/StatusBits';
import { SplitBar } from '@/components/domain/Charts';
import { cn, longDate, relativeDay, toISODate, today } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { AttendanceMark } from '@/types';

const MARKS: AttendanceMark[] = ['presente', 'tarde', 'justificada', 'lesionada', 'ausente'];

export default function AttendancePage() {
  const { data, teamId, setTeamId, actions } = useClub();
  const toast = useToast();
  const teams = visibleTeams(data);
  const [saving, setSaving] = useState(false);

  const squad = useMemo(() => squadOf(data, teamId), [data, teamId]);

  /** Sesiones seleccionables: las de hoy y días próximos, más las recientes. */
  const sessions = useMemo(
    () =>
      data.sessions
        .filter((s) => s.teamId === teamId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 12),
    [data.sessions, teamId],
  );

  const todaySession = sessions.find((s) => s.date === toISODate(today()));
  const [sessionId, setSessionId] = useState(() => todaySession?.id ?? sessions[0]?.id ?? '');
  const session = sessions.find((s) => s.id === sessionId);

  const existing = data.attendance.find((a) => a.sessionId === sessionId);
  const [marks, setMarks] = useState<Record<string, { mark: AttendanceMark; reason?: string }>>({});
  const [dirty, setDirty] = useState(false);

  // Al cambiar de sesión o de equipo se recarga lo ya registrado.
  useEffect(() => {
    const base: Record<string, { mark: AttendanceMark; reason?: string }> = {};
    squad.forEach((p) => {
      base[p.id] = existing?.marks[p.id] ?? {
        // Una jugadora con parte médico abierto entra ya como justificada.
        mark: p.availability.status === 'lesionada'
          ? 'lesionada'
          : ['enferma', 'sancionada'].includes(p.availability.status)
            ? 'justificada'
            : 'sin_registrar',
        reason: ['lesionada', 'enferma', 'sancionada'].includes(p.availability.status)
          ? AVAILABILITY[p.availability.status].label
          : undefined,
      };
    });
    setMarks(base);
    setDirty(false);
  }, [sessionId, teamId, squad.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const first = sessions.find((s) => s.date === toISODate(today())) ?? sessions[0];
    if (first && !sessions.some((s) => s.id === sessionId)) setSessionId(first.id);
  }, [sessions, sessionId]);

  const counts = useMemo(() => {
    const list = Object.values(marks);
    return {
      presente: list.filter((m) => m.mark === 'presente').length,
      tarde: list.filter((m) => m.mark === 'tarde').length,
      justificada: list.filter((m) => m.mark === 'justificada').length,
      lesionada: list.filter((m) => m.mark === 'lesionada').length,
      ausente: list.filter((m) => m.mark === 'ausente').length,
      sinRegistrar: list.filter((m) => m.mark === 'sin_registrar').length,
    };
  }, [marks]);

  const setMark = (playerId: string, mark: AttendanceMark) => {
    setMarks((m) => ({ ...m, [playerId]: { ...m[playerId], mark } }));
    setDirty(true);
  };

  const markAllPresent = () => {
    setMarks((m) => {
      const next = { ...m };
      squad.forEach((p) => {
        // No se pisa a quien ya tiene parte médico.
        if (!['justificada', 'lesionada'].includes(next[p.id]?.mark)) next[p.id] = { mark: 'presente' };
      });
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await actions.saveAttendance({
        id: existing?.id ?? '',
        sessionId: session.id,
        teamId,
        date: session.date,
        marks,
        savedAt: new Date().toISOString(),
      });
      await actions.log({
        kind: 'asistencia',
        teamId,
        text: `Has registrado la asistencia del ${relativeDay(session.date).toLowerCase()} (${counts.presente} presentes).`,
        link: `/app/entrenamientos/${session.id}/asistencia`,
      });
      toast.success('Asistencia registrada', `${counts.presente} presentes · ${counts.ausente} ausentes`);
      setDirty(false);
    } catch (e) {
      toast.error('No hemos podido guardar la asistencia', humanError(e));
    } finally {
      setSaving(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <>
        <PageHeader title="Asistencia" description="Pasa lista en menos de treinta segundos." />
        <Panel>
          <EmptyState
           
            title="No hay entrenamientos de este equipo"
            description="Crea una sesión y podrás registrar la asistencia desde aquí."
            action={
              <Link
                to="/app/entrenamientos/nuevo"
                className="inline-flex h-9 items-center rounded-lg bg-navy-900 px-4 text-[13px] font-medium text-white"
              >
                Crear entrenamiento
              </Link>
            }
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Asistencia"
        description="Marca todos como presentes y corrige sólo las excepciones."
        actions={
          <div className="hidden gap-2 sm:flex">
            <Button variant="secondary" size="sm" icon={<CheckCheck size={15} />} onClick={markAllPresent}>
              Marcar todos como presentes
            </Button>
            <Button size="sm" icon={<Save size={15} />} loading={saving} onClick={save} disabled={!dirty && !!existing}>
              Guardar asistencia
            </Button>
          </div>
        }
      />

      {/* Selectores */}
      <Panel className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Equipo</label>
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Entrenamiento</label>
            <Select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {relativeDay(s.date)} · {s.start} — {s.title}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {session && (
          <p className="mt-3 text-[12.5px] text-muted">
            {longDate(session.date)} · {session.start} · {session.venue}
            {existing?.savedAt && <span className="ml-2 text-navy-400">· ya registrada, puedes corregirla</span>}
          </p>
        )}
      </Panel>

      {/* Resumen en vivo */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-5">
          <Figure label="Plantilla" value={squad.length} hint={`${counts.sinRegistrar} sin registrar`} />
        </Panel>
        <Panel className="p-5">
          <Figure label="Presentes" value={counts.presente} tone="ok" hint="en esta sesión" />
        </Panel>
        <Panel className="p-5">
          <Figure label="Justificadas" value={counts.justificada} tone="warn" hint="con motivo" />
        </Panel>
        <Panel className="p-5">
          <Figure label="Ausentes" value={counts.ausente} tone="bad" hint={`media del equipo ${teamAttendanceRate(data, teamId)}%`} />
        </Panel>
      </div>

      <Panel className="mb-4 p-4">
        <SplitBar
          height={10}
          segments={[
            { value: counts.presente, color: 'bg-ok', label: 'Presentes' },
            { value: counts.tarde, color: 'bg-warn', label: 'Tarde' },
            { value: counts.justificada, color: 'bg-warn/60', label: 'Justificadas' },
            { value: counts.lesionada, color: 'bg-bad/60', label: 'Lesionadas' },
            { value: counts.ausente, color: 'bg-bad', label: 'Ausentes' },
            { value: counts.sinRegistrar, color: 'bg-line', label: 'Sin registrar' },
          ]}
        />
      </Panel>

      {/* Lista de marcado */}
      <Panel className="overflow-hidden">
        <ul className="divide-y divide-navy-100">
          {squad.map((p) => {
            const current = marks[p.id]?.mark ?? 'pendiente';
            return (
              <li key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <Link to={`/app/plantilla/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                  <Avatar name={p.name} size={38} badge={p.number} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-navy-900">{p.shortName}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                      <AvailabilityDot status={p.availability.status} />
                      {p.position}
                      {p.availability.status !== 'disponible' && (
                        <span className="text-navy-400">· {AVAILABILITY[p.availability.status].label}</span>
                      )}
                    </span>
                  </span>
                </Link>

                {/* Botonera de estados — grande y con buen área táctil */}
                <div className="grid shrink-0 grid-cols-4 gap-1.5 sm:flex">
                  {MARKS.map((m) => {
                    const a = ATTENDANCE[m];
                    const active = current === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMark(p.id, m)}
                        className={cn(
                          'flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-medium transition-all sm:w-auto sm:min-w-[92px]',
                          active
                            ? m === 'presente'
                              ? 'border-ok bg-ok/10 text-[#1F6B44]'
                              : m === 'justificada'
                                ? 'border-warn bg-warn/10 text-[#9A6412]'
                                : m === 'ausente'
                                  ? 'border-bad bg-bad/8 text-[#A63B34]'
                                  : 'border-navy-300 bg-navy-100 text-navy-600'
                            : 'border-line text-navy-400 hover:border-navy-300 hover:text-navy-600',
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', active ? a.bg : 'bg-line')} />
                        <span className="hidden sm:inline">{a.label}</span>
                        <span className="sm:hidden">{a.short}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Barra de guardado fija en móvil */}
      <div className="sticky bottom-[calc(76px+var(--safe-bottom))] z-20 mt-4 lg:static lg:mt-6">
        <Panel className="flex flex-col items-stretch gap-3 p-4 shadow-pop sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="ok">{counts.presente} presentes</Tag>
            {counts.tarde > 0 && <Tag tone="warn">{counts.tarde} tarde</Tag>}
            <Tag tone="bad">{counts.ausente} ausentes</Tag>
            {counts.sinRegistrar > 0 && <Tag tone="neutral">{counts.sinRegistrar} sin registrar</Tag>}
          </div>
          <div className="flex gap-2 pr-[72px] sm:pr-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCheck size={15} />}
              onClick={markAllPresent}
              className="flex-1 sm:hidden"
            >
              Todos
            </Button>
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Undo2 size={15} />}
                onClick={() => {
                  const base: Record<string, { mark: AttendanceMark; reason?: string }> = {};
                  squad.forEach((p) => {
                    base[p.id] = existing?.marks[p.id] ?? { mark: 'sin_registrar' };
                  });
                  setMarks(base);
                  setDirty(false);
                }}
              >
                Descartar cambios
              </Button>
            )}
            <Button size="sm" icon={<Save size={15} />} loading={saving} onClick={save} disabled={!dirty && !!existing} className="flex-1 sm:flex-none">
              Guardar
              <span className="hidden sm:inline">&nbsp;asistencia</span>
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
