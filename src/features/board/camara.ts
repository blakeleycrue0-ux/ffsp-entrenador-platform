/**
 * La cámara: desde dónde se mira el campo.
 * ---------------------------------------------------------------------------
 * Hasta ahora sólo había dos vistas, horizontal y vertical, y las dos eran
 * planas: el campo visto desde justo encima. Eso sirve para colocar, pero no
 * se parece a lo que ve una entrenadora desde la banda, y hay jugadas —una
 * salida de portería, un saque de esquina— que sólo se entienden mirándolas
 * desde donde ocurren.
 *
 * Aquí el campo está en el suelo de un espacio de tres dimensiones y la cámara
 * lo orbita: **gira** alrededor del centro y se **inclina** desde el cenit
 * hasta casi el césped. Con eso salen todas las vistas, incluidas las dos de
 * antes, que no son más que inclinación cero.
 *
 * LAS CUENTAS, porque conviene poder comprobarlas.
 *
 * El campo se centra: `a = x − largo/2`, `b = y − ancho/2`. Se gira un ángulo
 * ψ sobre el centro:
 *
 *     u = a·cos ψ − b·sen ψ        (hacia la derecha de la pantalla)
 *     w = a·sen ψ + b·cos ψ        (hacia abajo; lo lejano es w negativo)
 *
 * La cámara se coloca a distancia D del centro, inclinada θ respecto de la
 * vertical, mirando al centro. Para un punto (u, w, z) —z es la altura sobre
 * el césped, en metros— la profundidad y la posición en pantalla son:
 *
 *     zc = D − w·sen θ − z·cos θ
 *     sx = D·u / zc
 *     sy = D·(w·cos θ − z·sen θ) / zc
 *
 * La distancia focal se fija igual a D a propósito: así, con θ = 0 y ψ = 0,
 * queda `zc = D`, `sx = u`, `sy = w`, es decir **exactamente** el dibujo plano
 * de siempre. Ninguna jugada guardada se mueve un milímetro al pasar por aquí.
 *
 * Consecuencias que se usan en el resto del dibujo:
 *
 *  · Las rectas siguen siendo rectas (es una transformación proyectiva), así
 *    que para un rectángulo bastan sus cuatro esquinas. Las circunferencias
 *    NO: se convierten en elipses y hay que trocearlas.
 *  · `escala(x, y)` dice cuánto encoge lo que hay en ese punto. Las fichas se
 *    dibujan derechas y a esa escala, no deformadas: un dorsal torcido no se
 *    lee, y lo que importa es seguir a la jugadora.
 *  · `desproyecta` deshace la cuenta, y por eso se puede seguir arrastrando y
 *    dibujando con el dedo con cualquier inclinación.
 */

import type { Point } from './scene';
import type { PitchSpec } from './scene';

export interface Camara {
  /** Giro sobre el centro, en grados. 0 deja el campo apaisado. */
  giro: number;
  /** Inclinación respecto de la vertical, en grados. 0 es a vista de pájaro. */
  inclinacion: number;
}

/** Más de esto y el fondo del campo se va al infinito: deja de ser legible. */
export const INCLINACION_MAXIMA = 62;

/**
 * Lo más alto que se dibuja sobre el césped, en metros: el larguero de una
 * portería reglamentaria, con un palmo de sobra. Entra en el encuadre para que
 * con la cámara inclinada no quede la portería del fondo cortada por arriba.
 */
const ALTO_MAXIMO = 2.7;

export const CAMARA_PLANA: Camara = { giro: 0, inclinacion: 0 };

/**
 * Lo lejos que se pone la cámara, en múltiplos del radio del campo.
 *
 * Es el único número con criterio aquí. Más bajo exagera la perspectiva y el
 * fondo se hace diminuto; más alto la aplana hasta que no se nota. Medido
 * sobre un campo de 105×68 con la inclinación al máximo: con 1,6 la portería
 * del fondo queda al 38 % del tamaño de la cercana —una caricatura—, y con 4
 * se queda en el 81 %, que no merece la pena. Con 2,6 queda en el 68 %: se ve
 * profundidad y el fondo sigue siendo utilizable.
 */
const LEJANIA = 2.6;

const rad = (g: number) => (g * Math.PI) / 180;

export const normalizaCamara = (c: Camara): Camara => ({
  giro: ((c.giro % 360) + 360) % 360,
  inclinacion: Math.min(INCLINACION_MAXIMA, Math.max(0, c.inclinacion)),
});

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface Proyeccion {
  /** De metros sobre el campo a unidades del lienzo. `z` es altura en metros. */
  proyecta(x: number, y: number, z?: number): Point;
  /** De unidades del lienzo a metros sobre el césped (z = 0). */
  desproyecta(sx: number, sy: number): Point;
  /** Cuánto encoge lo que esté en ese punto del césped. 1 es el tamaño natural. */
  escala(x: number, y: number): number;
  /** El rectángulo que ocupa todo lo dibujable, ya con su margen. */
  caja: Caja;
  /** Sin inclinación ni giro: se pueden usar rectángulos y círculos tal cual. */
  plana: boolean;
  /** Sin inclinación, aunque esté girada: nada encoge con la distancia. */
  sinProfundidad: boolean;
  camara: Camara;

  /**
   * Cuánto se achata lo que está tumbado en el césped: `cos θ`. Un círculo de
   * un metro pintado en la hierba se ve como una elipse de un metro de ancho
   * y `aplanado` metros de alto.
   */
  aplanado: number;
  /**
   * Cuánto sube en pantalla cada metro de altura: `sen θ`. A vista de pájaro
   * es cero —lo alto no sobresale por ningún lado— y con la cámara tumbada se
   * acerca a uno.
   */
  alzado: number;
  /**
   * Lo que hay que girar en pantalla algo que está alineado con el campo.
   * Un punto del césped en el ángulo φ se dibuja en el ángulo φ + `vuelta`.
   */
  vuelta: number;
}

/**
 * Prepara la proyección de un campo con una cámara.
 *
 * El margen se mide en metros y entra en la caja: las porterías sobresalen del
 * terreno de juego y, si no se cuenta con ellas, quedan cortadas.
 */
export function proyeccion(spec: PitchSpec, camara: Camara, margen = 3): Proyeccion {
  const cam = normalizaCamara(camara);
  const psi = rad(cam.giro);
  const th = rad(cam.inclinacion);
  const cosP = Math.cos(psi);
  const senP = Math.sin(psi);
  const cosT = Math.cos(th);
  const senT = Math.sin(th);

  const L = spec.length;
  const W = spec.width;
  const mx = L / 2;
  const my = W / 2;

  /* La cámara se aleja en proporción al campo, para que un campo de fútbol 7 y
     uno de once se vean con la misma perspectiva y no con la misma distancia. */
  const radio = Math.hypot(L / 2 + margen, W / 2 + margen);
  const D = LEJANIA * radio;

  const aMundo = (x: number, y: number) => {
    const a = x - mx;
    const b = y - my;
    return { u: a * cosP - b * senP, w: a * senP + b * cosP };
  };

  /* El centro se devuelve al final. Es lo que hace que, sin giro y sin
     inclinación, `proyecta` sea la identidad EXACTA y no «casi»: así una
     jugada guardada se abre en el mismo sitio hasta el último decimal. */
  const esPlana = cam.inclinacion === 0 && cam.giro === 0;

  const proyecta = (x: number, y: number, z = 0): Point => {
    /* La vista de siempre no pasa por ninguna cuenta. No es por velocidad: es
       que restar el centro y volvérselo a sumar NO es exacto en coma flotante
       —(68/12 − 34) + 34 no vuelve al mismo número—, y bastaba ese error del
       decimal quince para que una jugada guardada no abriera idéntica. */
    if (esPlana && z === 0) return { x, y };

    const { u, w } = aMundo(x, y);
    /* Sin inclinación, la división sería por D exacto y sobra. Lo que tiene
       altura sí pasa por la cuenta: visto desde arriba, lo alto está más
       cerca del objetivo y se abre hacia afuera. */
    if (senT === 0 && z === 0) return { x: u + mx, y: w + my };
    const zc = D - w * senT - z * cosT;
    /* No puede pasar con la inclinación acotada, pero si pasara, dividir por
       cero mandaría la ficha al infinito y se llevaría el dibujo por delante. */
    if (zc <= 0.001) return { x: u * 1e4 + mx, y: (w * cosT - z * senT) * 1e4 + my };
    return { x: (D * u) / zc + mx, y: (D * (w * cosT - z * senT)) / zc + my };
  };

  const desproyecta = (sxAbs: number, syAbs: number): Point => {
    const sx = sxAbs - mx;
    const sy = syAbs - my;
    /* Despejando w de sy = D·w·cos θ / (D − w·sen θ):
         w = sy·D / (D·cos θ + sy·sen θ) */
    const den = D * cosT + sy * senT;
    const w = Math.abs(den) < 1e-6 ? 0 : (sy * D) / den;
    const zc = D - w * senT;
    const u = (sx * zc) / D;
    /* Y se deshace el giro. */
    const a = u * cosP + w * senP;
    const b = -u * senP + w * cosP;
    return { x: a + mx, y: b + my };
  };

  const escala = (x: number, y: number): number => {
    const { w } = aMundo(x, y);
    const zc = D - w * senT;
    return zc <= 0.001 ? 1e4 : D / zc;
  };

  /* La caja sale de las cuatro esquinas del campo con su margen. Las rectas
     siguen siendo rectas, así que del césped no hace falta mirar nada más.
     PERO el césped no es lo único que se dibuja: el larguero de una portería
     está a dos metros y medio del suelo y, con la cámara inclinada, sube en
     pantalla por encima de la línea de fondo. Sin contar con eso, la portería
     del fondo sale cortada —se vio—. En plano no hace falta: nada sobresale
     hacia arriba, y así el encuadre de siempre sigue siendo el de siempre. */
  const alturas = senT > 0 ? [0, ALTO_MAXIMO] : [0];
  const esquinas = alturas.flatMap((z) =>
    [
      [-margen, -margen],
      [L + margen, -margen],
      [L + margen, W + margen],
      [-margen, W + margen],
    ].map(([x, y]) => proyecta(x, y, z)),
  );

  const xs = esquinas.map((p) => p.x);
  const ys = esquinas.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  return {
    proyecta,
    desproyecta,
    escala,
    caja: { x: x0, y: y0, ancho: x1 - x0, alto: y1 - y0 },
    plana: esPlana,
    sinProfundidad: cam.inclinacion === 0,
    camara: cam,
    aplanado: cosT,
    alzado: senT,
    vuelta: cam.giro,
  };
}

/* ─────────────────────────────── Utilidades ──────────────────────────────── */

/** Una polilínea proyectada, lista para un atributo `points` o `d`. */
export function proyectaPuntos(p: Proyeccion, puntos: Point[], z = 0): Point[] {
  return puntos.map((q) => p.proyecta(q.x, q.y, z));
}

/**
 * Una circunferencia del campo, troceada. Bajo perspectiva deja de ser un
 * círculo, así que se dibuja como polilínea cerrada; con 64 lados no se
 * distingue de una curva ni con el campo ampliado cuatro veces.
 */
export function circuloProyectado(
  p: Proyeccion,
  cx: number,
  cy: number,
  r: number,
  lados = 64,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < lados; i += 1) {
    const a = (i / lados) * Math.PI * 2;
    out.push(p.proyecta(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return out;
}

/** Un arco, de `desde` a `hasta` en radianes. */
export function arcoProyectado(
  p: Proyeccion,
  cx: number,
  cy: number,
  r: number,
  desde: number,
  hasta: number,
  lados = 32,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= lados; i += 1) {
    const a = desde + ((hasta - desde) * i) / lados;
    out.push(p.proyecta(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return out;
}

/** Los cuatro vértices de un rectángulo del campo, proyectados. */
export function rectProyectado(
  p: Proyeccion,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  z = 0,
): Point[] {
  return [
    p.proyecta(x, y, z),
    p.proyecta(x + ancho, y, z),
    p.proyecta(x + ancho, y + alto, z),
    p.proyecta(x, y + alto, z),
  ];
}

export const aPuntos = (ps: Point[]): string =>
  ps.map((q) => `${q.x.toFixed(3)},${q.y.toFixed(3)}`).join(' ');

export const aRuta = (ps: Point[], cerrada = false): string =>
  ps.length === 0
    ? ''
    : `M ${ps.map((q) => `${q.x.toFixed(3)} ${q.y.toFixed(3)}`).join(' L ')}${cerrada ? ' Z' : ''}`;

/* ─────────────────────────────── Vistas ──────────────────────────────────── */

/**
 * Las vistas con nombre. No son modos aparte: cada una es una pareja de giro e
 * inclinación, así que se puede partir de una y seguir moviéndola a mano.
 */
export interface Vista {
  id: string;
  label: string;
  /** Una frase para saber cuándo sirve, que «Banda» a secas no dice nada. */
  pista: string;
  camara: Camara;
}

export const VISTAS: Vista[] = [
  {
    id: 'cenital',
    label: 'Cenital',
    pista: 'Desde arriba, apaisado. Lo mejor para colocar.',
    camara: { giro: 0, inclinacion: 0 },
  },
  {
    id: 'vertical',
    label: 'Vertical',
    pista: 'Desde arriba, de pie. Llena la pantalla del móvil.',
    camara: { giro: 90, inclinacion: 0 },
  },
  {
    id: 'banda',
    label: 'Banda',
    pista: 'Como se ve de pie junto al terreno de juego.',
    camara: { giro: 0, inclinacion: 46 },
  },
  {
    id: 'porteria',
    label: 'Tras portería',
    pista: 'Desde detrás del fondo: el mejor ángulo para la profundidad.',
    camara: { giro: 90, inclinacion: 50 },
  },
  {
    id: 'esquina',
    label: 'Esquina',
    pista: 'En diagonal, como una cámara de televisión.',
    camara: { giro: 34, inclinacion: 40 },
  },
];

/** Qué vista corresponde a una cámara, si es alguna exactamente. */
export function vistaDe(c: Camara): string | null {
  const n = normalizaCamara(c);
  return VISTAS.find((v) => v.camara.giro === n.giro && v.camara.inclinacion === n.inclinacion)?.id ?? null;
}

/**
 * La cámara de una jugada.
 *
 * Las jugadas guardadas antes de que esto existiera sólo tienen `vertical`, y
 * tienen que seguir viéndose igual: sin inclinación y, si estaban de pie,
 * giradas un cuarto de vuelta.
 */
export function camaraDe(scene: { camara?: Camara; vertical?: boolean }): Camara {
  if (scene.camara) return normalizaCamara(scene.camara);
  return { giro: scene.vertical ? 90 : 0, inclinacion: 0 };
}
