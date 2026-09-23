/**
 * Pizarra táctica — el centro del producto.
 *
 * Reglas de la pantalla:
 *  · Mientras se reproduce no se edita. El estado de reproducción y el de
 *    edición están separados: mover el cabezal nunca cambia la jugada.
 *  · Mover una jugadora en un instante crea un fotograma clave en ese instante.
 *    Entre fotogramas, la posición se interpola: el movimiento es continuo.
 *  · Guardar es explícito y se ve. Nada se da por guardado si el servidor no lo
 *    ha confirmado.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Image as ImageIcon, Pause, Play, Plus, Redo2, Repeat, RotateCcw, Trash2, Undo2,
} from 'lucide-react';
import {
  Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Panel,
  PanelHeader, SaveIndicator, Segmented, Select, Skeleton, Tag, Textarea, Toggle,
  type SaveState,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import { plays, type Play as SavedPlay, type PlaySummary } from '@/services/plays';
import { humanError } from '@/services/supabase';
import { BoardStage } from './BoardStage';
import { Timeline } from './Timeline';
import { formatSeconds, usePlayback, type Speed } from './playback';
import {
  EMPTY_SCENE, PITCH_OPTIONS, type ObjectKind, type PitchKind, type Point, type Scene,
  addObject, layoutTeam, moveObject, removeKeyframe, removeObject,
} from './scene';
import { cn } from '@/lib/utils';

const PALETTE: { kind: ObjectKind; label: string; hint: string }[] = [
  { kind: 'jugadora', label: 'Jugadora', hint: 'Del equipo' },
  { kind: 'rival', label: 'Rival', hint: 'Equipo contrario' },
  { kind: 'balon', label: 'Balón', hint: 'Se mueve con los pases' },
  { kind: 'cono', label: 'Cono', hint: 'Material' },
  { kind: 'porteria', label: 'Portería', hint: 'Portería portátil' },
  { kind: 'nota', label: 'Texto', hint: 'Una indicación sobre el campo' },
];

const DURATIONS = [3000, 5000, 6000, 8000, 10000, 15000, 20000];

export default function BoardPage() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, userId, teamId } = useClub();
  const teams = visibleTeams(data);

  const [scene, setScene] = useState<Scene>(EMPTY_SCENE);
  const [list, setList] = useState<PlaySummary[] | null>(null);
  const [current, setCurrent] = useState<SavedPlay | null>(null);
  const [name, setName] = useState('Jugada sin nombre');
  const [description, setDescription] = useState('');
  const [playTeam, setPlayTeam] = useState<string>(teamId ?? '');
  const [selected, setSelected] = useState<string | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openList, setOpenList] = useState(false);

  const playback = usePlayback(scene.durationMs);
  const svgRef = useRef<SVGSVGElement>(null);

  /* Historial para deshacer y rehacer: sólo del estado de edición. */
  const past = useRef<Scene[]>([]);
  const future = useRef<Scene[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  const commit = useCallback(
    (next: Scene) => {
      past.current = [...past.current.slice(-49), scene];
      future.current = [];
      setScene(next);
      setHistoryTick((t) => t + 1);
      setSaveState('idle');
    },
    [scene],
  );

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current = [scene, ...future.current.slice(0, 49)];
    setScene(previous);
    setHistoryTick((t) => t + 1);
  }, [scene]);

  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    past.current = [...past.current, scene];
    future.current = rest;
    setScene(next);
    setHistoryTick((t) => t + 1);
  }, [scene]);

  /* ─────────────────────────────── Carga ─────────────────────────────────── */

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);
    plays
      .list()
      .then((rows) => alive && setList(rows))
      .catch((e) => alive && setLoadError(humanError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!playId) {
      setCurrent(null);
      return;
    }
    let alive = true;
    setLoading(true);
    plays
      .get(playId)
      .then((p) => {
        if (!alive) return;
        if (!p) {
          toast.error('Esa jugada ya no existe.');
          navigate('/app/pizarra', { replace: true });
          return;
        }
        setCurrent(p);
        setScene(p.scene);
        setName(p.name);
        setDescription(p.description);
        setPlayTeam(p.teamId ?? '');
        past.current = [];
        future.current = [];
        playback.reset();
      })
      .catch((e) => alive && setLoadError(humanError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // playback y toast son estables; sólo reaccionamos al identificador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  /* ─────────────────────────────── Edición ───────────────────────────────── */

  const editable = !playback.playing;

  const onMove = useCallback(
    (id: string, at: Point) => commit(moveObject(scene, id, Math.round(playback.time), at)),
    [commit, scene, playback.time],
  );

  const onAdd = useCallback(
    (kind: ObjectKind, at?: Point) => {
      const spec = scene.pitch;
      const label =
        kind === 'jugadora' || kind === 'rival'
          ? String(scene.objects.filter((o) => o.kind === kind).length + 1)
          : kind === 'nota'
            ? 'Texto'
            : '';
      const point = at ?? { x: spec.startsWith('medio') ? 18 : 30, y: 22 };
      commit(addObject(scene, { kind, label }, point));
    },
    [commit, scene],
  );

  const selectedObject = scene.objects.find((o) => o.id === selected) ?? null;
  const selectedTrack = selected ? scene.tracks[selected] ?? [] : [];

  /* Atajos: espacio reproduce, flechas mueven el cabezal. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        playback.toggle();
      }
      if (e.key === 'ArrowRight') playback.seek(playback.time + (e.shiftKey ? 1000 : 100));
      if (e.key === 'ArrowLeft') playback.seek(playback.time - (e.shiftKey ? 1000 : 100));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && editable) {
        commit(removeObject(scene, selected));
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playback, undo, redo, selected, editable, commit, scene]);

  /* ─────────────────────────────── Guardar ───────────────────────────────── */

  const save = async () => {
    if (!userId) return;
    setSaveState('saving');
    try {
      const saved = await plays.save({
        id: current?.id,
        name,
        description,
        teamId: playTeam || null,
        scene,
        userId,
      });
      setCurrent(saved);
      setSaveState('saved');
      setList((rows) => {
        const others = (rows ?? []).filter((r) => r.id !== saved.id);
        return [{ ...saved }, ...others];
      });
      if (!playId) navigate(`/app/pizarra/${saved.id}`, { replace: true });
    } catch (e) {
      setSaveState('error');
      toast.error(humanError(e));
    }
  };

  const remove = async () => {
    if (!current) return;
    try {
      await plays.remove(current.id);
      setList((rows) => (rows ?? []).filter((r) => r.id !== current.id));
      toast.success('Jugada eliminada.');
      navigate('/app/pizarra', { replace: true });
      setScene(EMPTY_SCENE);
      setCurrent(null);
      setName('Jugada sin nombre');
    } catch (e) {
      toast.error(humanError(e));
    } finally {
      setConfirmDelete(false);
    }
  };

  /* Exportación: una imagen del instante actual. El navegador no permite
     grabar vídeo de forma fiable desde aquí, así que no lo prometemos. */
  const exportImage = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const source = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = Math.round((1800 * svg.clientHeight) / Math.max(1, svg.clientWidth));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `${name.replace(/[^\w\sáéíóúñ-]/gi, '').trim() || 'jugada'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      toast.error('No hemos podido generar la imagen en este navegador.');
    }
  };

  /* ─────────────────────────────── Pantalla ──────────────────────────────── */

  const dirty = useMemo(() => saveState === 'idle' && scene.objects.length > 0, [saveState, scene]);

  if (loadError) {
    return (
      <ErrorState
        description={loadError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          current ? (
            <>
              <button onClick={() => setOpenList(true)} className="hover:text-navy-900">
                Pizarra táctica
              </button>
              <span>·</span>
              <span>Guardada en el club</span>
            </>
          ) : (
            'Pizarra táctica'
          )
        }
        title={
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaveState('idle');
            }}
            aria-label="Nombre de la jugada"
            className="w-full max-w-xl rounded border border-transparent bg-transparent px-1 py-0.5 text-xl font-semibold leading-tight outline-none transition-colors hover:border-line focus:border-navy-600 sm:text-2xl"
          />
        }
        actions={
          <>
            <SaveIndicator state={saveState} />
            <Button variant="secondary" onClick={() => setOpenList(true)}>
              Mis jugadas
            </Button>
            <Button onClick={save} loading={saveState === 'saving'}>
              Guardar
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Campo y controles */}
        <div className="min-w-0 space-y-3">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
              <Button
                size="sm"
                onClick={playback.toggle}
                icon={playback.playing ? <Pause size={15} /> : <Play size={15} />}
              >
                {playback.playing ? 'Pausar' : 'Reproducir'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={playback.reset}
                icon={<RotateCcw size={15} />}
                aria-label="Volver al principio"
              >
                Reiniciar
              </Button>

              <Segmented<'0.5' | '1' | '2'>
                size="sm"
                value={String(playback.speed) as '0.5' | '1' | '2'}
                onChange={(v) => playback.setSpeed(Number(v) as Speed)}
                options={[
                  { id: '0.5', label: '0,5×' },
                  { id: '1', label: '1×' },
                  { id: '2', label: '2×' },
                ]}
              />

              <button
                onClick={() => playback.setLoop(!playback.loop)}
                aria-pressed={playback.loop}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors',
                  playback.loop
                    ? 'border-navy-900 bg-navy-900 text-white'
                    : 'border-line bg-white text-navy-700 hover:border-navy-400',
                )}
              >
                <Repeat size={14} /> Bucle
              </button>

              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={undo}
                  disabled={past.current.length === 0}
                  icon={<Undo2 size={15} />}
                  aria-label="Deshacer"
                  data-history={historyTick}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={redo}
                  disabled={future.current.length === 0}
                  icon={<Redo2 size={15} />}
                  aria-label="Rehacer"
                />
                <Button size="sm" variant="secondary" onClick={exportImage} icon={<ImageIcon size={15} />}>
                  Imagen
                </Button>
              </div>
            </div>

            <div className="bg-navy-900/5 p-2 sm:p-3">
              {loading && !current && scene.objects.length === 0 ? (
                <Skeleton className="aspect-[111/74] w-full" />
              ) : (
                <div className="mx-auto w-full overflow-hidden rounded">
                  <BoardStage
                    scene={scene}
                    playback={playback}
                    selected={editable ? selected : null}
                    onSelect={setSelected}
                    onMove={onMove}
                    onDropNew={(kind, at) => onAdd(kind, at)}
                    editable={editable}
                    showPaths={showPaths}
                    svgRef={svgRef}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-line px-3 py-3">
              <Timeline
                scene={scene}
                playback={playback}
                selected={selected}
                editable={editable}
                onRemoveKeyframe={(id, t) => commit(removeKeyframe(scene, id, t))}
              />
            </div>
          </Panel>

          {scene.objects.length === 0 && (
            <Panel>
              <EmptyState
                title="El campo está vacío"
                description="Coloca las jugadoras y el balón, muévelos en distintos instantes y la jugada se reproducirá sola. Puedes empezar con una alineación completa."
                action={
                  <>
                    <Button onClick={() => commit(layoutTeam(scene, 'jugadora'))}>
                      Colocar mi equipo
                    </Button>
                    <Button variant="secondary" onClick={() => onAdd('jugadora')}>
                      Añadir una jugadora
                    </Button>
                  </>
                }
              />
            </Panel>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-3">
          <Panel>
            <PanelHeader title="Añadir al campo" />
            <div className="grid grid-cols-2 gap-1.5 p-2.5">
              {PALETTE.map((p) => (
                <button
                  key={p.kind}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/ffsp-objeto', p.kind)}
                  onClick={() => onAdd(p.kind)}
                  disabled={!editable}
                  title={p.hint}
                  className="rounded-md border border-line bg-white px-2 py-2 text-left text-sm font-medium text-navy-800 transition-colors hover:border-navy-400 disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-line p-2.5">
              <Button size="sm" variant="secondary" disabled={!editable} onClick={() => commit(layoutTeam(scene, 'jugadora'))}>
                Alineación propia
              </Button>
              <Button size="sm" variant="secondary" disabled={!editable} onClick={() => commit(layoutTeam(scene, 'rival'))}>
                Alineación rival
              </Button>
            </div>
          </Panel>

          {selectedObject && editable && (
            <Panel>
              <PanelHeader
                title={
                  selectedObject.kind === 'balon'
                    ? 'Balón'
                    : selectedObject.kind === 'rival'
                      ? `Rival ${selectedObject.label}`
                      : selectedObject.kind === 'jugadora'
                        ? `Jugadora ${selectedObject.label}`
                        : 'Elemento'
                }
                actions={
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 size={14} />}
                    aria-label="Quitar del campo"
                    onClick={() => {
                      commit(removeObject(scene, selectedObject.id));
                      setSelected(null);
                    }}
                  />
                }
              />
              <div className="space-y-3 p-3">
                {(selectedObject.kind === 'jugadora' ||
                  selectedObject.kind === 'rival' ||
                  selectedObject.kind === 'nota') && (
                  <Field label={selectedObject.kind === 'nota' ? 'Texto' : 'Dorsal'}>
                    <Input
                      value={selectedObject.label}
                      maxLength={selectedObject.kind === 'nota' ? 24 : 3}
                      onChange={(e) =>
                        commit({
                          ...scene,
                          objects: scene.objects.map((o) =>
                            o.id === selectedObject.id ? { ...o, label: e.target.value } : o,
                          ),
                        })
                      }
                    />
                  </Field>
                )}

                <div>
                  <p className="eyebrow mb-1.5">Movimiento</p>
                  {selectedTrack.length < 2 ? (
                    <p className="text-sm leading-relaxed text-muted">
                      Todavía no se mueve. Lleva el cabezal a un instante posterior y arrástrala a su
                      nueva posición: ese recorrido se reproducirá de forma continua.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {selectedTrack.map((k) => (
                        <li key={k.t} className="flex items-center justify-between gap-2 text-sm">
                          <button
                            onClick={() => playback.seek(k.t)}
                            className="tabular-nums text-navy-800 underline-offset-2 hover:underline"
                          >
                            {formatSeconds(k.t)}
                          </button>
                          {k.t === 0 ? (
                            <Tag size="sm">Inicio</Tag>
                          ) : (
                            <button
                              onClick={() => commit(removeKeyframe(scene, selectedObject.id, k.t))}
                              className="text-xs text-muted hover:text-bad"
                            >
                              Quitar
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="La jugada" />
            <div className="space-y-3 p-3">
              <Field label="Campo">
                <Select
                  value={scene.pitch}
                  disabled={!editable}
                  onChange={(e) => commit({ ...scene, pitch: e.target.value as PitchKind })}
                >
                  {PITCH_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Duración" hint="Cuánto dura la jugada completa.">
                <Select
                  value={String(scene.durationMs)}
                  disabled={!editable}
                  onChange={(e) => commit({ ...scene, durationMs: Number(e.target.value) })}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {formatSeconds(d)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Equipo" hint="Opcional. Sirve para encontrarla después.">
                <Select value={playTeam} onChange={(e) => setPlayTeam(e.target.value)}>
                  <option value="">Sin equipo concreto</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Notas">
                <Textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setSaveState('idle');
                  }}
                  placeholder="Qué se trabaja, a qué prestar atención…"
                  className="min-h-[70px]"
                />
              </Field>

              <Toggle checked={showPaths} onChange={setShowPaths} label="Ver todas las trayectorias" />

              {current && (
                <Button
                  variant="danger"
                  size="sm"
                  block
                  icon={<Trash2 size={14} />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Eliminar jugada
                </Button>
              )}
            </div>
          </Panel>

          <p className="px-1 text-xs leading-relaxed text-muted">
            La exportación genera una imagen del instante actual. Grabar la animación en vídeo desde
            el navegador no es fiable en todos los equipos, así que no lo ofrecemos todavía.
          </p>
        </div>
      </div>

      {/* Jugadas guardadas */}
      <Modal
        open={openList}
        onClose={() => setOpenList(false)}
        title="Jugadas del club"
        description="Se comparten con el cuerpo técnico que tiene acceso al club."
        footer={
          <Button
            icon={<Plus size={15} />}
            onClick={() => {
              setOpenList(false);
              navigate('/app/pizarra');
              setScene(EMPTY_SCENE);
              setCurrent(null);
              setName('Jugada sin nombre');
              setDescription('');
              past.current = [];
              future.current = [];
              playback.reset();
            }}
          >
            Nueva jugada
          </Button>
        }
      >
        {list === null ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="Todavía no hay jugadas guardadas"
            description="Cuando guardes la primera, aparecerá aquí para todo el cuerpo técnico del club."
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setOpenList(false);
                    navigate(`/app/pizarra/${p.id}`);
                  }}
                  className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-navy-900">{p.name}</span>
                    {p.description && (
                      <span className="mt-0.5 block truncate text-sm text-muted">{p.description}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {formatSeconds(p.durationMs)}
                  </span>
                  {p.id === current?.id && <Tag size="sm" tone="solid">Abierta</Tag>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Eliminar la jugada"
        description={
          <>
            Se eliminará <strong>{name}</strong> para todo el cuerpo técnico. No se puede deshacer.
          </>
        }
      />

      {/* Aviso discreto de cambios sin guardar */}
      {dirty && current && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center lg:bottom-6">
          <span className="pointer-events-auto flex items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm shadow-raised">
            Hay cambios sin guardar
            <Button size="sm" onClick={save} loading={saveState === 'saving'}>
              Guardar
            </Button>
          </span>
        </div>
      )}
    </>
  );
}
