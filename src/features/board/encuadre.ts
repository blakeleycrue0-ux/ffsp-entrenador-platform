/**
 * Zoom y encuadre del campo: cuenta pura, sin pantalla.
 * ---------------------------------------------------------------------------
 * Estaba dentro de `BoardStage.tsx`, que arrastra React entero. Vive aquí
 * porque es geometría y se puede medir sola: una prueba que compruebe el
 * encuadre no tiene por qué montar un navegador para hacerlo.
 */

import { camaraDe, proyeccion } from './camara';
import { PITCHES, type Point, type Scene } from './scene';

export interface View {
  /** 1 es «todo el campo a la vista». */
  s: number;
  /** Desplazamiento en unidades del lienzo. */
  tx: number;
  ty: number;
}

export const VIEW_INICIAL: View = { s: 1, tx: 0, ty: 0 };

/** Cuánto zoom se deja hacer. Por debajo de 1 se ve más campo del que hay. */
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 4;

/** Metros de aire alrededor de la jugada al encuadrarla. */
const AIRE = 4;

/**
 * ENCUADRAR LA JUGADA, QUE NO ES LO MISMO QUE ENCUADRAR EL CAMPO.
 * ───────────────────────────────────────────────────────────────────────────
 * Un rondó ocupa veinte metros. Un circuito de finalización, treinta. Y los
 * dos se dibujaban sobre un campo entero de 105 × 68, así que lo que el
 * entrenador quiere mirar salía en la octava parte de la pantalla y las
 * fichas, por grandes que se pusieran, eran puntos. En pantalla completa
 * pasaba exactamente igual: la pantalla la llenaba el CÉSPED, no la jugada.
 *
 * Esto mira dónde está de verdad lo que hay —las fichas y sus recorridos
 * enteros, no sólo dónde empiezan— y acerca hasta que eso llene el lienzo,
 * con unos metros de aire para que nada quede pegado al borde.
 *
 * Se calcula en coordenadas del lienzo y no en metros porque la cámara puede
 * estar girada e inclinada: en perspectiva, un rectángulo sobre el campo no
 * es un rectángulo en la pantalla, y lo que tiene que caber es lo que se ve.
 */
export function encuadraJugada(scene: Scene): View {
  const spec = PITCHES[scene.pitch];
  const proy = proyeccion(spec, camaraDe(scene), 3);
  const { caja } = proy;

  /* Todos los puntos por los que pasa algo: cada fotograma de cada pista y,
     en los tramos dibujados a mano, también los puntos de en medio. */
  const metros: Point[] = [];
  for (const obj of scene.objects) {
    for (const k of scene.tracks[obj.id] ?? []) {
      metros.push({ x: k.x, y: k.y });
      for (const p of k.path ?? []) metros.push(p);
      if (k.cx !== undefined && k.cy !== undefined) metros.push({ x: k.cx, y: k.cy });
    }
  }
  /* Un campo vacío no se encuadra: no hay nada que mirar. */
  if (metros.length === 0) return VIEW_INICIAL;

  /* El aire se añade en metros, alrededor de cada punto, y se proyecta con
     ellos: así sigue siendo aire aunque el campo esté en perspectiva. */
  const puntos = metros.flatMap(({ x, y }) => [
    proy.proyecta(x - AIRE, y - AIRE), proy.proyecta(x + AIRE, y - AIRE),
    proy.proyecta(x - AIRE, y + AIRE), proy.proyecta(x + AIRE, y + AIRE),
  ]);

  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const ancho = Math.max(...xs) - Math.min(...xs);
  const alto = Math.max(...ys) - Math.min(...ys);
  if (ancho <= 0 || alto <= 0) return VIEW_INICIAL;

  /* Nunca se aleja por debajo de 1: el campo entero ya es el mínimo útil. Si
     la jugada ocupa el campo entero, esto no hace nada, que es lo correcto. */
  const s = Math.min(ZOOM_MAX, Math.max(1, Math.min(caja.ancho / ancho, caja.alto / alto)));

  /* El centro de la jugada tiene que caer en el centro del lienzo. Deshaciendo
     la transformación del mundo —escala respecto al centro y luego desplazar—
     el desplazamiento sale directo. */
  const cx = caja.x + caja.ancho / 2;
  const cy = caja.y + caja.alto / 2;
  const bx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const by = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { s, tx: (cx - bx) * s, ty: (cy - by) * s };
}

