/**
 * Editor de escena reutilizable.
 * ---------------------------------------------------------------------------
 * Lo usan la pizarra táctica y la ficha de un ejercicio. Recibe la escena y
 * devuelve la escena modificada; no sabe dónde se guarda ni quién la guarda.
 *
 * Reglas que no cambian:
 *  · Mientras se reproduce no se edita.
 *  · Mover un objeto en un instante crea un fotograma clave en ese instante.
 *  · El estado de reproducción no forma parte de la escena.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Pause, Play, Redo2, Repeat, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { Button, Field, Input, Panel, PanelHeader, Segmented, Select, Tag, Toggle } from '@/components/ui';
import { BoardStage } from './BoardStage';
import { Timeline } from './Timeline';
import { formatSeconds, type Playback, type Speed } from './playback';
import {
  MOVE_LABEL, MOVES, PITCH_OPTIONS,
  type Keyframe, type ObjectKind, type PitchKind, type Point, type Scene,
  addObject, layoutTeam, moveObject, patchKeyframe, removeKeyframe, removeObject,
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

export function useBoardHistory(scene: Scene, setScene: (s: Scene) => void) {
  const past = useRef<Scene[]>([]);
  const future = useRef<Scene[]>([]);
  const [, bump] = useState(0);

  const commit = useCallback(
    (next: Scene) => {
      past.current = [...past.current.slice(-49), scene];
      future.current = [];
      setScene(next);
      bump((n) => n + 1);
    },
    [scene, setScene],
  );

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current = [scene, ...future.current.slice(0, 49)];
    setScene(previous);
    bump((n) => n + 1);
  }, [scene, setScene]);

  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    past.current = [...past.current, scene];
    future.current = rest;
    setScene(next);
    bump((n) => n + 1);
  }, [scene, setScene]);

  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    bump((n) => n + 1);
  }, []);

  return { commit, undo, redo, reset, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}

export function BoardEditor({
  scene, playback, history, svgRef, onExportImage, aside, compact,
}: {
  scene: Scene;
  /** Los cambios se aplican a través de `history.commit`. */
  onChange?: (s: Scene) => void;
  playback: Playback;
  history: ReturnType<typeof useBoardHistory>;
  svgRef?: React.RefObject<SVGSVGElement>;
  onExportImage?: () => void;
  /** Contenido extra para la columna lateral (nombre, notas, guardar…). */
  aside?: React.ReactNode;
  /** Sin columna lateral: el panel de la jugada va debajo del campo. */
  compact?: boolean;
}) {
  const { commit, undo, redo, canUndo, canRedo } = history;
  const [selected, setSelected] = useState<string | null>(null);
  const [showPaths, setShowPaths] = useState(true);

  const editable = !playback.playing;
  const selectedObject = scene.objects.find((o) => o.id === selected) ?? null;
  const selectedTrack = selected ? scene.tracks[selected] ?? [] : [];

  const onMove = useCallback(
    (id: string, at: Point) => commit(moveObject(scene, id, Math.round(playback.time), at)),
    [commit, scene, playback.time],
  );

  const onAdd = useCallback(
    (kind: ObjectKind, at?: Point) => {
      const label =
        kind === 'jugadora' || kind === 'rival'
          ? String(scene.objects.filter((o) => o.kind === kind).length + 1)
          : kind === 'nota'
            ? 'Texto'
            : '';
      const point = at ?? { x: scene.pitch.startsWith('medio') ? 18 : 30, y: 22 };
      commit(addObject(scene, { kind, label }, point));
    },
    [commit, scene],
  );

  /* Atajos: espacio reproduce, flechas mueven el cabezal, supr. borra. */
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

  const panelJugada = (
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

        <Toggle checked={showPaths} onChange={setShowPaths} label="Ver todas las trayectorias" />
      </div>
    </Panel>
  );

  const lateral = (
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
                <ul className="space-y-2">
                  {selectedTrack.map((k, i) => (
                    <KeyframeRow
                      key={`${k.t}-${i}`}
                      k={k}
                      first={i === 0}
                      max={scene.durationMs}
                      onSeek={() => playback.seek(k.t)}
                      onPatch={(patch) => commit(patchKeyframe(scene, selectedObject.id, k.t, patch))}
                      onRemove={() => commit(removeKeyframe(scene, selectedObject.id, k.t))}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      )}

      {panelJugada}
      {aside}
    </div>
  );

  return (
    <div className={cn('grid gap-3', !compact && 'lg:grid-cols-[1fr_280px]')}>
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
              <Button size="sm" variant="ghost" onClick={undo} disabled={!canUndo} icon={<Undo2 size={15} />} aria-label="Deshacer" />
              <Button size="sm" variant="ghost" onClick={redo} disabled={!canRedo} icon={<Redo2 size={15} />} aria-label="Rehacer" />
              {onExportImage && (
                <Button size="sm" variant="secondary" onClick={onExportImage} icon={<ImageIcon size={15} />}>
                  Imagen
                </Button>
              )}
            </div>
          </div>

          <div className="bg-navy-900/5 p-2 sm:p-3">
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

        {compact && lateral}
      </div>

      {!compact && lateral}
    </div>
  );
}

/** Una fila de la lista de fotogramas: instante, tipo de movimiento y trazo. */
function KeyframeRow({
  k, first, max, onSeek, onPatch, onRemove,
}: {
  k: Keyframe;
  first: boolean;
  max: number;
  onSeek: () => void;
  onPatch: (patch: Partial<Keyframe>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="rounded-md border border-line p-2">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onSeek} className="text-sm tabular-nums text-navy-800 underline-offset-2 hover:underline">
          {formatSeconds(k.t)}
        </button>
        {first ? (
          <Tag size="sm">Inicio</Tag>
        ) : (
          <button onClick={onRemove} className="text-xs text-muted hover:text-bad">
            Quitar
          </button>
        )}
      </div>

      {!first && (
        <div className="mt-2 space-y-2">
          <Field label="Llega en">
            <Input
              type="range"
              min={200}
              max={max}
              step={100}
              value={k.t}
              onChange={(e) => onPatch({ t: Number(e.target.value) })}
              className="h-6 px-0"
            />
          </Field>
          <Field label="Qué es">
            <Select value={k.move ?? 'carrera'} onChange={(e) => onPatch({ move: e.target.value as Keyframe['move'] })}>
              {MOVES.map((m) => (
                <option key={m} value={m}>
                  {MOVE_LABEL[m]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </li>
  );
}
