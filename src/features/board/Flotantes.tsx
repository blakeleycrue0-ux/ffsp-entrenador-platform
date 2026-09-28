/**
 * Mandos flotantes de la pizarra.
 * ---------------------------------------------------------------------------
 * EL CAMPO ES LA PANTALLA. Cada barra fija que se pone encima le quita alto al
 * campo para siempre, y una pizarra táctica con un campo pequeño no sirve: lo
 * que se mira son las distancias entre jugadoras.
 *
 * Así que los mandos van encima del campo, en cristal ahumado, y se pueden
 * mover, plegar y acoplar a un lado. Dónde los deja cada una se recuerda en
 * este navegador —es una preferencia de pantalla, no un dato del club, así que
 * no tiene nada que hacer en la base de datos—.
 */

import { useCallback, useRef, useState } from 'react';
import { ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Muelle = 'flotante' | 'izquierda' | 'derecha' | 'abajo' | 'arriba';

export interface Sitio {
  muelle: Muelle;
  /** Posición en píxeles dentro del lienzo, sólo cuando está flotando. */
  x: number;
  y: number;
  plegado: boolean;
}

const POR_DEFECTO: Sitio = { muelle: 'arriba', x: 24, y: 24, plegado: false };

/** Una pantalla estrecha: el móvil de pie. */
export const esEstrecha = () => typeof window !== 'undefined' && window.innerWidth < 768;

const esSitio = (v: unknown): v is Sitio => {
  const s = v as Sitio;
  return !!s && typeof s.x === 'number' && typeof s.y === 'number' && typeof s.plegado === 'boolean'
    && ['flotante', 'izquierda', 'derecha', 'abajo', 'arriba'].includes(s.muelle);
};

/** Recuerda dónde se han dejado los mandos. Si no se puede, no pasa nada. */
export function useSitio(clave: string, inicial: Sitio = POR_DEFECTO) {
  const [sitio, setSitio] = useState<Sitio>(() => {
    try {
      const crudo = localStorage.getItem(`playoff360:pizarra:${clave}`);
      const leido: unknown = crudo ? JSON.parse(crudo) : null;
      return esSitio(leido) ? leido : inicial;
    } catch {
      return inicial;
    }
  });

  const guardar = useCallback((s: Sitio) => {
    setSitio(s);
    try {
      localStorage.setItem(`playoff360:pizarra:${clave}`, JSON.stringify(s));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [clave]);

  return [sitio, guardar] as const;
}

const ANCLAJE: Record<Muelle, string> = {
  arriba: 'left-1/2 top-3 -translate-x-1/2',
  /* Tres píxeles del borde de SU lienzo, y nada más. Aquí había un hueco a
     mano para esquivar el dique de la aplicación; ahora ese hueco lo reserva
     el armazón, así que contarlo otra vez dejaba la isla flotando en mitad de
     la nada con el campo cortado por arriba. */
  abajo: 'left-1/2 -translate-x-1/2 bottom-3',
  izquierda: 'left-3 top-1/2 -translate-y-1/2',
  derecha: 'right-3 top-1/2 -translate-y-1/2',
  flotante: '',
};

/**
 * Una isla de cristal sobre el campo. Se arrastra por el asa; al soltarla
 * cerca de un borde se acopla ahí, y en el centro se queda flotando.
 */
export function Isla({
  sitio, onSitio, children, className, etiqueta, plegable = true,
}: {
  sitio: Sitio;
  onSitio: (s: Sitio) => void;
  children: React.ReactNode;
  className?: string;
  etiqueta: string;
  plegable?: boolean;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const [moviendo, setMoviendo] = useState(false);

  const enVertical = sitio.muelle === 'izquierda' || sitio.muelle === 'derecha';

  const bajar = (e: React.PointerEvent) => {
    const el = caja.current;
    const padre = el?.offsetParent as HTMLElement | null;
    if (!el || !padre) return;
    const r = el.getBoundingClientRect();
    const p = padre.getBoundingClientRect();
    arrastre.current = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
    setMoviendo(true);
    // Al empezar a arrastrar pasa a flotar desde donde estaba, sin saltos.
    onSitio({ ...sitio, muelle: 'flotante', x: r.left - p.left, y: r.top - p.top });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const mover = (e: React.PointerEvent) => {
    const a = arrastre.current;
    const padre = caja.current?.offsetParent as HTMLElement | null;
    if (!a || a.id !== e.pointerId || !padre) return;
    const p = padre.getBoundingClientRect();
    onSitio({
      ...sitio,
      muelle: 'flotante',
      x: Math.max(0, Math.min(p.width - 40, e.clientX - p.left - a.dx)),
      y: Math.max(0, Math.min(p.height - 40, e.clientY - p.top - a.dy)),
    });
  };

  const soltar = (e: React.PointerEvent) => {
    const a = arrastre.current;
    const el = caja.current;
    const padre = el?.offsetParent as HTMLElement | null;
    if (!a || a.id !== e.pointerId || !el || !padre) return;
    arrastre.current = null;
    setMoviendo(false);

    /* Acoplar si se ha soltado cerca de un borde. El margen es generoso a
       propósito: acertar un píxel con el dedo no es razonable. */
    const p = padre.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2 - p.left;
    const cy = r.top + r.height / 2 - p.top;
    const margen = 0.18;

    if (cy < p.height * margen) onSitio({ ...sitio, muelle: 'arriba' });
    else if (cy > p.height * (1 - margen)) onSitio({ ...sitio, muelle: 'abajo' });
    else if (cx < p.width * margen) onSitio({ ...sitio, muelle: 'izquierda' });
    else if (cx > p.width * (1 - margen)) onSitio({ ...sitio, muelle: 'derecha' });
  };

  return (
    <div
      ref={caja}
      className={cn(
        /* Nunca más ancha que el lienzo: centrada y sin tope, una barra larga
           se sale por los dos lados y el primer botón queda fuera. */
        'cristal absolute z-flotante max-w-[calc(100%-1.5rem)] rounded-2xl',
        moviendo ? 'transition-none' : 'transition-[top,left,right,bottom] duration-200',
        sitio.muelle === 'flotante' ? '' : ANCLAJE[sitio.muelle],
        className,
      )}
      style={sitio.muelle === 'flotante' ? { left: sitio.x, top: sitio.y } : undefined}
      role="toolbar"
      aria-label={etiqueta}
    >
      {/* `flex-nowrap` NO es un detalle: sin él, en un móvil la barra se parte
          en tres filas y se convierte en un bloque encima del campo. Se queda
          en una línea y se desliza. */}
      <div className={cn('flex items-stretch flex-nowrap', enVertical && 'flex-col')}>
        {/* El asa: dice que esto se mueve, y es por donde se coge. */}
        <button
          onPointerDown={bajar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          aria-label={`Mover ${etiqueta}`}
          className={cn(
            'grid shrink-0 place-items-center text-ink-500 transition-colors hover:text-ink-800',
            enVertical ? 'h-7 w-full cursor-grab active:cursor-grabbing' : 'w-6 cursor-grab active:cursor-grabbing',
          )}
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={14} className={enVertical ? 'rotate-90' : undefined} />
        </button>

        {!sitio.plegado && (
          <div
            className={cn(
              'min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}',
              enVertical ? 'pb-1.5' : 'py-1.5 pr-1.5',
            )}
          >
            {children}
          </div>
        )}

        {plegable && (
          <button
            onClick={() => onSitio({ ...sitio, plegado: !sitio.plegado })}
            aria-label={sitio.plegado ? `Desplegar ${etiqueta}` : `Plegar ${etiqueta}`}
            aria-expanded={!sitio.plegado}
            className={cn(
              'grid shrink-0 place-items-center text-ink-500 transition-colors hover:text-ink-900',
              enVertical ? 'h-7 w-full' : 'w-7',
            )}
          >
            <ChevronDown size={14} className={cn('transition-transform', sitio.plegado && 'rotate-180')} />
          </button>
        )}
      </div>
    </div>
  );
}
