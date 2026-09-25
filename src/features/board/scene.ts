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

export type PitchKind = 'completo' | 'medio' | 'f7' | 'medio-f7';

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
}

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
};

export const PITCH_OPTIONS = Object.values(PITCHES).map((p) => ({ id: p.id, label: p.label }));

/* ───────────────────────────────── Objetos ───────────────────────────────── */

export type ObjectKind = 'jugadora' | 'rival' | 'balon' | 'cono' | 'porteria' | 'nota';

export interface BoardObject {
  id: string;
  kind: ObjectKind;
  /** Dorsal, inicial o texto de la nota. */
  label: string;
  /** Nombre completo opcional: se muestra en la ficha, no sobre el campo. */
  name?: string;
}

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
  /** Duración total en milisegundos. */
  durationMs: number;
  objects: BoardObject[];
  /** Pistas por id de objeto. Un objeto sin pista no se mueve. */
  tracks: Record<string, Track>;
}

export const EMPTY_SCENE: Scene = {
  version: 1,
  pitch: 'completo',
  durationMs: 6000,
  objects: [],
  tracks: {},
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
  return {
    ...scene,
    objects: [...scene.objects, { ...obj, id }],
    tracks: { ...scene.tracks, [id]: [{ t: 0, x: at.x, y: at.y }] },
  };
}

export function removeObject(scene: Scene, objectId: string): Scene {
  const tracks = { ...scene.tracks };
  delete tracks[objectId];
  return { ...scene, objects: scene.objects.filter((o) => o.id !== objectId), tracks };
}

/** Todos los instantes con fotograma, ordenados y sin repetir. */
export function sceneKeyTimes(scene: Scene): number[] {
  const set = new Set<number>();
  for (const track of Object.values(scene.tracks)) for (const k of track) set.add(k.t);
  return [...set].sort((a, b) => a - b);
}

/** Valida y normaliza una escena que llega de la base de datos. */
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
  return {
    version: 1,
    pitch,
    durationMs: typeof raw.durationMs === 'number' && raw.durationMs > 0 ? raw.durationMs : 6000,
    objects,
    tracks,
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

/** Coloca un equipo en su mitad, con dorsales del 1 en adelante. */
export function layoutTeam(scene: Scene, side: 'jugadora' | 'rival'): Scene {
  const spec = PITCHES[scene.pitch];
  const f7 = spec.id === 'f7' || spec.id === 'medio-f7';
  const shape = f7 ? F7_SHAPE : F11_SHAPE;
  const scaleY = spec.width / (f7 ? 45 : 68);

  let next = scene;
  shape.forEach(([x, y], i) => {
    const px = side === 'jugadora' ? x : spec.length - x;
    next = addObject(
      next,
      { kind: side, label: String(i + 1) },
      { x: Math.min(spec.length - 1, Math.max(1, px)), y: y * scaleY },
    );
  });
  return next;
}
