/**
 * Constructor de entrenamientos.
 * ---------------------------------------------------------------------------
 * Dos formas de trabajar, misma pantalla:
 *   1. Arrastrar ejercicios de la biblioteca a la línea de sesión (o pulsarlos).
 * La duración total se recalcula sola en cada cambio.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { addMinutes, cn, minutesToLabel, normalize, toISODate, today, uid } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { Drill, DrillTag, SessionBlock, TrainingSession } from '@/types';

const TAGS: DrillTag[] = [
  'Calentamiento', 'Posesión', 'Finalización', 'Defensa', 'Ataque', 'Presión',
  'Transición', 'Técnica', 'Táctica', 'Preparación física',
];

const emptySession = (teamId: string): TrainingSession => ({
  id: '',
  teamId,
  title: '',
  date: toISODate(today()),
  start: '19:00',
  duration: 0,
  venue: 'Campo Municipal',
  objective: '',
  expectedPlayers: 20,
  material: ['Balones', 'Conos', 'Petos'],
  blocks: [],
  status: 'borrador',
});

export default function SessionBuilder() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, teamId, actions } = useClub();
  const teams = visibleTeams(data);
  const [saving, setSaving] = useState(false);

  const existing = sessionId ? data.sessions.find((s) => s.id === sessionId) : undefined;
  const [draft, setDraft] = useState<TrainingSession>(() => existing ?? emptySession(teamId));
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryTag, setLibraryTag] = useState<DrillTag | 'todas'>('todas');
  const dragBlock = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    if (existing) setDraft(existing);
  }, [existing]);

  const totalDuration = useMemo(() => draft.blocks.reduce((a, b) => a + b.duration, 0), [draft.blocks]);

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
    if (draft.blocks.length === 0) {
      toast.error('La sesión está vacía', 'Añade al menos un ejercicio desde la biblioteca o crea un bloque propio.');
      return;
    }
    setSaving(true);
    try {
      const saved = await actions.saveSession({ ...draft, duration: totalDuration, status });
      await actions.log({
        kind: 'sesion',
        teamId: saved.teamId,
        text: existing ? `Has actualizado «${saved.title}».` : `Has creado un nuevo entrenamiento: «${saved.title}».`,
        link: `/app/entrenamientos/${saved.id}`,
      });
      toast.success(
        status === 'borrador' ? 'Borrador guardado' : 'Entrenamiento guardado correctamente',
        `${minutesToLabel(totalDuration)} · ${saved.blocks.length} bloques`,
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
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted transition-colors hover:text-ink-900"
      >
        <ArrowLeft size={15} /> Planificaciones
      </Link>

      <PageHeader
        title={existing ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}
        description="Arrastra ejercicios a la línea de sesión, ajusta las duraciones y guarda."
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

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Datos de la sesión */}
          <Panel className="p-5">
            <h2 className="text-[15px] font-semibold">Datos de la sesión</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Título" className="sm:col-span-2">
                <Input
                  value={draft.title}
                  onChange={(e) => update({ title: e.target.value })}
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
                <Input value={draft.venue} onChange={(e) => update({ venue: e.target.value })} />
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
              <Field label="Número de jugadoras">
                <Input
                  type="number"
                  value={draft.expectedPlayers}
                  onChange={(e) => update({ expectedPlayers: Number(e.target.value) })}
                />
              </Field>
              <Field label="Duración total" hint="Se calcula sola a partir de los bloques.">
                <div className="flex h-[42px] items-center gap-2 rounded-xl border border-line bg-ink-50 px-3.5">
                  <Clock size={16} className="text-ink-800" />
                  <span className="text-[15px] font-semibold text-ink-900 tabular-nums">
                    {minutesToLabel(totalDuration)}
                  </span>
                  <span className="text-[12.5px] text-ink-400">
                    {draft.start} – {addMinutes(draft.start, totalDuration)}
                  </span>
                </div>
              </Field>
              <Field label="Observaciones" className="sm:col-span-2">
                <Textarea
                  value={draft.notes ?? ''}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder="Notas para el cuerpo técnico, cargas individuales, jugadoras al margen…"
                  className="min-h-[72px]"
                />
              </Field>
            </div>
          </Panel>

          {/* Línea de sesión */}
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold">Línea de la sesión</h2>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {draft.blocks.length} bloques · {minutesToLabel(totalDuration)}
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
                className="m-5 rounded-2xl border-2 border-dashed border-line py-14 text-center"
              >
                <p className="text-[14px] font-medium text-ink-700">Arrastra aquí tu primer ejercicio</p>
                <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
                  Cógelos de la biblioteca de la derecha o crea un bloque propio.
                </p>
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
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-50 text-[11px] font-bold text-ink-900 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>

                      <div className="min-w-0 flex-1">
                        <input
                          value={block.title}
                          onChange={(e) => patchBlock(block.id, { title: e.target.value })}
                          className="w-full rounded-md bg-transparent px-1 py-0.5 text-[14.5px] font-medium text-ink-900 outline-none transition-colors hover:bg-ink-50 focus:bg-ink-50"
                        />
                        <input
                          value={block.series ?? ''}
                          onChange={(e) => patchBlock(block.id, { series: e.target.value })}
                          placeholder="Series y descansos (ej.: 4 x 4′ / 90″)"
                          className="mt-0.5 w-full rounded-md bg-transparent px-1 py-0.5 text-[12.5px] text-muted outline-none transition-colors placeholder:text-ink-300 hover:bg-ink-50 focus:bg-ink-50"
                        />
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
                          {block.tags.slice(0, 3).map((t) => (
                            <Tag key={t} tone="neutral" size="sm">
                              {t}
                            </Tag>
                          ))}
                          <span className="text-[11.5px] text-ink-400 tabular-nums">
                            {cursor} – {addMinutes(cursor, block.duration)}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <div className="flex items-center rounded-lg border border-line">
                          <button
                            onClick={() => patchBlock(block.id, { duration: Math.max(5, block.duration - 5) })}
                            className="px-2 py-1.5 text-ink-400 transition-colors hover:text-ink-900"
                            aria-label="Menos tiempo"
                          >
                            −
                          </button>
                          <span className="w-10 text-center text-[13px] font-semibold text-ink-800 tabular-nums">
                            {block.duration}′
                          </span>
                          <button
                            onClick={() => patchBlock(block.id, { duration: block.duration + 5 })}
                            className="px-2 py-1.5 text-ink-400 transition-colors hover:text-ink-900"
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
                  <span className="text-[12.5px] text-muted">Duración total</span>
                  <span className="text-[15px] font-semibold text-ink-900 tabular-nums">
                    {minutesToLabel(totalDuration)}
                  </span>
                </div>
              </div>
            )}
          </Panel>

          {/* Material */}
          <Panel className="p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Package size={16} className="text-ink-800" /> Material
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.material.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[13px] text-ink-700"
                >
                  {m}
                  <button
                    onClick={() => update({ material: draft.material.filter((x) => x !== m) })}
                    className="text-ink-300 transition-colors hover:text-bad"
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
                className="rounded-lg border border-dashed border-ink-300 px-2.5 py-1.5 text-[13px] outline-none placeholder:text-ink-400 focus:border-ink-400"
              />
            </div>
          </Panel>
        </div>

        {/* Biblioteca de ejercicios */}
        <Panel className="h-fit overflow-hidden xl:sticky xl:top-24">
          <div className="border-b border-ink-100 p-4">
            <h2 className="text-[15px] font-semibold">Biblioteca de ejercicios</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">Arrástralos a la línea o pulsa para añadir al final.</p>
            <div className="relative mt-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Buscar ejercicio…"
                className="py-2 pl-9 text-[13.5px]"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                onClick={() => setLibraryTag('todas')}
                className={cn(
                  'rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
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
                    'rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
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
              <p className="px-3 py-8 text-center text-[13px] text-muted">
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
                  <GripVertical size={15} className="mt-0.5 shrink-0 text-ink-300 group-hover:text-ink-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink-800">{d.name}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted">{d.tags.join(' · ')}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-ink-100 px-1.5 py-0.5 text-[11.5px] font-medium text-ink-600 tabular-nums">
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
