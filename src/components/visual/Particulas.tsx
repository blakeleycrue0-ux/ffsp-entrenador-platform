/**
 * El ambiente, envuelto para React.
 *
 * Todo el trabajo está en `superficie.ts`, que no sabe nada de React: aquí
 * sólo se monta el lienzo, se arranca y se para. Lo único que se decide en
 * este archivo es que si la persona ha pedido menos movimiento, se dibuja un
 * instante de la tela y se queda quieta —una imagen, no un recuadro vacío—.
 */

import { useEffect, useRef } from 'react';
import { arrancaSuperficie, type OpcionesSuperficie } from './superficie';

type Props = OpcionesSuperficie & { className?: string };

export function Particulas({ intensidad = 1, densidad = 1, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    if (!lienzo) return;
    const quieto =
      typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return arrancaSuperficie(lienzo, { intensidad, densidad, quieto });
  }, [intensidad, densidad]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

/**
 * El ambiente a pantalla completa.
 *
 * El velo no es un adorno: la tela llega a ponerse casi blanca, y un titular
 * blanco encima de una cresta blanca no se lee. Oscurece justo la banda donde
 * va el texto y deja la parte de arriba limpia, que es donde está la escultura.
 */
export function Ambiente({
  intensidad = 1,
  densidad = 1,
  velo = 'abajo',
  className = '',
}: Props & { velo?: 'abajo' | 'centro' | 'ninguno' }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-black ${className}`}
      aria-hidden="true"
    >
      <Particulas intensidad={intensidad} densidad={densidad} />
      {velo !== 'ninguno' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              velo === 'abajo'
                /* Arriba apenas se toca: la legibilidad de la navegación la
                   resuelve un velo propio bajo la cabecera, que es una banda
                   estrecha, en vez de apagar toda la franja de arriba y
                   quedarse sin la cresta de la tela. */
                ? 'linear-gradient(to bottom, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.1) 7%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.88) 82%, #000 100%)'
                : 'radial-gradient(74% 62% at 50% 52%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 52%, rgba(0,0,0,0.15) 100%)',
          }}
        />
      )}
    </div>
  );
}
