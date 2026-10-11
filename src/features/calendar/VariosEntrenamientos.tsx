/**
 * Meter los entrenamientos de la temporada de una vez.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * UNA HORA POR DÍA, que es como entrena un club de verdad. El lunes a las
 * 18:45 y el viernes a las 19:30 no es un caso raro: es lo normal, porque los
 * campos se reparten y el viernes el anterior acaba más tarde. La primera
 * versión de esta hoja pedía UNA hora para todos los días marcados, así que
 * quien entrena a horas distintas tenía que pasar por aquí dos veces —una por
 * cada hora— o corregir treinta sesiones a mano después.
 *
 * Y CADA DÍA TIENE TAMBIÉN SU DURACIÓN, por lo mismo: el entreno largo suele
 * ser el de mitad de semana.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * YA NO SE SUBE NINGÚN ARCHIVO. Hubo un camino para importar un `.ics` —el que
 * exporta el calendario del móvil— y se ha quitado entero, con su lector.
 * Estaba bien pensado y no servía para nada:
 *
 *  · Desde un teléfono no se puede exportar un calendario. Ni Google Calendar
 *    ni el de Apple lo ofrecen en el móvil, que es donde se usa esto.
 *  · Desde el ordenador, Google da un `.zip` que hay que descomprimir primero.
 *  · Y el selector de archivos del iPhone no reconocía el tipo, así que no
 *    aparecía ninguno y no había manera de elegirlo.
 *
 * Tres obstáculos para hacer algo que aquí se hace marcando días con el dedo.
 * Una función que nadie puede completar no es una función: es una puerta
 * pintada en la pared.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LO QUE NO HACE, A PROPÓSITO:
 *
 *  · NO CREA NADA SIN QUE SE VEA ANTES. Primero sale la lista de lo que va a
 *    entrar, con su día y su hora, y se puede quitar lo que no. Un botón que
 *    mete treinta cosas en la base de datos sin enseñarlas no es un atajo.
 *  · NO DUPLICA. Lo que ya existe —mismo equipo, mismo día, misma hora— sale
 *    marcado y desmarcado, y se dice por qué.
 *  · NO RELLENA LA SESIÓN. Entra el hueco en el calendario —día, hora, campo—,
 *    no un entrenamiento con ejercicios que nadie ha elegido.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import {
  Button, Checkbox, Field, Input, LinkButton, Modal, Select,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { citasDelHorario, minutosEntreHoras } from '@/lib/horario';
import { addMinutes, cn, dayName, dayShort, minutesToLabel, toISODate, today } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { TrainingSession, TrainingSlot } from '@/types';

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
}

/** Lo que dura un entrenamiento, para no escribir minutos a mano. */
const DURACIONES = [60, 75, 90, 105, 120];

/** De lunes a domingo, con el número que usa `Date.getDay()`. */
const SEMANA: { n: number; letra: string; nombre: string }[] = [
  { n: 1, letra: 'L', nombre: 'lunes' },
  { n: 2, letra: 'M', nombre: 'martes' },
  { n: 3, letra: 'X', nombre: 'miércoles' },
  { n: 4, letra: 'J', nombre: 'jueves' },
  { n: 5, letra: 'V', nombre: 'viernes' },
  { n: 6, letra: 'S', nombre: 'sábado' },
  { n: 0, letra: 'D', nombre: 'domingo' },
];

/** La hora y la duración de un día de la semana. */
interface Dia { inicio: string; minutos: number }

const POR_DEFECTO: Dia = { inicio: '18:00', minutos: 90 };

/** `2026-10-11` → `mar 11 oct`, para leer una lista larga de un vistazo. */
const diaCorto = (iso: string) => {
  const [, m, d] = iso.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${dayShort(iso)} ${Number(d)} ${meses[Number(m) - 1]}`;
};

export function VariosEntrenamientos({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { data, teamId, actions } = useClub();
  const toast = useToast();
  const teams = visibleTeams(data);

  const [equipo, setEquipo] = useState(teamId || teams[0]?.id || '');
  const [desde, setDesde] = useState(toISODate(today()));
  const [hasta, setHasta] = useState(() => {
    const d = today();
    d.setMonth(d.getMonth() + 3);
    return toISODate(d);
  });
  /** Los días marcados, cada uno con SU hora y SU duración. */
  const [dias, setDias] = useState<Record<number, Dia>>({});
  const [citas, setCitas] = useState<Cita[] | null>(null);
  const [fuera, setFuera] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);

  const elEquipo = teams.find((t) => t.id === equipo);

  /* Al abrir se empieza de cero: una lista de la vez anterior, con otro equipo,
     es la forma más fácil de crear algo que nadie ha pedido. */
  useEffect(() => {
    if (!abierto) return;
    setCitas(null);
    setFuera(new Set());
    setEquipo(teamId || teams[0]?.id || '');
  }, [abierto, teamId, teams]);

  /* LOS DÍAS SE PROPONEN CON EL HORARIO DEL EQUIPO, cada uno con la hora que
     tenga guardada. Es el dato que ya existe y el que acierta casi siempre; y
     si no hay horario, se marcan a mano, que es para lo que están los botones. */
  useEffect(() => {
    if (!abierto) return;
    const guardados = elEquipo?.trainingSlots ?? [];
    setDias(Object.fromEntries(guardados
      .filter((h) => /^\d{1,2}:\d{2}$/.test(h.start ?? ''))
      .map((h) => [h.weekday, {
        inicio: h.start,
        minutos: minutosEntreHoras(h.start, h.end ?? '') ?? POR_DEFECTO.minutos,
      }])));
  }, [abierto, equipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const marcados = SEMANA.filter((d) => dias[d.n]);

  const alternarDia = (n: number) =>
    setDias((d) => {
      if (d[n]) {
        const { [n]: _fuera, ...resto } = d;
        return resto;
      }
      /* Un día nuevo hereda la hora del último marcado: si el lunes es a las
         18:45, lo más probable es que el miércoles también, y así sólo hay que
         cambiar el que de verdad es distinto. */
      const ultimo = SEMANA.map((x) => d[x.n]).filter(Boolean).at(-1);
      return { ...d, [n]: { ...(ultimo ?? POR_DEFECTO) } };
    });

  const ponDia = (n: number, patch: Partial<Dia>) =>
    setDias((d) => ({ ...d, [n]: { ...(d[n] ?? POR_DEFECTO), ...patch } }));

  /** Lo que ya está guardado, para no meterlo dos veces. */
  const yaHay = useMemo(() => {
    const s = new Set<string>();
    data.sessions.filter((x) => x.teamId === equipo).forEach((x) => s.add(`${x.date} ${x.start}`));
    return s;
  }, [data.sessions, equipo]);

  const ver = () => {
    const slots: TrainingSlot[] = marcados.map((d) => ({
      weekday: d.n,
      start: dias[d.n].inicio,
      end: addMinutes(dias[d.n].inicio, dias[d.n].minutos),
      venue: elEquipo?.venue ?? '',
    }));
    if (slots.length === 0) {
      toast.error('Elige al menos un día', 'Toca los días de la semana en los que entrenáis.');
      return;
    }
    const salen = citasDelHorario(slots, desde, hasta);
    if (salen.length === 0) {
      toast.error(
        'No sale ningún entrenamiento',
        'Revisa las fechas: entre esas dos no cae ninguno de los días elegidos.',
      );
      return;
    }
    const lista: Cita[] = salen.map((c, i) => ({
      clave: `c${i}`,
      titulo: `Entrenamiento del ${dayName(c.fecha).toLowerCase()}`,
      fecha: c.fecha,
      inicio: c.inicio,
      minutos: c.minutos,
      lugar: c.lugar || elEquipo?.venue || '',
      repetida: yaHay.has(`${c.fecha} ${c.inicio}`),
    }));
    setFuera(new Set(lista.filter((c) => c.repetida).map((c) => c.clave)));
    setCitas(lista);
  };

  const elegidas = (citas ?? []).filter((c) => !fuera.has(c.clave));

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
        expectedPlayers: data.players.filter((p) => p.teamId === equipo && !p.archivedAt).length,
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
      description="Marca los días, pon la hora de cada uno y entran todos de golpe."
      footer={
        citas
          ? (
            <>
              <Button variant="ghost" onClick={() => setCitas(null)}>Atrás</Button>
              <Button loading={guardando} disabled={elegidas.length === 0} onClick={() => void crear()}>
                {elegidas.length === 0
                  ? 'Crear entrenamientos'
                  : elegidas.length === 1 ? 'Crear 1 entrenamiento' : `Crear ${elegidas.length} entrenamientos`}
              </Button>
            </>
          )
          : <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
      }
    >
      {teams.length === 0 ? (
        <div className="py-2">
          <p className="text-base text-ink-800">Primero necesitas un equipo.</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Los entrenamientos van siempre a un equipo: sin equipo no hay donde ponerlos.
          </p>
          <LinkButton to="/app/equipo-tecnico/nuevo-equipo" className="mt-4">Crear equipo</LinkButton>
        </div>
      ) : citas ? (
        <Repaso citas={citas} fuera={fuera} onAlternar={alternar} />
      ) : (
        <div className="space-y-5">
          {teams.length > 1 && (
            <Field label="Equipo">
              <Select value={equipo} onChange={(e) => setEquipo(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
          )}

          <div>
            <p className="label">¿Qué días entrenáis?</p>
            {/* Siete botones de 44 px: caben en una fila a 320 px
                (7 × 40 + 6 × 2 = 292) y se marcan de un toque. */}
            <div className="mt-1.5 flex gap-1.5">
              {SEMANA.map((d) => {
                const puesto = !!dias[d.n];
                return (
                  <button
                    key={d.n}
                    type="button"
                    aria-pressed={puesto}
                    aria-label={d.nombre}
                    onClick={() => alternarDia(d.n)}
                    className={cn(
                      'h-11 flex-1 rounded-xl border text-base font-semibold transition-colors',
                      puesto
                        ? 'border-marca-600 bg-marca-600 text-white'
                        : 'border-line text-ink-600 hover:border-line-fuerte',
                    )}
                  >
                    {d.letra}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LA HORA, DÍA POR DÍA. Aparece una fila por cada día marcado, y
              sólo por los marcados: preguntar por los siete sería pedir siete
              respuestas para dar dos. */}
          {marcados.length > 0 && (
            <div className="divide-y divide-line rounded-2xl border border-line">
              {marcados.map((d) => (
                /* EL NOMBRE DEL DÍA SE VA ARRIBA EN LAS PANTALLAS ESTRECHAS.
                   Con los tres en una fila, a 320 px el campo de la hora se
                   quedaba en 54 px —no cabe «18:45» y no hay dónde tocar— .
                   Partido en dos líneas, cada control tiene su sitio. */
                <div key={d.n} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
                  <span className="shrink-0 text-base font-medium capitalize text-ink-800 sm:w-[86px]">
                    {d.nombre}
                  </span>
                  <div className="flex min-w-0 flex-1 gap-2.5">
                  <Input
                    type="time"
                    aria-label={`Hora del ${d.nombre}`}
                    value={dias[d.n].inicio}
                    onChange={(e) => ponDia(d.n, { inicio: e.target.value })}
                    className="h-11 w-[116px] shrink-0"
                  />
                  <Select
                    aria-label={`Duración del ${d.nombre}`}
                    value={dias[d.n].minutos}
                    onChange={(e) => ponDia(d.n, { minutos: Number(e.target.value) })}
                    className="h-11 min-w-0 flex-1"
                  >
                    {Array.from(new Set([...DURACIONES, dias[d.n].minutos]))
                      .sort((a, b) => a - b)
                      .map((m) => (
                        <option key={m} value={m}>{minutesToLabel(m)}</option>
                      ))}
                  </Select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde">
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </Field>
            <Field label="Hasta">
              <Input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
            </Field>
          </div>

          <Button block onClick={ver}>Ver lo que entraría</Button>

          {(elEquipo?.trainingSlots?.length ?? 0) === 0 && (
            <p className="text-sm leading-relaxed text-muted">
              Si quieres que esto quede guardado para la próxima,{' '}
              <Link to={`/app/equipo-tecnico/${equipo}`} className="font-medium text-marca-400 underline underline-offset-2">
                ponlo en la ficha del equipo
              </Link>
              . No hace falta para lo de aquí.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ───────────────────────── La lista de lo que entraría ───────────────────── */

function Repaso({
  citas, fuera, onAlternar,
}: {
  citas: Cita[];
  fuera: Set<string>;
  onAlternar: (clave: string) => void;
}) {
  const repetidas = citas.filter((c) => c.repetida).length;

  return (
    <div>
      {repetidas > 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-line bg-raised px-3.5 py-3 text-sm leading-relaxed text-ink-600">
          <Info size={14} className="mt-0.5 shrink-0 text-ink-400" aria-hidden />
          <span>
            {repetidas === 1
              ? 'Uno ya estaba en el calendario a esa hora: va desmarcado.'
              : `${repetidas} ya estaban en el calendario a esa hora: van desmarcados.`}
          </span>
        </p>
      )}

      <div className="-mx-1 max-h-[46vh] overflow-y-auto px-1">
        <ul className="divide-y divide-line">
          {citas.map((c) => {
            const dentro = !fuera.has(c.clave);
            return (
              <li key={c.clave}>
                {/* TODA LA FILA ES LA CASILLA. En una lista de treinta, acertar
                    un cuadrado de dieciocho píxeles con el pulgar es lo que
                    hace que alguien desista y lo cree todo tal cual. */}
                <Checkbox
                  checked={dentro}
                  onChange={() => onAlternar(c.clave)}
                  className="w-full py-1.5"
                  label={
                    <span className={cn('flex min-w-0 items-center gap-3', !dentro && 'opacity-45')}>
                      <span className="w-[82px] shrink-0 text-sm font-medium text-ink-700 tabular-nums">
                        {diaCorto(c.fecha)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base text-ink-900">
                          {c.inicio} – {addMinutes(c.inicio, c.minutos)}
                        </span>
                        {c.lugar && <span className="block truncate text-xs text-ink-400">{c.lugar}</span>}
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
