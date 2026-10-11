/**
 * PASAR LISTA. Un toque por jugadora que falta.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ERA LA PEOR PANTALLA DE LA APLICACIÓN, y con diferencia:
 * `pruebas/complejidad.mjs` le contó 99 cosas que pulsar y 2.681 px de alto,
 * sin una sola acción pintada como la principal. Y es la pantalla que se usa
 * dos veces por semana, de pie en el campo, con el móvil en una mano.
 *
 * Las 99 salían de una cuenta muy simple: dieciséis jugadoras × cinco botones
 * de estado = ochenta, más dieciséis nombres enlazados a su ficha, más los
 * desplegables. Ochenta botones para decir que faltaron dos.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LO QUE DE VERDAD PASA EN UN ENTRENAMIENTO: vienen casi todas. El trabajo no
 * es decidir el estado de cada una: es señalar las dos que no están. Así que:
 *
 *  1. «TODAS VINIERON» ES LA ACCIÓN PRINCIPAL, grande y la primera. Un toque y
 *     la lista está hecha —menos las excepciones—. Antes existía, pero era un
 *     botón secundario pequeño perdido entre los otros ochenta.
 *  2. CADA FILA ES UN INTERRUPTOR. Toda la fila, no un botón dentro de ella:
 *     se toca el nombre y cambia de «Vino» a «No vino». Un toque por
 *     excepción, y el área que hay que acertar es de 390 × 60 px.
 *  3. EL MOTIVO SÓLO APARECE DONDE HAY UNA FALTA. Cuando alguien no viene sale
 *     un «¿Por qué?» en SU fila, y ahí están los cinco estados de siempre
 *     —tarde, justificada, lesionada, sin avisar—. En una lista normal eso son
 *     dos chips, no ochenta botones.
 *
 * NO SE HA PERDIDO NINGÚN ESTADO: los cinco siguen existiendo y se siguen
 * guardando igual. Lo que cambia es cuándo se preguntan.
 *
 * Y «SIN REGISTRAR» SIGUE SIENDO «SIN REGISTRAR». La lista no empieza con
 * todas presentes: empieza sin marcar, porque mientras nadie haya pasado lista
 * no hay asistencia, y rellenarla sola convertiría un descuido en dieciséis
 * presencias falsas. Lo que se ofrece es un botón para decirlo de una vez, que
 * es distinto de darlo por hecho.
 *
 * LA SESIÓN SALE DE LA DIRECCIÓN, que es de donde venía. Esta pantalla se abre
 * desde la ficha de un entrenamiento —`/app/entrenamientos/:id/asistencia`— y
 * aun así elegía la sesión por su cuenta: la de hoy, o la primera de la lista.
 * Se podía estar pasando lista de otro día sin enterarse.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronLeft, Save, Undo2, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { squadOf, visibleTeams } from '@/store/selectors';
import { Avatar, Button, EmptyState, LinkButton, Modal, PageHeader, Panel, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { ATTENDANCE, asistencia, disponibilidad } from '@/components/domain/StatusBits';
import { cn, longDate, relativeDay, toISODate, today } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { AttendanceMark, Player } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';

/** Los motivos de una falta, en el orden en el que se dan de verdad. */
const MOTIVOS: AttendanceMark[] = ['tarde', 'justificada', 'lesionada', 'ausente'];

/** Un estado cuenta como «no vino» cuando no es presente ni sin marcar. */
const falta = (m: AttendanceMark) => m !== 'presente' && m !== 'sin_registrar';

export default function AttendancePage() {
  /* El ancho lo decide la tarea, no la pantalla. */
  useAnchura('tabla');
  const { sessionId: enLaDireccion } = useParams();
  const { data, teamId, setTeamId, actions } = useClub();
  const toast = useToast();
  const teams = visibleTeams(data);
  const [saving, setSaving] = useState(false);

  const squad = useMemo(() => squadOf(data, teamId), [data, teamId]);

  /** Sesiones seleccionables: las recientes de este equipo. */
  const sessions = useMemo(
    () =>
      data.sessions
        .filter((s) => s.teamId === teamId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 12),
    [data.sessions, teamId],
  );

  /* La de la dirección manda. Sólo si no hay ninguna se elige: la de hoy, o la
     última. */
  const deLaDireccion = data.sessions.find((s) => s.id === enLaDireccion);
  const [sessionId, setSessionId] = useState(
    () => deLaDireccion?.id ?? sessions.find((s) => s.date === toISODate(today()))?.id ?? sessions[0]?.id ?? '',
  );
  const session = data.sessions.find((s) => s.id === sessionId);

  const existing = data.attendance.find((a) => a.sessionId === sessionId);
  const [marks, setMarks] = useState<Record<string, { mark: AttendanceMark; reason?: string }>>({});
  const [dirty, setDirty] = useState(false);
  /** De quién se está eligiendo el motivo. */
  const [porQue, setPorQue] = useState<Player | null>(null);

  /** El estado de partida de una jugadora: lo guardado, o su parte médico. */
  const dePartida = (p: Player): { mark: AttendanceMark; reason?: string } =>
    existing?.marks[p.id] ?? {
      /* Una jugadora con parte médico abierto entra ya como justificada: es un
         dato que ya está en la base, no una suposición. */
      mark: p.availability.status === 'lesionada'
        ? 'lesionada'
        : ['enferma', 'sancionada'].includes(p.availability.status)
          ? 'justificada'
          : 'sin_registrar',
      reason: ['lesionada', 'enferma', 'sancionada'].includes(p.availability.status)
        ? disponibilidad(p.availability.status).label
        : undefined,
    };

  // Al cambiar de sesión o de equipo se recarga lo ya registrado.
  useEffect(() => {
    const base: Record<string, { mark: AttendanceMark; reason?: string }> = {};
    squad.forEach((p) => { base[p.id] = dePartida(p); });
    setMarks(base);
    setDirty(false);
  }, [sessionId, teamId, squad.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Si la sesión elegida deja de existir —se ha cambiado de equipo—, se coge
     una de las que hay. Nunca se queda la pantalla en blanco. */
  useEffect(() => {
    if (sessions.length === 0 || sessions.some((s) => s.id === sessionId)) return;
    setSessionId(sessions.find((s) => s.date === toISODate(today()))?.id ?? sessions[0].id);
  }, [sessions, sessionId]);

  const cuenta = useMemo(() => {
    const list = squad.map((p) => marks[p.id]?.mark ?? 'sin_registrar');
    return {
      vinieron: list.filter((m) => m === 'presente' || m === 'tarde').length,
      faltaron: list.filter((m) => m === 'ausente' || m === 'justificada' || m === 'lesionada').length,
      sinMarcar: list.filter((m) => m === 'sin_registrar').length,
    };
  }, [squad, marks]);

  const cambios = useMemo(
    () => squad.filter((p) => (marks[p.id]?.mark ?? 'sin_registrar') !== dePartida(p).mark).length,
    [squad, marks], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const poner = (playerId: string, mark: AttendanceMark, reason?: string) => {
    setMarks((m) => ({ ...m, [playerId]: { mark, reason: reason ?? m[playerId]?.reason } }));
    setDirty(true);
  };

  /** El interruptor de la fila: vino ⇄ no vino. */
  const alternar = (p: Player) => {
    const actual = marks[p.id]?.mark ?? 'sin_registrar';
    poner(p.id, actual === 'presente' ? 'ausente' : 'presente');
  };

  const todasVinieron = () => {
    setMarks((m) => {
      const next = { ...m };
      squad.forEach((p) => {
        /* No se pisa a quien tiene parte médico: eso ya es un dato. */
        const actual = next[p.id]?.mark;
        if (actual !== 'justificada' && actual !== 'lesionada') next[p.id] = { mark: 'presente' };
      });
      return next;
    });
    setDirty(true);
  };

  const descartar = () => {
    const base: Record<string, { mark: AttendanceMark; reason?: string }> = {};
    squad.forEach((p) => { base[p.id] = dePartida(p); });
    setMarks(base);
    setDirty(false);
  };

  const guardar = async () => {
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
        text: `Has pasado lista del ${relativeDay(session.date).toLowerCase()} (${cuenta.vinieron} vinieron).`,
        link: `/app/entrenamientos/${session.id}/asistencia`,
      });
      toast.success(
        'Lista guardada',
        cuenta.faltaron === 0
          ? `Vinieron las ${cuenta.vinieron}.`
          : `${cuenta.vinieron} vinieron · ${cuenta.faltaron} faltaron`,
      );
      setDirty(false);
    } catch (e) {
      toast.error('No he podido guardar la lista', humanError(e));
    } finally {
      setSaving(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <>
        <PageHeader title="Pasar lista" />
        <Panel>
          <EmptyState
            size="pleno"
            title="Este equipo no tiene entrenamientos"
            description="La lista se pasa sobre un entrenamiento: apunta uno y podrás pasarla aquí."
            action={<LinkButton to="/app/entrenamientos/nuevo" size="sm">Apuntar entrenamiento</LinkButton>}
          />
        </Panel>
      </>
    );
  }

  /* QUEDA GENTE SIN MARCAR, Y ESO ES LO QUE DECIDE SI SE OFRECE EL ATAJO.
     Antes la condición era «no hay NADIE marcado», y bastaba con una jugadora
     lesionada —que entra ya justificada, porque es un dato guardado— para que
     el botón de «Vinieron todas» no apareciera nunca. Lo cazó la auditoría:
     esta pantalla se quedaba con cero acciones principales. */
  const quedanPorMarcar = cuenta.sinMarcar > 0;
  /* «Sin empezar» ES QUE LA ENTRENADORA NO HAYA TOCADO NADA, no que no haya
     ninguna marca: una jugadora con parte médico abierto llega ya justificada
     —es un dato de la base— y eso no significa que la lista esté empezada. Con
     la otra definición, el botón decía «Las otras 15 vinieron» antes de que
     nadie hubiera hecho nada. */
  const sinEmpezar = !dirty && !existing?.savedAt;

  return (
    <>
      {session && (
        <Link
          to={`/app/entrenamientos/${session.id}`}
          className="mb-3 inline-flex h-8 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink-900"
        >
          <ChevronLeft size={15} /> {session.title || 'El entrenamiento'}
        </Link>
      )}

      <PageHeader title="Pasar lista" />

      {/* DE QUÉ SESIÓN. Si se ha llegado desde su ficha, se dice y no se
          ofrece cambiarla: un desplegable que puede cambiarte de día sin que
          te enteres es justo lo que hacía que se pasara lista del día
          equivocado. Sin dirección —entrando desde el menú— sí hay que
          elegirla, y entonces el desplegable es la pregunta de la pantalla. */}
      {deLaDireccion ? (
        <p className="text-base leading-relaxed text-ink-600">
          {longDate(session?.date ?? '')} · {session?.start}
          {session?.venue ? ` · ${session.venue}` : ''}
          {existing?.savedAt && <span className="text-ink-400"> · ya la pasaste, puedes corregirla</span>}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {teams.length > 1 && (
            <div>
              <label className="label" htmlFor="asis-equipo">Equipo</label>
              <Select id="asis-equipo" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
          )}
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
      )}

      {/* LA ACCIÓN PRINCIPAL, Y CAMBIA SEGÚN LO QUE FALTE POR HACER. Antes de
          empezar, lo que hace falta es decir que vinieron todas; a partir de
          ahí, lo que hace falta es guardar. Nunca las dos a la vez
          compitiendo. */}
      {quedanPorMarcar && (
        <div className="mt-5">
          {/* Y SÓLO HAY UNA ACCIÓN PRINCIPAL A LA VEZ. En cuanto hay algo sin
              guardar, la importante es guardar —y está abajo, pegada—, así que
              ésta baja a secundaria en vez de pelearse con ella. */}
          <Button
            size="lg"
            block
            variant={dirty ? 'secondary' : 'primary'}
            icon={<Check size={18} />}
            onClick={todasVinieron}
          >
            {sinEmpezar
              ? 'Vinieron todas'
              : cuenta.sinMarcar === 1 ? 'La otra vino' : `Las otras ${cuenta.sinMarcar} vinieron`}
          </Button>
          {sinEmpezar && (
            <p className="mt-2.5 text-base leading-relaxed text-ink-500">
              Y luego toca sólo a las que faltaron. {squad.length} jugadoras en la plantilla.
            </p>
          )}
        </div>
      )}

      {!sinEmpezar && (
        <p className="mt-5 text-md text-ink-700">
          <span className="font-semibold text-ink-900">{cuenta.vinieron}</span> de {squad.length} vinieron
          {cuenta.faltaron > 0 && <span className="text-ink-500"> · {cuenta.faltaron} faltaron</span>}
          {cuenta.sinMarcar > 0 && (
            <span className="text-ink-500">
              {' · '}
              {cuenta.sinMarcar === 1 ? '1 sin marcar' : `${cuenta.sinMarcar} sin marcar`}
            </span>
          )}
        </p>
      )}

      {/* LA LISTA. Una fila, un interruptor, y el motivo sólo donde hay falta. */}
      <ul className="mt-4 divide-y divide-line">
        {squad.map((p) => {
          const marca = marks[p.id]?.mark ?? 'sin_registrar';
          const a = asistencia(marca);
          return (
            <li key={p.id}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alternar(p)}
                  aria-pressed={marca === 'presente'}
                  aria-label={`${p.shortName}: ${a.label}`}
                  className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 py-2 text-left"
                >
                  <Avatar name={p.name} size={36} badge={p.number} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-ink-900">{p.shortName}</span>
                    <span className="block truncate text-sm text-ink-500">{p.position}</span>
                  </span>

                  {/* El estado, como una pastilla que se lee de lejos. */}
                  <span
                    className={cn(
                      'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium',
                      marca === 'presente'
                        ? 'bg-ok/15 text-ok'
                        : marca === 'sin_registrar'
                          ? 'bg-panel text-ink-500'
                          : marca === 'lesionada' || marca === 'ausente'
                            ? 'bg-bad/15 text-bad'
                            : 'bg-warn/15 text-warn',
                    )}
                  >
                    {marca === 'presente' && <Check size={14} strokeWidth={3} aria-hidden />}
                    {marca === 'ausente' && <X size={14} strokeWidth={3} aria-hidden />}
                    {marca === 'presente' ? 'Vino' : marca === 'ausente' ? 'No vino' : a.label}
                  </span>
                </button>

                {/* Y SÓLO SI FALTÓ. En una lista normal son dos o tres, no
                    dieciséis: por eso esto no es una columna de botones. */}
                {falta(marca) && (
                  <button
                    type="button"
                    onClick={() => setPorQue(p)}
                    className="h-9 shrink-0 rounded-full px-3 text-sm font-medium text-ink-500 underline decoration-ink-500/40 underline-offset-2 transition-colors hover:text-ink-900"
                  >
                    ¿Por qué?
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* GUARDAR. Sólo cuando hay algo que guardar, y entonces es lo único
          pegado abajo. */}
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
            <Button size="sm" icon={<Save size={15} />} loading={saving} onClick={() => void guardar()}>
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* EL MOTIVO DE UNA FALTA. Los cinco estados de siempre, preguntados
          sólo de quien no vino. */}
      <Modal
        open={!!porQue}
        onClose={() => setPorQue(null)}
        size="sm"
        title={porQue ? `¿Por qué no vino ${porQue.shortName}?` : ''}
      >
        <div className="space-y-1.5">
          {MOTIVOS.map((m) => {
            const info = ATTENDANCE[m];
            const elegido = porQue ? (marks[porQue.id]?.mark ?? 'sin_registrar') === m : false;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (porQue) poner(porQue.id, m, info.label);
                  setPorQue(null);
                }}
                className={cn(
                  'flex h-12 w-full items-center gap-3 rounded-xl px-3.5 text-left text-base transition-colors',
                  elegido ? 'bg-ink-900 font-semibold text-white' : 'bg-panel text-ink-800 active:bg-raised',
                )}
              >
                <span
                  aria-hidden
                  className={cn('h-2 w-2 shrink-0 rounded-full', elegido ? 'bg-white' : info.bg)}
                />
                {m === 'ausente' ? 'No avisó' : info.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              if (porQue) poner(porQue.id, 'presente');
              setPorQue(null);
            }}
            className="flex h-12 w-full items-center rounded-xl px-3.5 text-left text-base text-ink-500 transition-colors active:bg-panel"
          >
            Me he equivocado, sí vino
          </button>
        </div>
      </Modal>
    </>
  );
}
