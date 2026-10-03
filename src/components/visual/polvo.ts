/**
 * El motor del ambiente: polvo de plata sobre negro.
 * ---------------------------------------------------------------------------
 * Aquí no hay nada de React a propósito. Es una función que recibe un lienzo y
 * devuelve cómo pararla, de modo que se puede abrir en una página suelta y
 * ajustar los números mirándola, sin reconstruir la aplicación entera. El
 * componente que lo usa son veinte líneas.
 *
 * CÓMO FUNCIONA. Unos miles de puntos diminutos empujados por un campo de
 * direcciones que cambia muy despacio. Como cada punto deja un rastro tenue y
 * los vecinos van casi en la misma dirección, los puntos se alinean solos en
 * filamentos y los filamentos en formaciones grandes, igual que la limadura de
 * hierro sobre un imán. De ahí sale el aspecto de tela o de curva de nivel.
 *
 * QUÉ NO ES. No es un cielo estrellado, no es nieve, no sigue al ratón, no
 * brilla, no tiene color y no explota nada. Un fondo que hace gracia la
 * primera vez molesta a partir de la segunda, y esto se ve todos los días.
 *
 * POR QUÉ A MANO Y NO CON UNA BIBLIOTECA. Son ciento cincuenta líneas de
 * lienzo 2D y cero dependencias. Meter WebGL o un motor de animación costaría
 * cientos de kilobytes en lo primero que descarga quien entra en la portada, y
 * esto se abre en el móvil de alguien a pie de campo.
 */

/** Los cuatro tonos. Ni uno más, y ninguno con color. */
export const TONOS = ['#FFFFFF', '#D7D7D7', '#8A8A8A', '#3A3A3A'];

/**
 * Ruido de valor: una rejilla de números al azar interpolada con suavidad.
 * Es lo que hace que dos puntos vecinos vayan casi en la misma dirección, y
 * por tanto lo que convierte una nube de puntos sueltos en una formación.
 */
function hacerRuido(semilla: number) {
  const tabla = new Float32Array(256 * 256);
  let s = semilla >>> 0;
  for (let i = 0; i < tabla.length; i += 1) {
    /* Generador propio y diminuto: `Math.random` no se puede sembrar, y sin
       semilla el fondo cambiaría en cada recarga. */
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    tabla[i] = s / 4294967296;
  }
  const en = (x: number, y: number) => tabla[((y & 255) << 8) | (x & 255)];
  const suave = (t: number) => t * t * (3 - 2 * t);

  return (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = suave(x - xi);
    const yf = suave(y - yi);
    const a = en(xi, yi);
    const b = en(xi + 1, yi);
    const c = en(xi, yi + 1);
    const d = en(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

export interface OpcionesPolvo {
  /** Cuánto se ve. 1 es el ambiente de la portada; menos, un fondo callado. */
  intensidad?: number;
  /** Multiplica la cantidad de puntos. Subirlo cuesta batería. */
  densidad?: number;
  /** Sin movimiento: calcula la formación de golpe y se queda quieta. */
  quieto?: boolean;
}

/**
 * Arranca el ambiente sobre un lienzo. Devuelve la función que lo para y
 * suelta todo lo que haya enganchado.
 */
export function arrancaPolvo(
  lienzo: HTMLCanvasElement,
  { intensidad = 1, densidad = 1, quieto = false }: OpcionesPolvo = {},
): () => void {
  const ctx = lienzo.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  const ruido = hacerRuido(20260207);

  let ancho = 0;
  let alto = 0;
  let puntos = new Float32Array(0);
  let tonos = new Uint8Array(0);
  let n = 0;
  let cuadro = 0;
  let animacion = 0;
  let pendiente = 0;

  const siembra = (i: number) => {
    const k = i * 4;
    puntos[k] = Math.random() * ancho;
    puntos[k + 1] = Math.random() * alto;
    /* Vida distinta para cada punto: si todos nacieran y murieran a la vez,
       la formación parpadearía entera cada pocos segundos. */
    puntos[k + 2] = 420 + Math.random() * 1700;
    /* Y velocidad distinta. Con todos a la misma, los rastros salen del mismo
       largo y el conjunto se lee como lluvia; variándola, unos se quedan casi
       quietos —y son polvo— y otros dejan una estela. */
    puntos[k + 3] = 0.18 + Math.random() * Math.random() * 0.75;
  };

  const mide = () => {
    const rect = lienzo.getBoundingClientRect();
    /* Son puntos de un píxel: a 3× no se ven mejor y cuesta cuatro veces más. */
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    ancho = Math.max(1, Math.round(rect.width));
    alto = Math.max(1, Math.round(rect.height));
    lienzo.width = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Los puntos salen del área, así que un móvil mueve una cuarta parte que
       un escritorio sin que haya que decidir nada a mano. */
    n = Math.round(Math.min(3400, Math.max(420, ((ancho * alto) / 360) * densidad)));
    puntos = new Float32Array(n * 4);
    tonos = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) {
      siembra(i);
      /* El reparto de tonos no es uniforme: muchos grises apagados, pocos
         blancos. Al revés, el fondo se convierte en una pared de puntos. */
      const r = Math.random();
      tonos[i] = r > 0.94 ? 0 : r > 0.76 ? 1 : r > 0.38 ? 2 : 3;
    }
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, ancho, alto);
  };

  /** Un paso: mover cada punto y dejar su marca. */
  const paso = () => {
    cuadro += 1;

    /* El rastro: en vez de borrar, se tapa con negro casi transparente. Lo que
       ya estaba dibujado se va apagando, y de ahí salen los filamentos. Con
       más alfa no hay rastro y queda nieve; con menos, se ensucia. */
    ctx.fillStyle = 'rgba(5,5,5,0.022)';
    ctx.fillRect(0, 0, ancho, alto);

    const t = cuadro * 0.00016; // el campo cambia despacio: minutos, no segundos
    /* Formaciones GRANDES. Con el valor de antes —casi tres veces éste— salían
       remolinos del tamaño de un dedo y el conjunto parecía pelusa. */
    const escala = 0.00085;

    for (let i = 0; i < n; i += 1) {
      const k = i * 4;
      const x = puntos[k];
      const y = puntos[k + 1];

      /* LA CLAVE. No se usa el ruido como ángulo: se va PERPENDICULAR A SU
         PENDIENTE, que es tanto como seguir las curvas de nivel de un
         terreno. Usar el ruido de ángulo directamente llena la pantalla de
         remolinos pequeños que se cruzan; seguir el nivel da curvas largas
         que no se cruzan nunca, y de ahí sale el aspecto de tela o de mapa
         topográfico, que es lo que se buscaba.

         La segunda octava va floja y sólo sirve para que no se vea la rejilla
         del ruido. */
      const u = x * escala;
      const v = y * escala;
      const e = 0.42;
      const gx =
        (ruido(u + e + t * 9, v) - ruido(u - e + t * 9, v)) * 0.82
        + (ruido((u + e) * 3.3, v * 3.3 + 40) - ruido((u - e) * 3.3, v * 3.3 + 40)) * 0.18;
      const gy =
        (ruido(u + t * 9, v + e) - ruido(u + t * 9, v - e)) * 0.82
        + (ruido(u * 3.3, (v + e) * 3.3 + 40) - ruido(u * 3.3, (v - e) * 3.3 + 40)) * 0.18;

      /* Donde el terreno es llano la pendiente no apunta a ningún lado y la
         dirección daría bandazos. Una corriente de fondo muy floja lo
         estabiliza y además da al conjunto un sentido de avance. */
      /* La corriente de fondo va MUY floja: lo justo para que en las zonas
         llanas la dirección no dé bandazos. Con más, todas las curvas salen
         paralelas y en diagonal, y se pierde el dibujo. */
      const angulo = Math.atan2(gx + 0.00018, -gy + 0.00030);

      /* EL BRILLO POR ZONAS. Siguiendo curvas de nivel los puntos no se
         amontonan —el campo no tiene sumideros—, así que la densidad sale
         igual de pareja en toda la pantalla y el conjunto se lee como lluvia.
         Lo que crea las formaciones grandes es que el polvo se ENCIENDA en
         unas zonas y casi se apague en otras, y eso sale de la altura del
         mismo terreno cuyas curvas se están siguiendo: las crestas brillan,
         los valles se quedan en nada. */
      /* OJO CON LA ESCALA. La primera vez se puso a 0,55, y a ese tamaño una
         sola celda del ruido es más ancha que la pantalla entera: el brillo
         salía constante y, por mala suerte, constante y bajo. Resultado, un
         rectángulo negro. Las zonas tienen que medir un tercio de pantalla,
         no tres pantallas. */
      const altura = ruido(u * 2.2 + t * 9, v * 2.2);
      const brillo = Math.max(0.08, Math.min(1.3, (altura - 0.3) * 2.3));

      const tono = tonos[i];
      ctx.fillStyle = TONOS[tono];
      ctx.globalAlpha =
        (tono === 0 ? 0.34 : tono === 1 ? 0.23 : tono === 2 ? 0.15 : 0.09) * brillo * intensidad;
      ctx.fillRect(x, y, 1, 1);
      /* Los dos tonos claros dejan además una mancha de 2 px muy floja. No es
         un resplandor —no hay desenfoque ni nada que cueste— pero quita el
         filo de aguja del punto suelto y el conjunto pasa de arañazo a polvo. */
      if (tono < 2) {
        ctx.globalAlpha *= 0.22;
        ctx.fillRect(x - 0.5, y - 0.5, 2, 2);
      }

      const vel = puntos[k + 3];
      puntos[k] = x + Math.cos(angulo) * vel;
      puntos[k + 1] = y + Math.sin(angulo) * vel;
      puntos[k + 2] -= 1;

      if (
        puntos[k + 2] <= 0
        || puntos[k] < -20 || puntos[k] > ancho + 20
        || puntos[k + 1] < -20 || puntos[k + 1] > alto + 20
      ) {
        /* Sin esto, al cabo de un rato todos los puntos acaban atrapados en
           los mismos remolinos y la imagen se queda quieta y con grumos. */
        siembra(i);
      }
    }
    ctx.globalAlpha = 1;
  };

  const bucle = () => {
    paso();
    animacion = requestAnimationFrame(bucle);
  };

  const arranca = () => {
    cancelAnimationFrame(animacion);
    /* Una animación que nadie mira sólo gasta batería. */
    if (quieto || (typeof document !== 'undefined' && document.hidden)) return;
    animacion = requestAnimationFrame(bucle);
  };

  /** Lo que hay que adelantar para que la formación ya esté hecha al verla. */
  const adelanta = () => {
    for (let i = 0; i < (quieto ? 700 : 320); i += 1) paso();
  };

  const alCambiarVisibilidad = () => {
    if (document.hidden) cancelAnimationFrame(animacion);
    else arranca();
  };

  const alCambiarTamano = () => {
    window.clearTimeout(pendiente);
    pendiente = window.setTimeout(() => {
      mide();
      adelanta();
      arranca();
    }, 180);
  };

  mide();
  adelanta();
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
