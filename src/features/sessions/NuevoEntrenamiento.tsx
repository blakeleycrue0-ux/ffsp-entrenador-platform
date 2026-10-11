/**
 * Crear un entrenamiento: cuatro preguntas y guardar.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LO QUE HABÍA AQUÍ. Una pantalla de 2.101 px con once campos, veintisiete
 * cosas que pulsar, y una biblioteca de ejercicios con su buscador y sus once
 * etiquetas. Para apuntar que el martes se entrena a las seis. Lo midió
 * `pruebas/complejidad.mjs`, y era la pantalla que el encargo señalaba con el
 * dedo.
 *
 * El error no era el número de campos: era el ORDEN DEL TRABAJO. Esta pantalla
 * mezclaba dos tareas que ocurren con semanas de diferencia:
 *
 *   1. APUNTAR que hay entrenamiento. Se hace en septiembre, para el trimestre
 *      entero, y lo que hace falta es el día, la hora y cuánto dura.
 *   2. MONTAR lo que se va a hacer. Se hace el día antes, mirando quién está
 *      lesionada y qué salió mal el jueves pasado, y lo que hace falta es la
 *      biblioteca de ejercicios entera.
 *
 * Pedir las dos a la vez obliga a tener decidido en septiembre el rondo del 14
 * de marzo. Así que aquí se hace la primera —y se puede guardar—, y la segunda
 * vive en la ficha del entrenamiento, detrás de «Montar la sesión», que es
 * donde se llega el día antes.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * «SE REPITE» ES LO QUE DE VERDAD AHORRA EL TRABAJO.
 *
 * Un club entrena los mismos días toda la temporada. Sin repetición, apuntar
 * el trimestre son treinta formularios; con ella es uno. Y no es una promesa:
 * se dice en la misma pantalla cuántos van a entrar y entre qué fechas, antes
 * de guardar, porque un botón que crea veintiséis cosas sin decir cuántas da
 * miedo —con razón—.
 *
 * LO QUE NO SE PREGUNTA, Y POR QUÉ:
 *
 *  · EL EQUIPO, cuando sólo hay uno. Un desplegable con una única opción no es
 *    una pregunta: es un trámite. Se pone solo y no se enseña.
 *  · EL TÍTULO. Se propone «Entrenamiento del martes», que es como se
 *    reconoce en una lista, y se puede cambiar en «Más opciones».
 *  · EL CAMPO. Es el del equipo, que ya está guardado.
 *  · EL OBJETIVO, LAS JUGADORAS Y LAS OBSERVACIONES. Son del día antes, como
 *    los ejercicios. Están en «Más opciones», a un toque.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import {
  Button, Desplegable, Field, Input, PageHeader, Panel, Select, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { citasDelHorario } from '@/lib/horario';
import { addMinutes, cn, dayName, longDateInline, minutesToLabel, toISODate, today } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { TrainingSession } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';

const DURACIONES = [60, 75, 90, 105, 120];

type Repeticion = 'no' | 'semanal' | 'quincenal';

const REPETICIONES: { id: Repeticion; label: string }[] = [
  { id: 'no', label: 'No se repite' },
  { id: 'semanal', label: 'Cada semana' },
  { id: 'quincenal', label: 'Cada dos semanas' },
];

const esFecha = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

const tituloDe = (fecha: string) => `Entrenamiento del ${dayName(fecha).toLowerCase()}`;

const mas = (iso: string, meses: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + meses);
  return toISODate(d);
};

export default function NuevoEntrenamiento() {
  /* Un formulario se lee mal a mil píxeles de ancho. */
  useAnchura('formulario');
  const navigate = useNavigate();
  const toast = useToast();
  const { data, teamId, actions } = useClub();
  const teams = visibleTeams(data);
  const [params] = useSearchParams();

  const [equipo, setEquipo] = useState(teamId || teams[0]?.id || '');
  const [fecha, setFecha] = useState(
    esFecha(params.get('fecha')) ? (params.get('fecha') as string) : toISODate(today()),
  );
  const [hora, setHora] = useState('18:00');
  const [horaAMano, setHoraAMano] = useState(false);
  const [duracion, setDuracion] = useState(90);
  const [repite, setRepite] = useState<Repeticion>('no');
  const [hasta, setHasta] = useState(() => mas(toISODate(today()), 3));
  const [guardando, setGuardando] = useState(false);

  /* Lo de «Más opciones». Vacío hasta que alguien lo toque: lo que se guarda
     sin abrirlo es exactamente lo que se ve. */
  const [titulo, setTitulo] = useState('');
  const [campo, setCampo] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [jugadoras, setJugadoras] = useState('');
  const [notas, setNotas] = useState('');

  const elEquipo = teams.find((t) => t.id === equipo);

  useEffect(() => {
    if (equipo || teams.length === 0) return;
    setEquipo(teamId || teams[0].id);
  }, [equipo, teamId, teams]);

  /* LA HORA SALE DEL HORARIO DEL EQUIPO, si ese día entrena. Es el dato que ya
     está guardado y el que acierta nueve de cada diez veces; si se toca a
     mano, deja de moverse. */
  useEffect(() => {
    if (horaAMano) return;
    const dia = new Date(`${fecha}T12:00:00`).getDay();
    const slot = elEquipo?.trainingSlots?.find((h) => h.weekday === dia);
    if (slot?.start) setHora(slot.start);
  }, [fecha, elEquipo, horaAMano]);

  /** Los días que se van a crear. Uno, o toda la serie. */
  const dias = useMemo(() => {
    if (repite === 'no') return [fecha];
    if (hasta < fecha) return [fecha];
    const cada = repite === 'semanal' ? 1 : 2;
    return citasDelHorario(
      [{ weekday: new Date(`${fecha}T12:00:00`).getDay(), start: hora, end: '', venue: '' }],
      fecha,
      hasta,
      duracion,
    )
      .map((c) => c.fecha)
      .filter((_, i) => i % cada === 0);
  }, [repite, fecha, hasta, hora, duracion]);

  /** Lo que ya hay a esa hora, para no crearlo dos veces. */
  const repetidos = useMemo(() => {
    const yaHay = new Set(
      data.sessions.filter((s) => s.teamId === equipo).map((s) => `${s.date} ${s.start}`),
    );
    return dias.filter((d) => yaHay.has(`${d} ${hora}`)).length;
  }, [data.sessions, equipo, dias, hora]);

  const nuevos = dias.length - repetidos;

  const guardar = async () => {
    if (!equipo) {
      toast.error('Falta el equipo', 'Elige para qué equipo es este entrenamiento.');
      return;
    }
    if (nuevos === 0) {
      toast.error(
        'Ya está en el calendario',
        'Ese día y a esa hora ya hay un entrenamiento de este equipo.',
      );
      return;
    }
    setGuardando(true);
    try {
      const yaHay = new Set(
        data.sessions.filter((s) => s.teamId === equipo).map((s) => `${s.date} ${s.start}`),
      );
      const sesiones: TrainingSession[] = dias
        .filter((d) => !yaHay.has(`${d} ${hora}`))
        .map((d) => ({
          id: '',
          teamId: equipo,
          title: titulo.trim() || tituloDe(d),
          date: d,
          start: hora,
          duration: duracion,
          venue: campo.trim() || elEquipo?.venue || '',
          objective: objetivo.trim(),
          expectedPlayers: Number(jugadoras) || data.players.filter((p) => p.teamId === equipo && !p.archivedAt).length,
          material: [],
          notes: notas.trim() || undefined,
          blocks: [],
          status: 'planificado',
        }));

      const guardadas = await actions.saveSessions(sesiones);
      await actions.log({
        kind: 'sesion',
        teamId: equipo,
        text:
          guardadas.length === 1
            ? `Has apuntado un entrenamiento el ${longDateInline(guardadas[0].date)}.`
            : `Has apuntado ${guardadas.length} entrenamientos de ${elEquipo?.name ?? 'tu equipo'}.`,
        link: guardadas.length === 1 ? `/app/entrenamientos/${guardadas[0].id}` : '/app/calendario',
      });
      toast.success(
        guardadas.length === 1 ? 'Entrenamiento apuntado' : `${guardadas.length} entrenamientos apuntados`,
        'Ábrelo cuando quieras para montar los ejercicios.',
      );
      /* Uno: a su ficha, que es donde se monta. Varios: al calendario, que es
         donde se ve que han entrado. */
      navigate(guardadas.length === 1 ? `/app/entrenamientos/${guardadas[0].id}` : '/app/calendario');
    } catch (e) {
      toast.error('No he podido guardar', humanError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Link
        to="/app/entrenamientos"
        className="mb-4 inline-flex h-8 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink-900"
      >
        <ArrowLeft size={15} /> Entrenamientos
      </Link>

      <PageHeader title="Nuevo entrenamiento" />

      <Panel className="space-y-4 p-4 sm:p-5">
        {/* El equipo sólo se pregunta cuando hay algo que elegir. */}
        {teams.length > 1 && (
          <Field label="Equipo">
            <Select value={equipo} onChange={(e) => setEquipo(e.target.value)}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Día">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Hora">
            <Input
              type="time"
              value={hora}
              onChange={(e) => { setHoraAMano(true); setHora(e.target.value); }}
            />
          </Field>
        </div>

        <Field label="Dura">
          <Select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))}>
            {DURACIONES.map((m) => (
              <option key={m} value={m}>{minutesToLabel(m)}</option>
            ))}
          </Select>
        </Field>

        <Field label="Se repite">
          <Select value={repite} onChange={(e) => setRepite(e.target.value as Repeticion)}>
            {REPETICIONES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </Select>
        </Field>

        {repite !== 'no' && (
          <Field label="Hasta">
            <Input type="date" value={hasta} min={fecha} onChange={(e) => setHasta(e.target.value)} />
          </Field>
        )}
      </Panel>

      {/* LO QUE VA A PASAR AL PULSAR, ESCRITO. Es la diferencia entre un botón
          que guarda y un botón que crea veintiséis cosas sin avisar. */}
      <p className={cn('mt-3 text-base leading-relaxed', nuevos === 0 ? 'text-bad' : 'text-ink-600')}>
        {nuevos === 0
          ? 'Ese día, a esa hora, ya hay un entrenamiento de este equipo.'
          : dias.length === 1
            ? `Se apunta el ${longDateInline(fecha)}, de ${hora} a ${addMinutes(hora, duracion)}.`
            : `Son ${nuevos} entrenamientos, del ${longDateInline(dias[0])} al ${longDateInline(dias[dias.length - 1])}`
              + `${repetidos > 0 ? ` (${repetidos} ya estaban y no se repiten)` : ''}.`}
      </p>

      <div className="mt-4">
        <Button size="lg" block loading={guardando} disabled={nuevos === 0} onClick={() => void guardar()}>
          {dias.length > 1 && nuevos > 1 ? `Apuntar ${nuevos} entrenamientos` : 'Apuntar entrenamiento'}
        </Button>
      </div>

      <Desplegable
        className="mt-4"
        titulo="Más opciones"
        pista="Título, campo, objetivo, jugadoras y notas"
      >
        <Field label="Título" hint={`Si lo dejas vacío: «${tituloDe(fecha)}».`}>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={tituloDe(fecha)} />
        </Field>
        <Field label="Campo" hint={elEquipo?.venue ? `Si lo dejas vacío: «${elEquipo.venue}».` : undefined}>
          <Input value={campo} onChange={(e) => setCampo(e.target.value)} placeholder={elEquipo?.venue || 'Dónde se entrena'} />
        </Field>
        <Field label="Objetivo">
          <Input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="¿Qué quieres que mejoren?" />
        </Field>
        <Field label="Número de jugadoras">
          <Input
            type="number"
            inputMode="numeric"
            value={jugadoras}
            onChange={(e) => setJugadoras(e.target.value)}
            placeholder={String(data.players.filter((p) => p.teamId === equipo && !p.archivedAt).length)}
          />
        </Field>
        <Field label="Observaciones">
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Cargas individuales, jugadoras al margen…" />
        </Field>
      </Desplegable>
    </>
  );
}

