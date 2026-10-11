/**
 * Meter muchos entrenamientos de golpe.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * EL PROBLEMA QUE ARREGLA. La aplicación sabía crear UN entrenamiento: título,
 * equipo, fecha, hora, y una línea de ejercicios. Para una temporada completa
 * —dos días por semana, de septiembre a mayo— eso son setenta formularios. Y
 * encima el alta pregunta qué días entrena el equipo, lo guarda, y luego no lo
 * usaba para nada: el calendario seguía saliendo vacío. Así que la promesa
 * estaba hecha y sin cumplir.
 *
 * DOS CAMINOS, Y NINGUNO INVENTA NADA:
 *
 *  1. EL HORARIO DEL EQUIPO. Los días y las horas que ya están guardados en el
 *     equipo, repartidos entre dos fechas. Si el equipo no tiene horario, este
 *     camino no se ofrece: se dice que no lo hay y se enlaza a donde se pone.
 *  2. UN ARCHIVO .ICS. El que exporta cualquier calendario —el del móvil, el
 *     del club, Google, Apple, Outlook—. SE LEE EN EL NAVEGADOR: el archivo no
 *     se sube a ningún sitio, no pasa por ningún servidor nuestro ni de nadie.
 *     Importa, porque el calendario de alguien es un dato personal.
 *
 * LO QUE NO HACE, A PROPÓSITO:
 *
 *  · NO CREA NADA SIN QUE SE VEA ANTES. Primero sale la lista de lo que va a
 *    entrar, con su día y su hora, y se puede quitar lo que no. Un botón que
 *    mete setenta cosas en la base de datos sin enseñarlas no es un atajo, es
 *    una trampa.
 *  · NO DUPLICA. Lo que ya existe —mismo equipo, mismo día, misma hora— sale
 *    marcado y desmarcado, y se dice por qué. Importar dos veces el mismo
 *    archivo no tiene que dejar el calendario con todo repetido.
 *  · NO SE INVENTA LA DURACIÓN. Si el archivo no dice cuánto dura, se usa la
 *    que elija quien importa, y se avisa de cuántas van con esa.
 *  · NO RELLENA LA SESIÓN. Entra el hueco en el calendario —día, hora, campo—,
 *    no un entrenamiento planificado con ejercicios que nadie ha elegido. Los
 *    ejercicios se ponen después, abriendo cada sesión.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, FileUp, Info } from 'lucide-react';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import {
  Button, Checkbox, Field, Input, LinkButton, Modal, Select,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { citasDelHorario } from '@/lib/horario';
import { leerIcs } from '@/lib/ics';
import { addMinutes, cn, dayName, dayShort, toISODate, today } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { TrainingSession } from '@/types';

type Fuente = 'horario' | 'archivo';

interface Cita {
  /** Identifica la fila en la lista; no se guarda en ningún sitio. */
  clave: string;
  titulo: string;
  fecha: string;
  inicio: string;
  minutos: number;
  lugar: string;
  /** Ya hay un entrenamiento de ese equipo ese día a esa hora. */
  repetida: boolean;
  /** El origen no decía cuánto dura y se ha puesto la duración elegida. */
  duracionPuesta: boolean;
}

const DURACIONES = [60, 75, 90, 105, 120];

/** `2026-10-11` → `mar 11 oct`, para leer una lista larga de un vistazo. */
const diaCorto = (iso: string) => {
  const [, m, d] = iso.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${dayShort(iso)} ${Number(d)} ${meses[Number(m) - 1]}`;
};

export function ImportarEntrenos({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { data, teamId, actions } = useClub();
  const toast = useToast();
  const teams = visibleTeams(data);

  const [fuente, setFuente] = useState<Fuente | null>(null);
  const [equipo, setEquipo] = useState(teamId || teams[0]?.id || '');
  const [desde, setDesde] = useState(toISODate(today()));
  const [hasta, setHasta] = useState(() => {
    const d = today();
    d.setMonth(d.getMonth() + 3);
    return toISODate(d);
  });
  const [duracion, setDuracion] = useState(90);
  const [citas, setCitas] = useState<Cita[] | null>(null);
  const [fuera, setFuera] = useState<Set<string>>(new Set());
  const [avisos, setAvisos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  /* Al abrir se empieza de cero: una lista de la vez anterior, con otro equipo
     o otro archivo, es la forma más fácil de crear algo que nadie ha pedido. */
  useEffect(() => {
    if (!abierto) return;
    setFuente(null);
    setCitas(null);
    setAvisos([]);
    setFuera(new Set());
    setEquipo(teamId || teams[0]?.id || '');
  }, [abierto, teamId, teams]);

  const elEquipo = teams.find((t) => t.id === equipo);
  const horarios = elEquipo?.trainingSlots ?? [];

  /** Lo que ya está guardado, para no meterlo dos veces. */
  const yaHay = useMemo(() => {
    const s = new Set<string>();
    data.sessions.filter((x) => x.teamId === equipo).forEach((x) => s.add(`${x.date} ${x.start}`));
    return s;
  }, [data.sessions, equipo]);

  const marcarRepetidas = (lista: Omit<Cita, 'repetida'>[]): Cita[] =>
    lista.map((c) => ({ ...c, repetida: yaHay.has(`${c.fecha} ${c.inicio}`) }));

  /** El horario del equipo, repartido entre las dos fechas. */
  const leerDelHorario = () => {
    const citasDeHorario = citasDelHorario(horarios, desde, hasta, duracion);
    if (citasDeHorario.length === 0) {
      toast.error(
        'No sale ningún entrenamiento',
        'Revisa las fechas: entre esas dos no cae ninguno de los días del horario.',
      );
      return;
    }
    const lista = marcarRepetidas(
      citasDeHorario.map((c, i) => ({
        clave: `h${i}`,
        titulo: `Entrenamiento del ${dayName(c.fecha).toLowerCase()}`,
        fecha: c.fecha,
        inicio: c.inicio,
        minutos: c.minutos,
        lugar: c.lugar || elEquipo?.venue || '',
        duracionPuesta: false,
      })),
    );
    setAvisos([]);
    setFuera(new Set(lista.filter((c) => c.repetida).map((c) => c.clave)));
    setCitas(lista);
  };

  /** El archivo, leído aquí mismo. No se sube a ningún servidor. */
  const leerDelArchivo = async (f: File) => {
    let contenido = '';
    try {
      contenido = await f.text();
    } catch {
      toast.error('No he podido abrir el archivo', 'Vuelve a elegirlo, o prueba a exportarlo otra vez.');
      return;
    }
    const { eventos, avisos: queja } = leerIcs(contenido);
    if (eventos.length === 0) {
      setAvisos(queja.length > 0 ? queja : ['El archivo no trae ninguna cita.']);
      setCitas([]);
      return;
    }
    const lista = marcarRepetidas(
      eventos.map((e, i) => ({
        clave: `a${i}`,
        titulo: e.titulo,
        fecha: e.fecha,
        /* Una cita de día entero no tiene hora: se le pone la del horario del
           equipo para ese día si lo hay, y si no, la que se haya elegido
           arriba. Lo que no se hace es dejarla a las 00:00. */
        inicio: e.inicio || horaDelDia(e.fecha) || '18:00',
        minutos: e.minutos ?? duracion,
        lugar: e.lugar || elEquipo?.venue || '',
        duracionPuesta: e.minutos === null,
      })),
    );
    setAvisos(queja);
    setFuera(new Set(lista.filter((c) => c.repetida).map((c) => c.clave)));
    setCitas(lista);
  };

  /** La hora a la que ese día de la semana entrena el equipo, si la hay. */
  const horaDelDia = (fecha: string): string => {
    const dia = new Date(`${fecha}T12:00:00`).getDay();
    return horarios.find((h) => h.weekday === dia)?.start ?? '';
  };

  const elegidas = (citas ?? []).filter((c) => !fuera.has(c.clave));
  const sinHora = (citas ?? []).filter((c) => c.duracionPuesta && !fuera.has(c.clave)).length;

  const alternar = (clave: string) =>
    setFuera((s) => {
      const n = new Set(s);
      if (n.has(clave)) n.delete(clave);
      else n.add(clave);
      return n;
    });

  const crear = async () => {
    if (!equipo) {
      toast.error('Falta el equipo', 'Elige a qué equipo van estos entrenamientos.');
      return;
    }
    if (elegidas.length === 0) return;
    setGuardando(true);
    try {
      const sesiones: TrainingSession[] = elegidas.map((c) => ({
        id: '',
        teamId: equipo,
        title: c.titulo,
        date: c.fecha,
        start: c.inicio,
        duration: c.minutos,
        venue: c.lugar,
        objective: '',
        expectedPlayers: data.players.filter((p) => p.teamId === equipo).length,
        material: [],
        blocks: [],
        status: 'planificado',
      }));
      const guardadas = await actions.saveSessions(sesiones);
      await actions.log({
        kind: 'sesion',
        teamId: equipo,
        text:
          guardadas.length === 1
            ? `Has añadido un entrenamiento al calendario de ${elEquipo?.name ?? 'tu equipo'}.`
            : `Has añadido ${guardadas.length} entrenamientos al calendario de ${elEquipo?.name ?? 'tu equipo'}.`,
        link: '/app/calendario',
      });
      toast.success(
        guardadas.length === 1 ? 'Entrenamiento añadido' : `${guardadas.length} entrenamientos añadidos`,
        'Ya están en el calendario. Abre cualquiera para montar los ejercicios.',
      );
      onCerrar();
    } catch (e) {
      toast.error('No he podido crear los entrenamientos', humanError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      size="lg"
      title="Añadir varios entrenamientos"
      description="Del horario del equipo o de un archivo de calendario."
      footer={
        citas
          ? (
            <>
              <Button variant="ghost" onClick={() => { setCitas(null); setAvisos([]); }}>
                Atrás
              </Button>
              <Button loading={guardando} disabled={elegidas.length === 0} onClick={() => void crear()}>
                {elegidas.length === 1 ? 'Crear 1 entrenamiento' : `Crear ${elegidas.length} entrenamientos`}
              </Button>
            </>
          )
          : (
            <Button variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
          )
      }
    >
      {teams.length === 0 ? (
        <div className="py-2">
          <p className="text-base text-ink-800">Primero necesitas un equipo.</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Los entrenamientos van siempre a un equipo: sin equipo no hay donde ponerlos.
          </p>
          <LinkButton to="/app/equipo-tecnico/nuevo-equipo" className="mt-4">
            Crear equipo
          </LinkButton>
        </div>
      ) : citas ? (
        <Repaso
          citas={citas}
          fuera={fuera}
          onAlternar={alternar}
          avisos={avisos}
          sinHora={sinHora}
          duracion={duracion}
        />
      ) : (
        <div className="space-y-4">
          <Field label="Equipo">
            <Select value={equipo} onChange={(e) => setEquipo(e.target.value)}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Origen
              icono={<CalendarClock size={18} />}
              titulo="Del horario del equipo"
              detalle={
                horarios.length === 0
                  ? 'Este equipo no tiene horario guardado'
                  : horarios.map((h) => `${dayShort(diaDeLaSemana(h.weekday))} ${h.start}`).join(' · ')
              }
              activo={fuente === 'horario'}
              desactivado={horarios.length === 0}
              onClick={() => setFuente('horario')}
            />
            <Origen
              icono={<FileUp size={18} />}
              titulo="De un archivo .ics"
              detalle="Se lee aquí, en tu navegador"
              activo={fuente === 'archivo'}
              onClick={() => setFuente('archivo')}
            />
          </div>

          {horarios.length === 0 && (
            <p className="text-sm leading-relaxed text-muted">
              Para repartir el horario del equipo hace falta tenerlo puesto.{' '}
              <Link to={`/app/equipo-tecnico/${equipo}`} className="font-medium text-marca-400 underline underline-offset-2">
                Ponle los días y las horas
              </Link>{' '}
              y vuelve aquí.
            </p>
          )}

          {fuente === 'horario' && horarios.length > 0 && (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Desde">
                  <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                </Field>
                <Field label="Hasta">
                  <Input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
                </Field>
              </div>
              <Field label="Duración" hint="Sólo para los horarios a los que les falte la hora de fin.">
                <Select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))}>
                  {DURACIONES.map((m) => (
                    <option key={m} value={m}>{m} minutos</option>
                  ))}
                </Select>
              </Field>
              <Button block onClick={leerDelHorario}>Ver lo que entraría</Button>
            </div>
          )}

          {fuente === 'archivo' && (
            <div className="space-y-4 border-t border-line pt-4">
              <Field label="Duración" hint="Para las citas del archivo que no digan cuánto duran.">
                <Select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))}>
                  {DURACIONES.map((m) => (
                    <option key={m} value={m}>{m} minutos</option>
                  ))}
                </Select>
              </Field>
              <input
                ref={archivo}
                type="file"
                accept=".ics,text/calendar"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void leerDelArchivo(f);
                }}
              />
              <Button block onClick={() => archivo.current?.click()}>Elegir el archivo</Button>
              <p className="text-sm leading-relaxed text-muted">
                En el calendario del móvil o del ordenador, exporta el calendario y te dará un
                archivo que acaba en <code className="text-ink-700">.ics</code>. Ése.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** `2` → una fecha cualquiera que caiga en martes, para pedirle el nombre. */
function diaDeLaSemana(weekday: number): string {
  /* 2026-01-04 fue domingo: sumando el número se llega al día que toca, y
     `dayShort` ya sabe traducirlo. */
  const d = new Date('2026-01-04T12:00:00');
  d.setDate(d.getDate() + weekday);
  return toISODate(d);
}

function Origen({
  icono, titulo, detalle, activo, desactivado, onClick,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  activo: boolean;
  desactivado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={desactivado}
      onClick={onClick}
      className={cn(
        'flex min-h-[72px] items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors',
        activo ? 'border-marca-500 bg-marca-500/10' : 'border-line hover:border-line-fuerte',
        desactivado && 'opacity-45',
      )}
    >
      <span className={cn('mt-0.5 shrink-0', activo ? 'text-marca-400' : 'text-ink-400')}>{icono}</span>
      <span className="min-w-0">
        <span className="block text-base font-medium text-ink-900">{titulo}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{detalle}</span>
      </span>
    </button>
  );
}

/* ───────────────────────── La lista de lo que entraría ───────────────────── */

function Repaso({
  citas, fuera, onAlternar, avisos, sinHora, duracion,
}: {
  citas: Cita[];
  fuera: Set<string>;
  onAlternar: (clave: string) => void;
  avisos: string[];
  sinHora: number;
  duracion: number;
}) {
  const repetidas = citas.filter((c) => c.repetida).length;

  if (citas.length === 0) {
    return (
      <div className="py-2">
        <p className="text-base text-ink-800">No he encontrado ninguna cita.</p>
        {avisos.map((a) => (
          <p key={a} className="mt-1.5 text-sm leading-relaxed text-muted">{a}</p>
        ))}
      </div>
    );
  }

  return (
    <div>
      {(repetidas > 0 || sinHora > 0 || avisos.length > 0) && (
        <div className="mb-3 space-y-1.5 rounded-xl border border-line bg-raised px-3.5 py-3">
          {repetidas > 0 && (
            <Nota>
              {repetidas === 1
                ? 'Uno ya estaba en el calendario a esa hora: va desmarcado.'
                : `${repetidas} ya estaban en el calendario a esa hora: van desmarcados.`}
            </Nota>
          )}
          {sinHora > 0 && (
            <Nota>
              {sinHora === 1
                ? `A uno no se le sabe la duración: entra con ${duracion} minutos.`
                : `A ${sinHora} no se les sabe la duración: entran con ${duracion} minutos.`}
            </Nota>
          )}
          {avisos.map((a) => <Nota key={a}>{a}</Nota>)}
        </div>
      )}

      <div className="-mx-1 max-h-[46vh] overflow-y-auto px-1">
        <ul className="divide-y divide-line">
          {citas.map((c) => {
            const dentro = !fuera.has(c.clave);
            return (
              /* TODA LA FILA ES LA CASILLA. En una lista de treinta, acertar
                 un cuadrado de dieciocho píxeles con el pulgar es lo que hace
                 que alguien desista y lo importe todo tal cual. */
              <li key={c.clave}>
                <Checkbox
                  checked={dentro}
                  onChange={() => onAlternar(c.clave)}
                  className="w-full py-1.5"
                  label={
                    <span className={cn('flex min-w-0 items-center gap-3', !dentro && 'opacity-45')}>
                      <span className="w-[82px] shrink-0 text-sm font-medium text-ink-700 tabular-nums">
                        {diaCorto(c.fecha)}
                      </span>
                      <span className="hidden w-[94px] shrink-0 text-sm text-ink-600 tabular-nums sm:block">
                        {c.inicio} – {addMinutes(c.inicio, c.minutos)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base text-ink-900">{c.titulo}</span>
                        <span className="block truncate text-xs text-ink-400">
                          <span className="sm:hidden">{c.inicio} – {addMinutes(c.inicio, c.minutos)}</span>
                          {c.lugar && <span className="max-sm:before:content-['_·_']">{c.lugar}</span>}
                        </span>
                      </span>
                      {c.repetida && <span className="shrink-0 text-xs text-ink-400">Ya está</span>}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const Nota = ({ children }: { children: React.ReactNode }) => (
  <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
    <Info size={14} className="mt-0.5 shrink-0 text-ink-400" aria-hidden />
    <span>{children}</span>
  </p>
);
