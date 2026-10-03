/**
 * La superficie: una tela de puntos.
 * ---------------------------------------------------------------------------
 * QUÉ ES, Y QUÉ NO ES. Esto NO son partículas sueltas volando. Es **una sola
 * superficie matemática** —una lámina que ondula— muestreada en decenas de
 * miles de puntos diminutos y proyectada en perspectiva. Los puntos no tienen
 * vida propia: cada uno es una muestra de la misma tela, y por eso el conjunto
 * se lee como una tela y no como lluvia.
 *
 * La versión anterior hacía justo lo contrario: puntos independientes
 * siguiendo un campo, cada uno dejando su rastro. Daba rayas largas. Parecía
 * lluvia, pelo o fibra óptica. Está borrada entera; no se ha puesto esto
 * encima de aquello.
 *
 * CÓMO SE DIBUJA
 *
 *  1. Una rejilla (u, v). Para cada nodo se calcula su ALTURA con una suma de
 *     senos de distintas frecuencias que se mueven muy despacio.
 *  2. De las derivadas de esos senos sale la NORMAL de la superficie en ese
 *     punto —exacta, no aproximada—, y de la normal sale la LUZ: lo que mira
 *     hacia el foco se pone casi blanco, lo que mira a otro lado se hunde en
 *     negro. Eso es lo que da el aspecto de tela o de metal, y no se puede
 *     conseguir pintando todos los puntos del mismo blanco.
 *  3. Se proyecta en perspectiva: lo lejano, más pequeño y más junto.
 *  4. Cada punto se reparte entre los cuatro píxeles que le tocan y se SUMA.
 *     Donde caen muchos, la suma satura en blanco y la lámina parece sólida;
 *     donde caen pocos, se ven los puntos uno a uno. Es la propia densidad la
 *     que dibuja, sin trucos.
 *
 * POR QUÉ CON `ImageData` Y NO CON `fillRect`. Treinta mil rectángulos por
 * fotograma son treinta mil llamadas al lienzo. Escribiendo en el búfer de
 * píxeles son cuatro sumas por punto, y el borrado es un `fill` de memoria. De
 * ahí que esto aguante treinta mil muestras a 60 fps en un móvil.
 *
 * NO HAY: rastros, líneas, estelas, remolinos, estrellas, color, ratón, ni
 * nada que reaccione a nada. El fondo es negro puro y el negro forma parte del
 * dibujo.
 */

export interface OpcionesSuperficie {
  /** Cuánto se ve. 1 es la portada; menos, un fondo más callado. */
  intensidad?: number;
  /** Multiplica la cantidad de muestras. Subirlo cuesta batería. */
  densidad?: number;
  /** Sin movimiento: dibuja un estado bonito y se queda quieta. */
  quieto?: boolean;
}

/* ─────────────────────────── La forma de la tela ─────────────────────────── */

/**
 * Altura de la lámina en (u, v) y sus dos pendientes, en una sola pasada.
 *
 * Son cuatro ondas cruzadas con periodos que no son múltiplos entre sí, así
 * que la figura tarda minutos en parecerse a sí misma y no se ve el bucle.
 * Las pendientes salen derivando los mismos senos: exactas y casi gratis.
 */
function tela(u: number, v: number, t: number, fuera: Float32Array): void {
  const a1 = 1.7 * u + 0.9 * v + t * 0.21;
  const a2 = 2.9 * u - 1.5 * v + t * 0.132 + 1.7;
  const a3 = 4.3 * v - 1.1 * u + t * 0.171 + 3.1;
  const a4 = 5.9 * u + 2.2 * v - t * 0.113;

  const s1 = Math.sin(a1);
  const s2 = Math.sin(a2);
  const s3 = Math.sin(a3);
  const s4 = Math.sin(a4);

  fuera[0] = 0.46 * s1 + 0.27 * s2 + 0.15 * s3 + 0.075 * s4;

  const c1 = Math.cos(a1);
  const c2 = Math.cos(a2);
  const c3 = Math.cos(a3);
  const c4 = Math.cos(a4);

  // ∂h/∂u
  fuera[1] = 0.46 * 1.7 * c1 + 0.27 * 2.9 * c2 + 0.15 * -1.1 * c3 + 0.075 * 5.9 * c4;
  // ∂h/∂v
  fuera[2] = 0.46 * 0.9 * c1 + 0.27 * -1.5 * c2 + 0.15 * 4.3 * c3 + 0.075 * 2.2 * c4;
}

/* ─────────────────────────────── El motor ────────────────────────────────── */

export function arrancaSuperficie(
  lienzo: HTMLCanvasElement,
  { intensidad = 1, densidad = 1, quieto = false }: OpcionesSuperficie = {},
): () => void {
  const ctx = lienzo.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  let ancho = 0;
  let alto = 0;
  let img: ImageData | null = null;
  let pix: Uint8ClampedArray = new Uint8ClampedArray(0);
  let limpio: Uint32Array = new Uint32Array(0);
  let nu = 0;
  let nv = 0;
  let animacion = 0;
  let pendiente = 0;
  let arranque = 0;

  const h = new Float32Array(3);

  /* La luz, normalizada, desde arriba y un poco a la izquierda. Y el vector
     intermedio entre la luz y la mirada, para el brillo especular. */
  const LX = -0.38;
  const LY = 0.80;
  const LZ = -0.46;
  const MX = -0.26;
  const MY = 0.63;
  const MZ = -0.73;

  const mide = () => {
    const rect = lienzo.getBoundingClientRect();
    /* A un punto por píxel de CSS. Son puntos de un píxel: a 2× o 3× cuesta
       cuatro o nueve veces más y no se ve mejor. */
    ancho = Math.max(1, Math.round(rect.width));
    alto = Math.max(1, Math.round(rect.height));
    lienzo.width = ancho;
    lienzo.height = alto;

    img = ctx.createImageData(ancho, alto);
    pix = img.data;
    /* Un búfer de borrado ya preparado: negro opaco. Vaciar con `set` desde
       otro array es una copia de memoria, lo más rápido que hay. */
    limpio = new Uint32Array(ancho * alto).fill(0xff000000);

    /* Las muestras salen del área, con tope. Treinta mil en un escritorio
       grande; en un móvil bajan solas a unas ocho mil. */
    const objetivo = Math.min(30000, Math.max(5200, (ancho * alto) / 44)) * densidad;
    /* Rejilla más ancha que alta: la lámina se ve en escorzo, así que a lo
       largo hacen falta más muestras para que no se abra en filas. */
    nu = Math.round(Math.sqrt(objetivo * 1.9));
    nv = Math.round(objetivo / nu);
  };

  /** Un fotograma entero. */
  const pinta = (t: number) => {
    if (!img) return;
    new Uint32Array(pix.buffer).set(limpio);

    /* Encuadre de la lámina. Se sale por los lados a propósito: una tela que
       se ve entera, con sus cuatro bordes, parece una alfombra; cortada por el
       marco parece que sigue más allá. */
    const SX = ancho * 1.75; // ancho de la tela en unidades de mundo
    const SZ = ancho * 1.35; // profundidad
    const SY = ancho * 0.2; // cuánto ondula
    const Z0 = ancho * 0.5; // lo cerca que pasa el borde de delante
    const foco = ancho * 0.95;
    const cx = ancho * 0.5;
    /* LA CÁMARA VA POR ENCIMA DE LA TELA. Sin esto estaba a su misma altura,
       la veía exactamente de canto y la lámina entera se proyectaba sobre una
       línea que además se salía por arriba: la pantalla quedaba casi negra.
       Es el error de geometría que hay que no cometer dos veces. */
    const altura = ancho * 0.42;
    /* El centro óptico va ALTO: así la lámina ocupa la parte de arriba y deja
       limpio el tercio de abajo, que es donde va el texto. */
    const cy = alto * 0.5;

    const inclinacion = 0.52; // radianes: la cámara mira hacia abajo
    const cosI = Math.cos(inclinacion);
    const senI = Math.sin(inclinacion);

    /* De la rejilla al mundo: la pendiente hay que reescalarla porque u y v no
       miden lo mismo en metros. */
    const ku = (SY / SX) * 2;
    const kv = (SY / SZ) * 2;

    /* La fila `j` va de lejos (0) a cerca (nv−1), para que lo cercano se
       dibuje encima. La coordenada exacta de cada muestra sale más abajo, con
       su desorden incluido. */
    for (let j = 0; j < nv; j += 1) {
      for (let i = 0; i < nu; i += 1) {
        /* LAS MUESTRAS VAN DESORDENADAS. Tomadas en una rejilla exacta se ven
           las filas y las columnas, y eso se lee como una malla de alambre, no
           como una tela. Con un desorden pequeño y FIJO para cada muestra
           —sale de sus índices, así que no tiembla entre fotogramas— la rejilla
           desaparece y quedan puntos sueltos que, juntos, forman la
           superficie. */
        const sal = ((i * 73856093) ^ (j * 19349663)) >>> 0;
        const du = ((sal & 1023) / 1023 - 0.5) * 1.35;
        const dv = (((sal >>> 10) & 1023) / 1023 - 0.5) * 1.35;

        const u = (i + du) / (nu - 1) - 0.5;
        const vv = Math.min(1, Math.max(0, (j + dv) / (nv - 1)));

        tela(u * 3.1, vv * 3.1, t, h);
        const Z = Z0 + (1 - vv) * SZ;
        const Y = h[0] * SY - altura;

        /* Giro de la cámara sobre el eje X y proyección. */
        const Yr = Y * cosI + Z * senI;
        const Zr = Z * cosI - Y * senI;
        if (Zr < 1) continue;

        const inv = foco / Zr;
        const sx = cx + u * SX * inv;
        const sy = cy - Yr * inv;
        if (sx < 0 || sx >= ancho - 1 || sy < 0 || sy >= alto - 1) continue;

        /* ── La luz ──────────────────────────────────────────────────────
           La normal sale de las dos pendientes. Sin esto todos los puntos
           saldrían del mismo blanco y la tela parecería una mancha. */
        const gu = h[1] * ku;
        const gv = h[2] * kv;
        const nl = 1 / Math.sqrt(gu * gu + gv * gv + 1);
        const Nx = -gu * nl;
        const Ny = nl;
        const Nz = -gv * nl;

        let luz = Nx * LX + Ny * LY + Nz * LZ;
        luz = luz > 0 ? luz * Math.sqrt(luz) : 0;

        let brillo = Nx * MX + Ny * MY + Nz * MZ;
        if (brillo > 0) {
          brillo *= brillo;
          brillo *= brillo;
          brillo *= brillo; // ^8: un filo estrecho, no un halo
        } else {
          brillo = 0;
        }

        /* Lo lejano se apaga, y el borde de delante también: así la lámina se
           funde con el negro por los dos lados en vez de cortarse en seco. La
           profundidad sale de `v`, que es la coordenada de la propia tela: con
           `Zr` dependía del giro de la cámara y se descuadraba al tocarlo. */
        const prof = vv;
        const borde = Math.min(1, vv * 4.5) * Math.min(1, (1 - vv) * 9);

        /* Más luz y con la caída más suave: antes sólo se encendía la cresta y
           el resto de la tela se quedaba en un gris apenas visible. */
        let valor = (0.1 + luz * 1.95 + brillo * 1.25) * (0.5 + prof * 0.8) * borde * intensidad;
        if (valor <= 0.002) continue;
        valor *= 255;

        /* Reparto entre los cuatro píxeles vecinos: así el punto no salta de
           píxel en píxel al moverse, y donde caen muchos la suma satura en
           blanco y la superficie parece continua. */
        const x0 = sx | 0;
        const y0 = sy | 0;
        const fx = sx - x0;
        const fy = sy - y0;
        const base = (y0 * ancho + x0) * 4;
        const w00 = (1 - fx) * (1 - fy) * valor;
        const w10 = fx * (1 - fy) * valor;
        const w01 = (1 - fx) * fy * valor;
        const w11 = fx * fy * valor;
        const salto = ancho * 4;

        pix[base] += w00; pix[base + 1] += w00; pix[base + 2] += w00;
        pix[base + 4] += w10; pix[base + 5] += w10; pix[base + 6] += w10;
        pix[base + salto] += w01; pix[base + salto + 1] += w01; pix[base + salto + 2] += w01;
        pix[base + salto + 4] += w11; pix[base + salto + 5] += w11; pix[base + salto + 6] += w11;
      }
    }

    ctx.putImageData(img, 0, 0);
  };

  const bucle = (ahora: number) => {
    /* Un ciclo completo son decenas de segundos: al mirarla hay que dudar de
       si se mueve. */
    pinta((ahora - arranque) / 1000);
    animacion = requestAnimationFrame(bucle);
  };

  const arranca = () => {
    cancelAnimationFrame(animacion);
    if (quieto || (typeof document !== 'undefined' && document.hidden)) return;
    animacion = requestAnimationFrame(bucle);
  };

  const alCambiarVisibilidad = () => {
    if (document.hidden) cancelAnimationFrame(animacion);
    else arranca();
  };

  const alCambiarTamano = () => {
    window.clearTimeout(pendiente);
    pendiente = window.setTimeout(() => {
      mide();
      pinta(quieto ? 12 : (performance.now() - arranque) / 1000);
      arranca();
    }, 180);
  };

  arranque = typeof performance !== 'undefined' ? performance.now() : 0;
  mide();
  /* Quieta, se dibuja un instante concreto de la onda elegido porque queda
     bien: una imagen, no un recuadro vacío. */
  pinta(quieto ? 12 : 0);
  arranca();

  window.addEventListener('resize', alCambiarTamano);
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  return () => {
    cancelAnimationFrame(animacion);
    window.clearTimeout(pendiente);
    window.removeEventListener('resize', alCambiarTamano);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  };
}
