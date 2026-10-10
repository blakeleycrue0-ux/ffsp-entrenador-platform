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
import { squadOf, visibleTeams } from '@/store/selectors';
import { Avatar, Button, EmptyState, PageHeader, Panel, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { AvailabilityDot, asistencia, disponibilidad } from '@/components/domain/StatusBits';
import { cn, longDate, relativeDay, toISODate, today } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { AttendanceMark } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';

const MARKS: AttendanceMark[] = ['presente', 'tarde', 'justificada', 'lesionada', 'ausente'];

export default function AttendancePage() {
  /* El ancho lo decide la tarea, no la pantalla. */
  useAnchura('tabla');
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
          ? disponibilidad(p.availability.status).label
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

  /** El estado de partida, para poder contar los cambios y deshacerlos. */
  const partida = useMemo(() => {
    const base: Record<string, AttendanceMark> = {};
    squad.forEach((p) => {
      base[p.id] = existing?.marks[p.id]?.mark
        ?? (p.availability.status === 'lesionada'
          ? 'lesionada'
          : ['enferma', 'sancionada'].includes(p.availability.status)
            ? 'justificada'
            : 'sin_registrar');
    });
    return base;
  }, [squad, existing]);

  /* Cuántas marcas se han tocado. La barra de guardar dice esto y sólo esto:
     un número que no se sabe de dónde sale no sirve para decidir si guardar. */
  const cambios = useMemo(
    () => Object.entries(marks).filter(([id, m]) => m.mark !== partida[id]).length,
    [marks, partida],
  );

  const descartar = () => {
    const base: Record<string, { mark: AttendanceMark; reason?: string }> = {};
    squad.forEach((p) => { base[p.id] = existing?.marks[p.id] ?? { mark: partida[p.id] }; });
    setMarks(base);
    setDirty(false);
  };

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
                className="inline-flex h-9 items-center rounded-lg bg-ink-900 px-4 text-[13px] font-medium text-ink-0"
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
        description="Marca a todas como presentes y cambia sólo las excepciones."
      />

      {/* ── QUÉ SESIÓN ────────────────────────────────────────────────────────
          Dos desplegables y la fecha debajo. Sin caja: agrupar dos campos que
          ya están juntos no añade ninguna información, sólo un borde más. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="asis-equipo">Equipo</label>
          <Select id="asis-equipo" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="label" htmlFor="asis-sesion">Entrenamiento</label>
          <Select id="asis-sesion" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {relativeDay(s.date)} · {s.start}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {session && (
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          {/* El título va aquí y no dentro del desplegable: ahí se cortaba a
              media palabra, porque un `<select>` nativo no se puede recortar
              con puntos suspensivos. */}
          {session.title && <span className="text-ink-700">{session.title} · </span>}
          {longDate(session.date)} · {session.start}
          {session.venue ? ` · ${session.venue}` : ''}
          {existing?.savedAt && <span className="text-ink-400"> · ya registrada, puedes corregirla</span>}
        </p>
      )}

      {/* ── RESUMEN ───────────────────────────────────────────────────────────
          Cuatro cifras con su palabra debajo, y nada más. Antes eran cuatro
          cajas con borde, fondo, radio y relleno, más una barra de colores en
          una quinta caja: cinco rectángulos para decir «18 de 22». La cifra
          grande ya es el contraste; el recuadro no añadía nada. */}
      {/* Rejilla, no una fila que se parte: envuelto, el cuarto dato caía solo
          a la línea de abajo y parecía que sobraba. */}
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Cifra valor={squad.length} etiqueta="Plantilla" />
        <Cifra valor={counts.presente + counts.tarde} etiqueta="Presentes" tono="ok" />
        <Cifra valor={counts.ausente} etiqueta="Ausentes" tono="bad" />
        <Cifra valor={counts.justificada + counts.lesionada} etiqueta="Justificadas" tono="warn" />
      </div>

      {counts.sinRegistrar > 0 && (
        <p className="mt-3 text-sm text-ink-500">
          {counts.sinRegistrar === 1
            ? 'Queda 1 jugadora sin marcar.'
            : `Quedan ${counts.sinRegistrar} jugadoras sin marcar.`}
        </p>
      )}

      {/* ── JUGADORAS ─────────────────────────────────────────────────────────
          La acción de «todas presentes» vive AQUÍ, al lado de la lista sobre la
          que actúa, y no en una barra flotante permanente junto al guardar: son
          dos cosas distintas y estaban en el mismo sitio, tocándose. */}
      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-md font-semibold text-ink-900">Jugadoras</h2>
        <Button variant="secondary" size="sm" icon={<CheckCheck size={15} />} onClick={markAllPresent}>
          Marcar todas presentes
        </Button>
      </div>

      <ul className="mt-2 divide-y divide-line">
        {squad.map((p) => {
          const current = marks[p.id]?.mark ?? 'sin_registrar';
          return (
            <li key={p.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:gap-4">
              <Link to={`/app/plantilla/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={p.name} size={36} badge={p.number} />
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium text-ink-900">{p.shortName}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-500">
                    <AvailabilityDot status={p.availability.status} />
                    {p.position}
                    {p.availability.status !== 'disponible' && (
                      <span className="truncate text-ink-400">· {disponibilidad(p.availability.status).label}</span>
                    )}
                  </span>
                </span>
              </Link>

              {/* Cinco estados, siempre en una fila que se desliza si no cabe:
                  partida en dos filas se convertía en un bloque y empujaba a
                  la jugadora de al lado. */}
              <div className="flex shrink-0 gap-1.5">
                {MARKS.map((m) => {
                  const a = asistencia(m);
                  const active = current === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMark(p.id, m)}
                      aria-pressed={active}
                      className={cn(
                        'h-10 min-w-0 flex-1 rounded-xl border px-2 text-sm font-medium transition-colors sm:h-9 sm:flex-none sm:px-3',
                        active
                          ? m === 'presente'
                            ? 'border-transparent bg-ok/15 text-ok'
                            : m === 'tarde' || m === 'justificada'
                              ? 'border-transparent bg-warn/15 text-warn'
                              : m === 'lesionada'
                                ? 'border-transparent bg-bad/12 text-bad'
                                : 'border-transparent bg-bad/15 text-bad'
                          : 'border-line text-ink-500 hover:border-ink-400 hover:text-ink-800',
                      )}
                    >
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

      {/* ── GUARDAR ───────────────────────────────────────────────────────────
          Sólo existe cuando hay algo que guardar. Antes había una barra fija
          permanente con las cifras, «Todos», «Descartar» y «Guardar» a la vez,
          y encima el botón redondo de crear se le montaba por la derecha; para
          que no se tocaran, la propia barra se reservaba 72 px a mano.
          Una barra, una responsabilidad: cuántos cambios hay y guardarlos. */}
      {dirty && (
        <div
          data-barra-fija
          className="sticky z-flotante mt-6 lg:static lg:mt-8"
          style={{ bottom: 'calc(var(--sobre-nav) + 12px)' }}
        >
          <div className="cristal flex items-center gap-3 rounded-2xl px-4 py-3">
            <p className="min-w-0 flex-1 truncate text-base text-ink-700">
              {cambios === 1 ? '1 cambio sin guardar' : `${cambios} cambios sin guardar`}
            </p>
            <Button variant="ghost" size="sm" icon={<Undo2 size={15} />} onClick={descartar}>
              <span className="hidden sm:inline">Descartar</span>
            </Button>
            <Button size="sm" icon={<Save size={15} />} loading={saving} onClick={save}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Una cifra y su palabra. Sin caja, sin borde y sin cápsula de color.
 *
 * EL NÚMERO VA EN BLANCO Y EL COLOR ES UN PUNTO. Tres cifras enormes en verde,
 * rojo y ámbar sobre negro se pelean entre ellas y ninguna destaca; además el
 * color acaba siendo lo primero que se ve, cuando lo primero que hay que leer
 * es cuántas son. El punto dice de qué es cada una sin gritar.
 */
function Cifra({
  valor, etiqueta, tono,
}: { valor: number; etiqueta: string; tono?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className="min-w-0">
      <p className="cifra text-[34px] text-ink-900">{valor}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
        {tono && (
          <span
            aria-hidden
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              tono === 'ok' ? 'bg-ok' : tono === 'warn' ? 'bg-warn' : 'bg-bad',
            )}
          />
        )}
        <span className="truncate">{etiqueta}</span>
      </p>
    </div>
  );
}
