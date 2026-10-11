/**
 * El fondo de la plataforma: negro arriba, gris abajo, y unas ondas.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SUSTITUYE AL AZUL NOCHE Y A SU RESPLANDOR. Lo que había era un fondo azul
 * marino con un halo azul cayendo desde arriba y el arco de un campo de
 * fútbol detrás de la hora. Tres cosas de color en el sitio donde no tiene
 * que haber ninguna: el fondo de una herramienta está para no verse.
 *
 * Ahora son tres capas y ni una gota de color:
 *
 *  1. NEGRO PURO arriba. No «casi negro»: #000. Es donde van la hora y los
 *     accesos rápidos, en blanco, y lo que hace que se lean sin esfuerzo.
 *  2. LAS ONDAS. Líneas finas de gris oscuro, muy separadas y muy suaves,
 *     que cruzan la parte negra. No son un adorno con brillo: son un gris
 *     apenas por encima del negro —#232327 sobre #000—, lo justo para que el
 *     negro no sea un vacío plano. Si compiten con el contenido, están mal.
 *  3. LA TRANSICIÓN A GRIS. De negro a #E8E8EB, progresiva, en la mitad de
 *     abajo. Ahí es donde viven las tarjetas claras, y por eso el gris no es
 *     un bloque: aparece poco a poco y las ondas se apagan dentro de él.
 *
 * VA FIJO A LA VENTANA, no al documento. Así el negro está siempre arriba
 * —detrás de la cabecera— y el gris siempre abajo —detrás de la navegación—,
 * independientemente de lo larga que sea la página y de por dónde se vaya.
 * Si se desplazara con el contenido, una lista de treinta jugadoras acabaría
 * sobre negro otra vez.
 *
 * NO SE DESENFOCA NADA Y NO HAY NINGUNA IMAGEN. Son un degradado y un SVG de
 * diez trazos que pesa lo que pesa este párrafo. El fondo de una aplicación
 * que se desplaza con el dedo no puede costar nada.
 *
 * Y NO LO HEREDA LA PORTADA. Esto se dibuja dentro del armazón de la
 * plataforma y de las pantallas de acceso, nunca en el documento: la página
 * pública pinta sus propios fondos y no se entera de que esto existe.
 */

/* Diez líneas, cada 30 unidades. Son pocas y separadas a propósito: muchas
   juntas dejan de leerse como ondas y pasan a ser una trama. */
const ONDAS = Array.from({ length: 10 }, (_, i) => 18 + i * 30);

/**
 * Sólo las ondas, para ponerlas dentro de una superficie negra.
 *
 * Las usan la entrada y el alta, que tienen su propia franja negra y no el
 * fondo fijo de la plataforma. Comparten este componente para que las ondas
 * sean las mismas en los tres sitios: si cambian, cambian a la vez.
 *
 * `preserveAspectRatio="none"` estira el dibujo con el ancho de la pantalla,
 * y `vector-effect` evita que estire también el grosor del trazo, que es lo
 * que las volvería gruesas en una pantalla ancha.
 */
export function OndasDeFondo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'}
      viewBox="0 0 440 320"
      preserveAspectRatio="none"
      fill="none"
    >
      {ONDAS.map((y, i) => (
        <path
          key={y}
          d={`M-20 ${y} C 70 ${y - 13} 130 ${y + 13} 220 ${y} S 370 ${y - 13} 460 ${y}`}
          stroke="#232327"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          /* Se apagan hacia abajo: donde empieza el gris ya no se ven. */
          opacity={1 - i * 0.07}
        />
      ))}
    </svg>
  );
}

/**
 * EN EL ESCRITORIO NO HAY NEGRO, Y NO ES UNA EXCEPCIÓN CAPRICHOSA.
 *
 * La composición de arriba —negro con la hora encima y el gris subiendo
 * desde abajo— es la de un teléfono: una sola columna, un dato enorme y la
 * navegación flotando al alcance del pulgar. En un portátil no hay nada de
 * eso. Hay un menú lateral claro, una cabecera clara y dos columnas de
 * tarjetas claras; el héroe no existe, porque Inicio enseña el saludo y la
 * rejilla. El negro no quedaba detrás de ningún dato: quedaba detrás de la
 * cabecera y asomaba como una franja entre ella y el contenido.
 *
 * Así que a partir de `lg` el fondo es el mismo gris de la superficie y se
 * acabó. Es la misma paleta —negro, blanco y grises— puesta donde cada
 * tamaño la necesita.
 */
export function FondoPlataforma() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black lg:bg-surface">
      <OndasDeFondo className="absolute inset-x-0 top-0 h-[68%] w-full lg:hidden" />

      {/* De negro a gris, progresivo. El primer tramo es negro sobre negro:
          sirve para que las ondas se desvanezcan antes de que llegue el
          gris, en vez de cortarse de golpe. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[64%] lg:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 26%, #0D0D0F 46%, #3A3A40 64%, #A8A8AF 82%, #E8E8EB 96%)',
        }}
      />
    </div>
  );
}
