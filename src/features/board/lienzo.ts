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
 * que mantenerlos parecidos; por eso los colores y las medidas salen de las
 * mismas constantes y cada figura está puesta al lado de la que copia.
 *
 * Todo en metros sobre el campo; la transformación del lienzo se ocupa de la
 * escala y del giro en vertical.
 */

import {
  PITCHES, sampleScene, trackSegments, type BoardObject, type Drawing, type ObjectKind,
  type Point, type Scene, type Surface,
} from './scene';

/* Los mismos colores que en pantalla. */
const RELLENO: Record<ObjectKind, string> = {
  jugadora: '#101C2D',
  rival: '#FFFFFF',
  portera: '#E2A33C',
  comodin: '#7FB2F0',
  balon: '#FFFFFF',
  cono: '#E2A33C',
  pica: '#E8695C',
  porteria: '#FFFFFF',
  miniporteria: '#FFFFFF',
  zona: '#3ECF8E',
  nota: 'transparent',
};

const TEXTO: Record<ObjectKind, string> = {
  jugadora: '#FFFFFF',
  rival: '#101C2D',
  portera: '#101C2D',
  comodin: '#101C2D',
  balon: '#101C2D',
  cono: '#101C2D',
  pica: '#FFFFFF',
  porteria: '#101C2D',
  miniporteria: '#101C2D',
  zona: '#3ECF8E',
  nota: '#FFFFFF',
};

const CESPED: Record<Surface, { hierba: string; linea: string; porteria: string; franjas: boolean }> = {
  cesped: { hierba: '#20573C', linea: 'rgba(255,255,255,0.72)', porteria: '#47556B', franjas: true },
  impresion: { hierba: '#FFFFFF', linea: 'rgba(16,28,45,0.55)', porteria: '#647184', franjas: false },
};

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
  trayectorias: true, dorsales: true, nombres: false, marca: true,
};

/** El tamaño del lienzo que le corresponde a una escena, para un alto dado. */
export function medidas(scene: Scene, alto: number): { ancho: number; alto: number } {
  const spec = PITCHES[scene.pitch];
  const vertical = scene.vertical === true;
  const w = (vertical ? spec.width : spec.length) + MARGEN * 2;
  const h = (vertical ? spec.length : spec.width) + MARGEN * 2;
  /* Par, porque algunos codificadores de vídeo rechazan un lado impar. */
  const ancho = Math.round((alto * w) / h / 2) * 2;
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
  const spec = PITCHES[scene.pitch];
  const vertical = scene.vertical === true;
  const cajaW = (vertical ? spec.width : spec.length) + MARGEN * 2;
  const cajaH = (vertical ? spec.length : spec.width) + MARGEN * 2;
  const escala = Math.min(ancho / cajaW, alto / cajaH);

  ctx.save();
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, ancho, alto);

  // Centrado, con el margen dentro, y en metros a partir de aquí.
  ctx.translate((ancho - cajaW * escala) / 2, (alto - cajaH * escala) / 2);
  ctx.scale(escala, escala);
  ctx.translate(MARGEN, MARGEN);
  if (vertical) {
    ctx.translate(spec.width, 0);
    ctx.rotate(Math.PI / 2);
  }

  pintaCampo(ctx, scene);
  for (const d of scene.drawings ?? []) pintaDibujo(ctx, d);
  if (a.trayectorias) pintaTrayectorias(ctx, scene);

  const posiciones = sampleScene(scene, t);
  for (const obj of scene.objects) {
    const p = posiciones[obj.id];
    if (!p) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    // En vertical se contragira para que los dorsales no salgan tumbados.
    if (vertical) ctx.rotate(-Math.PI / 2);
    pintaObjeto(ctx, obj, a);
    ctx.restore();
  }

  ctx.restore();

  if (a.marca) pintaMarca(ctx, ancho, alto);
}

/* ──────────────────────────────── El campo ───────────────────────────────── */

function pintaCampo(ctx: CanvasRenderingContext2D, scene: Scene) {
  const spec = PITCHES[scene.pitch];
  const { length: L, width: W, boxLength: bl, boxWidth: bw, smallBoxLength: sl, smallBoxWidth: sw } = spec;
  const cy = W / 2;
  const s = 0.22;
  const { hierba, linea, porteria, franjas } = CESPED[scene.surface ?? 'cesped'];

  ctx.fillStyle = hierba;
  ctx.fillRect(0, 0, L, W);

  if (spec.blank) {
    ctx.strokeStyle = linea;
    ctx.lineWidth = s;
    ctx.strokeRect(s / 2, s / 2, L - s, W - s);
    return;
  }

  if (franjas) {
    ctx.fillStyle = 'rgba(255,255,255,0.028)';
    for (let i = 0; i < 8; i += 2) ctx.fillRect((L / 8) * i, 0, L / 8, W);
  }

  ctx.strokeStyle = linea;
  ctx.fillStyle = linea;
  ctx.lineWidth = s;

  ctx.strokeRect(s / 2, s / 2, L - s, W - s);

  ctx.beginPath();
  if (spec.half) {
    ctx.moveTo(L, 0);
    ctx.lineTo(L, W);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(L, cy, spec.circleR, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.moveTo(L / 2, 0);
    ctx.lineTo(L / 2, W);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(L / 2, cy, spec.circleR, 0, Math.PI * 2);
    ctx.stroke();
    punto(ctx, L / 2, cy, 0.35);
  }

  ctx.strokeRect(0, cy - bw / 2, bl, bw);
  ctx.strokeRect(0, cy - sw / 2, sl, sw);
  punto(ctx, 11, cy, 0.3);

  if (!spec.half) {
    ctx.strokeRect(L - bl, cy - bw / 2, bl, bw);
    ctx.strokeRect(L - sl, cy - sw / 2, sl, sw);
    punto(ctx, L - 11, cy, 0.3);
  }

  ctx.strokeStyle = porteria;
  ctx.strokeRect(-1.6, cy - spec.goalWidth / 2, 1.6, spec.goalWidth);
  if (!spec.half) ctx.strokeRect(L, cy - spec.goalWidth / 2, 1.6, spec.goalWidth);
}

function punto(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/* ─────────────────────────────── Anotaciones ─────────────────────────────── */

function pintaDibujo(ctx: CanvasRenderingContext2D, d: Drawing) {
  const [a, b, c] = d.points;
  if (!a) return;
  ctx.save();
  ctx.strokeStyle = d.color;
  ctx.fillStyle = d.color;
  ctx.lineWidth = d.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (d.kind === 'zona') {
    const fin = b ?? a;
    ctx.globalAlpha = 0.16;
    if (d.shape === 'circulo') {
      ctx.beginPath();
      ctx.ellipse((a.x + fin.x) / 2, (a.y + fin.y) / 2, Math.abs(fin.x - a.x) / 2, Math.abs(fin.y - a.y) / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(Math.min(a.x, fin.x), Math.min(a.y, fin.y), Math.abs(fin.x - a.x), Math.abs(fin.y - a.y));
      ctx.globalAlpha = 1;
      ctx.strokeRect(Math.min(a.x, fin.x), Math.min(a.y, fin.y), Math.abs(fin.x - a.x), Math.abs(fin.y - a.y));
    }
    ctx.restore();
    return;
  }

  if (d.kind === 'discontinua') ctx.setLineDash([d.width * 3, d.width * 2.2]);

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if (d.kind === 'curva' && b && c) ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
  else if (b) ctx.lineTo(b.x, b.y);
  ctx.stroke();

  if (d.kind === 'flecha' && b) punta(ctx, a, b, d.width);
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

function pintaTrayectorias(ctx: CanvasRenderingContext2D, scene: Scene) {
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
      ctx.beginPath();
      ctx.moveTo(tramo.points[0].x, tramo.points[0].y);
      for (const p of tramo.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      const n = tramo.points.length;
      punta(ctx, tramo.points[n - 2], tramo.points[n - 1], 0.36);
    }
  }
  ctx.restore();
}

/* ──────────────────────────────── Las fichas ─────────────────────────────── */

function pintaObjeto(ctx: CanvasRenderingContext2D, obj: BoardObject, a: Ajustes) {
  const color = obj.color || RELLENO[obj.kind];
  const giro = ((obj.rot ?? 0) * Math.PI) / 180;

  if (obj.kind === 'zona') {
    const w = obj.w ?? 14;
    const h = obj.h ?? 10;
    ctx.save();
    ctx.rotate(giro);
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
    if (obj.label) rotulo(ctx, obj.label, 1.8, color, 0);
    ctx.restore();
    return;
  }

  if (obj.kind === 'balon') {
    ctx.beginPath();
    ctx.arc(0, 0, 0.95, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 0.18;
    ctx.strokeStyle = '#101C2D';
    ctx.stroke();
    return;
  }

  if (obj.kind === 'cono') {
    ctx.beginPath();
    ctx.moveTo(0, -1.4);
    ctx.lineTo(1.2, 1);
    ctx.lineTo(-1.2, 1);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 0.14;
    ctx.strokeStyle = '#101C2D';
    ctx.stroke();
    return;
  }

  if (obj.kind === 'pica') {
    ctx.save();
    ctx.rotate(giro);
    ctx.fillStyle = color;
    ctx.fillRect(-0.16, -1.8, 0.32, 3.6);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 1.9, 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (obj.kind === 'porteria' || obj.kind === 'miniporteria') {
    const w = obj.w ?? (obj.kind === 'porteria' ? 1 : 0.7);
    const h = obj.h ?? (obj.kind === 'porteria' ? 5 : 2);
    ctx.save();
    ctx.rotate(giro);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 0.12;
    ctx.strokeStyle = '#101C2D';
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  if (obj.kind === 'nota') {
    rotulo(ctx, obj.label, 2.4, color === 'transparent' ? '#FFFFFF' : color, 0);
    return;
  }

  // Jugadoras, rivales, porteras y comodines.
  ctx.beginPath();
  ctx.arc(0, 0, 1.75, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 0.22;
  ctx.strokeStyle = obj.kind === 'rival' ? '#101C2D' : '#FFFFFF';
  ctx.stroke();

  if (a.dorsales && obj.label) {
    rotulo(ctx, obj.label, 1.9, obj.color ? '#FFFFFF' : TEXTO[obj.kind], 0);
  }
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
