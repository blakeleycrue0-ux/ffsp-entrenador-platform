/**
 * Editor táctico.
 * ---------------------------------------------------------------------------
 * Pizarra sobre un campo de fútbol en SVG con coordenadas normalizadas (0-100)
 * para que sea responsive sin recalcular nada. Permite añadir jugadoras
 * propias y rivales, balón, conos, portería, flechas (pase, desmarque,
 * conducción), zonas y texto. El resultado se guarda dentro del ejercicio.
 */

import { useRef, useState } from 'react';
import {
  ArrowUpRight, Circle, CircleDot, Eraser, MousePointer2, Square, Trash2, Triangle, Type, Users,
} from 'lucide-react';
import type { TacticShape } from '@/types';
import { cn, uid } from '@/lib/utils';

type Tool =
  | 'seleccionar' | 'jugador' | 'rival' | 'balon' | 'cono' | 'porteria'
  | 'pase' | 'desmarque' | 'conduccion' | 'zona' | 'texto' | 'borrar';

const TOOLS: { id: Tool; label: string; icon: typeof Circle }[] = [
  { id: 'seleccionar', label: 'Mover', icon: MousePointer2 },
  { id: 'jugador', label: 'Jugadora', icon: Users },
  { id: 'rival', label: 'Rival', icon: Circle },
  { id: 'balon', label: 'Balón', icon: CircleDot },
  { id: 'cono', label: 'Cono', icon: Triangle },
  { id: 'pase', label: 'Pase', icon: ArrowUpRight },
  { id: 'desmarque', label: 'Desmarque', icon: ArrowUpRight },
  { id: 'conduccion', label: 'Conducción', icon: ArrowUpRight },
  { id: 'zona', label: 'Zona', icon: Square },
  { id: 'texto', label: 'Texto', icon: Type },
  { id: 'borrar', label: 'Borrar', icon: Eraser },
];

const ARROW_STYLE: Record<string, { color: string; dash?: string }> = {
  pass: { color: '#653F8A', dash: undefined },
  run: { color: '#2F8F5B', dash: '5 4' },
  dribble: { color: '#E9A23B', dash: '1 5' },
};

export function TacticBoard({
  shapes, onChange, readOnly,
}: {
  shapes: TacticShape[];
  onChange?: (s: TacticShape[]) => void;
  readOnly?: boolean;
}) {
  const [tool, setTool] = useState<Tool>('seleccionar');
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const point = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const c = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    return {
      x: Math.max(0, Math.min(100, ((c.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((c.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const emit = (next: TacticShape[]) => onChange?.(next);

  const playerCount = shapes.filter((s) => s.kind === 'player' && s.team === 'own').length;
  const rivalCount = shapes.filter((s) => s.kind === 'player' && s.team === 'rival').length;

  const onDown = (e: React.MouseEvent) => {
    if (readOnly || tool === 'seleccionar') return;
    const p = point(e);

    if (tool === 'pase' || tool === 'desmarque' || tool === 'conduccion' || tool === 'zona') {
      setDrawing(p);
      return;
    }

    const map: Partial<Record<Tool, TacticShape>> = {
      jugador: { id: uid('sh'), kind: 'player', x: p.x, y: p.y, label: String(playerCount + 1), team: 'own' },
      rival: { id: uid('sh'), kind: 'player', x: p.x, y: p.y, label: String.fromCharCode(65 + rivalCount), team: 'rival' },
      balon: { id: uid('sh'), kind: 'ball', x: p.x, y: p.y },
      cono: { id: uid('sh'), kind: 'cone', x: p.x, y: p.y },
      porteria: { id: uid('sh'), kind: 'goal', x: p.x, y: p.y },
    };

    if (tool === 'texto') {
      const label = window.prompt('Texto de la anotación');
      if (label) emit([...shapes, { id: uid('sh'), kind: 'text', x: p.x, y: p.y, label }]);
      return;
    }

    const shape = map[tool];
    if (shape) emit([...shapes, shape]);
  };

  const onUp = (e: React.MouseEvent) => {
    if (!drawing || readOnly) return;
    const p = point(e);
    if (tool === 'zona') {
      emit([
        ...shapes,
        {
          id: uid('sh'), kind: 'zone',
          x: Math.min(drawing.x, p.x), y: Math.min(drawing.y, p.y),
          w: Math.abs(p.x - drawing.x), h: Math.abs(p.y - drawing.y),
        },
      ]);
    } else {
      const style = tool === 'pase' ? 'pass' : tool === 'desmarque' ? 'run' : 'dribble';
      emit([...shapes, { id: uid('sh'), kind: 'arrow', x: drawing.x, y: drawing.y, x2: p.x, y2: p.y, style }]);
    }
    setDrawing(null);
  };

  const onMove = (e: React.MouseEvent) => {
    if (!dragId || readOnly || tool !== 'seleccionar') return;
    const p = point(e);
    emit(shapes.map((s) => (s.id === dragId && 'x' in s ? { ...s, x: p.x, y: p.y } : s)));
  };

  const removeShape = (id: string) => emit(shapes.filter((s) => s.id !== id));

  return (
    <div>
      {!readOnly && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200'
                    : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800',
                )}
              >
                <Icon
                  size={14}
                  className={cn(
                    t.id === 'desmarque' && 'text-pitch',
                    t.id === 'conduccion' && 'text-sun',
                    t.id === 'borrar' && 'text-danger',
                  )}
                />
                {t.label}
              </button>
            );
          })}
          <button
            onClick={() => emit([])}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-500 transition-colors hover:bg-danger/8 hover:text-danger"
          >
            <Trash2 size={14} /> Vaciar pizarra
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink-200">
        <svg
          ref={svgRef}
          viewBox="0 0 100 68"
          className={cn('w-full select-none bg-[#F4F8F5]', !readOnly && tool !== 'seleccionar' && 'cursor-crosshair')}
          onMouseDown={onDown}
          onMouseUp={onUp}
          onMouseMove={onMove}
          onMouseLeave={() => {
            setDrawing(null);
            setDragId(null);
          }}
        >
          <Pitch />

          {/* Zonas primero para que queden al fondo */}
          {shapes.filter((s) => s.kind === 'zone').map((s) =>
            s.kind === 'zone' ? (
              <rect
                key={s.id}
                x={s.x} y={(s.y * 68) / 100} width={s.w} height={(s.h * 68) / 100}
                rx="1.5"
                fill="#653F8A" fillOpacity="0.08" stroke="#653F8A" strokeOpacity="0.35"
                strokeWidth="0.4" strokeDasharray="1.5 1"
                onClick={() => !readOnly && tool === 'borrar' && removeShape(s.id)}
              />
            ) : null,
          )}

          {shapes.map((s) => {
            const y = (s.y * 68) / 100;
            const clickable = !readOnly && tool === 'borrar';
            const onShapeClick = () => clickable && removeShape(s.id);
            const onShapeDown = () => !readOnly && tool === 'seleccionar' && setDragId(s.id);

            switch (s.kind) {
              case 'player':
                return (
                  <g key={s.id} onClick={onShapeClick} onMouseDown={onShapeDown} className={cn(!readOnly && 'cursor-move')}>
                    <circle
                      cx={s.x} cy={y} r="2.6"
                      fill={s.team === 'own' ? '#653F8A' : '#FFFFFF'}
                      stroke={s.team === 'own' ? '#402759' : '#5D5A6B'}
                      strokeWidth="0.35"
                    />
                    <text
                      x={s.x} y={y + 0.85} textAnchor="middle" fontSize="2.4" fontWeight="700"
                      fill={s.team === 'own' ? '#FFFFFF' : '#44424F'}
                    >
                      {s.label}
                    </text>
                  </g>
                );
              case 'ball':
                return (
                  <g key={s.id} onClick={onShapeClick} onMouseDown={onShapeDown}>
                    <circle cx={s.x} cy={y} r="1.3" fill="#FFFFFF" stroke="#1C1B22" strokeWidth="0.3" />
                    <circle cx={s.x} cy={y} r="0.5" fill="#1C1B22" />
                  </g>
                );
              case 'cone':
                return (
                  <polygon
                    key={s.id}
                    points={`${s.x},${y - 1.8} ${s.x - 1.5},${y + 1.4} ${s.x + 1.5},${y + 1.4}`}
                    fill="#E9A23B" stroke="#B87C1C" strokeWidth="0.25"
                    onClick={onShapeClick} onMouseDown={onShapeDown}
                  />
                );
              case 'goal':
                return (
                  <rect
                    key={s.id} x={s.x - 4} y={y - 0.8} width="8" height="1.6" rx="0.3"
                    fill="none" stroke="#44424F" strokeWidth="0.5"
                    onClick={onShapeClick} onMouseDown={onShapeDown}
                  />
                );
              case 'arrow': {
                const st = ARROW_STYLE[s.style];
                const y2 = (s.y2 * 68) / 100;
                return (
                  <g key={s.id} onClick={onShapeClick}>
                    <defs>
                      <marker id={`ah-${s.id}`} markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                        <path d="M0,0 L4,2 L0,4 z" fill={st.color} />
                      </marker>
                    </defs>
                    <line
                      x1={s.x} y1={y} x2={s.x2} y2={y2}
                      stroke={st.color} strokeWidth="0.55" strokeDasharray={st.dash}
                      markerEnd={`url(#ah-${s.id})`} strokeLinecap="round"
                    />
                  </g>
                );
              }
              case 'text':
                return (
                  <text
                    key={s.id} x={s.x} y={y} fontSize="2.6" fontWeight="600" fill="#44424F"
                    textAnchor="middle" onClick={onShapeClick} onMouseDown={onShapeDown}
                  >
                    {s.label}
                  </text>
                );
              default:
                return null;
            }
          })}
        </svg>
      </div>

      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-700" /> Jugadora propia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-ink-400 bg-white" /> Rival
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 bg-brand-700" /> Pase
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 border-t-2 border-dashed border-pitch" /> Desmarque
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 border-t-2 border-dotted border-sun" /> Conducción
          </span>
          <span className="ml-auto">Con la herramienta «Mover» puedes arrastrar cualquier elemento.</span>
        </div>
      )}
    </div>
  );
}

/** Campo de fútbol dibujado a escala (100 x 68). */
function Pitch() {
  const line = { stroke: '#C7DDCD', strokeWidth: 0.35, fill: 'none' } as const;
  return (
    <g>
      <rect x="0" y="0" width="100" height="68" fill="#F4F8F5" />
      {/* Franjas de siega muy sutiles */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 10} y="0" width="10" height="68" fill={i % 2 ? '#EFF5F1' : '#F4F8F5'} />
      ))}
      <rect x="2" y="2" width="96" height="64" {...line} />
      <line x1="50" y1="2" x2="50" y2="66" {...line} />
      <circle cx="50" cy="34" r="8.5" {...line} />
      <circle cx="50" cy="34" r="0.6" fill="#C7DDCD" />
      {/* Áreas */}
      <rect x="2" y="14" width="15" height="40" {...line} />
      <rect x="83" y="14" width="15" height="40" {...line} />
      <rect x="2" y="24" width="5.5" height="20" {...line} />
      <rect x="92.5" y="24" width="5.5" height="20" {...line} />
      {/* Porterías */}
      <rect x="0.6" y="29" width="1.4" height="10" {...line} />
      <rect x="98" y="29" width="1.4" height="10" {...line} />
      {/* Puntos de penalti */}
      <circle cx="12.5" cy="34" r="0.5" fill="#C7DDCD" />
      <circle cx="87.5" cy="34" r="0.5" fill="#C7DDCD" />
    </g>
  );
}
