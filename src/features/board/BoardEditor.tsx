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
 *  · Los dibujos explicativos y las trayectorias que animan son cosas
 *    distintas y se editan por separado.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, Copy, Hand, Image as ImageIcon, Maximize2, Minus, MousePointer2, Move,
  Pause, Play, Redo2, Repeat, RotateCcw, Slash, Spline, Square, Trash2, Undo2,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import { Button, Field, Input, Panel, PanelHeader, Segmented, Select, Tag, Toggle } from '@/components/ui';
import { BoardStage, useBoardView, type Tool } from './BoardStage';
import { Timeline } from './Timeline';
import { formatSeconds, type Playback, type Speed } from './playback';
import {
  DRAW_COLORS, DRAW_LABEL, KIND_LABEL, MOVE_LABEL, MOVES, PITCH_OPTIONS, RESIZABLE, ROTATABLE,
  type DrawKind, type Keyframe, type ObjectKind, type PitchKind, type Point, type Scene, type Surface,
  addDrawing, addObject, duplicateObject, layoutSquad, layoutTeam, moveObject, patchDrawing,
  patchKeyframe, patchObject, removeDrawing, removeKeyframe, removeObject,
} from './scene';
import { cn } from '@/lib/utils';

/** Lo que se puede poner en el campo, por grupos. */
const PALETTE: { grupo: string; kinds: ObjectKind[] }[] = [
  { grupo: 'Fichas', kinds: ['jugadora', 'rival', 'portera', 'comodin'] },
  { grupo: 'Material', kinds: ['balon', 'cono', 'pica', 'porteria', 'miniporteria'] },
  { grupo: 'Sobre el campo', kinds: ['zona', 'nota'] },
];

const HERRAMIENTAS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: null, label: 'Seleccionar', icon: <MousePointer2 size={15} /> },
  { id: 'mano', label: 'Desplazar', icon: <Hand size={15} /> },
  { id: 'linea', label: 'Línea', icon: <Slash size={15} /> },
  { id: 'flecha', label: 'Flecha', icon: <ArrowUpRight size={15} /> },
  { id: 'discontinua', label: 'Discontinua', icon: <Minus size={15} /> },
  { id: 'curva', label: 'Curva', icon: <Spline size={15} /> },
  { id: 'zona', label: 'Zona', icon: <Square size={15} /> },
];

const DURATIONS = [3000, 5000, 6000, 8000, 10000, 15000, 20000];
const GROSORES = [
  { id: '0.24', label: 'Fino' },
  { id: '0.36', label: 'Medio' },
  { id: '0.6', label: 'Grueso' },
];

export interface SquadMember {
  id: string;
  name: string;
  number: number;
  isKeeper?: boolean;
}

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
  scene, playback, history, svgRef, onExportImage, aside, compact, squad = [],
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
  /** Plantilla real del equipo, para colocar jugadoras de verdad. */
  squad?: SquadMember[];
}) {
  const { commit, undo, redo, canUndo, canRedo } = history;
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [tool, setTool] = useState<Tool>(null);
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [drawWidth, setDrawWidth] = useState(0.36);
  const [presenting, setPresenting] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const vista = useBoardView();

  const editable = !playback.playing;
  const selectedObject = scene.objects.find((o) => o.id === selected) ?? null;
  const selectedTrack = selected ? scene.tracks[selected] ?? [] : [];
  const drawing = (scene.drawings ?? []).find((d) => d.id === selectedDrawing) ?? null;

  const onMove = useCallback(
    (id: string, at: Point) => commit(moveObject(scene, id, Math.round(playback.time), at)),
    [commit, scene, playback.time],
  );

  const onAdd = useCallback(
    (kind: ObjectKind, at?: Point) => {
      const esFicha = kind === 'jugadora' || kind === 'rival' || kind === 'portera' || kind === 'comodin';
      const label = esFicha
        ? String(scene.objects.filter((o) => o.kind === kind).length + 1)
        : kind === 'nota'
          ? 'Texto'
          : '';
      const point = at ?? { x: scene.pitch.startsWith('medio') ? 18 : 30, y: 22 };
      commit(addObject(scene, { kind, label }, point));
    },
    [commit, scene],
  );

  /* ─────────────────────────── Presentación ──────────────────────────────── */

  const presentar = useCallback(async () => {
    const el = shell.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      // Sin pantalla completa (iOS no la da en cualquier elemento) se presenta
      // igual: se ocultan los paneles y el campo ocupa lo que haya.
      setPresenting((p) => !p);
    }
  }, []);

  useEffect(() => {
    const onChange = () => setPresenting(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

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
      if (e.key === 'Escape') {
        setTool(null);
        setPresenting(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && selected && editable) {
        e.preventDefault();
        commit(duplicateObject(scene, selected));
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && editable) {
        if (selected) {
          commit(removeObject(scene, selected));
          setSelected(null);
        } else if (selectedDrawing) {
          commit(removeDrawing(scene, selectedDrawing));
          setSelectedDrawing(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playback, undo, redo, selected, selectedDrawing, editable, commit, scene]);

  /* ───────────────────────────── Paneles ─────────────────────────────────── */

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

        <Field label="Orientación">
          <Segmented<'h' | 'v'>
            size="sm"
            value={scene.vertical ? 'v' : 'h'}
            onChange={(v) => commit({ ...scene, vertical: v === 'v' })}
            options={[
              { id: 'h', label: 'Horizontal' },
              { id: 'v', label: 'Vertical' },
            ]}
          />
        </Field>

        <Field label="Superficie" hint="La de impresión se lee en papel sin gastar tinta.">
          <Segmented<Surface>
            size="sm"
            value={scene.surface ?? 'cesped'}
            onChange={(v) => commit({ ...scene, surface: v })}
            options={[
              { id: 'cesped', label: 'Césped' },
              { id: 'impresion', label: 'Impresión' },
            ]}
          />
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

  const panelDibujo = drawing && editable && (
    <Panel>
      <PanelHeader
        title={DRAW_LABEL[drawing.kind]}
        actions={
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 size={14} />}
            aria-label="Borrar el trazo"
            onClick={() => {
              commit(removeDrawing(scene, drawing.id));
              setSelectedDrawing(null);
            }}
          />
        }
      />
      <div className="space-y-3 p-3">
        <Field label="Color">
          <Paleta value={drawing.color} onChange={(c) => commit(patchDrawing(scene, drawing.id, { color: c }))} />
        </Field>
        <Field label="Grosor">
          <Segmented
            size="sm"
            value={String(drawing.width)}
            onChange={(v) => commit(patchDrawing(scene, drawing.id, { width: Number(v) }))}
            options={GROSORES}
          />
        </Field>
        <Field label="Tipo">
          <Select
            value={drawing.kind}
            onChange={(e) => commit(patchDrawing(scene, drawing.id, { kind: e.target.value as DrawKind }))}
          >
            {(Object.keys(DRAW_LABEL) as DrawKind[]).map((k) => (
              <option key={k} value={k}>
                {DRAW_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        {drawing.kind === 'zona' && (
          <Field label="Forma">
            <Segmented<'rect' | 'circulo'>
              size="sm"
              value={drawing.shape ?? 'rect'}
              onChange={(v) => commit(patchDrawing(scene, drawing.id, { shape: v }))}
              options={[
                { id: 'rect', label: 'Rectángulo' },
                { id: 'circulo', label: 'Círculo' },
              ]}
            />
          </Field>
        )}
        <p className="text-sm leading-relaxed text-muted">
          Los trazos son anotaciones: explican el ejercicio, pero no mueven a nadie. Lo que anima es
          el recorrido de cada ficha.
        </p>
      </div>
    </Panel>
  );

  const panelObjeto = selectedObject && editable && (
    <Panel>
      <PanelHeader
        title={
          selectedObject.name ||
          `${KIND_LABEL[selectedObject.kind]}${selectedObject.label ? ` ${selectedObject.label}` : ''}`
        }
        actions={
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              icon={<Copy size={14} />}
              aria-label="Duplicar"
              onClick={() => commit(duplicateObject(scene, selectedObject.id))}
            />
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
          </div>
        }
      />
      <div className="space-y-3 p-3">
        {(selectedObject.kind === 'nota' || selectedObject.kind === 'zona' ||
          ['jugadora', 'rival', 'portera', 'comodin'].includes(selectedObject.kind)) && (
          <Field label={selectedObject.kind === 'jugadora' || selectedObject.kind === 'rival' ||
            selectedObject.kind === 'portera' || selectedObject.kind === 'comodin' ? 'Dorsal' : 'Texto'}>
            <Input
              value={selectedObject.label}
              maxLength={selectedObject.kind === 'nota' ? 24 : 4}
              onChange={(e) => commit(patchObject(scene, selectedObject.id, { label: e.target.value }))}
            />
          </Field>
        )}

        {['jugadora', 'rival', 'portera', 'comodin'].includes(selectedObject.kind) && (
          <Field label="Nombre" hint="Se ve aquí, no sobre el campo.">
            <Input
              value={selectedObject.name ?? ''}
              placeholder="Opcional"
              onChange={(e) => commit(patchObject(scene, selectedObject.id, { name: e.target.value }))}
            />
          </Field>
        )}

        <Field label="Color">
          <Paleta
            value={selectedObject.color ?? ''}
            allowDefault
            onChange={(c) => commit(patchObject(scene, selectedObject.id, { color: c || undefined }))}
          />
        </Field>

        {RESIZABLE.includes(selectedObject.kind) && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Ancho (m)">
              <Input
                type="number"
                min={1}
                max={80}
                step={0.5}
                value={selectedObject.w ?? 10}
                onChange={(e) => commit(patchObject(scene, selectedObject.id, { w: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Alto (m)">
              <Input
                type="number"
                min={1}
                max={80}
                step={0.5}
                value={selectedObject.h ?? 10}
                onChange={(e) => commit(patchObject(scene, selectedObject.id, { h: Number(e.target.value) }))}
              />
            </Field>
          </div>
        )}

        {selectedObject.kind === 'zona' && (
          <Field label="Forma">
            <Segmented<'rect' | 'circulo'>
              size="sm"
              value={selectedObject.shape ?? 'rect'}
              onChange={(v) => commit(patchObject(scene, selectedObject.id, { shape: v }))}
              options={[
                { id: 'rect', label: 'Rectángulo' },
                { id: 'circulo', label: 'Círculo' },
              ]}
            />
          </Field>
        )}

        {ROTATABLE.includes(selectedObject.kind) && (
          <Field label={`Giro · ${Math.round(selectedObject.rot ?? 0)}°`}>
            <Input
              type="range"
              min={0}
              max={350}
              step={10}
              value={selectedObject.rot ?? 0}
              onChange={(e) => commit(patchObject(scene, selectedObject.id, { rot: Number(e.target.value) }))}
              className="h-6 px-0"
            />
          </Field>
        )}

        <div>
          <p className="eyebrow mb-1.5">Movimiento</p>
          {selectedTrack.length < 2 ? (
            <p className="text-sm leading-relaxed text-muted">
              Todavía no se mueve. Lleva el cabezal a un instante posterior y arrástrala a su nueva
              posición: ese recorrido se reproducirá de forma continua.
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
  );

  const lateral = (
    <div className="space-y-3">
      <Panel>
        <PanelHeader title="Añadir al campo" />
        <div className="space-y-2.5 p-2.5">
          {PALETTE.map((g) => (
            <div key={g.grupo}>
              <p className="eyebrow mb-1.5">{g.grupo}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {g.kinds.map((kind) => (
                  <button
                    key={kind}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/playoff360-objeto', kind)}
                    onClick={() => onAdd(kind)}
                    disabled={!editable}
                    className="rounded-md border border-line bg-white px-2 py-2 text-left text-sm font-medium text-navy-800 transition-colors hover:border-navy-400 disabled:opacity-50"
                  >
                    {KIND_LABEL[kind]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-line p-2.5">
          <Button size="sm" variant="secondary" disabled={!editable} onClick={() => commit(layoutTeam(scene, 'jugadora'))}>
            Alineación propia
          </Button>
          <Button size="sm" variant="secondary" disabled={!editable} onClick={() => commit(layoutTeam(scene, 'rival'))}>
            Alineación rival
          </Button>
          {squad.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!editable}
              onClick={() => commit(layoutSquad(scene, squad.slice(0, 11)))}
            >
              Mi plantilla
            </Button>
          )}
        </div>
      </Panel>

      {panelObjeto}
      {panelDibujo}
      {panelJugada}
      {aside}
    </div>
  );

  /* ─────────────────────────────── Vista ─────────────────────────────────── */

  const barraDibujo = (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
      <div className="flex items-center gap-1">
        {HERRAMIENTAS.map((h) => (
          <button
            key={h.label}
            onClick={() => setTool(h.id)}
            disabled={!editable}
            aria-pressed={tool === h.id}
            title={h.label}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-md border transition-colors disabled:opacity-50',
              tool === h.id
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-line bg-white text-navy-700 hover:border-navy-400',
            )}
          >
            {h.icon}
          </button>
        ))}
      </div>

      {tool && tool !== 'mano' && (
        <>
          <span className="h-5 w-px bg-line" />
          <Paleta value={drawColor} onChange={setDrawColor} />
          <Segmented
            size="sm"
            value={String(drawWidth)}
            onChange={(v) => setDrawWidth(Number(v))}
            options={GROSORES}
          />
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={vista.zoomOut} icon={<ZoomOut size={15} />} aria-label="Alejar" />
        <Button size="sm" variant="ghost" onClick={vista.zoomIn} icon={<ZoomIn size={15} />} aria-label="Acercar" />
        <Button
          size="sm"
          variant="ghost"
          onClick={vista.fit}
          disabled={vista.ajustado}
          icon={<Move size={15} />}
          aria-label="Encuadrar todo"
        />
      </div>
    </div>
  );

  const barraReproduccion = (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
      <Button
        size="sm"
        onClick={playback.toggle}
        icon={playback.playing ? <Pause size={15} /> : <Play size={15} />}
      >
        {playback.playing ? 'Pausar' : 'Reproducir'}
      </Button>
      {/* Sin `aria-label`: ya tiene texto visible, y poner otro distinto hace que
          el lector de pantalla y el control por voz anuncien algo que no se ve. */}
      <Button size="sm" variant="secondary" onClick={playback.reset} icon={<RotateCcw size={15} />}>
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
        <Button size="sm" variant="secondary" onClick={presentar} icon={<Maximize2 size={15} />}>
          Presentar
        </Button>
      </div>
    </div>
  );

  const campo = (
    <BoardStage
      scene={scene}
      playback={playback}
      selected={editable ? selected : null}
      onSelect={(id) => {
        setSelected(id);
        if (id) setSelectedDrawing(null);
      }}
      onMove={onMove}
      onDropNew={(kind, at) => onAdd(kind, at)}
      editable={editable}
      showPaths={showPaths && !presenting}
      svgRef={svgRef}
      tool={tool}
      drawColor={drawColor}
      drawWidth={drawWidth}
      onDraw={(d) => {
        commit(addDrawing(scene, d));
        setTool(null);
      }}
      selectedDrawing={selectedDrawing}
      onSelectDrawing={setSelectedDrawing}
      view={vista.view}
      onView={vista.setView}
      presenting={presenting}
    />
  );

  /* Presentación: sólo el campo y los mandos imprescindibles. */
  if (presenting) {
    return (
      <div ref={shell} className="flex h-full w-full flex-col bg-night">
        <div className="flex min-h-0 flex-1 items-center justify-center p-3">{campo}</div>
        <div className="flex items-center justify-center gap-2 border-t border-white/10 px-3 py-2.5">
          <Button
            size="sm"
            onClick={playback.toggle}
            icon={playback.playing ? <Pause size={15} /> : <Play size={15} />}
          >
            {playback.playing ? 'Pausar' : 'Reproducir'}
          </Button>
          <Button size="sm" variant="secondary" onClick={playback.reset} icon={<RotateCcw size={15} />}>
            Reiniciar
          </Button>
          <button
            onClick={() => playback.setLoop(!playback.loop)}
            aria-pressed={playback.loop}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors',
              playback.loop ? 'border-white bg-white text-night' : 'border-white/25 text-white/80',
            )}
          >
            <Repeat size={14} /> Bucle
          </button>
          <span className="ml-2 text-sm tabular-nums text-white/60">
            {formatSeconds(playback.time)} / {formatSeconds(scene.durationMs)}
          </span>
          <Button size="sm" variant="secondary" onClick={presentar} className="ml-2">
            Salir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={shell} className={cn('grid gap-3', !compact && 'lg:grid-cols-[1fr_280px]')}>
      <div className="min-w-0 space-y-3">
        <Panel className="overflow-hidden">
          {barraReproduccion}
          {barraDibujo}

          <div className="bg-navy-900/5 p-2 sm:p-3">
            <div className="mx-auto w-full overflow-hidden rounded">{campo}</div>
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

/* ─────────────────────────────── Piezas ──────────────────────────────────── */

/** Seis colores y nada más: una rueda completa sólo sirve para perder el tiempo. */
function Paleta({
  value, onChange, allowDefault,
}: {
  value: string;
  onChange: (c: string) => void;
  allowDefault?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowDefault && (
        <button
          onClick={() => onChange('')}
          aria-pressed={!value}
          title="Color por defecto"
          className={cn(
            'grid h-7 w-7 place-items-center rounded-md border text-xs text-muted',
            !value ? 'border-navy-900' : 'border-line',
          )}
        >
          —
        </button>
      )}
      {DRAW_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          aria-label={`Color ${c}`}
          style={{ background: c }}
          className={cn(
            'h-7 w-7 rounded-md border transition-transform',
            value === c ? 'border-navy-900 ring-2 ring-navy-900/20' : 'border-line',
          )}
        />
      ))}
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
