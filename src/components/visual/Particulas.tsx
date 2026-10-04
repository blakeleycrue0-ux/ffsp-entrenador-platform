/**
 * La seda, envuelta para React.
 *
 * Todo el trabajo está en `seda.ts`, que no sabe nada de React: aquí sólo se
 * monta el lienzo, se arranca y se para. Lo único que se decide en este archivo
 * es que si la persona ha pedido menos movimiento, se dibuja un instante de la
 * tela y se queda quieta —una imagen, no un recuadro vacío—.
 */

import { useEffect, useRef } from 'react';
import { arrancaSeda, type OpcionesSeda } from './seda';

type Props = OpcionesSeda & { className?: string };

export function Particulas({ intensidad = 1, densidad = 1, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    if (!lienzo) return;
    const quieto =
      typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return arrancaSeda(lienzo, { intensidad, densidad, quieto });
  }, [intensidad, densidad]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      /* Ni `filter`, ni `transform`, ni `opacity` aquí ni en ningún padre que
         contenga también el texto: cualquiera de los tres promueve una capa y
         Safari rasteriza lo de dentro, con lo que la tipografía se ablanda. El
         lienzo va en su propia capa, al fondo, y el texto en la suya. */
      style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

/**
 * La seda a pantalla completa, con lo justo para que encima se lea.
 *
 * EL VELO NO TAPA LA TELA. La tela tiene que cruzar POR DETRÁS del texto —si se
 * corta por encima del titular vuelven a ser dos cosas pegadas, un fondo y un
 * bloque, que es exactamente lo que no se quiere—. Así que en la banda del
 * texto no se corta nada: se oscurece lo justo para que el blanco del titular
 * gane al plateado de la tela, y la tela se sigue viendo detrás.
 *
 * Abajo sí se cierra del todo en negro, pero gradualmente: ahí es donde la
 * tela se desvanece, no donde se le pone una tapa.
 */
const VELOS = {
  /* La portada. Casi no toca la mitad de arriba y aprieta despacio hacia
     abajo: la tela tiene que seguir viéndose por detrás del titular. */
  portada:
    'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.06) 9%, rgba(0,0,0,0) 20%, rgba(0,0,0,0.13) 48%, rgba(0,0,0,0.44) 66%, rgba(0,0,0,0.78) 84%, rgba(0,0,0,0.96) 100%)',
  abajo:
    'linear-gradient(to bottom, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.1) 7%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.88) 82%, #000 100%)',
  centro:
    'radial-gradient(74% 62% at 50% 52%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 52%, rgba(0,0,0,0.15) 100%)',
} as const;

export function Ambiente({
  intensidad = 1,
  densidad = 1,
  velo = 'portada',
  className = '',
}: Props & { velo?: keyof typeof VELOS | 'ninguno' }) {
  return (
    /* Las capas, explícitas: lienzo al 0, velo al 1, y el contenido de la
       portada al 2 por su cuenta. Van escritas porque dependían del orden del
       documento, y eso se rompe en cuanto alguien mueve un bloque. Lo que NO
       lleva este contenedor es `opacity` ni `filter`: envolvería al lienzo en
       una capa compuesta y, si algún día el texto cayera dentro, Safari lo
       rasterizaría y se ablandaría la tipografía. */
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black ${className}`}
      aria-hidden="true"
    >
      <Particulas intensidad={intensidad} densidad={densidad} />
      {velo !== 'ninguno' && (
        <div className="absolute inset-0 z-[1]" style={{ background: VELOS[velo] }} />
      )}
    </div>
  );
}
