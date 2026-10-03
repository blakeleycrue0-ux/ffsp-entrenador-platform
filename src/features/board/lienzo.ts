/**
 * La jugada dibujada sobre un lienzo (canvas).
 * ---------------------------------------------------------------------------
 * POR QUÉ NO SE REAPROVECHA EL SVG. Para una imagen fija sí se hace —serializar
 * el SVG y pasarlo a mapa de bits es exacto y cuesta una vez—. Para un vídeo
 * habría que serializar y decodificar el SVG entero TREINTA VECES POR SEGUNDO,
 * y ahí no llega: la grabación va en tiempo real, así que cada fotograma que
 * tarda de más es un fotograma que se pierde y un vídeo que sale a tirones.
 *
 * Dibujar sobre el lienzo son unas decenas de trazos y se hace en menos de un
 * milisegundo. El precio es que este dibujo y el de la pantalla son dos, y hay
 * que mantenerlos parecidos.
 *
 * CÓMO SE EVITA QUE SE SEPAREN. Lo que de verdad se escapaba no eran los
 * colores sino la GEOMETRÍA: cada archivo tenía su manera de colocar el campo.
 * Ahora los dos pasan por la misma cámara (`camara.ts`) y por los mismos
 * colores (`piezas.tsx`), así que lo único que se repite es el trazo —y cada
 * figura está puesta al lado de la que copia—. Si el vídeo saliera distinto de
 * la pantalla, sería por un trazo, no por estar mirando el campo desde otro
 * sitio.
 */

import {
  PITCHES, sampleScene, trackSegments, type BoardObject, type Drawing, type ObjectKind,
  type Point, type Scene, type Surface,
} from './scene';
import {
  arcoProyectado, camaraDe, circuloProyectado, proyeccion, type Proyeccion,
} from './camara';
import { FILL as RELLENO, TEXT as TEXTO } from './piezas';

const CESPED: Record<
  Surface,
  { hierba: string; lejos: string; linea: string; poste: string; red: string; sombra: string; franjas: boolean }
> = {
  cesped: {
    hierba: '#20573C',
    lejos: '#1A4731',
    linea: 'rgba(255,255,255,0.72)',
    poste: '#F2F5F8',
    red: 'rgba(255,255,255,0.50)',
    sombra: 'rgba(8,18,14,0.22)',
    franjas: true,
  },
  impresion: {
    hierba: '#FFFFFF',
    lejos: '#FFFFFF',
    linea: 'rgba(16,28,45,0.55)',
    poste: '#3C475A',
    red: 'rgba(16,28,45,0.22)',
    sombra: 'rgba(16,28,45,0.10)',
    franjas: false,
  },
};

const SOMBRA_FICHA = 'rgba(8,16,12,0.34)';

const ESTELA = (kind: ObjectKind) =>
  kind === 'balon' ? '#FFFFFF' : kind === 'rival' ? '#F0C3BE' : '#9FD9BB';

const MARGEN = 3;

export interface Ajustes {
  /** Pintar el recorrido de cada ficha. */
  trayectorias: boolean;
  /** Pintar el dorsal dentro de la ficha. */
  dorsales: boolean;
  /** Pintar el nombre debajo de la ficha. */
  nombres: boolean;
  /** Una marca discreta en la esquina. */
  marca: boolean;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  trayectorias: true,
  dorsales: true,
  nombres: false,
  marca: true,
};

const proyDe = (scene: Scene) => proyeccion(PITCHES[scene.pitch], camaraDe(scene), MARGEN);

export function medidas(scene: Scene, alto: number): { ancho: number; alto: number } {
  const { caja } = proyDe(scene);
  /* Par, porque algunos codificadores de vídeo rechazan un lado impar. */
  const ancho = Math.round((alto * caja.ancho) / caja.alto / 2) * 2;
  return { ancho, alto: Math.round(alto / 2) * 2 };
}

/**
 * Pinta la escena en el instante `t` (ms). No guarda estado: cada llamada
 * dibuja el fotograma entero, que es lo que hace que grabar sea sólo
 * llamarla una y otra vez.
 */
export function pintaEscena(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  t: number,
  ancho: number,
  alto: number,
  a: Ajustes = AJUSTES_POR_DEFECTO,
): void {
  const proy = proyDe(scene);
  const { caja } = proy;
  const escala = Math.min(ancho / caja.ancho, alto / caja.alto);

  ctx.save();
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, ancho, alto);

  // Centrado, y en unidades del lienzo —ya proyectadas— a partir de aquí.
  ctx.translate((ancho - caja.ancho * escala) / 2, (alto - caja.alto * escala) / 2);
  ctx.scale(escala, escala);
  ctx.translate(-caja.x, -caja.y);

  pintaCampo(ctx, scene, proy);
  for (const d of scene.drawings ?? []) pintaDibujo(ctx, d, proy);
  if (a.trayectorias) pintaTrayectorias(ctx, scene, proy);

  const posiciones = sampleScene(scene, t);
  /* De atrás hacia delante, igual que en pantalla: con la cámara inclinada,
     quien está más cerca tapa a quien está más lejos. */
  const orden = scene.objects
    .filter((o) => posiciones[o.id])
    .map((o) => ({ o, q: proy.proyecta(posiciones[o.id].x, posiciones[o.id].y) }))
    .sort((p, q) => p.q.y - q.q.y);

  for (const { o, q } of orden) {
    const p = posiciones[o.id];
    const k = proy.escala(p.x, p.y);
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.scale(k, k);
    pintaObjeto(ctx, o, a, proy);
    ctx.restore();
  }

  ctx.restore();

  if (a.marca) pintaMarca(ctx, ancho, alto);
}

/* ──────────────────────────────── Ayudas ─────────────────────────────────── */

/** Un camino cerrado a partir de puntos ya proyectados. */
function camino(ctx: CanvasRenderingContext2D, ps: Point[], cerrar = true) {
  if (ps.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(ps[0].x, ps[0].y);
  for (const p of ps.slice(1)) ctx.lineTo(p.x, p.y);
  if (cerrar) ctx.closePath();
}

const rectProy = (proy: Proyeccion, x: number, y: number, w: number, h: number, z = 0): Point[] => [
  proy.proyecta(x, y, z),
  proy.proyecta(x + w, y, z),
  proy.proyecta(x + w, y + h, z),
  proy.proyecta(x, y + h, z),
];

/* ──────────────────────────────── El campo ───────────────────────────────── */

function pintaCampo(ctx: CanvasRenderingContext2D, scene: Scene, proy: Proyeccion) {
  const spec = PITCHES[scene.pitch];
  const { length: L, width: W, boxLength: bl, boxWidth: bw, smallBoxLength: sl, smallBoxWidth: sw } = spec;
  const cy = W / 2;
  const s = 0.22;
  const paleta = CESPED[scene.surface ?? 'cesped'];
  const { hierba, linea, franjas } = paleta;

  const rellena = (ps: Point[], color: string, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    camino(ctx, ps);
    ctx.fill();
    ctx.restore();
  };
  const traza = (ps: Point[], cerrar = true) => {
    camino(ctx, ps, cerrar);
    ctx.stroke();
  };

  rellena(rectProy(proy, 0, 0, L, W), hierba);

  if (spec.blank) {
    ctx.strokeStyle = linea;
    ctx.lineWidth = s;
    traza(rectProy(proy, s / 2, s / 2, L - s, W - s));
    return;
  }

  if (franjas) {
    for (let i = 0; i < 8; i += 2) {
      rellena(rectProy(proy, (L / 8) * i, 0, L / 8, W), '#FFFFFF', 0.028);
    }
  }

  /* El fondo se oscurece con la distancia, igual que en pantalla: sin esa
     diferencia la profundidad no se lee. Sólo si hay inclinación. */
  if (!proy.sinProfundidad && (scene.surface ?? 'cesped') === 'cesped') {
    const a = proy.proyecta(L / 2, 0);
    const b = proy.proyecta(L / 2, W);
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, 'rgba(26,71,49,0.85)');
    grad.addColorStop(0.55, 'rgba(26,71,49,0.18)');
    grad.addColorStop(1, 'rgba(26,71,49,0)');
    ctx.save();
    ctx.fillStyle = grad;
    camino(ctx, rectProy(proy, 0, 0, L, W));
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = linea;
  ctx.fillStyle = linea;
  ctx.lineWidth = s;

  traza(rectProy(proy, s / 2, s / 2, L - s, W - s));

  if (spec.half) {
    traza([proy.proyecta(L, 0), proy.proyecta(L, W)], false);
    traza(arcoProyectado(proy, L, cy, spec.circleR, Math.PI / 2, (3 * Math.PI) / 2), false);
  } else {
    traza([proy.proyecta(L / 2, 0), proy.proyecta(L / 2, W)], false);
    traza(circuloProyectado(proy, L / 2, cy, spec.circleR));
    rellena(circuloProyectado(proy, L / 2, cy, 0.35, 16), linea);
  }

  /** El arco del área: el trozo del círculo que asoma fuera. */
  const arcoArea = (lado: 'izq' | 'der') => {
    const px = lado === 'izq' ? 11 : L - 11;
    const r = spec.circleR;
    const dx = bl - 11;
    if (Math.abs(dx) >= r) return;
    const ang = Math.acos(dx / r);
    traza(
      lado === 'izq'
        ? arcoProyectado(proy, px, cy, r, -ang, ang)
        : arcoProyectado(proy, px, cy, r, Math.PI - ang, Math.PI + ang),
      false,
    );
  };
  const corner = (x: number, y: number, desde: number) =>
    traza(arcoProyectado(proy, x, y, 1, desde, desde + Math.PI / 2, 12), false);

  traza(rectProy(proy, 0, cy - bw / 2, bl, bw));
  traza(rectProy(proy, 0, cy - sw / 2, sl, sw));
  arcoArea('izq');
  rellena(circuloProyectado(proy, 11, cy, 0.3, 16), linea);

  if (!spec.half) {
    traza(rectProy(proy, L - bl, cy - bw / 2, bl, bw));
    traza(rectProy(proy, L - sl, cy - sw / 2, sl, sw));
    arcoArea('der');
    rellena(circuloProyectado(proy, L - 11, cy, 0.3, 16), linea);
  }

  corner(0, 0, 0);
  corner(0, W, -Math.PI / 2);
  if (!spec.half) {
    corner(L, 0, Math.PI / 2);
    corner(L, W, Math.PI);
  }

  pintaPorteria(ctx, proy, 0, cy, spec.goalWidth, -1, paleta);
  if (!spec.half) pintaPorteria(ctx, proy, L, cy, spec.goalWidth, 1, paleta);
}

/** La misma portería que en `Pitch.tsx`: postes, larguero y red con caída. */
function pintaPorteria(
  ctx: CanvasRenderingContext2D,
  proy: Proyeccion,
  x: number,
  cy: number,
  ancho: number,
  hacia: -1 | 1,
  paleta: (typeof CESPED)[Surface],
) {
  if (ancho <= 0) return;
  const alto = ancho >= 7 ? 2.44 : 2;
  const fondo = ancho >= 7 ? 1.9 : 1.4;
  const techo = fondo * 0.45;
  const y0 = cy - ancho / 2;
  const y1 = cy + ancho / 2;
  const xT = x + hacia * techo;
  const xF = x + hacia * fondo;
  const P = (px: number, py: number, pz: number) => proy.proyecta(px, py, pz);

  ctx.save();

  ctx.fillStyle = paleta.sombra;
  camino(ctx, [P(x, y0, 0), P(xF, y0, 0), P(xF, y1, 0), P(x, y1, 0)]);
  ctx.fill();

  ctx.fillStyle = paleta.red;
  ctx.globalAlpha = 0.22;
  for (const pano of [
    [P(x, y0, alto), P(xT, y0, alto), P(xT, y1, alto), P(x, y1, alto)],
    [P(xT, y0, alto), P(xF, y0, 0), P(xF, y1, 0), P(xT, y1, alto)],
    [P(x, y0, 0), P(x, y0, alto), P(xT, y0, alto), P(xF, y0, 0)],
    [P(x, y1, 0), P(x, y1, alto), P(xT, y1, alto), P(xF, y1, 0)],
  ]) {
    camino(ctx, pano);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = paleta.red;
  ctx.lineWidth = 0.05;
  const nAncho = Math.max(6, Math.round(ancho * 1.4));
  for (let i = 1; i < nAncho; i += 1) {
    const y = y0 + ((y1 - y0) * i) / nAncho;
    camino(ctx, [P(x, y, alto), P(xT, y, alto), P(xF, y, 0)], false);
    ctx.stroke();
  }
  for (let i = 1; i <= 4; i += 1) {
    const u = i / 5;
    const [px, pz] =
      u < 0.4
        ? [x + hacia * techo * (u / 0.4), alto]
        : [xT + hacia * (fondo - techo) * ((u - 0.4) / 0.6), alto * (1 - (u - 0.4) / 0.6)];
    camino(ctx, [P(px, y0, pz), P(px, y1, pz)], false);
    ctx.stroke();
  }

  ctx.strokeStyle = paleta.poste;
  ctx.lineWidth = ancho >= 7 ? 0.2 : 0.16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  camino(ctx, [P(x, y0, 0), P(x, y0, alto), P(x, y1, alto), P(x, y1, 0)], false);
  ctx.stroke();

  ctx.restore();
}

/* ─────────────────────────────── Anotaciones ─────────────────────────────── */

function pintaDibujo(ctx: CanvasRenderingContext2D, d: Drawing, proy: Proyeccion) {
  const [a, b, c] = d.points;
  if (!a) return;
  const P = (p: Point) => proy.proyecta(p.x, p.y);
  ctx.save();
  ctx.strokeStyle = d.color;
  ctx.fillStyle = d.color;
  ctx.lineWidth = d.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (d.kind === 'zona') {
    const fin = b ?? a;
    const x0 = Math.min(a.x, fin.x);
    const y0 = Math.min(a.y, fin.y);
    const w = Math.abs(fin.x - a.x);
    const h = Math.abs(fin.y - a.y);
    const borde =
      d.shape === 'circulo'
        ? Array.from({ length: 48 }, (_, i) => {
            const u = (i / 48) * Math.PI * 2;
            return P({ x: x0 + w / 2 + (w / 2) * Math.cos(u), y: y0 + h / 2 + (h / 2) * Math.sin(u) });
          })
        : rectProy(proy, x0, y0, w, h);
    ctx.globalAlpha = 0.16;
    camino(ctx, borde);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (d.kind === 'discontinua') ctx.setLineDash([d.width * 3, d.width * 2.2]);

  if (d.kind === 'curva' && b && c) {
    /* Bajo perspectiva una curva deja de ser una Bézier, así que se trocea
       y se dibuja como polilínea: con veinticuatro tramos no se nota. */
    const puntos = Array.from({ length: 25 }, (_, i) => {
      const u = i / 24;
      const m = 1 - u;
      return P({
        x: m * m * a.x + 2 * m * u * b.x + u * u * c.x,
        y: m * m * a.y + 2 * m * u * b.y + u * u * c.y,
      });
    });
    camino(ctx, puntos, false);
    ctx.stroke();
    punta(ctx, puntos[puntos.length - 2], puntos[puntos.length - 1], d.width);
  } else if (b) {
    const pa = P(a);
    const pb = P(b);
    camino(ctx, [pa, pb], false);
    ctx.stroke();
    if (d.kind === 'flecha') punta(ctx, pa, pb, d.width);
  }

  ctx.restore();
}

/** La punta de flecha, a escala del grosor del trazo. */
function punta(ctx: CanvasRenderingContext2D, desde: Point, hasta: Point, grosor: number) {
  const ang = Math.atan2(hasta.y - desde.y, hasta.x - desde.x);
  const l = grosor * 3.2;
  ctx.save();
  ctx.translate(hasta.x, hasta.y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-l, l * 0.52);
  ctx.lineTo(-l, -l * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function pintaTrayectorias(ctx: CanvasRenderingContext2D, scene: Scene, proy: Proyeccion) {
  ctx.save();
  ctx.lineWidth = 0.36;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.6;

  for (const obj of scene.objects) {
    const tramos = trackSegments(scene.tracks[obj.id] ?? []);
    if (tramos.length === 0) continue;
    ctx.strokeStyle = ESTELA(obj.kind);
    ctx.fillStyle = ESTELA(obj.kind);
    for (const tramo of tramos) {
      if (tramo.points.length < 2) continue;
      const ps = tramo.points.map((p) => proy.proyecta(p.x, p.y));
      camino(ctx, ps, false);
      ctx.stroke();
      punta(ctx, ps[ps.length - 2], ps[ps.length - 1], 0.36);
    }
  }
  ctx.restore();
}

/* ──────────────────────────────── Las fichas ─────────────────────────────── */

/** Oscurece un color. El mismo que usa el dibujo de pantalla. */
function oscuro(hex: string, k = 0.62): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Cada ficha, en coordenadas propias y con la cámara ya aplicada por quien
 * llama. Las medidas y los criterios son los de `piezas.tsx`: lo tumbado se
 * achata por `aplanado`, lo alto sube por `alzado` y lo alineado con el campo
 * gira con la cámara.
 */
function pintaObjeto(ctx: CanvasRenderingContext2D, obj: BoardObject, a: Ajustes, proy: Proyeccion) {
  const color = obj.color || RELLENO[obj.kind];
  const ap = proy.aplanado;
  const al = proy.alzado;
  const vuelta = (((obj.rot ?? 0) + proy.vuelta) * Math.PI) / 180;

  const sombra = (rx: number, opacidad = 1) => {
    if (al < 0.05) return;
    ctx.save();
    ctx.globalAlpha = opacidad * Math.min(0.55, al * 0.7);
    ctx.fillStyle = SOMBRA_FICHA;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, rx * ap, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  if (obj.kind === 'zona') {
    const w = obj.w ?? 14;
    const h = obj.h ?? 10;
    ctx.save();
    ctx.scale(1, ap);
    ctx.rotate(vuelta);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.28;
    ctx.setLineDash([1.2, 0.8]);
    ctx.globalAlpha = 0.16;
    if (obj.shape === 'circulo') {
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
    // El rótulo no se achata: un texto aplastado no se lee.
    if (obj.label) rotulo(ctx, obj.label, 1.8, color, 0);
    return;
  }

  if (obj.kind === 'balon') {
    const r = 0.95;
    sombra(r * 0.78, 0.75);
    ctx.save();
    ctx.translate(0, -r * al);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 0.18;
    ctx.strokeStyle = '#101C2D';
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const u = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = 0.36 * Math.cos(u);
      const py = 0.36 * Math.sin(u);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#101C2D';
    ctx.fill();
    ctx.restore();
    return;
  }

  if (obj.kind === 'cono') {
    const rb = 0.8;
    const h = 2.4;
    const cima = -h * al;
    const sombraColor = oscuro(color);

    if (al <= 0.04) {
      ctx.beginPath();
      ctx.arc(0, 0, rb, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 0.08;
      ctx.strokeStyle = sombraColor;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, rb * 0.42, 0, Math.PI * 2);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = sombraColor;
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    sombra(rb, 0.8);
    ctx.beginPath();
    ctx.moveTo(-rb, 0);
    ctx.lineTo(0, cima);
    ctx.lineTo(rb, 0);
    ctx.ellipse(0, 0, rb, rb * ap, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 0.07;
    ctx.strokeStyle = sombraColor;
    ctx.stroke();

    // El lado de sombra, para que tenga volumen.
    ctx.beginPath();
    ctx.moveTo(0, cima);
    ctx.lineTo(rb, 0);
    ctx.ellipse(0, 0, rb, rb * ap, 0, 0, Math.PI / 2);
    ctx.closePath();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = sombraColor;
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  if (obj.kind === 'pica') {
    const largo = 3.6;
    const grueso = 0.34;
    ctx.save();
    ctx.scale(1, ap);
    ctx.rotate(vuelta);
    if (al > 0.05) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = SOMBRA_FICHA;
      barra(ctx, grueso * 0.5, largo, grueso);
      ctx.restore();
    }
    ctx.fillStyle = color;
    barra(ctx, 0, largo, grueso);
    ctx.fillStyle = oscuro(color, 0.78);
    for (const y of [-largo / 2, largo / 2]) {
      ctx.beginPath();
      ctx.arc(0, y, grueso * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (obj.kind === 'porteria' || obj.kind === 'miniporteria') {
    const esGrande = obj.kind === 'porteria';
    const fondo = obj.w ?? (esGrande ? 1 : 0.7);
    const boca = obj.h ?? (esGrande ? 5 : 2);
    const alto = Math.min(esGrande ? 2.2 : 1.1, boca * 0.5);
    const c = Math.cos(vuelta);
    const s = Math.sin(vuelta);
    const S = (dx: number, dy: number) => ({ x: dx * c - dy * s, y: (dx * s + dy * c) * ap });
    const sube = (p: Point, z: number) => ({ x: p.x, y: p.y - z * al });

    const bocaIzq = S(-fondo / 2, -boca / 2);
    const bocaDer = S(-fondo / 2, boca / 2);
    const fondoIzq = S(fondo / 2, -boca / 2);
    const fondoDer = S(fondo / 2, boca / 2);
    const marcoIzq = sube(bocaIzq, alto);
    const marcoDer = sube(bocaDer, alto);
    const traseraIzq = sube(fondoIzq, alto * 0.45);
    const traseraDer = sube(fondoDer, alto * 0.45);

    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = SOMBRA_FICHA;
    camino(ctx, [bocaIzq, fondoIzq, fondoDer, bocaDer]);
    ctx.fill();

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#FFFFFF';
    for (const pano of [
      [marcoIzq, traseraIzq, traseraDer, marcoDer],
      [traseraIzq, fondoIzq, fondoDer, traseraDer],
      [bocaIzq, marcoIzq, traseraIzq, fondoIzq],
      [bocaDer, marcoDer, traseraDer, fondoDer],
    ]) {
      camino(ctx, pano);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth = 0.045;
    const n = Math.max(3, Math.round(boca * 1.6));
    const mezcla = (p: Point, q: Point, u: number) => ({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u });
    for (let i = 1; i < n; i += 1) {
      const u = i / n;
      camino(ctx, [mezcla(marcoIzq, marcoDer, u), mezcla(traseraIzq, traseraDer, u), mezcla(fondoIzq, fondoDer, u)], false);
      ctx.stroke();
    }
    camino(ctx, [traseraIzq, traseraDer], false);
    ctx.stroke();
    camino(ctx, [fondoIzq, fondoDer], false);
    ctx.stroke();

    ctx.strokeStyle = '#EEF2F6';
    ctx.lineWidth = esGrande ? 0.2 : 0.16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    camino(ctx, [bocaIzq, marcoIzq, marcoDer, bocaDer], false);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (obj.kind === 'nota') {
    rotulo(ctx, obj.label, 2.4, color === 'transparent' ? '#FFFFFF' : color, 0);
    return;
  }

  /* Jugadoras, rivales, porteras y comodines: el disco con el dorsal, de pie
     sobre su huella cuando la cámara se inclina. */
  const r = 1.75;
  const levanta = -1.15 * al;
  sombra(r * 0.82);
  if (al > 0.05) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.82, r * 0.82 * ap, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 0.26;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, levanta);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(0, levanta);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 0.22;
  ctx.strokeStyle = obj.kind === 'rival' ? '#101C2D' : '#FFFFFF';
  ctx.stroke();

  if (a.dorsales && obj.label) {
    rotulo(ctx, obj.label, 1.9, obj.color ? '#FFFFFF' : TEXTO[obj.kind], 0);
  }
  ctx.restore();

  if (a.nombres && obj.name) {
    /* Debajo de la ficha, con una sombra fina: sobre el verde claro del área
       un texto blanco sin contorno se pierde. */
    ctx.save();
    ctx.lineWidth = 0.22;
    ctx.strokeStyle = 'rgba(9,9,11,0.75)';
    ctx.font = `600 1.3px "Schibsted Grotesk", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeText(obj.name, 0, 3.1);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(obj.name, 0, 3.1);
    ctx.restore();
  }
}

/** Una barra con los extremos redondeados, centrada y vertical. */
function barra(ctx: CanvasRenderingContext2D, dx: number, largo: number, grueso: number) {
  const r = grueso / 2;
  ctx.beginPath();
  ctx.moveTo(dx - r, -largo / 2 + r);
  ctx.arc(dx, -largo / 2 + r, r, Math.PI, 0);
  ctx.lineTo(dx + r, largo / 2 - r);
  ctx.arc(dx, largo / 2 - r, r, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
}

function rotulo(ctx: CanvasRenderingContext2D, texto: string, tam: number, color: string, y: number) {
  ctx.save();
  ctx.font = `600 ${tam}px "Schibsted Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 0, y);
  ctx.restore();
}

/* La marca va en píxeles, fuera de la transformación del campo: así se ve
   igual de grande sea cual sea el tamaño del campo. */
function pintaMarca(ctx: CanvasRenderingContext2D, ancho: number, alto: number) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.font = `600 ${Math.round(alto * 0.022)}px "Schibsted Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Playoff360', ancho - alto * 0.022, alto - alto * 0.02);
  ctx.restore();
}
