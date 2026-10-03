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
  MOVE_DASH, PITCHES, type DrawKind, type Drawing, type ObjectKind,
  type Point, type Scene, medioDelTramo, sampleScene, sampleTrack, trackSegments,
} from './scene';
import { aPuntos, camaraDe, proyeccion, type Proyeccion } from './camara';
import { ObjectShape } from './piezas';
import { largo as largoDe } from './trazo';
import type { Playback } from './playback';
import { cn } from '@/lib/utils';

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

/**
 * `mano` desplaza el campo, `movimiento` dibuja la trayectoria de la ficha
 * seleccionada, el resto son anotaciones, y `null` selecciona y arrastra.
 */
export type Tool = 'mano' | 'movimiento' | DrawKind | null;

/** Las herramientas que dejan una anotación sobre el campo. */
const esDibujo = (t: Tool): t is DrawKind => t !== null && t !== 'mano' && t !== 'movimiento';

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
  /**
   * Trayectoria dibujada a mano para un objeto: los puntos crudos del dedo, en
   * metros. Quien la recibe decide cuánto dura y dónde va el fotograma; aquí
   * sólo se recoge el gesto.
   */
  onTrazo?: (id: string, crudos: Point[]) => void;
  /**
   * Dobla el tramo que termina en el fotograma `indice` para que pase por
   * `por`. Sin `por`, lo devuelve a la recta.
   */
  onCurvar?: (id: string, indice: number, por: Point | null) => void;
  selectedDrawing?: string | null;
  onSelectDrawing?: (id: string | null) => void;

  view?: View;
  onView?: (v: View) => void;
  /** En presentación no se ve nada que no sea la jugada. */
  presenting?: boolean;
  /**
   * Ocupar toda la caja en vez de crecer con el ancho. El propio SVG centra y
   * escala su contenido (`preserveAspectRatio`), así que el campo se ve entero
   * con bandas transparentes a los lados: es lo que hace falta en un espacio
   * de trabajo de alto fijo, donde la ventana manda y el campo se adapta.
   */
  llenar?: boolean;
}

export function BoardStage({
  scene, playback, selected, onSelect, onMove, onDropNew, editable, showPaths, svgRef, className,
  tool = null, drawColor = '#FFFFFF', drawWidth = 0.36, onDraw, onTrazo, onCurvar,
  selectedDrawing = null, onSelectDrawing, view = VIEW_INICIAL, onView, presenting, llenar,
}: StageProps) {
  const spec = PITCHES[scene.pitch];
  const innerRef = useRef<SVGSVGElement>(null);
  const svg = svgRef ?? innerRef;
  const world = useRef<SVGGElement>(null);
  const fichas = useRef<SVGGElement>(null);
  const nodes = useRef(new Map<string, SVGGElement>());
  const dragging = useRef<{ id: string; pointerId: number } | null>(null);
  const panning = useRef<{ pointerId: number; x: number; y: number; from: View } | null>(null);
  const [draft, setDraft] = useState<Point[] | null>(null);
  /* El trazo a mano se acumula en una referencia —se añaden decenas de puntos
     por segundo y no hace falta repintar por cada uno— y se copia al estado
     sólo cuando el dedo avanza de verdad. */
  const trazo = useRef<{ id: string; pointerId: number; puntos: Point[] } | null>(null);
  const [trazoVista, setTrazoVista] = useState<Point[] | null>(null);
  /* El tirador que se está arrastrando para doblar un tramo. */
  const curvando = useRef<{ indice: number; pointerId: number } | null>(null);
  const [curvaVista, setCurvaVista] = useState<{ indice: number; por: Point } | null>(null);

  const margin = 3;
  /* La cámara decide la forma del lienzo: girada cambia de proporción e
     inclinada se convierte en un trapecio más ancho por delante. */
  const camara = useMemo(() => camaraDe(scene), [scene]);
  const proy = useMemo(() => proyeccion(spec, camara, margin), [spec, camara]);
  const { caja } = proy;
  const viewBox = `${caja.x} ${caja.y} ${caja.ancho} ${caja.alto}`;
  const ratio = caja.ancho / caja.alto;

  /* El zoom se hace sobre el centro de lo que se ve, no sobre la esquina:
     al ampliar, lo que estabas mirando se queda donde estaba. */
  const cx = caja.x + caja.ancho / 2;
  const cy = caja.y + caja.alto / 2;
  const worldTransform =
    `translate(${view.tx} ${view.ty}) translate(${cx} ${cy}) scale(${view.s}) translate(${-cx} ${-cy})`;

  /** Dónde cae una posición del campo dentro del lienzo. */
  const aLienzo = useCallback((p: Point) => proy.proyecta(p.x, p.y), [proy]);

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
      /* Dos pasos: el primero deshace el zoom y el desplazamiento, que son una
         transformación corriente del SVG; el segundo deshace la cámara. Por
         eso se puede arrastrar con la misma precisión con cualquier vista. */
      const enLienzo = pt.matrixTransform(ctm.inverse());
      const p = proy.desproyecta(enLienzo.x, enLienzo.y);
      return {
        x: Math.min(spec.length + 2, Math.max(-2, p.x)),
        y: Math.min(spec.width + 2, Math.max(-2, p.y)),
      };
    },
    [spec.length, spec.width, svg, proy],
  );

  /** Cómo se coloca una ficha: en su sitio y con el tamaño que le toca. */
  const colocacion = useCallback(
    (p: Point) => {
      const q = proy.proyecta(p.x, p.y);
      const k = proy.escala(p.x, p.y);
      return proy.sinProfundidad
        ? `translate(${q.x} ${q.y})`
        : `translate(${q.x} ${q.y}) scale(${k.toFixed(4)})`;
    },
    [proy],
  );

  /* Cada fotograma: escribir las posiciones directamente en el SVG. */
  useEffect(() => {
    const capa = fichas.current;
    const apply = (ms: number) => {
      const positions = sampleScene(scene, ms);
      for (const [id, node] of nodes.current) {
        const p = positions[id];
        if (p) node.setAttribute('transform', colocacion(p));
      }

      /* Con la cámara inclinada, quien está más cerca tapa a quien está más
         lejos. En SVG eso es el orden de los elementos, así que hay que
         reordenarlos; moverlos ya estando puestos cuesta muy poco y son
         veinte, no veinte mil. Sin inclinación no hay nada que ordenar. */
      if (capa && !proy.sinProfundidad) {
        const orden = [...nodes.current.entries()]
          .filter(([id]) => positions[id])
          .sort((a, b) => proy.proyecta(positions[a[0]].x, positions[a[0]].y).y
            - proy.proyecta(positions[b[0]].x, positions[b[0]].y).y);
        for (const [, node] of orden) capa.appendChild(node);
      }
    };
    return playback.subscribe(apply);
  }, [playback, scene, colocacion, proy]);

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

    if (tool === 'movimiento') {
      /* La trayectoria SIEMPRE arranca donde está la ficha ahora, aunque el
         dedo se apoye tres metros más allá: si no, la jugadora daría un salto
         al empezar a moverse. */
      if (!selected) return;
      const desde = sampleTrack(scene.tracks[selected] ?? [], playback.time);
      if (!desde) return;
      trazo.current = { id: selected, pointerId: e.pointerId, puntos: [desde] };
      setTrazoVista([desde]);
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
    const cur = curvando.current;
    if (cur && cur.pointerId === e.pointerId) {
      const at = toPitch(e.clientX, e.clientY);
      if (at) setCurvaVista({ indice: cur.indice, por: at });
      return;
    }

    const pan = panning.current;
    if (pan && pan.pointerId === e.pointerId) {
      onView?.({ ...pan.from, tx: pan.from.tx + (e.clientX - pan.x) * 0.06, ty: pan.from.ty + (e.clientY - pan.y) * 0.06 });
      return;
    }

    const tr = trazo.current;
    if (tr && tr.pointerId === e.pointerId) {
      const at = toPitch(e.clientX, e.clientY);
      if (!at) return;
      const ultimo = tr.puntos[tr.puntos.length - 1];
      // Un cuarto de metro: por debajo de eso es pulso, no intención.
      if (Math.hypot(at.x - ultimo.x, at.y - ultimo.y) < 0.25) return;
      tr.puntos.push(at);
      setTrazoVista([...tr.puntos]);
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
    if (node) node.setAttribute('transform', colocacion(at));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const cur = curvando.current;
    if (cur && cur.pointerId === e.pointerId) {
      curvando.current = null;
      const at = toPitch(e.clientX, e.clientY);
      setCurvaVista(null);
      if (at && selected) onCurvar?.(selected, cur.indice, at);
      return;
    }

    if (panning.current?.pointerId === e.pointerId) {
      panning.current = null;
      return;
    }

    const tr = trazo.current;
    if (tr && tr.pointerId === e.pointerId) {
      trazo.current = null;
      setTrazoVista(null);
      const at = toPitch(e.clientX, e.clientY);
      if (at) tr.puntos.push(at);
      /* Metro y medio: por debajo es un toque, y un toque no es un recorrido.
         Crear ahí un movimiento llenaría la jugada de fotogramas invisibles. */
      if (largoDe(tr.puntos) > 1.5) onTrazo?.(tr.id, tr.puntos);
      return;
    }

    if (draft) {
      const [a, b] = draft;
      const largo = Math.hypot(b.x - a.x, b.y - a.y);
      // Un toque suelto no es un trazo: evita llenar el campo de puntos.
      if (largo > 1.2 && esDibujo(tool) && onDraw) {
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

  /* De atrás hacia delante. Sin inclinación da igual —nada se solapa por
     profundidad— y se deja el orden de la jugada, que es el que espera quien
     la montó. */
  const ordenadas = useMemo(() => {
    if (proy.sinProfundidad) return scene.objects;
    return [...scene.objects].sort((a, b) => {
      const pa = positions[a.id];
      const pb = positions[b.id];
      if (!pa || !pb) return 0;
      return proy.proyecta(pa.x, pa.y).y - proy.proyecta(pb.x, pb.y).y;
    });
  }, [scene.objects, positions, proy]);

  /**
   * Un tirador por tramo de la ficha seleccionada. Sólo en los tramos que se
   * pueden doblar: donde hay un recorrido dibujado con el dedo manda ese
   * recorrido, y poner ahí un tirador que no hiciera nada sería peor que no
   * ponerlo.
   */
  const tiradores = useMemo(() => {
    if (!editable || tool || playback.playing || !selected || !onCurvar) return [];
    const track = scene.tracks[selected] ?? [];
    const out: { indice: number; punto: Point; curvo: boolean }[] = [];
    for (let i = 1; i < track.length; i += 1) {
      if (track[i].path && track[i].path!.length > 0) continue;
      const punto = medioDelTramo(track, i);
      if (punto) out.push({ indice: i, punto, curvo: track[i].cx !== undefined });
    }
    return out;
  }, [editable, tool, playback.playing, selected, onCurvar, scene.tracks]);

  /** La curva que se vería al soltar: se dibuja mientras se arrastra. */
  const vistaPreviaCurva = useMemo(() => {
    if (!curvaVista || !selected) return [];
    const track = scene.tracks[selected] ?? [];
    const a = track[curvaVista.indice - 1];
    const b = track[curvaVista.indice];
    if (!a || !b) return [];
    const c = {
      x: 2 * curvaVista.por.x - (a.x + b.x) / 2,
      y: 2 * curvaVista.por.y - (a.y + b.y) / 2,
    };
    return Array.from({ length: 33 }, (_, i) => {
      const u = i / 32;
      const m = 1 - u;
      return {
        x: m * m * a.x + 2 * m * u * c.x + u * u * b.x,
        y: m * m * a.y + 2 * m * u * c.y + u * u * b.y,
      };
    });
  }, [curvaVista, selected, scene.tracks]);

  const estela = (kind: ObjectKind) =>
    kind === 'balon' ? '#FFFFFF' : kind === 'rival' ? '#F0C3BE' : '#9FD9BB';

  return (
    <svg
      ref={svg}
      viewBox={viewBox}
      style={llenar ? { touchAction: 'none' } : { aspectRatio: ratio, touchAction: 'none' }}
      className={cn(
        'board-surface block',
        llenar ? 'h-full w-full' : 'mx-auto max-h-full w-full',
        tool === 'mano' && 'cursor-grab active:cursor-grabbing',
        tool && tool !== 'mano' && 'cursor-crosshair',
        tool === 'movimiento' && !selected && 'cursor-not-allowed',
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
        <Pitch spec={spec} surface={scene.surface ?? 'cesped'} proy={proy} />

        {/* El trazo que se está dibujando AHORA: se ve crudo, tal cual sale
            del dedo, para que se entienda que lo que manda es el gesto. Al
            soltar se suaviza y pasa a ser la trayectoria de verdad. */}
        {trazoVista && trazoVista.length > 1 && (
          <polyline
            points={aPuntos(trazoVista.map(aLienzo))}
            fill="none"
            stroke="#0A8CFF"
            strokeWidth={0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
            pointerEvents="none"
          />
        )}

        {/* Dibujos explicativos: por debajo de las fichas, nunca las tapan */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {(scene.drawings ?? []).map((d) => (
            <DrawingShape
              key={d.id}
              d={d}
              proy={proy}
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
          {draft && esDibujo(tool) && (
            <DrawingShape
              proy={proy}
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

        {/* Estelas de la animación.
            La capa va marcada para poder medirla desde fuera: es la única
            manera de comprobar «esto ya no va en línea recta» mirando lo que
            se dibuja, y no lo que la aplicación cree que ha guardado. */}
        <g data-capa="estelas" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {paths.map((p) => (
            <polyline
              key={p.key}
              points={aPuntos(p.points.map(aLienzo))}
              stroke={estela(p.kind)}
              strokeWidth={0.36}
              strokeDasharray={p.kind === 'balon' ? MOVE_DASH.pase : MOVE_DASH[p.move]}
              opacity={p.id === selected ? 0.95 : 0.5}
              markerEnd={`url(#punta-${p.kind === 'balon' ? 'balon' : p.kind === 'rival' ? 'rival' : 'propia'})`}
            />
          ))}
        </g>

        {/* Tiradores para doblar un tramo.
            Un desplazamiento es recto mientras no se diga otra cosa, y casi
            nada en un campo va recto. Esto permite agarrar el tramo por la
            mitad y abrirlo sin rehacer el movimiento entero. */}
        {tiradores.length > 0 && (
          <g>
            {curvaVista && (
              <polyline
                points={aPuntos(vistaPreviaCurva.map(aLienzo))}
                fill="none"
                stroke="#0A8CFF"
                strokeWidth={0.34}
                strokeDasharray="1 0.7"
                opacity={0.9}
                pointerEvents="none"
              />
            )}
            {tiradores.map((t) => {
              const q = aLienzo(curvaVista?.indice === t.indice ? curvaVista.por : t.punto);
              const k = proy.escala(t.punto.x, t.punto.y);
              return (
                <circle
                  key={t.indice}
                  cx={q.x}
                  cy={q.y}
                  r={0.95 * k}
                  fill={t.curvo ? '#0A8CFF' : 'rgba(10,140,255,0.28)'}
                  stroke="#FFFFFF"
                  strokeWidth={0.18 * k}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    curvando.current = { indice: t.indice, pointerId: e.pointerId };
                    setCurvaVista({ indice: t.indice, por: t.punto });
                    (e.currentTarget as Element).setPointerCapture(e.pointerId);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (selected) onCurvar?.(selected, t.indice, null);
                  }}
                >
                  <title>Arrastra para curvar este tramo. Doble clic para dejarlo recto.</title>
                </circle>
              );
            })}
          </g>
        )}

        {/* Objetos. Con la cámara inclinada se pintan de atrás hacia delante,
            para que quien está más cerca tape a quien está más lejos. */}
        <g ref={fichas}>
          {ordenadas.map((obj) => {
            const p = positions[obj.id] ?? { x: spec.length / 2, y: spec.width / 2 };
            return (
              <g
                key={obj.id}
                ref={(el) => {
                  if (el) nodes.current.set(obj.id, el);
                  else nodes.current.delete(obj.id);
                }}
                transform={colocacion(p)}
                className={cn(editable && !tool && 'cursor-grab active:cursor-grabbing')}
                onPointerDown={(e) => onPointerDownObject(e, obj.id)}
              >
                <ObjectShape obj={obj} selected={obj.id === selected && !presenting} proy={proy} />
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}

/* ─────────────────────────────── Dibujos ─────────────────────────────────── */

/**
 * Los dibujos están PINTADOS EN EL CÉSPED, como la cal: se tumban con el campo
 * y se achatan con la cámara. Por eso todos pasan por la proyección en lugar
 * de usar las coordenadas del campo tal cual.
 *
 * Las rectas siguen siendo rectas, así que basta con sus extremos. La curva y
 * la elipse no, y se trocean: veinticuatro tramos no se distinguen de una
 * curva ni con el campo ampliado cuatro veces.
 */
function DrawingShape({
  d, selected, onSelect, proy,
}: {
  d: Drawing;
  selected: boolean;
  onSelect?: (e: React.PointerEvent) => void;
  proy: Proyeccion;
}) {
  // Seleccionado se engorda un poco: es la señal más clara sobre un campo verde.
  const común = {
    stroke: d.color,
    strokeWidth: selected ? d.width * 1.9 : d.width,
    opacity: selected ? 1 : 0.85,
    onPointerDown: onSelect,
    style: onSelect ? { cursor: 'pointer' as const } : undefined,
  };
  const P = (p: Point) => proy.proyecta(p.x, p.y);

  if (d.kind === 'zona') {
    const [a, b] = d.points;
    const x0 = Math.min(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);

    if (d.shape === 'circulo') {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const borde = Array.from({ length: 48 }, (_, i) => {
        const t = (i / 48) * Math.PI * 2;
        return P({ x: mx + (w / 2) * Math.cos(t), y: my + (h / 2) * Math.sin(t) });
      });
      return (
        <polygon
          points={aPuntos(borde)}
          fill={d.color}
          fillOpacity={0.14}
          strokeDasharray="1.2 0.8"
          {...común}
        />
      );
    }
    return (
      <polygon
        points={aPuntos([
          P({ x: x0, y: y0 }), P({ x: x0 + w, y: y0 }),
          P({ x: x0 + w, y: y0 + h }), P({ x: x0, y: y0 + h }),
        ])}
        fill={d.color}
        fillOpacity={0.14}
        strokeDasharray="1.2 0.8"
        {...común}
      />
    );
  }

  if (d.kind === 'curva') {
    const [a, c, b] = d.points;
    const n = 24;
    const puntos = Array.from({ length: n + 1 }, (_, i) => {
      const u = i / n;
      const m = 1 - u;
      return P({
        x: m * m * a.x + 2 * m * u * c.x + u * u * b.x,
        y: m * m * a.y + 2 * m * u * c.y + u * u * b.y,
      });
    });
    return (
      <polyline
        points={aPuntos(puntos)}
        fill="none"
        markerEnd="url(#punta-dibujo)"
        {...común}
      />
    );
  }

  const [a, b] = d.points;
  const pa = P(a);
  const pb = P(b);
  return (
    <line
      x1={pa.x}
      y1={pa.y}
      x2={pb.x}
      y2={pb.y}
      strokeDasharray={d.kind === 'discontinua' ? '1.4 0.9' : undefined}
      markerEnd={d.kind === 'flecha' ? 'url(#punta-dibujo)' : undefined}
      {...común}
    />
  );
}
