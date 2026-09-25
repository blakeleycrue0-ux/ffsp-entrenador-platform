/**
 * El campo interactivo.
 * ---------------------------------------------------------------------------
 * Durante la reproducción las posiciones se escriben directamente sobre el SVG
 * en cada fotograma, sin pasar por el estado de React: así el movimiento es
 * continuo y no depende de cuántas veces se vuelva a dibujar la interfaz.
 * React sólo se ocupa de qué objetos existen, no de dónde están en cada
 * instante.
 *
 * Todo se dibuja dentro de un grupo «mundo» con el zoom y el desplazamiento
 * aplicados. Las coordenadas del ratón se convierten contra ESE grupo, no
 * contra el SVG, de modo que arrastrar sigue siendo exacto con cualquier zoom
 * y con el campo en vertical.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pitch } from './Pitch';
import {
  MOVE_DASH, PITCHES, type BoardObject, type DrawKind, type Drawing, type ObjectKind,
  type Point, type Scene, sampleScene, trackSegments,
} from './scene';
import type { Playback } from './playback';
import { cn } from '@/lib/utils';

/* ─────────────────────────────── Colores ─────────────────────────────────── */

const FILL: Record<ObjectKind, string> = {
  jugadora: '#101C2D',
  rival: '#FFFFFF',
  portera: '#E2A33C',
  comodin: '#7FB2F0',
  balon: '#FFFFFF',
  cono: '#E2A33C',
  pica: '#E8695C',
  porteria: '#FFFFFF',
  miniporteria: '#FFFFFF',
  zona: '#3ECF8E',
  nota: 'transparent',
};

const TEXT: Record<ObjectKind, string> = {
  jugadora: '#FFFFFF',
  rival: '#101C2D',
  portera: '#101C2D',
  comodin: '#101C2D',
  balon: '#101C2D',
  cono: '#101C2D',
  pica: '#101C2D',
  porteria: '#101C2D',
  miniporteria: '#101C2D',
  zona: '#101C2D',
  nota: '#FFFFFF',
};

/* ──────────────────────────── Zoom y encuadre ────────────────────────────── */

export interface View {
  /** 1 es «todo el campo a la vista». */
  s: number;
  /** Desplazamiento en unidades del lienzo. */
  tx: number;
  ty: number;
}

export const VIEW_INICIAL: View = { s: 1, tx: 0, ty: 0 };

export function useBoardView() {
  const [view, setView] = useState<View>(VIEW_INICIAL);
  const zoom = useCallback((factor: number) => {
    setView((v) => {
      const s = Math.min(4, Math.max(0.6, v.s * factor));
      // Se amplía respecto al centro: lo que estabas mirando se queda donde está.
      return { s, tx: v.tx * (s / v.s), ty: v.ty * (s / v.s) };
    });
  }, []);
  const fit = useCallback(() => setView(VIEW_INICIAL), []);
  return {
    view,
    setView,
    zoomIn: useCallback(() => zoom(1.25), [zoom]),
    zoomOut: useCallback(() => zoom(1 / 1.25), [zoom]),
    fit,
    ajustado: view.s === 1 && view.tx === 0 && view.ty === 0,
  };
}

/* ──────────────────────────────── Props ──────────────────────────────────── */

/** `mano` desplaza el campo; el resto dibuja; `null` selecciona y arrastra. */
export type Tool = 'mano' | DrawKind | null;

export interface StageProps {
  scene: Scene;
  playback: Playback;
  /** `null` mientras se reproduce: durante la reproducción no se edita. */
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** Suelta un objeto en una posición nueva en el instante actual. */
  onMove: (id: string, at: Point) => void;
  /** Crear un objeto al soltar sobre el campo desde la paleta. */
  onDropNew?: (kind: ObjectKind, at: Point) => void;
  editable: boolean;
  /** Muestra las trayectorias de todos los objetos, no sólo del seleccionado. */
  showPaths: boolean;
  svgRef?: React.RefObject<SVGSVGElement>;
  className?: string;

  /** Herramienta activa. Sin ella se selecciona y se arrastra. */
  tool?: Tool;
  /** Color y grosor con los que se dibuja. */
  drawColor?: string;
  drawWidth?: number;
  onDraw?: (d: Omit<Drawing, 'id'>) => void;
  selectedDrawing?: string | null;
  onSelectDrawing?: (id: string | null) => void;

  view?: View;
  onView?: (v: View) => void;
  /** En presentación no se ve nada que no sea la jugada. */
  presenting?: boolean;
}

export function BoardStage({
  scene, playback, selected, onSelect, onMove, onDropNew, editable, showPaths, svgRef, className,
  tool = null, drawColor = '#FFFFFF', drawWidth = 0.36, onDraw,
  selectedDrawing = null, onSelectDrawing, view = VIEW_INICIAL, onView, presenting,
}: StageProps) {
  const spec = PITCHES[scene.pitch];
  const vertical = scene.vertical === true;
  const innerRef = useRef<SVGSVGElement>(null);
  const svg = svgRef ?? innerRef;
  const world = useRef<SVGGElement>(null);
  const nodes = useRef(new Map<string, SVGGElement>());
  const dragging = useRef<{ id: string; pointerId: number } | null>(null);
  const panning = useRef<{ pointerId: number; x: number; y: number; from: View } | null>(null);
  const [draft, setDraft] = useState<Point[] | null>(null);

  const margin = 3;
  /* En vertical el lienzo cambia de proporción, pero las coordenadas no. */
  const boxW = (vertical ? spec.width : spec.length) + margin * 2;
  const boxH = (vertical ? spec.length : spec.width) + margin * 2;
  const viewBox = `${-margin} ${-margin} ${boxW} ${boxH}`;
  const ratio = boxW / boxH;

  /** Giro del mundo: en vertical, (x,y) → (ancho − y, x). */
  const worldTransform = [
    `translate(${view.tx} ${view.ty})`,
    `scale(${view.s})`,
    vertical ? `translate(${spec.width} 0) rotate(90)` : '',
  ]
    .filter(Boolean)
    .join(' ');

  /** Convierte un punto de pantalla a metros sobre el campo. */
  const toPitch = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const el = world.current;
      const root = svg.current;
      if (!el || !root) return null;
      const ctm = el.getScreenCTM();
      if (!ctm) return null;
      const pt = root.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const p = pt.matrixTransform(ctm.inverse());
      return {
        x: Math.min(spec.length + 2, Math.max(-2, p.x)),
        y: Math.min(spec.width + 2, Math.max(-2, p.y)),
      };
    },
    [spec.length, spec.width, svg],
  );

  /* Cada fotograma: escribir las posiciones directamente en el SVG. */
  useEffect(() => {
    const apply = (ms: number) => {
      const positions = sampleScene(scene, ms);
      for (const [id, node] of nodes.current) {
        const p = positions[id];
        if (p) node.setAttribute('transform', `translate(${p.x} ${p.y})`);
      }
    };
    return playback.subscribe(apply);
  }, [playback, scene]);

  /* ──────────────────────────── Interacción ──────────────────────────────── */

  const onPointerDownObject = (e: React.PointerEvent, id: string) => {
    if (!editable || tool) return;
    e.stopPropagation();
    onSelect(id);
    dragging.current = { id, pointerId: e.pointerId };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerDownSurface = (e: React.PointerEvent) => {
    if (!editable) return;

    if (tool === 'mano') {
      panning.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, from: view };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    if (tool) {
      const at = toPitch(e.clientX, e.clientY);
      if (at) setDraft([at, at]);
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    onSelect(null);
    onSelectDrawing?.(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const pan = panning.current;
    if (pan && pan.pointerId === e.pointerId) {
      onView?.({ ...pan.from, tx: pan.from.tx + (e.clientX - pan.x) * 0.06, ty: pan.from.ty + (e.clientY - pan.y) * 0.06 });
      return;
    }

    if (draft) {
      const at = toPitch(e.clientX, e.clientY);
      if (at) setDraft([draft[0], at]);
      return;
    }

    const drag = dragging.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const at = toPitch(e.clientX, e.clientY);
    if (!at) return;
    // Se pinta en el acto y se guarda en la jugada al mismo tiempo: no hay
    // desfase entre lo que se ve y lo que queda registrado.
    const node = nodes.current.get(drag.id);
    if (node) node.setAttribute('transform', `translate(${at.x} ${at.y})`);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (panning.current?.pointerId === e.pointerId) {
      panning.current = null;
      return;
    }

    if (draft) {
      const [a, b] = draft;
      const largo = Math.hypot(b.x - a.x, b.y - a.y);
      // Un toque suelto no es un trazo: evita llenar el campo de puntos.
      if (largo > 1.2 && tool && tool !== 'mano' && onDraw) {
        const points =
          tool === 'curva'
            ? [a, { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.3, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.3 }, b]
            : [a, b];
        onDraw({ kind: tool, points, color: drawColor, width: drawWidth, shape: 'rect' });
      }
      setDraft(null);
      return;
    }

    const drag = dragging.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragging.current = null;
    const at = toPitch(e.clientX, e.clientY);
    if (at) onMove(drag.id, at);
  };

  /* Trayectorias: sólo tiene sentido verlas con la reproducción parada. */
  const paths = useMemo(() => {
    if (playback.playing) return [];
    return scene.objects
      .filter((o) => showPaths || o.id === selected)
      .flatMap((o) =>
        trackSegments(scene.tracks[o.id] ?? []).map((seg, i) => ({
          key: `${o.id}-${i}`,
          id: o.id,
          kind: o.kind,
          ...seg,
        })),
      );
  }, [scene, selected, showPaths, playback.playing]);

  const positions = useMemo(() => sampleScene(scene, playback.time), [scene, playback.time]);
  const estela = (kind: ObjectKind) =>
    kind === 'balon' ? '#FFFFFF' : kind === 'rival' ? '#F0C3BE' : '#9FD9BB';

  return (
    <svg
      ref={svg}
      viewBox={viewBox}
      style={{ aspectRatio: ratio, touchAction: 'none' }}
      className={cn(
        'board-surface mx-auto block max-h-full w-full',
        tool === 'mano' && 'cursor-grab active:cursor-grabbing',
        tool && tool !== 'mano' && 'cursor-crosshair',
        className,
      )}
      role="img"
      aria-label={`Pizarra táctica con ${scene.objects.length} elementos`}
      onPointerDown={onPointerDownSurface}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={(e) => onDropNew && e.preventDefault()}
      onDrop={(e) => {
        if (!onDropNew) return;
        e.preventDefault();
        const kind = e.dataTransfer.getData('text/playoff360-objeto') as ObjectKind;
        const at = toPitch(e.clientX, e.clientY);
        if (kind && at) onDropNew(kind, at);
      }}
    >
      {/* Puntas de flecha: dicen hacia dónde va cada recorrido */}
      <defs>
        {[
          ['propia', '#9FD9BB'],
          ['rival', '#F0C3BE'],
          ['balon', '#FFFFFF'],
        ].map(([id, color]) => (
          <marker
            key={id}
            id={`punta-${id}`}
            viewBox="0 0 8 8"
            refX={6}
            refY={4}
            markerWidth={3}
            markerHeight={3}
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 7 4 L 0 7 z" fill={color} />
          </marker>
        ))}
        <marker
          id="punta-dibujo"
          viewBox="0 0 8 8"
          refX={6}
          refY={4}
          markerWidth={3.2}
          markerHeight={3.2}
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 7 4 L 0 7 z" fill="context-stroke" />
        </marker>
      </defs>

      <g ref={world} transform={worldTransform}>
        <Pitch spec={spec} surface={scene.surface ?? 'cesped'} />

        {/* Dibujos explicativos: por debajo de las fichas, nunca las tapan */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {(scene.drawings ?? []).map((d) => (
            <DrawingShape
              key={d.id}
              d={d}
              selected={d.id === selectedDrawing}
              onSelect={
                editable && !tool && onSelectDrawing
                  ? (e) => {
                      e.stopPropagation();
                      onSelectDrawing(d.id);
                      onSelect(null);
                    }
                  : undefined
              }
            />
          ))}
          {draft && tool && tool !== 'mano' && (
            <DrawingShape
              d={{
                id: 'borrador',
                kind: tool,
                points:
                  tool === 'curva'
                    ? [
                        draft[0],
                        {
                          x: (draft[0].x + draft[1].x) / 2 + (draft[1].y - draft[0].y) * 0.3,
                          y: (draft[0].y + draft[1].y) / 2 - (draft[1].x - draft[0].x) * 0.3,
                        },
                        draft[1],
                      ]
                    : draft,
                color: drawColor,
                width: drawWidth,
                shape: 'rect',
              }}
              selected={false}
            />
          )}
        </g>

        {/* Estelas de la animación */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {paths.map((p) => (
            <polyline
              key={p.key}
              points={p.points.map((q) => `${q.x},${q.y}`).join(' ')}
              stroke={estela(p.kind)}
              strokeWidth={0.36}
              strokeDasharray={p.kind === 'balon' ? MOVE_DASH.pase : MOVE_DASH[p.move]}
              opacity={p.id === selected ? 0.95 : 0.5}
              markerEnd={`url(#punta-${p.kind === 'balon' ? 'balon' : p.kind === 'rival' ? 'rival' : 'propia'})`}
            />
          ))}
        </g>

        {/* Objetos */}
        {scene.objects.map((obj) => {
          const p = positions[obj.id] ?? { x: spec.length / 2, y: spec.width / 2 };
          return (
            <g
              key={obj.id}
              ref={(el) => {
                if (el) nodes.current.set(obj.id, el);
                else nodes.current.delete(obj.id);
              }}
              transform={`translate(${p.x} ${p.y})`}
              className={cn(editable && !tool && 'cursor-grab active:cursor-grabbing')}
              onPointerDown={(e) => onPointerDownObject(e, obj.id)}
            >
              {/* En vertical se contragira para que dorsales y textos no salgan tumbados. */}
              <g transform={vertical ? 'rotate(-90)' : undefined}>
                <ObjectShape obj={obj} selected={obj.id === selected && !presenting} />
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ─────────────────────────────── Dibujos ─────────────────────────────────── */

function DrawingShape({
  d, selected, onSelect,
}: {
  d: Drawing;
  selected: boolean;
  onSelect?: (e: React.PointerEvent) => void;
}) {
  // Seleccionado se engorda un poco: es la señal más clara sobre un campo verde.
  const común = {
    stroke: d.color,
    strokeWidth: selected ? d.width * 1.9 : d.width,
    opacity: selected ? 1 : 0.85,
    onPointerDown: onSelect,
    style: onSelect ? { cursor: 'pointer' as const } : undefined,
  };
  if (d.kind === 'zona') {
    const [a, b] = d.points;
    if (d.shape === 'circulo') {
      return (
        <>
            <ellipse
            cx={(a.x + b.x) / 2}
            cy={(a.y + b.y) / 2}
            rx={Math.abs(b.x - a.x) / 2}
            ry={Math.abs(b.y - a.y) / 2}
            fill={d.color}
            fillOpacity={0.14}
            strokeDasharray="1.2 0.8"
            {...común}
          />
        </>
      );
    }
    return (
      <>
        <rect
          x={Math.min(a.x, b.x)}
          y={Math.min(a.y, b.y)}
          width={Math.abs(b.x - a.x)}
          height={Math.abs(b.y - a.y)}
          fill={d.color}
          fillOpacity={0.14}
          strokeDasharray="1.2 0.8"
          {...común}
        />
      </>
    );
  }

  if (d.kind === 'curva') {
    const [a, c, b] = d.points;
    return (
      <>
        <path
          d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`}
          markerEnd="url(#punta-dibujo)"
          {...común}
        />
      </>
    );
  }

  const [a, b] = d.points;
  return (
    <>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        strokeDasharray={d.kind === 'discontinua' ? '1.4 0.9' : undefined}
        markerEnd={d.kind === 'flecha' ? 'url(#punta-dibujo)' : undefined}
        {...común}
      />
    </>
  );
}

/* ─────────────────────────────── Fichas ──────────────────────────────────── */

function ObjectShape({ obj, selected }: { obj: BoardObject; selected: boolean }) {
  const ring = selected ? (
    <circle r={2.5} fill="none" stroke="#FFFFFF" strokeWidth={0.3} strokeDasharray="0.8 0.6" />
  ) : null;
  const color = obj.color || FILL[obj.kind];
  const giro = obj.rot ? `rotate(${obj.rot})` : undefined;

  if (obj.kind === 'zona') {
    const w = obj.w ?? 14;
    const h = obj.h ?? 10;
    return (
      <g transform={giro}>
        {ring}
        {obj.shape === 'circulo' ? (
          <ellipse
            rx={w / 2}
            ry={h / 2}
            fill={color}
            fillOpacity={0.16}
            stroke={color}
            strokeWidth={0.28}
            strokeDasharray="1.2 0.8"
          />
        ) : (
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill={color}
            fillOpacity={0.16}
            stroke={color}
            strokeWidth={0.28}
            strokeDasharray="1.2 0.8"
          />
        )}
        {obj.label && (
          <text textAnchor="middle" dominantBaseline="middle" fontSize={1.8} fill={color} fontWeight={600}>
            {obj.label}
          </text>
        )}
      </g>
    );
  }

  if (obj.kind === 'balon') {
    return (
      <>
        {ring}
        <circle r={0.95} fill="#FFFFFF" stroke="#101C2D" strokeWidth={0.18} />
      </>
    );
  }

  if (obj.kind === 'cono') {
    return (
      <>
        {ring}
        <polygon points="0,-1.4 1.2,1 -1.2,1" fill={color} stroke="#101C2D" strokeWidth={0.14} />
      </>
    );
  }

  if (obj.kind === 'pica') {
    return (
      <g transform={giro}>
        {ring}
        <rect x={-0.16} y={-1.8} width={0.32} height={3.6} rx={0.16} fill={color} />
        <circle cy={1.9} r={0.42} fill={color} opacity={0.5} />
      </g>
    );
  }

  if (obj.kind === 'porteria' || obj.kind === 'miniporteria') {
    const w = obj.w ?? (obj.kind === 'porteria' ? 1 : 0.7);
    const h = obj.h ?? (obj.kind === 'porteria' ? 5 : 2);
    return (
      <g transform={giro}>
        {ring}
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          fill="#FFFFFF"
          stroke="#101C2D"
          strokeWidth={0.12}
        />
      </g>
    );
  }

  if (obj.kind === 'nota') {
    return (
      <>
        {ring}
        <text textAnchor="middle" dominantBaseline="middle" fontSize={2.4} fill={color === 'transparent' ? '#FFFFFF' : color} fontWeight={600}>
          {obj.label}
        </text>
      </>
    );
  }

  // Jugadoras, rivales, porteras y comodines
  return (
    <>
      {ring}
      <circle
        r={1.75}
        fill={color}
        stroke={obj.kind === 'rival' ? '#101C2D' : '#FFFFFF'}
        strokeWidth={0.22}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={1.9}
        fontWeight={600}
        fill={obj.color ? '#FFFFFF' : TEXT[obj.kind]}
        style={{ pointerEvents: 'none' }}
      >
        {obj.label}
      </text>
    </>
  );
}
