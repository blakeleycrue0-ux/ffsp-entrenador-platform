/**
 * Modelo de la pizarra táctica.
 * ---------------------------------------------------------------------------
 * Una jugada es una escena: objetos (jugadoras, balón, conos…) y, para cada
 * objeto, una pista con fotogramas clave en el tiempo. La reproducción no
 * guarda estado aquí: se calcula la posición de cada objeto en el instante `t`
 * interpolando entre sus fotogramas. Así la animación es continua y no depende
 * de temporizadores encadenados.
 *
 * Las coordenadas están en metros sobre el campo, no en píxeles: el dibujo se
 * adapta al tamaño de la pantalla sin recalcular la jugada.
 */

export type PitchKind = 'completo' | 'medio' | 'f7' | 'medio-f7' | 'vacio';

export interface PitchSpec {
  id: PitchKind;
  label: string;
  /** Largo y ancho en metros. */
  length: number;
  width: number;
  /** Medidas de las áreas, en metros. */
  boxLength: number;
  boxWidth: number;
  smallBoxLength: number;
  smallBoxWidth: number;
  goalWidth: number;
  circleR: number;
  /** Un campo «medio» sólo dibuja la mitad de ataque. */
  half: boolean;
  /** Superficie lisa, sin líneas: para ejercicios que no son de campo. */
  blank?: boolean;
}

/** Cómo se pinta la superficie. La de impresión gasta menos tinta y se lee en papel. */
export type Surface = 'cesped' | 'impresion';

export const PITCHES: Record<PitchKind, PitchSpec> = {
  completo: {
    id: 'completo', label: 'Campo completo (F11)',
    length: 105, width: 68,
    boxLength: 16.5, boxWidth: 40.3, smallBoxLength: 5.5, smallBoxWidth: 18.3,
    goalWidth: 7.32, circleR: 9.15, half: false,
  },
  medio: {
    id: 'medio', label: 'Medio campo (F11)',
    length: 52.5, width: 68,
    boxLength: 16.5, boxWidth: 40.3, smallBoxLength: 5.5, smallBoxWidth: 18.3,
    goalWidth: 7.32, circleR: 9.15, half: true,
  },
  f7: {
    id: 'f7', label: 'Campo completo (F7)',
    length: 65, width: 45,
    boxLength: 12, boxWidth: 26, smallBoxLength: 4, smallBoxWidth: 12,
    goalWidth: 6, circleR: 7, half: false,
  },
  'medio-f7': {
    id: 'medio-f7', label: 'Medio campo (F7)',
    length: 32.5, width: 45,
    boxLength: 12, boxWidth: 26, smallBoxLength: 4, smallBoxWidth: 12,
    goalWidth: 6, circleR: 7, half: true,
  },
  vacio: {
    id: 'vacio', label: 'Superficie libre',
    length: 40, width: 30,
    boxLength: 0, boxWidth: 0, smallBoxLength: 0, smallBoxWidth: 0,
    goalWidth: 0, circleR: 0, half: false, blank: true,
  },
};

export const PITCH_OPTIONS = Object.values(PITCHES).map((p) => ({ id: p.id, label: p.label }));

/* ───────────────────────────────── Objetos ───────────────────────────────── */

export type ObjectKind =
  | 'jugadora' | 'rival' | 'portera' | 'comodin'
  | 'balon' | 'cono' | 'pica' | 'porteria' | 'miniporteria' | 'zona' | 'nota';

/** Las que llevan dorsal y se pueden vincular a una jugadora de la plantilla. */
export const FICHAS: ObjectKind[] = ['jugadora', 'rival', 'portera', 'comodin'];

export const KIND_LABEL: Record<ObjectKind, string> = {
  jugadora: 'Jugadora',
  rival: 'Rival',
  portera: 'Portera',
  comodin: 'Comodín',
  balon: 'Balón',
  cono: 'Cono',
  pica: 'Pica',
  porteria: 'Portería',
  miniporteria: 'Miniportería',
  zona: 'Zona',
  nota: 'Texto',
};

export interface BoardObject {
  id: string;
  kind: ObjectKind;
  /** Dorsal, inicial o texto de la nota. */
  label: string;
  /** Nombre completo opcional: se muestra en la ficha, no sobre el campo. */
  name?: string;
  /** Jugadora de la plantilla a la que corresponde, si se colocó desde ahí. */
  playerId?: string;
  /** Color propio. Sin él se usa el del tipo. */
  color?: string;
  /** Tamaño en metros. Sólo lo usan zonas, porterías y notas. */
  w?: number;
  h?: number;
  /** Giro en grados. */
  rot?: number;
  /** Forma de una zona. */
  shape?: 'rect' | 'circulo';
}

/** Tamaño por defecto, en metros, de lo que se puede redimensionar. */
export const DEFAULT_SIZE: Partial<Record<ObjectKind, { w: number; h: number }>> = {
  zona: { w: 14, h: 10 },
  porteria: { w: 1, h: 5 },
  miniporteria: { w: 0.7, h: 2 },
};

export const RESIZABLE: ObjectKind[] = ['zona', 'porteria', 'miniporteria'];
export const ROTATABLE: ObjectKind[] = ['zona', 'porteria', 'miniporteria', 'pica'];

/* ─────────────────────────── Dibujos explicativos ────────────────────────── */

/**
 * Los dibujos NO animan nada: son anotaciones sobre el campo. Las trayectorias
 * que mueven a las jugadoras son otra cosa y viven en `tracks`. Mezclarlas
 * confunde, así que se guardan y se pintan por separado.
 */
export type DrawKind = 'linea' | 'flecha' | 'discontinua' | 'curva' | 'zona';

export const DRAW_LABEL: Record<DrawKind, string> = {
  linea: 'Línea',
  flecha: 'Flecha',
  discontinua: 'Discontinua',
  curva: 'Curva',
  zona: 'Zona',
};

export interface Drawing {
  id: string;
  kind: DrawKind;
  /** Recta y flecha: dos puntos. Curva: inicio, control y fin. Zona: dos esquinas. */
  points: Point[];
  color: string;
  /** Grosor en metros. */
  width: number;
  shape?: 'rect' | 'circulo';
}

export const DRAW_COLORS = ['#FFFFFF', '#3ECF8E', '#E2A33C', '#E8695C', '#7FB2F0', '#101C2D'];

/** Un fotograma clave: dónde está el objeto en el milisegundo `t`. */
export interface Keyframe {
  /** Milisegundos desde el inicio de la jugada. */
  t: number;
  x: number;
  y: number;
  /**
   * Punto de control de la curva hacia este fotograma, en metros y absoluto.
   * Sin él el desplazamiento es recto.
   */
  cx?: number;
  cy?: number;
  /** Cómo se entra y se sale de este tramo. */
  ease?: 'lineal' | 'suave';
  /** Qué representa el tramo que termina aquí: sirve para dibujar la estela. */
  move?: MoveKind;
}

export type MoveKind = 'carrera' | 'conduccion' | 'pase' | 'desmarque';

export const MOVES: MoveKind[] = ['carrera', 'conduccion', 'pase', 'desmarque'];

export const MOVE_LABEL: Record<MoveKind, string> = {
  carrera: 'Carrera',
  conduccion: 'Conducción',
  pase: 'Pase',
  desmarque: 'Desmarque',
};

/** Trazo de cada tipo de movimiento, en metros. */
export const MOVE_DASH: Record<MoveKind, string | undefined> = {
  carrera: undefined,
  conduccion: '0.9 0.5',
  pase: '1.6 1',
  desmarque: '0.3 0.7',
};

export type Track = Keyframe[];

export interface Scene {
  version: 1;
  pitch: PitchKind;
  /** En vertical el campo se dibuja girado; las coordenadas no cambian. */
  vertical?: boolean;
  surface?: Surface;
  /** Duración total en milisegundos. */
  durationMs: number;
  objects: BoardObject[];
  /** Pistas por id de objeto. Un objeto sin pista no se mueve. */
  tracks: Record<string, Track>;
  /** Anotaciones. No intervienen en la animación. */
  drawings?: Drawing[];
}

export const EMPTY_SCENE: Scene = {
  version: 1,
  pitch: 'completo',
  vertical: false,
  surface: 'cesped',
  durationMs: 6000,
  objects: [],
  tracks: {},
  drawings: [],
};

/* ─────────────────────────────── Interpolación ───────────────────────────── */

const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

export interface Point {
  x: number;
  y: number;
}

/** Bézier cuadrática: permite trayectorias curvas sin complicar la edición. */
const quad = (a: Point, c: Point, b: Point, u: number): Point => {
  const m = 1 - u;
  return {
    x: m * m * a.x + 2 * m * u * c.x + u * u * b.x,
    y: m * m * a.y + 2 * m * u * c.y + u * u * b.y,
  };
};

/**
 * Posición de una pista en el instante `t` (ms).
 * Antes del primer fotograma se queda en él; después del último, también.
 * Entre dos, interpola — de ahí que el movimiento sea continuo y no a saltos.
 */
export function sampleTrack(track: Track, t: number): Point | null {
  if (!track || track.length === 0) return null;
  if (track.length === 1 || t <= track[0].t) return { x: track[0].x, y: track[0].y };
  const last = track[track.length - 1];
  if (t >= last.t) return { x: last.x, y: last.y };

  let i = 0;
  while (i < track.length - 1 && track[i + 1].t <= t) i += 1;
  const a = track[i];
  const b = track[i + 1];
  const span = b.t - a.t;
  const raw = span <= 0 ? 1 : (t - a.t) / span;
  const u = b.ease === 'lineal' ? raw : easeInOut(raw);

  if (b.cx !== undefined && b.cy !== undefined) {
    return quad({ x: a.x, y: a.y }, { x: b.cx, y: b.cy }, { x: b.x, y: b.y }, u);
  }
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** Todas las posiciones de la escena en el instante `t`. */
export function sampleScene(scene: Scene, t: number): Record<string, Point> {
  const out: Record<string, Point> = {};
  for (const obj of scene.objects) {
    const p = sampleTrack(scene.tracks[obj.id], t);
    if (p) out[obj.id] = p;
  }
  return out;
}

/**
 * Tramos de la estela, uno por fotograma, con su tipo de movimiento: así el
 * pase se dibuja con un trazo distinto al de la carrera.
 */
export interface TrackSegment {
  points: Point[];
  move: MoveKind;
}

export function trackSegments(track: Track, stepsPerLeg = 12): TrackSegment[] {
  if (!track || track.length < 2) return [];
  const out: TrackSegment[] = [];
  for (let i = 1; i < track.length; i += 1) {
    const a = track[i - 1];
    const b = track[i];
    const points: Point[] = [];
    for (let j = 0; j <= stepsPerLeg; j += 1) {
      const p = sampleTrack(track, a.t + ((b.t - a.t) * j) / stepsPerLeg);
      if (p) points.push(p);
    }
    out.push({ points, move: b.move ?? 'carrera' });
  }
  return out;
}

/* ──────────────────────────────── Edición ────────────────────────────────── */

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Inserta o reemplaza el fotograma del objeto en el instante `t`. */
export function putKeyframe(scene: Scene, objectId: string, t: number, at: Point): Scene {
  const track = [...(scene.tracks[objectId] ?? [])];
  const round = Math.round(t);
  const idx = track.findIndex((k) => Math.abs(k.t - round) < 40);
  const previous = idx >= 0 ? track[idx] : undefined;
  const key: Keyframe = { ...previous, t: idx >= 0 ? track[idx].t : round, x: at.x, y: at.y };
  if (idx >= 0) track[idx] = key;
  else track.push(key);
  track.sort((a, b) => a.t - b.t);
  return { ...scene, tracks: { ...scene.tracks, [objectId]: track } };
}

/**
 * Mueve un objeto en el instante `t`. Si aún no se mueve, sólo cambia su
 * posición de partida; en cuanto tiene recorrido, crea un fotograma.
 */
export function moveObject(scene: Scene, objectId: string, t: number, at: Point): Scene {
  const track = scene.tracks[objectId] ?? [];
  if (track.length <= 1 && t === 0) {
    return { ...scene, tracks: { ...scene.tracks, [objectId]: [{ t: 0, x: at.x, y: at.y }] } };
  }
  return putKeyframe(scene, objectId, t, at);
}

/** Cambia el instante o el tipo de un fotograma sin tocar el resto. */
export function patchKeyframe(
  scene: Scene, objectId: string, t: number, patch: Partial<Keyframe>,
): Scene {
  const track = (scene.tracks[objectId] ?? []).map((k) => (k.t === t ? { ...k, ...patch } : k));
  // El primer fotograma siempre se queda en el instante cero.
  track.sort((a, b) => a.t - b.t);
  return { ...scene, tracks: { ...scene.tracks, [objectId]: track } };
}

export function removeKeyframe(scene: Scene, objectId: string, t: number): Scene {
  const track = (scene.tracks[objectId] ?? []).filter((k) => k.t !== t);
  return { ...scene, tracks: { ...scene.tracks, [objectId]: track } };
}

export function addObject(scene: Scene, obj: Omit<BoardObject, 'id'>, at: Point): Scene {
  const id = uid();
  const size = DEFAULT_SIZE[obj.kind];
  return {
    ...scene,
    objects: [...scene.objects, { ...size, ...obj, id }],
    tracks: { ...scene.tracks, [id]: [{ t: 0, x: at.x, y: at.y }] },
  };
}

export function removeObject(scene: Scene, objectId: string): Scene {
  const tracks = { ...scene.tracks };
  delete tracks[objectId];
  return { ...scene, objects: scene.objects.filter((o) => o.id !== objectId), tracks };
}

/** Cambia las propiedades de un objeto sin tocar su recorrido. */
export function patchObject(scene: Scene, objectId: string, patch: Partial<BoardObject>): Scene {
  return {
    ...scene,
    objects: scene.objects.map((o) => (o.id === objectId ? { ...o, ...patch } : o)),
  };
}

/**
 * Copia un objeto con todo su recorrido, desplazado un par de metros para que
 * se vea que son dos y no uno.
 */
export function duplicateObject(scene: Scene, objectId: string): Scene {
  const source = scene.objects.find((o) => o.id === objectId);
  if (!source) return scene;
  const id = uid();
  const track = (scene.tracks[objectId] ?? []).map((k) => ({ ...k, x: k.x + 2.5, y: k.y + 2.5 }));
  return {
    ...scene,
    objects: [...scene.objects, { ...source, id }],
    tracks: { ...scene.tracks, [id]: track.length ? track : [{ t: 0, x: 0, y: 0 }] },
  };
}

/* ─────────────────────────────── Dibujos ─────────────────────────────────── */

export function addDrawing(scene: Scene, drawing: Omit<Drawing, 'id'>): Scene {
  return { ...scene, drawings: [...(scene.drawings ?? []), { ...drawing, id: uid() }] };
}

export function patchDrawing(scene: Scene, id: string, patch: Partial<Drawing>): Scene {
  return {
    ...scene,
    drawings: (scene.drawings ?? []).map((d) => (d.id === id ? { ...d, ...patch } : d)),
  };
}

export function removeDrawing(scene: Scene, id: string): Scene {
  return { ...scene, drawings: (scene.drawings ?? []).filter((d) => d.id !== id) };
}

/** Todos los instantes con fotograma, ordenados y sin repetir. */
export function sceneKeyTimes(scene: Scene): number[] {
  const set = new Set<number>();
  for (const track of Object.values(scene.tracks)) for (const k of track) set.add(k.t);
  return [...set].sort((a, b) => a - b);
}

/**
 * Valida y normaliza una escena que llega de la base de datos.
 * Todo lo añadido después tiene valor por defecto, así que una jugada guardada
 * con una versión anterior se abre igual y no pierde nada.
 */
export function parseScene(value: unknown): Scene {
  const raw = value as Partial<Scene> | null;
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.objects)) return { ...EMPTY_SCENE };
  const pitch: PitchKind = raw.pitch && raw.pitch in PITCHES ? raw.pitch : 'completo';
  const objects = raw.objects.filter((o): o is BoardObject => !!o && typeof o.id === 'string');
  const tracks: Record<string, Track> = {};
  for (const obj of objects) {
    const track = (raw.tracks as Record<string, Track> | undefined)?.[obj.id];
    tracks[obj.id] = Array.isArray(track)
      ? track.filter((k) => typeof k?.t === 'number').sort((a, b) => a.t - b.t)
      : [];
  }

  const drawings = Array.isArray(raw.drawings)
    ? raw.drawings.filter(
        (d): d is Drawing =>
          !!d && typeof d.id === 'string' && Array.isArray(d.points) && d.points.length >= 2,
      )
    : [];

  return {
    version: 1,
    pitch,
    vertical: raw.vertical === true,
    surface: raw.surface === 'impresion' ? 'impresion' : 'cesped',
    durationMs: typeof raw.durationMs === 'number' && raw.durationMs > 0 ? raw.durationMs : 6000,
    objects,
    tracks,
    drawings,
  };
}

/* ─────────────────────── Disposición inicial de equipos ──────────────────── */

const F11_SHAPE: [number, number][] = [
  [5, 34], [18, 12], [18, 27], [18, 41], [18, 56],
  [38, 20], [38, 34], [38, 48],
  [58, 16], [58, 34], [58, 52],
];
const F7_SHAPE: [number, number][] = [
  [4, 22], [14, 10], [14, 22], [14, 34], [28, 14], [28, 22], [28, 30],
];

/** Rejilla sencilla, para cuando no hay campo sobre el que alinear. */
function gridSpots(spec: PitchSpec, n: number): [number, number][] {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push([((c + 1) * spec.length) / (cols + 1), ((r + 1) * spec.width) / (rows + 1)]);
  }
  return out;
}

/** Posiciones de una alineación, en metros, para el campo de la escena. */
function shapeSpots(spec: PitchSpec, side: 'jugadora' | 'rival', n?: number): [number, number][] {
  if (spec.blank) return gridSpots(spec, n ?? 11);
  const f7 = spec.id === 'f7' || spec.id === 'medio-f7';
  const base = f7 ? F7_SHAPE : F11_SHAPE;
  const shape = n ? base.slice(0, n) : base;
  const scaleY = spec.width / (f7 ? 45 : 68);
  return shape.map(([x, y]) => {
    const px = side === 'jugadora' ? x : spec.length - x;
    return [Math.min(spec.length - 1, Math.max(1, px)), y * scaleY];
  });
}

/** Coloca un equipo en su mitad, con dorsales del 1 en adelante. */
export function layoutTeam(scene: Scene, side: 'jugadora' | 'rival'): Scene {
  const spec = PITCHES[scene.pitch];
  let next = scene;
  shapeSpots(spec, side).forEach(([x, y], i) => {
    // La primera de la alineación es la portera.
    next = addObject(
      next,
      { kind: i === 0 && side === 'jugadora' ? 'portera' : side, label: String(i + 1) },
      { x, y },
    );
  });
  return next;
}

/**
 * Coloca jugadoras de la plantilla de verdad, con su dorsal y su nombre. Se
 * quedan vinculadas por `playerId`, de modo que la ficha sobre el campo sabe a
 * quién representa.
 */
export function layoutSquad(
  scene: Scene,
  squad: { id: string; name: string; number: number; isKeeper?: boolean }[],
): Scene {
  const spec = PITCHES[scene.pitch];
  const spots = shapeSpots(spec, 'jugadora', squad.length);
  let next = scene;
  squad.forEach((p, i) => {
    const [x, y] = spots[i] ?? spots[spots.length - 1] ?? [spec.length / 2, spec.width / 2];
    next = addObject(
      next,
      {
        kind: p.isKeeper ? 'portera' : 'jugadora',
        label: p.number ? String(p.number) : String(i + 1),
        name: p.name,
        playerId: p.id,
      },
      { x, y },
    );
  });
  return next;
}
