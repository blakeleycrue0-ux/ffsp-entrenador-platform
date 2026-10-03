/**
 * El ambiente, envuelto para React.
 *
 * Todo el trabajo está en `polvo.ts`, que no sabe nada de React: aquí sólo se
 * monta el lienzo, se arranca y se para. Lo único que se decide en este
 * archivo es que si la persona ha pedido menos movimiento, la formación se
 * calcula de golpe y se queda quieta —una imagen, no un recuadro vacío—.
 */

import { useEffect, useRef } from 'react';
import { arrancaPolvo, type OpcionesPolvo } from './polvo';

type Props = OpcionesPolvo & { className?: string };

export function Particulas({ intensidad = 1, densidad = 1, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    if (!lienzo) return;
    const quieto =
      typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return arrancaPolvo(lienzo, { intensidad, densidad, quieto });
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
 * El ambiente a pantalla completa, con lo que hace falta para que el texto se
 * siga leyendo: un velo que se oscurece hacia donde va el contenido.
 *
 * El velo no es un adorno. Sin él, un titular blanco sobre un punto blanco es
 * ilegible, y eso pasa tarde o temprano porque los puntos se mueven.
 */
export function Ambiente({
  intensidad = 1,
  densidad = 1,
  velo = 'abajo',
  className = '',
}: Props & { velo?: 'abajo' | 'centro' | 'ninguno' }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <Particulas intensidad={intensidad} densidad={densidad} />
      {velo !== 'ninguno' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              velo === 'abajo'
                ? 'linear-gradient(to bottom, rgba(5,5,5,0.12) 0%, rgba(5,5,5,0.3) 34%, rgba(5,5,5,0.82) 74%, #050505 100%)'
                : 'radial-gradient(72% 62% at 50% 52%, rgba(5,5,5,0.9) 0%, rgba(5,5,5,0.55) 52%, rgba(5,5,5,0.2) 100%)',
          }}
        />
      )}
    </div>
  );
}
