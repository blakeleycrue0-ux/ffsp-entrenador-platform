/**
 * Del dedo a la trayectoria.
 * ---------------------------------------------------------------------------
 * Cuando una entrenadora arrastra el dedo por el campo, el navegador manda
 * cientos de puntos: muchos pegados unos a otros, temblorosos, y algunos
 * repetidos porque el dedo se ha parado un instante. Guardar eso tal cual
 * hincha la jugada, la hace lenta de dibujar y, sobre todo, la hace fea: se ve
 * el pulso.
 *
 * Y el otro extremo es peor. Reducirlo a «de aquí a allí» —que es lo que había
 * hasta ahora— borra justo lo que se estaba explicando: el arco por fuera, el
 * quiebro, la finta. La forma ES el contenido táctico.
 *
 * Así que el trazo pasa por tres pasos, en este orden:
 *
 *   1. FILTRAR por distancia. Dos puntos a medio metro no dicen nada nuevo.
 *   2. SIMPLIFICAR con Ramer–Douglas–Peucker. Quita los puntos que caen casi
 *      sobre la recta que forman sus vecinos, y CONSERVA los quiebros: es un
 *      algoritmo que mide la desviación, no que promedia. Por eso un cambio de
 *      dirección brusco sobrevive y una curva suave se queda en cuatro puntos.
 *   3. SUAVIZAR con Catmull-Rom, que pasa POR los puntos en vez de acercarse a
 *      ellos. El resultado redondea las esquinas del polígono sin mover el
 *      recorrido de sitio.
 *
 * Todo en metros sobre el campo, como el resto de la pizarra.
 */

import type { Point } from './scene';

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Distancia de `p` al segmento `a`–`b`. La medida que usa el paso 2. */
function alSegmento(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  // Proyección de p sobre la recta, recortada al segmento.
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Paso 1. Se queda con un punto cada `minimo` metros.
 * El último SIEMPRE se conserva: es donde se ha levantado el dedo, y perderlo
 * dejaría la trayectoria corta.
 */
export function filtra(puntos: Point[], minimo = 0.6): Point[] {
  if (puntos.length <= 2) return [...puntos];
  const out: Point[] = [puntos[0]];
  for (let i = 1; i < puntos.length - 1; i += 1) {
    if (dist(puntos[i], out[out.length - 1]) >= minimo) out.push(puntos[i]);
  }
  out.push(puntos[puntos.length - 1]);
  return out;
}

/**
 * Paso 2. Ramer–Douglas–Peucker, iterativo para no arriesgar la pila con un
 * trazo muy largo.
 *
 * `epsilon` es la desviación que se tolera, en metros: por debajo de eso el
 * punto se considera decorativo. Un metro y medio en un campo de 105 × 68 es
 * poco más que el ancho de una jugadora.
 */
export function simplifica(puntos: Point[], epsilon = 0.9): Point[] {
  if (puntos.length <= 2) return [...puntos];

  const conservar = new Array<boolean>(puntos.length).fill(false);
  conservar[0] = true;
  conservar[puntos.length - 1] = true;

  const pila: [number, number][] = [[0, puntos.length - 1]];
  while (pila.length) {
    const [desde, hasta] = pila.pop() as [number, number];
    let peor = 0;
    let cual = -1;
    for (let i = desde + 1; i < hasta; i += 1) {
      const d = alSegmento(puntos[i], puntos[desde], puntos[hasta]);
      if (d > peor) { peor = d; cual = i; }
    }
    if (cual !== -1 && peor > epsilon) {
      conservar[cual] = true;
      pila.push([desde, cual], [cual, hasta]);
    }
  }

  return puntos.filter((_, i) => conservar[i]);
}

/**
 * Paso 3. Se redondean las esquinas, no se interpola por encima de ellas.
 *
 * LO PRIMERO QUE PROBÉ FUE CATMULL-ROM, y por eso está escrito aquí: una
 * curva que pasa POR los puntos suena a lo correcto, pero en un quiebro se
 * abre hacia fuera antes de girar. Medido en un ángulo recto de 20 × 24 m, la
 * curva llegaba a 1,7 m por fuera del recorrido dibujado —y eso con la
 * variante centrípeta, que es la que no se cruza consigo misma—. En un campo
 * eso es una jugadora que sale de la banda al doblar. El trazo del dedo ya es
 * la intención; el suavizado no puede llevársela de paseo.
 *
 * Así que se hace al revés: cada vértice se corta con una curva de Bézier
 * cuadrática cuyo punto de control ES el vértice. Una Bézier no se sale nunca
 * del triángulo que forman sus tres puntos, así que la trayectoria se queda
 * SIEMPRE dentro del recorrido. El radio del corte es proporcional a los
 * tramos que llegan al vértice, con tope: en un zigzag apretado redondea poco,
 * y en un recorrido largo no se come el quiebro.
 */
export function suaviza(puntos: Point[], porTramo = 8, radioMaximo = 2.5): Point[] {
  if (puntos.length <= 2) return [...puntos];

  const out: Point[] = [puntos[0]];

  for (let i = 1; i < puntos.length - 1; i += 1) {
    const a = puntos[i - 1];
    const b = puntos[i];
    const c = puntos[i + 1];
    const la = dist(a, b);
    const lc = dist(b, c);
    if (la === 0 || lc === 0) continue;

    /* 0,4 del tramo como mucho: pasado eso, dos esquinas seguidas se comerían
       la recta que hay entre ellas y el zigzag se volvería una ese. */
    const r = Math.min(0.4 * la, 0.4 * lc, radioMaximo);
    const entra: Point = { x: b.x + ((a.x - b.x) / la) * r, y: b.y + ((a.y - b.y) / la) * r };
    const sale: Point = { x: b.x + ((c.x - b.x) / lc) * r, y: b.y + ((c.y - b.y) / lc) * r };

    out.push(entra);
    for (let j = 1; j <= porTramo; j += 1) {
      const u = j / porTramo;
      const m = 1 - u;
      out.push({
        x: m * m * entra.x + 2 * m * u * b.x + u * u * sale.x,
        y: m * m * entra.y + 2 * m * u * b.y + u * u * sale.y,
      });
    }
  }

  out.push(puntos[puntos.length - 1]);
  return out;
}

export interface Ajustes {
  /** Metros mínimos entre puntos crudos. */
  minimo?: number;
  /** Desviación tolerada al simplificar, en metros. */
  epsilon?: number;
  /** Puntos intermedios por tramo al suavizar. */
  porTramo?: number;
}

/**
 * El trazo entero: de los puntos crudos del puntero a una trayectoria
 * utilizable. Devuelve la línea completa, extremos incluidos.
 */
export function procesaTrazo(crudos: Point[], a: Ajustes = {}): Point[] {
  if (crudos.length === 0) return [];
  if (crudos.length === 1) return [crudos[0]];
  return suaviza(simplifica(filtra(crudos, a.minimo), a.epsilon), a.porTramo);
}

/** Largo total de una polilínea, en metros. Sirve para repartir el tiempo. */
export function largo(puntos: Point[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i += 1) total += dist(puntos[i - 1], puntos[i]);
  return total;
}

/**
 * Posición a la fracción `u` (0–1) del recorrido, MEDIDA EN DISTANCIA, no en
 * número de puntos. Es la diferencia entre moverse a velocidad constante y
 * acelerar donde el trazo tiene los puntos más juntos.
 */
export function enLaFraccion(puntos: Point[], u: number): Point {
  if (puntos.length === 0) return { x: 0, y: 0 };
  if (puntos.length === 1) return puntos[0];
  const total = largo(puntos);
  if (total === 0) return puntos[0];

  const objetivo = Math.max(0, Math.min(1, u)) * total;
  let recorrido = 0;
  for (let i = 1; i < puntos.length; i += 1) {
    const tramo = dist(puntos[i - 1], puntos[i]);
    if (recorrido + tramo >= objetivo) {
      const k = tramo === 0 ? 0 : (objetivo - recorrido) / tramo;
      return {
        x: puntos[i - 1].x + (puntos[i].x - puntos[i - 1].x) * k,
        y: puntos[i - 1].y + (puntos[i].y - puntos[i - 1].y) * k,
      };
    }
    recorrido += tramo;
  }
  return puntos[puntos.length - 1];
}

/**
 * Hacia dónde mira quien recorre el trazo en la fracción `u`, en grados.
 * `null` cuando no hay avance suficiente para decirlo: girar una ficha por un
 * temblor de medio centímetro se ve peor que no girarla.
 */
export function rumbo(puntos: Point[], u: number, paso = 0.02): number | null {
  if (puntos.length < 2) return null;
  const a = enLaFraccion(puntos, Math.max(0, u - paso));
  const b = enLaFraccion(puntos, Math.min(1, u + paso));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 0.05) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}
