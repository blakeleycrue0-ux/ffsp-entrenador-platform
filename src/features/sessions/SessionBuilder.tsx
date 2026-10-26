/**
 * Constructor de entrenamientos.
 * ═══════════════════════════════════════════════════════════════════════════
 * Arrastrar ejercicios de la biblioteca a la línea de sesión, o pulsarlos. La
 * duración total se recalcula sola en cada cambio.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * UN ENTRENAMIENTO SE PUEDE GUARDAR VACÍO, Y ESO ES LO IMPORTANTE DE AQUÍ.
 *
 * Esta pantalla exigía tres cosas para guardar: equipo, título y AL MENOS UN
 * BLOQUE. Lo tercero convertía la pantalla en un callejón sin salida:
 *
 *  · Un club recién creado no tiene ejercicios en la biblioteca. La línea de
 *    sesión decía «arrastra aquí tu primer ejercicio» y al lado no había
 *    ninguno que arrastrar. No se podía guardar NADA.
 *  · Y aunque los hubiera: lo primero que hace cualquiera es poner en el
 *    calendario los días que entrena, y preparar los ejercicios después, el
 *    día antes. Pedir la sesión entera para poder apuntar la hora es pedir
 *    el trabajo de la temporada por adelantado.
 *
 * Ahora un entrenamiento es un hueco en el calendario —equipo, día, hora,
 * campo— y los bloques son el plan, que es opcional. Lo único que no se puede
 * guardar es lo que no se podría leer después: sin equipo no hay a quién
 * pertenece, y sin título no se distingue de los otros veintinueve.
 *
 * Y LA DURACIÓN NO SE INVENTA. Con bloques, sale de sumarlos, como siempre.
 * Sin bloques, la elige quien crea la sesión —y se ve el campo, no un cero
 * escondido—: el calendario tiene que pintar algo que dure lo que dura.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Clock, Copy, GripVertical, Package, Plus, Save, Search,
  Trash2, X,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import {
  Button, Field, Input, PageHeader, Panel, Select, Tag, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { addMinutes, cn, dayName, minutesToLabel, normalize, toISODate, today, uid } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { Drill, DrillTag, SessionBlock, TrainingSession } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';

const TAGS: DrillTag[] = [
  'Calentamiento', 'Posesión', 'Finalización', 'Defensa', 'Ataque', 'Presión',
  'Transición', 'Técnica', 'Táctica', 'Preparación física',
];

/** Las duraciones de un entrenamiento normal, para no escribir minutos a mano. */
const DURACIONES = [60, 75, 90, 105, 120];

const esFecha = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * El título que se propone: «Entrenamiento del martes».
 *
 * No es relleno: es el nombre con el que se reconoce en una lista de treinta,
 * y se puede cambiar. Se propone, no se impone —y si se toca, no se vuelve a
 * tocar solo aunque cambie la fecha—.
 */
const tituloPropuesto = (fecha: string) => `Entrenamiento del ${dayName(fecha).toLowerCase()}`;

const emptySession = (teamId: string, fecha: string): TrainingSession => ({
  id: '',
  teamId,
  title: tituloPropuesto(fecha),
  date: fecha,
  start: '19:00',
  duration: 0,
  venue: '',
  objective: '',
  expectedPlayers: 0,
  material: [],
  blocks: [],
  status: 'borrador',
});

export default function SessionBuilder() {
  /* El ancho lo decide la tarea, no la pantalla. */
  useAnchura('ancho');
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, teamId, actions } = useClub();
  const teams = visibleTeams(data);
  const [saving, setSaving] = useState(false);

  /* La fecha puede venir en la dirección: el calendario enlaza aquí desde un
     día vacío y el formulario tiene que llegar con ese día puesto, no con hoy.
     Si no viene, o viene mal escrita, se usa hoy. */
  const [params] = useSearchParams();
  const fechaPedida = esFecha(params.get('fecha')) ? (params.get('fecha') as string) : toISODate(today());

  const existing = sessionId ? data.sessions.find((s) => s.id === sessionId) : undefined;
  const [draft, setDraft] = useState<TrainingSession>(() => existing ?? emptySession(teamId, fechaPedida));
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryTag, setLibraryTag] = useState<DrillTag | 'todas'>('todas');
  /* La duración de una sesión sin bloques: la pone quien crea, y por eso hay
     que saber si la ha tocado o si sigue siendo la propuesta. */
  const [duracionSuelta, setDuracionSuelta] = useState(90);
  const [tituloAMano, setTituloAMano] = useState(false);
  const dragBlock = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    if (!existing) return;
    setDraft(existing);
    /* Una sesión guardada sin bloques ya tiene su duración: se trae tal cual,
       que si no, al abrirla para editarla volvería a 90 sin avisar. */
    if (existing.blocks.length === 0 && existing.duration > 0) setDuracionSuelta(existing.duration);
  }, [existing]);

  /* Equipo y campo salen de los datos del club, no de un texto inventado: el
     campo del equipo es el campo donde entrena, y las jugadores esperadas son
     las que hay en la plantilla. Si alguien los cambia, no se vuelven a tocar.
     Sólo para una sesión nueva: editar una existente no pisa lo guardado. */
  useEffect(() => {
    if (existing || draft.teamId) return;
    const primero = teamId || teams[0]?.id;
    if (primero) setDraft((d) => ({ ...d, teamId: primero }));
  }, [existing, draft.teamId, teamId, teams]);

  useEffect(() => {
    if (existing || !draft.teamId) return;
    const equipo = teams.find((t) => t.id === draft.teamId);
    const plantilla = data.players.filter((p) => p.teamId === draft.teamId).length;
    setDraft((d) => ({
      ...d,
      venue: d.venue || equipo?.venue || '',
      expectedPlayers: d.expectedPlayers || plantilla,
    }));
  }, [existing, draft.teamId, teams, data.players]);

  /* El título sigue a la fecha mientras nadie lo haya escrito a mano. */
  useEffect(() => {
    if (existing || tituloAMano) return;
    setDraft((d) => (d.title === tituloPropuesto(d.date) ? d : { ...d, title: tituloPropuesto(d.date) }));
  }, [existing, tituloAMano, draft.date]);

  const totalDuration = useMemo(() => draft.blocks.reduce((a, b) => a + b.duration, 0), [draft.blocks]);
  /** Lo que se va a guardar y lo que verá el calendario. */
  const duracionFinal = draft.blocks.length > 0 ? totalDuration : duracionSuelta;

  const drills = useMemo(
    () =>
      data.drills
        .filter((d) => (libraryTag === 'todas' ? true : d.tags.includes(libraryTag)))
        .filter((d) =>
          libraryQuery.trim()
            ? normalize(d.name).includes(normalize(libraryQuery)) || normalize(d.objective).includes(normalize(libraryQuery))
            : true,
        ),
    [data.drills, libraryTag, libraryQuery],
  );

  const update = (patch: Partial<TrainingSession>) => setDraft((d) => ({ ...d, ...patch }));

  const addDrill = (drill: Drill, at?: number) => {
    const block: SessionBlock = {
      id: uid('blk'),
      drillId: drill.id,
      title: drill.name,
      duration: drill.duration,
      tags: drill.tags,
    };
    setDraft((d) => {
      const blocks = [...d.blocks];
      blocks.splice(at ?? blocks.length, 0, block);
      return {
        ...d,
        blocks,
        material: Array.from(new Set([...d.material, ...drill.material])),
      };
    });
  };

  const addCustomBlock = () => {
    setDraft((d) => ({
      ...d,
      blocks: [...d.blocks, { id: uid('blk'), title: 'Bloque personalizado', duration: 15, tags: ['Táctica'] }],
    }));
  };

  const patchBlock = (id: string, patch: Partial<SessionBlock>) =>
    setDraft((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));

  const removeBlock = (id: string) =>
    setDraft((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));

  const duplicateBlock = (id: string) =>
    setDraft((d) => {
      const idx = d.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return d;
      const copy = { ...d.blocks[idx], id: uid('blk') };
      const blocks = [...d.blocks];
      blocks.splice(idx + 1, 0, copy);
      return { ...d, blocks };
    });

  const reorder = (from: number, to: number) =>
    setDraft((d) => {
      const blocks = [...d.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved);
      return { ...d, blocks };
    });

  const save = async (status: TrainingSession['status']) => {
    if (!draft.teamId) {
      toast.error('Falta el equipo', 'Selecciona el equipo para el que preparas la sesión.');
      return;
    }
    if (!draft.title.trim()) {
      toast.error('Falta el título del entrenamiento', 'Ponle un nombre para poder reconocerlo en tu planificación.');
      return;
    }
    /* AQUÍ NO HAY TERCERA COMPROBACIÓN. Antes se exigía un bloque, y eso
       impedía guardar a quien aún no tiene ejercicios en la biblioteca. */
    setSaving(true);
    try {
      const saved = await actions.saveSession({ ...draft, duration: duracionFinal, status });
      await actions.log({
        kind: 'sesion',
        teamId: saved.teamId,
        text: existing ? `Has actualizado «${saved.title}».` : `Has creado un nuevo entrenamiento: «${saved.title}».`,
        link: `/app/entrenamientos/${saved.id}`,
      });
      toast.success(
        status === 'borrador' ? 'Borrador guardado' : 'Entrenamiento guardado correctamente',
        saved.blocks.length === 0
          ? `${minutesToLabel(duracionFinal)} · ya está en el calendario, los ejercicios cuando quieras`
          : `${minutesToLabel(duracionFinal)} · ${saved.blocks.length} ${saved.blocks.length === 1 ? 'bloque' : 'bloques'}`,
      );
      navigate(`/app/entrenamientos/${saved.id}`);
    } catch (e) {
      toast.error('No hemos podido guardar el entrenamiento', humanError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link
        to="/app/entrenamientos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink-900"
      >
        <ArrowLeft size={15} /> Planificaciones
      </Link>

      <PageHeader
        title={existing ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}
        description="Con el día, la hora y el equipo ya se puede guardar. Los ejercicios, cuando los tengas."
        actions={
          <>
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => save('borrador')}>
              Guardar borrador
            </Button>
            <Button size="sm" icon={<Save size={15} />} loading={saving} onClick={() => save('planificado')}>
              Guardar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Datos de la sesión */}
          <Panel className="p-5">
            <h2 className="text-base font-semibold">Datos de la sesión</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Título" className="sm:col-span-2">
                <Input
                  value={draft.title}
                  onChange={(e) => {
                    setTituloAMano(true);
                    update({ title: e.target.value });
                  }}
                  placeholder="Ej.: Táctica colectiva — presión tras pérdida"
                />
              </Field>
              <Field label="Equipo">
                <Select value={draft.teamId} onChange={(e) => update({ teamId: e.target.value })}>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Campo">
                <Input
                  value={draft.venue}
                  onChange={(e) => update({ venue: e.target.value })}
                  placeholder="Dónde se entrena"
                />
              </Field>
              <Field label="Fecha">
                <Input type="date" value={draft.date} onChange={(e) => update({ date: e.target.value })} />
              </Field>
              <Field label="Hora de inicio">
                <Input type="time" value={draft.start} onChange={(e) => update({ start: e.target.value })} />
              </Field>
              <Field label="Objetivo de la sesión" className="sm:col-span-2">
                <Input
                  value={draft.objective}
                  onChange={(e) => update({ objective: e.target.value })}
                  placeholder="¿Qué quieres que mejoren hoy?"
                />
              </Field>
              <Field label="Número de jugadores">
                <Input
                  type="number"
                  value={draft.expectedPlayers}
                  onChange={(e) => update({ expectedPlayers: Number(e.target.value) })}
                />
              </Field>
              {/* CON BLOQUES SE CALCULA; SIN BLOQUES SE ELIGE. Enseñar «0 min»
                  y decir que se calcula sola era lo que dejaba el calendario
                  con entrenamientos que empiezan y acaban a la misma hora. */}
              {draft.blocks.length > 0 ? (
                <Field label="Duración total" hint="Se calcula sola a partir de los bloques.">
                  <div className="flex h-12 items-center gap-2 rounded-xl border border-line bg-ink-50 px-3.5">
                    <Clock size={16} className="text-ink-800" />
                    <span className="text-base font-semibold text-ink-900 tabular-nums">
                      {minutesToLabel(totalDuration)}
                    </span>
                    <span className="text-xs text-ink-500">
                      {draft.start} – {addMinutes(draft.start, totalDuration)}
                    </span>
                  </div>
                </Field>
              ) : (
                <Field
                  label="Duración"
                  hint={`De ${draft.start} a ${addMinutes(draft.start, duracionSuelta)}. Al añadir ejercicios se calcula sola.`}
                >
                  {/* La duración guardada entra en la lista aunque no sea una
                      de las habituales: una sesión importada puede durar 80
                      minutos, y un desplegable sin su propio valor se pinta
                      vacío y lo cambia al guardar sin que nadie lo toque. */}
                  <Select value={duracionSuelta} onChange={(e) => setDuracionSuelta(Number(e.target.value))}>
                    {Array.from(new Set([...DURACIONES, duracionSuelta])).sort((a, b) => a - b).map((m) => (
                      <option key={m} value={m}>{minutesToLabel(m)}</option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Observaciones" className="sm:col-span-2">
                <Textarea
                  value={draft.notes ?? ''}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder="Notas para el cuerpo técnico, cargas individuales, jugadores al margen…"
                  className="min-h-[72px]"
                />
              </Field>
            </div>
          </Panel>

          {/* Línea de sesión */}
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Línea de la sesión</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {draft.blocks.length === 0
                    ? 'Opcional: se puede guardar sin ejercicios'
                    : `${draft.blocks.length} ${draft.blocks.length === 1 ? 'bloque' : 'bloques'} · ${minutesToLabel(totalDuration)}`}
                </p>
              </div>
              <Button variant="secondary" size="sm" icon={<Plus size={15} />} onClick={addCustomBlock}>
                Bloque propio
              </Button>
            </div>

            {draft.blocks.length === 0 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('drill-id');
                  const drill = data.drills.find((d) => d.id === id);
                  if (drill) addDrill(drill);
                }}
                className="m-4 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center"
              >
                {/* CON LA BIBLIOTECA VACÍA NO SE DICE «ARRASTRA UN EJERCICIO».
                    Un club nuevo no tiene ninguno, y ese cartel mandaba a
                    coger algo de una lista vacía. Si no hay, se dice que no
                    hay y se enseña dónde se hace el primero. */}
                {data.drills.length === 0 ? (
                  <>
                    <p className="text-base font-medium text-ink-800">Todavía no tienes ejercicios</p>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
                      No hace falta ninguno para guardar el entrenamiento: con el día y la hora ya
                      queda en el calendario. Los ejercicios se añaden cuando los tengas.
                    </p>
                    <Link
                      to="/app/ejercicios/nuevo"
                      className="mt-3 inline-block text-sm font-medium text-ink-900 underline underline-offset-2"
                    >
                      Crear el primero
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium text-ink-800">Sin ejercicios, por ahora</p>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
                      Cógelos de la biblioteca —abajo en el móvil, al lado en el ordenador— o crea
                      un bloque propio. También puedes guardar así y montarla más tarde.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <ol>
                {draft.blocks.map((block, i) => {
                  let cursor = draft.start;
                  for (let k = 0; k < i; k++) cursor = addMinutes(cursor, draft.blocks[k].duration);
                  return (
                    <li
                      key={block.id}
                      draggable
                      onDragStart={() => (dragBlock.current = i)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(i);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        const drillId = e.dataTransfer.getData('drill-id');
                        if (drillId) {
                          const drill = data.drills.find((d) => d.id === drillId);
                          if (drill) addDrill(drill, i);
                        } else if (dragBlock.current !== null && dragBlock.current !== i) {
                          reorder(dragBlock.current, i);
                        }
                        dragBlock.current = null;
                      }}
                      className={cn(
                        'group flex items-start gap-3 border-b border-ink-100 px-4 py-3.5 transition-colors last:border-0',
                        dragOver === i && 'bg-ink-50/60',
                      )}
                    >
                      <span className="mt-1 cursor-grab text-ink-300 transition-colors group-hover:text-muted active:cursor-grabbing">
                        <GripVertical size={17} />
                      </span>
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-50 text-2xs font-bold text-ink-900 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>

                      <div className="min-w-0 flex-1">
                        <input
                          value={block.title}
                          onChange={(e) => patchBlock(block.id, { title: e.target.value })}
                          className="w-full rounded-md bg-transparent px-1 py-0.5 text-base font-medium text-ink-900 outline-none transition-colors hover:bg-ink-50 focus:bg-ink-50"
                        />
                        <input
                          value={block.series ?? ''}
                          onChange={(e) => patchBlock(block.id, { series: e.target.value })}
                          placeholder="Series y descansos (ej.: 4 x 4′ / 90″)"
                          className="mt-0.5 w-full rounded-md bg-transparent px-1 py-0.5 text-xs text-muted outline-none transition-colors placeholder:text-ink-500 hover:bg-ink-50 focus:bg-ink-50"
                        />
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
                          {block.tags.slice(0, 3).map((t) => (
                            <Tag key={t} tone="neutral" size="sm">
                              {t}
                            </Tag>
                          ))}
                          <span className="text-2xs text-ink-500 tabular-nums">
                            {cursor} – {addMinutes(cursor, block.duration)}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <div className="flex items-center rounded-lg border border-line">
                          <button
                            onClick={() => patchBlock(block.id, { duration: Math.max(5, block.duration - 5) })}
                            className="px-2 py-1.5 text-ink-500 transition-colors hover:text-ink-900"
                            aria-label="Menos tiempo"
                          >
                            −
                          </button>
                          <span className="w-10 text-center text-sm font-semibold text-ink-800 tabular-nums">
                            {block.duration}′
                          </span>
                          <button
                            onClick={() => patchBlock(block.id, { duration: block.duration + 5 })}
                            className="px-2 py-1.5 text-ink-500 transition-colors hover:text-ink-900"
                            aria-label="Más tiempo"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => duplicateBlock(block.id)}
                          className="rounded-lg p-2 text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-600"
                          aria-label="Duplicar bloque"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="rounded-lg p-2 text-ink-300 transition-colors hover:bg-bad/8 hover:text-bad"
                          aria-label="Eliminar bloque"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {draft.blocks.length > 0 && (
              <div className="border-t border-ink-100 bg-ink-50/50 px-5 py-4">
                <div className="flex gap-1">
                  {draft.blocks.map((b) => (
                    <div
                      key={b.id}
                      title={`${b.title} · ${b.duration}′`}
                      className="h-2 rounded-full bg-ink-400"
                      style={{ flex: b.duration }}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted">Duración total</span>
                  <span className="text-base font-semibold text-ink-900 tabular-nums">
                    {minutesToLabel(totalDuration)}
                  </span>
                </div>
              </div>
            )}
          </Panel>

          {/* Material */}
          <Panel className="p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Package size={16} className="text-ink-800" /> Material
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.material.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm text-ink-700"
                >
                  {m}
                  {/* 32 px de lado, no 13. La ✕ medía lo que mide su icono y
                      había que acertarle con la yema; ahora el área sensible
                      es un cuadrado que se sale un poco de la etiqueta, que
                      es lo que hace que se pueda quitar a la primera. */}
                  <button
                    onClick={() => update({ material: draft.material.filter((x) => x !== m) })}
                    className="-mr-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-raised hover:text-bad"
                    aria-label={`Quitar ${m}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
              <input
                placeholder="+ Añadir material"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v && !draft.material.includes(v)) update({ material: [...draft.material, v] });
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                /* 40 px de alto y letra de 16: por debajo de 16, Safari en el
                   iPhone amplía la página entera al enfocar. */
                className="h-10 rounded-xl border border-dashed border-line-fuerte bg-transparent px-3 text-md outline-none placeholder:text-ink-500 focus:border-ink-900"
              />
            </div>
          </Panel>
        </div>

        {/* Biblioteca de ejercicios */}
        <Panel className="h-fit overflow-hidden xl:sticky xl:top-24">
          <div className="border-b border-ink-100 p-4">
            <h2 className="text-base font-semibold">Biblioteca de ejercicios</h2>
            <p className="mt-0.5 text-xs text-muted">Arrástralos a la línea o pulsa para añadir al final.</p>
            <div className="relative mt-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <Input
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Buscar ejercicio…"
                className="h-11 pl-9"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                onClick={() => setLibraryTag('todas')}
                className={cn(
                  'inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium transition-colors',
                  libraryTag === 'todas' ? 'bg-ink-50 text-ink-900 ring-1 ring-inset ring-ink-200' : 'text-muted hover:bg-ink-100',
                )}
              >
                Todas
              </button>
              {TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setLibraryTag(t)}
                  className={cn(
                    'inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium transition-colors',
                    libraryTag === t ? 'bg-ink-50 text-ink-900 ring-1 ring-inset ring-ink-200' : 'text-muted hover:bg-ink-100',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[540px] overflow-y-auto p-2 pb-16">
            {drills.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                Ningún ejercicio coincide con el filtro.
              </p>
            ) : (
              drills.map((d) => (
                <button
                  key={d.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('drill-id', d.id)}
                  onClick={() => addDrill(d)}
                  className="group flex w-full cursor-grab items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-ink-50/60 active:cursor-grabbing"
                >
                  <GripVertical size={15} className="mt-0.5 shrink-0 text-ink-300 group-hover:text-ink-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-800">{d.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">{d.tags.join(' · ')}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-ink-100 px-1.5 py-0.5 text-2xs font-medium text-ink-600 tabular-nums">
                    {d.duration}′
                  </span>
                </button>
              ))
            )}
          </div>
        </Panel>
      </div>

    </>
  );
}
