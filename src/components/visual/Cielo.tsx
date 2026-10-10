/**
 * El cielo de la marca, detrás de las dos puertas.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ SUSTITUYE. La entrada y el montaje del club llevaban `Ambiente`: un
 * campo de partículas gris sobre negro, del diseño anterior. Era bonito y ya
 * no era de aquí: la portada es un cielo azul y la aplicación es azul noche,
 * y en medio quedaban dos pantallas en blanco y negro. Justo las dos por las
 * que se pasa SIEMPRE, y las únicas que ve alguien que todavía no sabe si
 * esto le sirve.
 *
 * Es el mismo cielo de la portada —mismas clases `cielo` y `nubes`, que viven
 * en `index.css`— y encima un velo oscuro. El velo hace dos cosas: deja leer
 * el formulario, que va en un panel oscuro, y evita que la pantalla parezca
 * la portada otra vez cuando ya has entrado.
 *
 * NO LLEVA LIENZO NI ANIMACIÓN POR FOTOGRAMA. El anterior pintaba partículas
 * en un `canvas` a sesenta veces por segundo detrás de un formulario. Esto
 * son dos degradados y una deriva de noventa segundos que el compositor
 * resuelve solo: en un móvil de hace cinco años se nota la diferencia
 * mientras se escribe una contraseña.
 */

/**
 * `velo` dice cuánto se apaga el cielo, y hay tres porque hay tres trabajos:
 *
 *   `medio`   detrás de un formulario centrado. Apaga el centro para que el
 *             panel se lea y deja los bordes en azul.
 *   `fuerte`  igual, pero cuando el formulario es más grande.
 *   `franja`  LA CABECERA DEL MÓVIL, que es otra cosa. Ahí el cielo no es un
 *             fondo: es lo único que se ve de la marca, así que casi no se
 *             apaga —sólo lo justo para que el logotipo blanco tenga
 *             contraste— y se funde con el azul noche por abajo. Con el velo
 *             fuerte quedaba una banda turbia cortada a cuchillo contra el
 *             formulario, que es lo que había.
 */
const VELOS = {
  medio:
    'radial-gradient(82% 68% at 50% 46%, rgba(6,12,27,0.88) 0%, rgba(6,12,27,0.68) 50%, rgba(6,12,27,0.38) 100%)',
  fuerte:
    'radial-gradient(78% 64% at 50% 48%, rgba(6,12,27,0.93) 0%, rgba(6,12,27,0.80) 48%, rgba(6,12,27,0.52) 100%)',
  franja:
    'linear-gradient(to bottom, rgba(6,12,27,0.34) 0%, rgba(6,12,27,0.22) 46%, rgba(6,12,27,0.72) 82%, #060C1B 100%)',
  /**
   * `hondo` ES PARA PANTALLAS LARGAS, Y NACE DE UN FALLO DE LEGIBILIDAD.
   *
   * El montaje del club llevaba el velo `fuerte`, que es radial: apaga el
   * centro y deja los bordes azules. Con un formulario corto va bien; con el
   * teclado del código —que ocupa de arriba abajo— el texto de los extremos
   * caía sobre cielo a media luz. Medido en la pantalla del código: el
   * párrafo del pie quedaba en gris claro sobre azul medio, por debajo del
   * mínimo legible. Y no era un matiz de gusto: no se leía.
   *
   * Aquí el cielo se queda sólo como un resplandor arriba, detrás de la
   * marca, y a partir de un tercio de pantalla es azul noche opaco. Se
   * reconoce el producto y todo lo que hay que leer está sobre fondo sólido.
   */
  hondo:
    'linear-gradient(to bottom, rgba(6,12,27,0.72) 0%, rgba(6,12,27,0.88) 22%, rgba(6,12,27,0.97) 42%, #060C1B 62%)',
} as const;

/**
 * `nubes` se apaga cuando la franja es BAJA. Las nubes son elipses de cien y
 * pico píxeles de alto: dentro de una banda de 76 px no se ven como nubes, se
 * ven como brochazos claros cortados por arriba y por abajo. En la cabecera
 * de la entrada del móvil se queda sólo el degradado, que a esa altura es lo
 * único que se lee como cielo.
 */
export function Cielo({
  velo = 'medio', nubes = true,
}: { velo?: keyof typeof VELOS; nubes?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="cielo absolute inset-0" />
      {nubes && <div className="nubes nubes-mueve" />}
      {/* El velo: azul noche, no negro. Un velo negro sobre azul apaga el
          color y deja un gris sucio; con el mismo tono del producto, lo que
          queda debajo sigue siendo azul, sólo que más hondo. */}
      <div className="absolute inset-0" style={{ background: VELOS[velo] }} />
    </div>
  );
}
