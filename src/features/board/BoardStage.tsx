/**
 * El campo interactivo.
 * ---------------------------------------------------------------------------
 * Durante la reproducción las posiciones se escriben directamente sobre el SVG
 * en cada fotograma, sin pasar por el estado de React: así el movimiento es
 * continuo y no depende de cuántas veces se vuelva a dibujar la interfaz.
 * React sólo se ocupa de qué objetos existen, no de dónde están en cada
 * instante.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pitch } from './Pitch';
import {
  MOVE_DASH, PITCHES, type BoardObject, type ObjectKind, type Point, type Scene,
  sampleScene, trackSegments,
} from './scene';
import type { Playback } from './playback';
import { cn } from '@/lib/utils';

const FILL: Record<ObjectKind, string> = {
  jugadora: '#101C2D',
  rival: '#FFFFFF',
  balon: '#FFFFFF',
  cono: '#E2A33C',
  porteria: '#FFFFFF',
  nota: 'transparent',
};

const TEXT: Record<ObjectKind, string> = {
  jugadora: '#FFFFFF',
  rival: '#101C2D',
  balon: '#101C2D',
  cono: '#101C2D',
  porteria: '#101C2D',
  nota: '#FFFFFF',
};

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
}

export function BoardStage({
  scene, playback, selected, onSelect, onMove, onDropNew, editable, showPaths, svgRef, className,
}: StageProps) {
  const spec = PITCHES[scene.pitch];
  const innerRef = useRef<SVGSVGElement>(null);
  const svg = svgRef ?? innerRef;
  const nodes = useRef(new Map<string, SVGGElement>());
  const dragging = useRef<{ id: string; pointerId: number } | null>(null);

  const margin = 3;
  const viewBox = `${-margin} ${-margin} ${spec.length + margin * 2} ${spec.width + margin * 2}`;
  /** Proporción real del dibujo, para que el contenedor no lo recorte. */
  const ratio = (spec.length + margin * 2) / (spec.width + margin * 2);

  /** Convierte un punto de pantalla a metros sobre el campo. */
  const toPitch = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const el = svg.current;
      if (!el) return null;
      const ctm = el.getScreenCTM();
      if (!ctm) return null;
      const pt = el.createSVGPoint();
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

  /* Arrastrar un objeto mueve la jugada en el instante actual. */
  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (!editable) return;
    e.stopPropagation();
    onSelect(id);
    dragging.current = { id, pointerId: e.pointerId };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
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

  return (
    <svg
      ref={svg}
      viewBox={viewBox}
      style={{ aspectRatio: ratio }}
      className={cn('board-surface mx-auto block max-h-full w-full', className)}
      role="img"
      aria-label={`Pizarra táctica con ${scene.objects.length} elementos`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerDown={() => editable && onSelect(null)}
      onDragOver={(e) => onDropNew && e.preventDefault()}
      onDrop={(e) => {
        if (!onDropNew) return;
        e.preventDefault();
        const kind = e.dataTransfer.getData('text/ffsp-objeto') as ObjectKind;
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
      </defs>

      <Pitch spec={spec} />

      {/* Estelas */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((p) => (
          <polyline
            key={p.key}
            points={p.points.map((q) => `${q.x},${q.y}`).join(' ')}
            stroke={p.kind === 'balon' ? '#FFFFFF' : p.kind === 'rival' ? '#F0C3BE' : '#9FD9BB'}
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
            className={cn(editable && 'cursor-grab active:cursor-grabbing')}
            onPointerDown={(e) => onPointerDown(e, obj.id)}
          >
            <ObjectShape obj={obj} selected={obj.id === selected} />
          </g>
        );
      })}
    </svg>
  );
}

function ObjectShape({ obj, selected }: { obj: BoardObject; selected: boolean }) {
  const ring = selected ? (
    <circle r={2.5} fill="none" stroke="#FFFFFF" strokeWidth={0.3} strokeDasharray="0.8 0.6" />
  ) : null;

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
        <polygon points="0,-1.4 1.2,1 -1.2,1" fill={FILL.cono} stroke="#101C2D" strokeWidth={0.14} />
      </>
    );
  }

  if (obj.kind === 'porteria') {
    return (
      <>
        {ring}
        <rect x={-0.4} y={-2.4} width={0.8} height={4.8} fill="#FFFFFF" stroke="#101C2D" strokeWidth={0.12} />
      </>
    );
  }

  if (obj.kind === 'nota') {
    return (
      <>
        {ring}
        <text textAnchor="middle" dominantBaseline="middle" fontSize={2.4} fill="#FFFFFF" fontWeight={600}>
          {obj.label}
        </text>
      </>
    );
  }

  // Jugadoras y rivales
  return (
    <>
      {ring}
      <circle
        r={1.75}
        fill={FILL[obj.kind]}
        stroke={obj.kind === 'rival' ? '#101C2D' : '#FFFFFF'}
        strokeWidth={0.22}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={1.9}
        fontWeight={600}
        fill={TEXT[obj.kind]}
        style={{ pointerEvents: 'none' }}
      >
        {obj.label}
      </text>
    </>
  );
}
