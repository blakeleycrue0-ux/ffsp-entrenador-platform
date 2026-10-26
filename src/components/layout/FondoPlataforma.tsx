/**
 * El fondo de la plataforma: una imagen, y nada más.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ES UN ARCHIVO, NO UN DEGRADADO QUE SE LE PAREZCA. `src/assets/fondo-inicio.webp`
 * son los píxeles de la imagen que se encargó, con su grano y sus tonos: un
 * desenfoque en blanco y negro con dos zonas claras arriba y abajo a la
 * derecha y una mancha oscura cruzando el centro. Reconstruirlo con
 * `linear-gradient` habría dado algo parecido de lejos y liso de cerca, y lo
 * que hace que esto no parezca un fondo de plantilla es justamente el grano.
 *
 * Pesa 93 KB. El original venía en PNG de 2,3 MB, que es inaceptable para lo
 * primero que carga un teléfono en el campo; es el MISMO archivo a la misma
 * resolución —1122 × 1402— vuelto a codificar en WebP, no una versión
 * reducida ni redibujada.
 *
 * LAS DOS CAPAS, Y SON DOS:
 *
 *  1. LA IMAGEN, `cover` y centrada. `cover` la recorta para llenar la
 *     pantalla sin deformarla nunca —ni estirada ni aplastada, se ponga el
 *     teléfono como se ponga—, y `no-repeat` evita que se vea dos veces en
 *     una pantalla larga. Va FIJA a la ventana: el fondo no se desplaza con
 *     el contenido, así que no hay costura por ningún lado y la imagen es
 *     continua de la cabecera a la navegación.
 *  2. UN VELO NEGRO SUAVE. La imagen tiene zonas casi blancas y encima van
 *     textos blancos: la hora, el día, las etiquetas de los accesos. El velo
 *     los hace legibles también ahí sin apagar el grano ni los grises —es
 *     una capa plana al 50 %, no un degradado ni un resplandor—.
 *
 * NI ONDAS NI RESPLANDORES. Antes aquí había diez trazos ondulados y un
 * degradado de negro a gris; ya no hay nada de eso. Una imagen, un velo.
 *
 * EN EL ESCRITORIO NO SE PONE. A partir de 1024 px la aplicación es un menú
 * lateral claro, una cabecera clara y tarjetas claras con texto oscuro: una
 * foto oscura detrás no se vería —la taparían las superficies— salvo como
 * una franja suelta entre la cabecera y el contenido. Ahí el fondo es el
 * mismo gris de la superficie.
 *
 * Y NO LO HEREDA LA PORTADA. Esto se dibuja dentro del armazón de la
 * plataforma y de las pantallas de acceso, nunca en el documento: la página
 * pública pinta sus propios fondos y no se entera de que esto existe.
 */

import fondo from '@/assets/fondo-inicio.webp';
import { cn } from '@/lib/utils';

/**
 * La imagen con su velo, para ponerla dentro de una superficie propia.
 *
 * La usan la entrada y el alta, que tienen su panel y no el fondo fijo de la
 * plataforma. Comparten este componente para que la imagen sea la misma en
 * los tres sitios: si cambia, cambia a la vez.
 */
// El velo oscurece la foto para que el texto se lea; eso es lo que tiene que
// hacer con el teléfono en claro y en oscuro. escala-ok: velo sobre la foto
export function ImagenDeFondo({ className, velo = 'bg-black/40' }: { className?: string; velo?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${fondo})` }}
      />
      <div className={cn('absolute inset-0', velo)} />
    </div>
  );
}

export function FondoPlataforma() {
  return (
    /* MISMA SUPERFICIE EN EL MÓVIL Y EN EL ESCRITORIO. Era `bg-ink-900` en
       el móvil y `lg:bg-surface` arriba: un marco oscuro con tarjetas claras
       flotando encima, que es lo que se leía como «franjas negras» detrás de
       la isla y de la barra de Safari. Ahora el tema lo decide el teléfono y
       el fondo es el mismo de punta a punta.
       Y se va con él la imagen de fondo del móvil, que existía para dar
       ambiente a ese marco oscuro y sobre gris claro sólo ensucia. */
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-surface" />
  );
}
