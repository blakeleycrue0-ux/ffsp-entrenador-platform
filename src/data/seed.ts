/**
 * DATOS DE DEMOSTRACIÓN — claramente identificables como ficticios.
 * ---------------------------------------------------------------------------
 * Se generan de forma determinista y relativa a la fecha actual para que la
 * plataforma siempre parezca "viva": hay entrenamiento hoy, partido el sábado,
 * asistencias pasadas y convocatorias a medio confirmar.
 *
 * Cuando exista backend real, este módulo se sustituye por el cliente HTTP:
 * la firma que consume la app es `repository.load()` en services/repository.ts.
 */

import type {
  ActivityItem, AttendanceRecord, Callup, ClubData, CoachTask, Drill, IntegrationState,
  Match, MessageTemplate, MessageThread, Notification, Player, PlayerPosition, Staff, Team,
  TrainingSession,
} from '@/types';
import { addDays, toISODate, today } from '@/lib/utils';

const T = today();
const iso = (offset: number) => toISODate(addDays(T, offset));
/** Próximo día de la semana (1 = lunes ... 6 = sábado, 0 = domingo). */
const nextWeekday = (target: number, from = 0) => {
  for (let i = from; i < from + 14; i++) {
    if (addDays(T, i).getDay() === target) return iso(i);
  }
  return iso(from);
};
const lastWeekday = (target: number) => {
  for (let i = 1; i < 15; i++) {
    if (addDays(T, -i).getDay() === target) return iso(-i);
  }
  return iso(-1);
};

export const NEXT_SATURDAY = nextWeekday(6, 1);
/** La temporada se deduce de la fecha: de julio a diciembre empieza la nueva. */
const seasonYear = T.getMonth() >= 6 ? T.getFullYear() : T.getFullYear() - 1;
export const SEASON = `${seasonYear}/${String((seasonYear + 1) % 100).padStart(2, '0')}`;

/* ───────────────────────────────── Staff ─────────────────────────────────── */

export const staff: Staff[] = [
  {
    id: 'st_1',
    name: 'Toni Ramis',
    role: 'entrenador',
    email: 'toni.ramis@santaponsacf.demo',
    phone: '+34 600 11 22 33',
    licence: 'UEFA B',
    teamIds: ['t_primer', 't_sub17', 't_cadete', 't_infantil'],
    permissions: [
      'teams.read', 'teams.write', 'players.read', 'players.read.sensitive', 'players.write',
      'sessions.read', 'sessions.write', 'matches.write', 'callups.write', 'attendance.write',
      'messages.send',
    ],
  },
  {
    id: 'st_2',
    name: 'Marga Coll',
    role: 'segundo-entrenador',
    email: 'marga.coll@santaponsacf.demo',
    licence: 'UEFA C',
    teamIds: ['t_sub17'],
    permissions: ['teams.read', 'players.read', 'sessions.read', 'sessions.write', 'attendance.write'],
  },
  {
    id: 'st_3',
    name: 'Jordi Serra',
    role: 'preparador-fisico',
    email: 'jordi.serra@santaponsacf.demo',
    licence: 'CAFD',
    teamIds: ['t_sub17', 't_primer'],
    permissions: ['teams.read', 'players.read', 'sessions.read', 'sessions.write'],
  },
  {
    id: 'st_4',
    name: 'Nuria Bauzá',
    role: 'coordinador',
    email: 'nuria.bauza@santaponsacf.demo',
    teamIds: ['t_primer', 't_sub17', 't_cadete', 't_infantil'],
    permissions: ['teams.read', 'players.read', 'sessions.read', 'club.admin', 'messages.send'],
  },
];

/* ───────────────────────────────── Equipos ───────────────────────────────── */

export const teams: Team[] = [
  {
    id: 't_primer', name: 'Primer Equipo', category: 'Primer Equipo', season: SEASON,
    competition: 'Tercera RFEF — Grupo XI', staffIds: ['st_1', 'st_3', 'st_4'], venue: 'Campo Municipal de Santa Ponsa',
    trainingSlots: [
      { weekday: 2, start: '19:00', end: '20:30', venue: 'Campo Municipal' },
      { weekday: 4, start: '19:00', end: '20:30', venue: 'Campo Municipal' },
    ],
  },
  {
    id: 't_sub17', name: 'Sub-17', category: 'Juvenil', season: SEASON,
    competition: 'Liga Nacional Juvenil', staffIds: ['st_1', 'st_2', 'st_3'], venue: 'Campo Municipal de Santa Ponsa',
    trainingSlots: [
      { weekday: 1, start: '18:00', end: '19:30', venue: 'Campo Anexo' },
      { weekday: 3, start: '19:00', end: '20:30', venue: 'Campo Municipal' },
      { weekday: 5, start: '18:30', end: '20:00', venue: 'Campo Municipal' },
    ],
  },
  {
    id: 't_cadete', name: 'Cadete A', category: 'Cadete', season: SEASON,
    competition: 'Primera Cadete — Grupo A', staffIds: ['st_1'], venue: 'Campo Anexo Santa Ponsa',
    trainingSlots: [
      { weekday: 2, start: '17:30', end: '19:00', venue: 'Campo Anexo' },
      { weekday: 4, start: '17:30', end: '19:00', venue: 'Campo Anexo' },
    ],
  },
  {
    id: 't_infantil', name: 'Infantil A', category: 'Infantil', season: SEASON,
    competition: 'Primera Infantil — Grupo B', staffIds: ['st_1'], venue: 'Campo Anexo Santa Ponsa',
    trainingSlots: [
      { weekday: 1, start: '17:00', end: '18:15', venue: 'Campo Anexo' },
      { weekday: 3, start: '17:00', end: '18:15', venue: 'Campo Anexo' },
    ],
  },
];

/* ──────────────────────────────── Jugadores ──────────────────────────────── */

const FIRST = [
  'Marc', 'Pau', 'Joan', 'Álex', 'Pedro', 'Toni', 'Guillem', 'Sergi', 'Iker', 'Nico',
  'Biel', 'Adrià', 'Rubén', 'Hugo', 'Lucas', 'Dani', 'Óscar', 'Mateo', 'Iván', 'Jaume',
  'Arnau', 'Bruno', 'Éric', 'Pol', 'Xavi', 'Miquel', 'Gerard', 'Aleix', 'Roger', 'Tomeu',
];
const LAST = [
  'Ramis', 'Coll', 'Bauzá', 'Serra', 'Ferrer', 'Vidal', 'Moyà', 'Salom', 'Pons', 'Amengual',
  'Ribas', 'Tugores', 'Morey', 'Cifre', 'Sastre', 'Nadal', 'Llull', 'Oliver', 'Riera', 'Gomila',
  'Mas', 'Cerdà', 'Palmer', 'Bonet', 'Torres', 'Estelrich', 'Fiol', 'Roselló', 'Quetglas', 'Adrover',
];

const FORMATION_POSITIONS: PlayerPosition[] = [
  'Portero', 'Portero',
  'Lateral derecho', 'Central', 'Central', 'Lateral izquierdo',
  'Lateral derecho', 'Central', 'Lateral izquierdo',
  'Pivote', 'Pivote', 'Interior', 'Interior', 'Interior',
  'Mediapunta', 'Mediapunta',
  'Extremo derecho', 'Extremo derecho', 'Extremo izquierdo', 'Extremo izquierdo',
  'Delantero', 'Delantero', 'Delantero',
  'Central', 'Interior',
];

const SECONDARY: Partial<Record<PlayerPosition, PlayerPosition>> = {
  Central: 'Lateral derecho',
  'Lateral derecho': 'Extremo derecho',
  'Lateral izquierdo': 'Extremo izquierdo',
  Pivote: 'Central',
  Interior: 'Mediapunta',
  Mediapunta: 'Interior',
  'Extremo derecho': 'Delantero',
  'Extremo izquierdo': 'Mediapunta',
  Delantero: 'Extremo izquierdo',
};

/** PRNG determinista: los datos de demo no cambian entre recargas. */
const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const teamSizes: Record<string, { size: number; birthYear: number }> = {
  t_primer: { size: 23, birthYear: seasonYear - 26 },
  t_sub17: { size: 24, birthYear: seasonYear - 17 },
  t_cadete: { size: 22, birthYear: seasonYear - 15 },
  t_infantil: { size: 20, birthYear: seasonYear - 13 },
};

const injuriesBy: Record<string, { idx: number; a: Player['availability'] }[]> = {
  t_sub17: [
    { idx: 4, a: { status: 'lesionado', note: 'Esguince de tobillo grado I', since: iso(-9), until: iso(12) } },
    { idx: 11, a: { status: 'duda', note: 'Molestias en el aductor', since: iso(-2) } },
    { idx: 17, a: { status: 'sancionado', note: 'Ciclo de amonestaciones — 1 partido', since: iso(-3), until: iso(3) } },
    { idx: 20, a: { status: 'enfermo', note: 'Proceso febril', since: iso(-1) } },
  ],
  t_primer: [
    { idx: 6, a: { status: 'lesionado', note: 'Rotura fibrilar en isquiotibial', since: iso(-20), until: iso(15) } },
    { idx: 14, a: { status: 'duda', note: 'Sobrecarga en gemelo', since: iso(-1) } },
  ],
  t_cadete: [
    { idx: 3, a: { status: 'lesionado', note: 'Contusión en rodilla', since: iso(-5), until: iso(6) } },
    { idx: 9, a: { status: 'ausente', note: 'Viaje familiar hasta el domingo', since: iso(-1), until: iso(3) } },
  ],
  t_infantil: [
    { idx: 8, a: { status: 'enfermo', note: 'Gastroenteritis', since: iso(-2) } },
  ],
};

function buildPlayers(): Player[] {
  const out: Player[] = [];
  Object.entries(teamSizes).forEach(([teamId, cfg], tIdx) => {
    const r = rng(1000 + tIdx * 77);
    for (let i = 0; i < cfg.size; i++) {
      const first = FIRST[(i + tIdx * 7) % FIRST.length];
      const last = LAST[(i * 3 + tIdx * 5) % LAST.length];
      const last2 = LAST[(i * 5 + tIdx * 11 + 4) % LAST.length];
      const position = FORMATION_POSITIONS[i % FORMATION_POSITIONS.length];
      const month = 1 + Math.floor(r() * 12);
      const day = 1 + Math.floor(r() * 27);
      const matches = 4 + Math.floor(r() * 9);
      const isFwd = ['Delantero', 'Extremo derecho', 'Extremo izquierdo', 'Mediapunta'].includes(position);
      const injury = injuriesBy[teamId]?.find((x) => x.idx === i);
      out.push({
        id: `p_${teamId.slice(2)}_${i + 1}`,
        teamId,
        name: `${first} ${last} ${last2}`,
        shortName: `${first} ${last}`,
        number: i + 1,
        position,
        secondaryPosition: SECONDARY[position],
        foot: r() > 0.78 ? 'Zurdo' : r() > 0.97 ? 'Ambidiestro' : 'Diestro',
        birthDate: `${cfg.birthYear}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`,
        phone: teamId === 't_primer' ? `+34 6${10 + i}  ${100 + i} ${200 + i}` : undefined,
        guardians:
          teamId === 't_primer'
            ? []
            : [
                {
                  name: `${['Marta', 'Carmen', 'Isabel', 'Ana', 'Rosa', 'Laura'][i % 6]} ${last}`,
                  relation: i % 3 === 0 ? 'Padre' : 'Madre',
                  phone: `+34 6${20 + i} ${300 + i} ${400 + i}`,
                  email: `familia.${last.toLowerCase()}${i}@correo.demo`,
                },
              ],
        availability: injury?.a ?? { status: 'disponible' },
        stats: {
          matches,
          minutes: matches * (45 + Math.floor(r() * 45)),
          goals: isFwd ? Math.floor(r() * 8) : Math.floor(r() * 2),
          assists: Math.floor(r() * 5),
          yellow: Math.floor(r() * 4),
          red: r() > 0.94 ? 1 : 0,
        },
        joinedAt: `${cfg.birthYear + 12}-09-01`,
      });
    }
  });
  return out;
}

export const players: Player[] = buildPlayers();

/* ─────────────────────────── Biblioteca de ejercicios ────────────────────── */

export const drills: Drill[] = [
  {
    id: 'd_1', name: 'Rondo 5v2 a un toque', objective: 'Velocidad de circulación y orientación corporal bajo presión.',
    tags: ['Posesión', 'Técnica', 'Calentamiento'], ageRange: 'U13 – Senior', players: '7 – 8', duration: 12,
    material: ['Balones', 'Conos', 'Petos'], createdBy: 'club', favorite: true,
    description:
      'Círculo de 8 m de diámetro. Cinco jugadores en el exterior a un toque, dos en el interior presionando. ' +
      'Cambio de rol al robo o tras 10 pases. Se puntúa el pase que atraviesa la línea entre los dos presionadores.',
    progressions: ['Dos toques libres para el receptor tras pase interior', 'Añadir comodín interior', 'Limitar a 6 segundos por posesión'],
    tactic: [
      { id: 's1', kind: 'zone', x: 30, y: 25, w: 40, h: 50 },
      { id: 's2', kind: 'player', x: 30, y: 25, label: '1', team: 'own' },
      { id: 's3', kind: 'player', x: 70, y: 25, label: '2', team: 'own' },
      { id: 's4', kind: 'player', x: 78, y: 60, label: '3', team: 'own' },
      { id: 's5', kind: 'player', x: 50, y: 82, label: '4', team: 'own' },
      { id: 's6', kind: 'player', x: 22, y: 60, label: '5', team: 'own' },
      { id: 's7', kind: 'player', x: 45, y: 45, label: 'A', team: 'rival' },
      { id: 's8', kind: 'player', x: 58, y: 58, label: 'B', team: 'rival' },
      { id: 's9', kind: 'arrow', x: 30, y: 25, x2: 70, y2: 25, style: 'pass' },
      { id: 's10', kind: 'ball', x: 30, y: 25 },
    ],
  },
  {
    id: 'd_2', name: 'Presión tras pérdida 6v6+3', objective: 'Reacción colectiva en los 5 segundos posteriores a la pérdida.',
    tags: ['Presión', 'Transición', 'Táctica'], ageRange: 'U15 – Senior', players: '15', duration: 20,
    material: ['Balones', 'Petos', 'Conos', '4 miniporterías'], createdBy: 'club', favorite: true,
    description:
      'Espacio de 40x35 m. Dos equipos de seis más tres comodines ofensivos. Al perder el balón, el equipo dispone de ' +
      '5 segundos para recuperarlo; si lo logra suma doble. Si el rival supera la presión, ataca miniportería.',
    progressions: ['Reducir a 4 segundos', 'Prohibir la falta táctica', 'Premiar la recuperación en campo rival x3'],
    tactic: [
      { id: 'p1', kind: 'player', x: 25, y: 30, label: '6', team: 'own' },
      { id: 'p2', kind: 'player', x: 40, y: 22, label: '8', team: 'own' },
      { id: 'p3', kind: 'player', x: 55, y: 33, label: '10', team: 'own' },
      { id: 'p4', kind: 'player', x: 35, y: 50, label: '5', team: 'own' },
      { id: 'p5', kind: 'player', x: 50, y: 55, label: '11', team: 'rival' },
      { id: 'p6', kind: 'ball', x: 50, y: 55 },
      { id: 'p7', kind: 'arrow', x: 40, y: 24, x2: 49, y2: 50, style: 'run' },
      { id: 'p8', kind: 'arrow', x: 25, y: 32, x2: 40, y2: 48, style: 'run' },
      { id: 'p9', kind: 'text', x: 62, y: 70, label: '5 segundos' },
    ],
  },
  {
    id: 'd_3', name: 'Salida de balón 3+2 vs 3', objective: 'Progresar desde portero con superioridad en primera línea.',
    tags: ['Posesión', 'Táctica', 'Ataque'], ageRange: 'U13 – Senior', players: '9 – 11', duration: 18,
    material: ['Balones', 'Portería', 'Conos', 'Petos'], createdBy: 'club',
    description:
      'Medio campo. Portero + 2 centrales + 2 laterales frente a 3 atacantes. El objetivo es superar la línea de presión ' +
      'con pase interior al pivote o conducción del central. Punto al superar la línea de medio campo con control.',
    progressions: ['Añadir pivote rival', 'Limitar a 6 pases', 'Prohibir el pase largo'],
  },
  {
    id: 'd_4', name: 'Finalización en tres tiempos', objective: 'Definición en área tras centro, segunda jugada y remate lejano.',
    tags: ['Finalización', 'Ataque', 'Técnica'], ageRange: 'U13 – Senior', players: '10 – 16', duration: 20,
    material: ['Balones', 'Portería', 'Conos'], createdBy: 'club',
    description:
      'Tres secuencias encadenadas sin pausa: centro desde banda con dos rematadores, rechace al borde del área y ' +
      'llegada del tercer hombre. Se rota tras cada serie. 6 series por lado.',
    progressions: ['Añadir dos defensores pasivos', 'Defensores activos', 'Limitar a un toque en el área'],
  },
  {
    id: 'd_5', name: 'Basculación defensiva 4+2', objective: 'Coordinar la línea de cuatro y las coberturas del doble pivote.',
    tags: ['Defensa', 'Táctica'], ageRange: 'U15 – Senior', players: '12 – 16', duration: 18,
    material: ['Conos', 'Petos', 'Balones'], createdBy: 'club',
    description:
      'Estructura defensiva 4+2 frente a seis atacantes que circulan el balón. Se trabajan los apoyos, la altura de la ' +
      'línea y el momento de saltar a presionar. El entrenador congela la jugada para corregir posiciones.',
    progressions: ['Añadir portero', 'Permitir profundidad al atacante', 'Puntuar por recuperación en 8 segundos'],
  },
  {
    id: 'd_6', name: 'Activación articular + movilidad', objective: 'Preparar el sistema neuromuscular antes de la carga principal.',
    tags: ['Calentamiento', 'Preparación física'], ageRange: 'Todas', players: 'Todos', duration: 10,
    material: ['Conos', 'Vallas bajas', 'Gomas'], createdBy: 'club', favorite: true,
    description:
      'Circuito de movilidad de cadera y tobillo, activación de glúteo con goma y progresión de carrera con cambios de ' +
      'ritmo. Termina con 3 aceleraciones de 15 m al 80 %.',
  },
  {
    id: 'd_7', name: 'Juego reducido 7v7 con porterías laterales', objective: 'Cambios de orientación y ocupación del ancho.',
    tags: ['Posesión', 'Ataque', 'Táctica'], ageRange: 'U13 – Senior', players: '14 – 16', duration: 22,
    material: ['4 miniporterías', 'Petos', 'Balones'], createdBy: 'club',
    description:
      'Campo de 50x40 m con dos miniporterías por banda en cada lado. Se marca conduciendo el balón por una de las dos ' +
      'zonas exteriores, lo que obliga a cambiar de orientación constantemente.',
    progressions: ['Gol doble tras cambio de orientación', 'Máximo 3 toques', 'Comodín central obligatorio'],
  },
  {
    id: 'd_8', name: 'Transición ofensiva 4v3 + 1', objective: 'Atacar rápido el espacio tras recuperación.',
    tags: ['Transición', 'Ataque', 'Finalización'], ageRange: 'U13 – Senior', players: '12', duration: 16,
    material: ['Balones', 'Porterías', 'Petos'], createdBy: 'club',
    description:
      'Al recuperar en zona propia se sale en superioridad 4 contra 3 hacia portería contraria; a los 4 segundos entra un ' +
      'defensor de recuperación. Prima la primera decisión y la velocidad de conducción.',
  },
  {
    id: 'd_9', name: 'Circuito técnico de conducción y pase', objective: 'Calidad de golpeo y control orientado a alta frecuencia.',
    tags: ['Técnica', 'Calentamiento'], ageRange: 'U10 – U16', players: '8 – 20', duration: 12,
    material: ['Conos', 'Balones', 'Setas'], createdBy: 'club',
    description:
      'Cuatro estaciones encadenadas: conducción en slalom, pared con apoyo, control orientado y pase largo. ' +
      'Dos series por estación con 45 segundos de descanso.',
  },
  {
    id: 'd_10', name: 'Vuelta a la calma guiada', objective: 'Bajar pulsaciones, estirar y cerrar la sesión con feedback.',
    tags: ['Preparación física'], ageRange: 'Todas', players: 'Todos', duration: 8,
    material: ['Esterillas'], createdBy: 'club',
    description: 'Carrera continua suave 3 minutos, estiramientos de cadena posterior y aductores, y ronda final de feedback del entrenador.',
  },
  {
    id: 'd_11', name: 'ABP: córner en corto', objective: 'Automatizar dos variantes de saque de esquina en corto.',
    tags: ['Ataque', 'Táctica', 'Finalización'], ageRange: 'U15 – Senior', players: '11 – 18', duration: 15,
    material: ['Balones', 'Portería', 'Petos'], createdBy: 'entrenador',
    description:
      'Se ensayan dos variantes: apoyo al córner corto con centro al segundo palo y bloqueo en el primer palo con ' +
      'llegada desde el borde del área. Cinco repeticiones de cada por lado.',
  },
  {
    id: 'd_12', name: 'Repliegue y salto a presión alta', objective: 'Reconocer señales de presión y de repliegue medio.',
    tags: ['Defensa', 'Presión', 'Táctica'], ageRange: 'U15 – Senior', players: '16 – 22', duration: 20,
    material: ['Conos', 'Petos', 'Balones', 'Porterías'], createdBy: 'entrenador',
    description:
      'Once contra once en tres cuartos de campo. Se define la señal de presión (pase al lateral, control malo, pase atrás) ' +
      'y se congela la acción para corregir la altura de la línea.',
  },
];

/* ─────────────────────────────── Sesiones ────────────────────────────────── */

const blk = (id: string, title: string, duration: number, tags: Drill['tags'], drillId?: string, series?: string) => ({
  id, title, duration, tags, drillId, series,
});

export const sessions: TrainingSession[] = [
  {
    id: 's_hoy', teamId: 't_sub17', title: 'Táctica colectiva — presión tras pérdida',
    date: iso(0), start: '19:00', duration: 90, venue: 'Campo Municipal',
    objective: 'Reducir el tiempo de reacción tras pérdida en campo rival.',
    expectedPlayers: 24, status: 'planificado',
    material: ['Balones', 'Petos (3 colores)', 'Conos', '4 miniporterías'],
    notes: 'Marga dirige el bloque 2. Vigilar carga de Iván Pons (vuelve de molestias).',
    blocks: [
      blk('b1', 'Activación articular + movilidad', 10, ['Calentamiento'], 'd_6'),
      blk('b2', 'Rondo 5v2 a un toque', 15, ['Posesión', 'Técnica'], 'd_1', '3 x 4′ / 60″ desc.'),
      blk('b3', 'Presión tras pérdida 6v6+3', 20, ['Presión', 'Transición'], 'd_2', '4 x 4′ / 90″ desc.'),
      blk('b4', 'Juego reducido 7v7 porterías laterales', 25, ['Posesión', 'Táctica'], 'd_7', '3 x 7′ / 2′ desc.'),
      blk('b5', 'Finalización en tres tiempos', 12, ['Finalización'], 'd_4'),
      blk('b6', 'Vuelta a la calma guiada', 8, ['Preparación física'], 'd_10'),
    ],
  },
  {
    id: 's_vie', teamId: 't_sub17', title: 'Activación pre-partido y ABP',
    date: nextWeekday(5, 1), start: '18:30', duration: 75, venue: 'Campo Municipal',
    objective: 'Llegar frescos al sábado y cerrar las variantes de córner.',
    expectedPlayers: 20, status: 'planificado', material: ['Balones', 'Conos', 'Petos'],
    blocks: [
      blk('b1', 'Activación articular + movilidad', 10, ['Calentamiento'], 'd_6'),
      blk('b2', 'Circuito técnico de conducción y pase', 12, ['Técnica'], 'd_9'),
      blk('b3', 'Salida de balón 3+2 vs 3', 18, ['Posesión', 'Táctica'], 'd_3'),
      blk('b4', 'ABP: córner en corto', 15, ['Ataque', 'Táctica'], 'd_11'),
      blk('b5', 'Partido libre 8v8', 12, ['Táctica']),
      blk('b6', 'Vuelta a la calma guiada', 8, ['Preparación física'], 'd_10'),
    ],
  },
  {
    id: 's_lun_prox', teamId: 't_sub17', title: 'Revisión del partido + posesión',
    date: nextWeekday(1, 2), start: '18:00', duration: 90, venue: 'Campo Anexo',
    objective: 'Corregir la salida de balón y recuperar carga tras competición.',
    expectedPlayers: 24, status: 'borrador', material: ['Balones', 'Conos', 'Petos'],
    blocks: [
      blk('b1', 'Activación articular + movilidad', 10, ['Calentamiento'], 'd_6'),
      blk('b2', 'Rondo 5v2 a un toque', 12, ['Posesión'], 'd_1'),
      blk('b3', 'Salida de balón 3+2 vs 3', 20, ['Posesión', 'Táctica'], 'd_3'),
    ],
  },
  {
    id: 's_ayer', teamId: 't_sub17', title: 'Fuerza específica y finalización',
    date: lastWeekday(1), start: '18:00', duration: 90, venue: 'Campo Anexo',
    objective: 'Trabajo de fuerza y definición en área.',
    expectedPlayers: 24, status: 'completado', material: ['Balones', 'Vallas', 'Gomas'],
    blocks: [
      blk('b1', 'Activación articular + movilidad', 10, ['Calentamiento'], 'd_6'),
      blk('b2', 'Circuito técnico de conducción y pase', 12, ['Técnica'], 'd_9'),
      blk('b3', 'Finalización en tres tiempos', 25, ['Finalización'], 'd_4'),
      blk('b4', 'Transición ofensiva 4v3 + 1', 18, ['Transición'], 'd_8'),
      blk('b5', 'Vuelta a la calma guiada', 8, ['Preparación física'], 'd_10'),
    ],
  },
  {
    id: 's_primer_hoy', teamId: 't_primer', title: 'Sesión táctica — repliegue medio',
    date: iso(0), start: '20:45', duration: 90, venue: 'Campo Municipal',
    objective: 'Ajustar alturas de la línea defensiva frente a equipos con extremos a pierna cambiada.',
    expectedPlayers: 22, status: 'planificado', material: ['Balones', 'Petos', 'Conos'],
    blocks: [
      blk('b1', 'Activación articular + movilidad', 10, ['Calentamiento'], 'd_6'),
      blk('b2', 'Basculación defensiva 4+2', 20, ['Defensa'], 'd_5'),
      blk('b3', 'Repliegue y salto a presión alta', 25, ['Defensa', 'Presión'], 'd_12'),
      blk('b4', 'Juego reducido 7v7', 25, ['Posesión'], 'd_7'),
      blk('b5', 'Vuelta a la calma guiada', 10, ['Preparación física'], 'd_10'),
    ],
  },
  {
    id: 's_cadete_man', teamId: 't_cadete', title: 'Conducción, pase y juego reducido',
    date: nextWeekday(2, 1), start: '17:30', duration: 90, venue: 'Campo Anexo',
    objective: 'Mejorar el primer control orientado.',
    expectedPlayers: 22, status: 'planificado', material: ['Balones', 'Conos', 'Petos'],
    blocks: [
      blk('b1', 'Activación articular + movilidad', 10, ['Calentamiento'], 'd_6'),
      blk('b2', 'Circuito técnico de conducción y pase', 15, ['Técnica'], 'd_9'),
      blk('b3', 'Rondo 5v2 a un toque', 15, ['Posesión'], 'd_1'),
      blk('b4', 'Juego reducido 7v7 porterías laterales', 25, ['Posesión'], 'd_7'),
      blk('b5', 'Finalización en tres tiempos', 15, ['Finalización'], 'd_4'),
      blk('b6', 'Vuelta a la calma guiada', 10, ['Preparación física'], 'd_10'),
    ],
  },
  {
    id: 's_infantil_man', teamId: 't_infantil', title: 'Técnica individual y 4v4',
    date: nextWeekday(1, 1), start: '17:00', duration: 75, venue: 'Campo Anexo',
    objective: 'Volumen de contactos con balón y toma de decisiones en espacio reducido.',
    expectedPlayers: 20, status: 'planificado', material: ['Balones', 'Conos'],
    blocks: [
      blk('b1', 'Activación articular + movilidad', 10, ['Calentamiento'], 'd_6'),
      blk('b2', 'Circuito técnico de conducción y pase', 20, ['Técnica'], 'd_9'),
      blk('b3', 'Juego reducido 4v4', 30, ['Posesión']),
      blk('b4', 'Vuelta a la calma guiada', 8, ['Preparación física'], 'd_10'),
    ],
  },
];

/* ─────────────────────────────── Partidos ────────────────────────────────── */

export const matches: Match[] = [
  {
    id: 'm_1', teamId: 't_sub17', opponent: 'Atlético Palma', competition: 'Liga Nacional Juvenil',
    date: NEXT_SATURDAY, start: '17:30', venue: 'Campo Municipal de Santa Ponsa', home: true,
    matchday: 9, status: 'programado', formation: '1-4-3-3',
    notes: 'Rival que presiona alto tras saque de portería. Preparar salida en largo como plan B.',
  },
  {
    id: 'm_2', teamId: 't_primer', opponent: 'CD Sóller', competition: 'Tercera RFEF',
    date: nextWeekday(0, 1), start: '12:00', venue: 'Camp d’en Maiol', home: false,
    matchday: 11, status: 'programado', formation: '1-4-2-3-1',
  },
  {
    id: 'm_3', teamId: 't_cadete', opponent: 'UD Calvià', competition: 'Primera Cadete',
    date: NEXT_SATURDAY, start: '11:00', venue: 'Campo Anexo Santa Ponsa', home: true,
    matchday: 8, status: 'programado',
  },
  {
    id: 'm_4', teamId: 't_infantil', opponent: 'CF Andratx', competition: 'Primera Infantil',
    date: nextWeekday(6, 8), start: '10:00', venue: 'Camp Sa Plana', home: false,
    matchday: 9, status: 'programado',
  },
  {
    id: 'm_5', teamId: 't_sub17', opponent: 'CE Constància', competition: 'Liga Nacional Juvenil',
    date: lastWeekday(6), start: '16:00', venue: 'Nou Camp d’Inca', home: false,
    matchday: 8, status: 'jugado', result: { own: 2, rival: 1 },
  },
  {
    id: 'm_6', teamId: 't_sub17', opponent: 'RCD Mallorca B', competition: 'Liga Nacional Juvenil',
    date: nextWeekday(6, 8), start: '18:00', venue: 'Son Bibiloni', home: false,
    matchday: 10, status: 'programado',
  },
  {
    id: 'm_7', teamId: 't_primer', opponent: 'At. Baleares B', competition: 'Tercera RFEF',
    date: lastWeekday(0), start: '17:00', venue: 'Campo Municipal de Santa Ponsa', home: true,
    matchday: 10, status: 'jugado', result: { own: 1, rival: 1 },
  },
];

/* ──────────────────────────── Convocatorias ──────────────────────────────── */

function buildCallup(matchId: string, teamId: string, slots: number, confirmedRatio: number): Callup {
  const squad = players.filter((p) => p.teamId === teamId);
  const r = rng(matchId.length * 991);
  const eligible = squad.filter((p) => p.availability.status === 'disponible' || p.availability.status === 'duda');
  const selected = eligible.slice(0, slots).map((p) => p.id);
  const entries = squad.map((p) => {
    const isSel = selected.includes(p.id);
    const roll = r();
    const response: Callup['entries'][number]['response'] = !isSel
      ? 'pendiente'
      : roll < confirmedRatio
        ? 'confirmado'
        : roll < confirmedRatio + 0.12
          ? 'rechazado'
          : 'pendiente';
    return {
      playerId: p.id,
      selected: isSel,
      response,
      respondedAt: response !== 'pendiente' ? new Date(Date.now() - Math.floor(roll * 40) * 3600000).toISOString() : undefined,
      reason: response === 'rechazado' ? 'Compromiso familiar' : undefined,
    };
  });
  return {
    id: `c_${matchId}`, matchId, teamId, slots,
    meetingTime: '16:30', meetingPlace: 'Vestuarios del Campo Municipal',
    kit: 'Equipación morada · medias moradas',
    notes: 'Traer segunda camiseta y botella individual.',
    entries,
    status: 'enviada',
    sentAt: new Date(Date.now() - 30 * 3600000).toISOString(),
  };
}

export const callups: Callup[] = [
  buildCallup('m_1', 't_sub17', 16, 0.75),
  { ...buildCallup('m_3', 't_cadete', 16, 0.6), status: 'borrador', sentAt: undefined },
  buildCallup('m_2', 't_primer', 18, 0.82),
];
callups[0].meetingTime = '16:15';

/* ───────────────────────────── Asistencia ───────────────────────────────── */

function buildAttendance(): AttendanceRecord[] {
  const out: AttendanceRecord[] = [];
  const past = [
    { id: 'a_1', sessionId: 's_ayer', teamId: 't_sub17', date: lastWeekday(1) },
    { id: 'a_2', sessionId: 'hist_1', teamId: 't_sub17', date: lastWeekday(5) },
    { id: 'a_3', sessionId: 'hist_2', teamId: 't_sub17', date: lastWeekday(3) },
    { id: 'a_4', sessionId: 'hist_3', teamId: 't_sub17', date: toISODate(addDays(T, -8)) },
    { id: 'a_5', sessionId: 'hist_4', teamId: 't_sub17', date: toISODate(addDays(T, -10)) },
    { id: 'a_6', sessionId: 'hist_5', teamId: 't_sub17', date: toISODate(addDays(T, -12)) },
    { id: 'a_7', sessionId: 'hist_6', teamId: 't_cadete', date: toISODate(addDays(T, -6)) },
    { id: 'a_8', sessionId: 'hist_7', teamId: 't_cadete', date: toISODate(addDays(T, -8)) },
    { id: 'a_9', sessionId: 'hist_8', teamId: 't_primer', date: toISODate(addDays(T, -7)) },
    { id: 'a_10', sessionId: 'hist_9', teamId: 't_infantil', date: toISODate(addDays(T, -6)) },
  ];
  past.forEach((rec, i) => {
    const squad = players.filter((p) => p.teamId === rec.teamId);
    const r = rng(7000 + i * 31);
    const marks: AttendanceRecord['marks'] = {};
    squad.forEach((p, idx) => {
      const roll = r();
      // Jugadores 4, 11 y 17 del Sub-17 tienen ausentismo notable (coherente con lesiones).
      const chronic = rec.teamId === 't_sub17' && [4, 11, 17, 20].includes(idx);
      let mark: AttendanceRecord['marks'][string]['mark'] = 'presente';
      if (chronic && roll < 0.55) mark = roll < 0.3 ? 'ausente' : 'justificado';
      else if (roll > 0.93) mark = 'justificado';
      else if (roll > 0.89) mark = 'ausente';
      marks[p.id] = { mark, reason: mark === 'justificado' ? ['Examen', 'Médico', 'Motivo familiar'][idx % 3] : undefined };
    });
    out.push({ ...rec, marks, savedAt: new Date(Date.now() - (i + 1) * 26 * 3600000).toISOString() });
  });
  return out;
}

export const attendance: AttendanceRecord[] = buildAttendance();

/* ───────────────────── Plantillas y mensajes (WhatsApp) ──────────────────── */

export const templates: MessageTemplate[] = [
  {
    id: 'tpl_convocatoria', kind: 'convocatoria', name: 'Convocatoria de partido',
    description: 'Lista de convocados con hora de citación y equipación.',
    variables: ['equipo', 'rival', 'fecha', 'hora', 'campo', 'citacion', 'equipacion', 'lista'],
    body:
      '*CONVOCATORIA*\nSanta Ponsa CF — {{equipo}}\n\n⚽ {{rival}}\n📅 {{fecha}}\n🕐 {{hora}}\n📍 {{campo}}\n\n' +
      '⏰ Citación: {{citacion}}\n👕 {{equipacion}}\n\n*Convocados:*\n{{lista}}\n\n' +
      'Confirmad asistencia respondiendo a este mensaje:\n✅ Voy   ❌ No puedo   ❓ Aún no lo sé',
  },
  {
    id: 'tpl_horario', kind: 'horario', name: 'Horarios de la semana',
    description: 'Resumen semanal de entrenamientos y partido.',
    variables: ['equipo', 'semana', 'detalle'],
    body: '*HORARIOS — {{equipo}}*\nSemana del {{semana}}\n\n{{detalle}}\n\nCualquier cambio se avisará por aquí.',
  },
  {
    id: 'tpl_cambio_entreno', kind: 'cambio-entrenamiento', name: 'Cambio de entrenamiento',
    description: 'Aviso de cambio de hora o cancelación.',
    variables: ['equipo', 'fecha', 'hora_nueva', 'motivo'],
    body: '⚠️ *CAMBIO DE ENTRENAMIENTO*\n{{equipo}}\n\n📅 {{fecha}}\n🕐 Nueva hora: {{hora_nueva}}\n\nMotivo: {{motivo}}\n\nGracias por confirmar la recepción.',
  },
  {
    id: 'tpl_cambio_campo', kind: 'cambio-campo', name: 'Cambio de campo',
    description: 'Aviso de cambio de instalación.',
    variables: ['equipo', 'fecha', 'campo_nuevo'],
    body: '📍 *CAMBIO DE CAMPO*\n{{equipo}}\n\n📅 {{fecha}}\nNuevo campo: *{{campo_nuevo}}*\n\nMisma hora de citación.',
  },
  {
    id: 'tpl_info_partido', kind: 'info-partido', name: 'Información de partido',
    description: 'Detalles logísticos para familias.',
    variables: ['equipo', 'rival', 'fecha', 'hora', 'campo', 'desplazamiento'],
    body: '*PARTIDO — {{equipo}}*\n\n⚽ {{rival}}\n📅 {{fecha}}\n🕐 {{hora}}\n📍 {{campo}}\n\n🚌 {{desplazamiento}}',
  },
  {
    id: 'tpl_recordatorio', kind: 'recordatorio', name: 'Recordatorio',
    description: 'Recordatorio breve del próximo compromiso.',
    variables: ['equipo', 'que', 'cuando'],
    body: '🔔 Recordatorio {{equipo}}\n\n{{que}}\n{{cuando}}\n\nNos vemos allí.',
  },
];

export const messages: MessageThread[] = [
  {
    id: 'msg_1', channel: 'whatsapp', kind: 'convocatoria', scope: 'equipo', teamId: 't_sub17',
    subject: 'Convocatoria — Santa Ponsa CF vs Atlético Palma',
    body: 'Convocatoria del sábado con 16 jugadores y citación a las 16:15 en vestuarios.',
    status: 'entregado', createdAt: new Date(Date.now() - 30 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 30 * 3600000).toISOString(), recipients: 24,
    responses: { confirmed: 12, declined: 1, unknown: 3 }, demo: true,
  },
  {
    id: 'msg_2', channel: 'whatsapp', kind: 'cambio-campo', scope: 'equipo', teamId: 't_cadete',
    subject: 'Cambio de campo — entrenamiento del martes',
    body: 'El entrenamiento del martes pasa al Campo Anexo por mantenimiento del césped.',
    status: 'leido', createdAt: new Date(Date.now() - 52 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 52 * 3600000).toISOString(), recipients: 22, demo: true,
  },
  {
    id: 'msg_3', channel: 'whatsapp', kind: 'individual', scope: 'individual', teamId: 't_sub17',
    playerId: 'p_sub17_5', subject: 'Seguimiento de la lesión',
    body: '¿Cómo va el tobillo? Si el fisio da el visto bueno, el viernes haces trabajo específico al margen.',
    status: 'respondido', createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 6 * 3600000).toISOString(), recipients: 1, demo: true,
  },
  {
    id: 'msg_4', channel: 'whatsapp', kind: 'recordatorio', scope: 'equipo', teamId: 't_sub17',
    subject: 'Recordatorio de entrenamiento — viernes 18:30',
    body: 'Activación pre-partido el viernes a las 18:30 en el Campo Municipal.',
    status: 'programado', createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    scheduledFor: new Date(Date.now() + 26 * 3600000).toISOString(), recipients: 24, demo: true,
  },
  {
    id: 'msg_5', channel: 'whatsapp', kind: 'info-partido', scope: 'equipo', teamId: 't_infantil',
    subject: 'Desplazamiento a Andratx',
    body: 'Salida del autobús a las 08:30 desde el aparcamiento del club.',
    status: 'borrador', createdAt: new Date(Date.now() - 1 * 3600000).toISOString(), recipients: 20, demo: true,
  },
];

/* ──────────────────── Notificaciones, tareas y actividad ─────────────────── */

export const notifications: Notification[] = [
  {
    id: 'n_1', icon: 'alerta', title: '3 jugadores todavía no han confirmado',
    detail: 'Convocatoria del sábado · Sub-17', createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    read: false, link: '/app/convocatorias/c_m_1',
  },
  {
    id: 'n_2', icon: 'mensaje', title: 'Sergi Vidal ha respondido a la convocatoria',
    detail: '✅ Voy — sábado 17:30', createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    read: false, link: '/app/convocatorias/c_m_1',
  },
  {
    id: 'n_3', icon: 'calendario', title: 'Hoy tienes entrenamiento a las 19:00',
    detail: 'Sub-17 · Campo Municipal', createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    read: false, link: '/app/planificaciones/s_hoy',
  },
  {
    id: 'n_4', icon: 'partido', title: 'Partido en 3 días',
    detail: 'Santa Ponsa CF vs Atlético Palma', createdAt: new Date(Date.now() - 9 * 3600000).toISOString(),
    read: true, link: '/app/partidos/m_1',
  },
  {
    id: 'n_5', icon: 'tarea', title: 'Falta completar la convocatoria del Cadete A',
    detail: 'Todavía en borrador', createdAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    read: true, link: '/app/convocatorias/c_m_3',
  },
];

export const tasks: CoachTask[] = [
  { id: 'tk_1', title: 'Completar convocatoria del Cadete A', done: false, priority: 'alta', dueDate: iso(1), teamId: 't_cadete', link: '/app/convocatorias/c_m_3' },
  { id: 'tk_2', title: 'Confirmar campo del sábado con el coordinador', done: false, priority: 'alta', dueDate: iso(1), link: '/app/partidos/m_1' },
  { id: 'tk_3', title: 'Revisar asistencia del lunes', done: false, priority: 'media', dueDate: iso(0), teamId: 't_sub17', link: '/app/asistencia' },
  { id: 'tk_4', title: 'Preparar el entrenamiento del viernes', done: false, priority: 'media', dueDate: iso(2), teamId: 't_sub17', link: '/app/planificaciones/s_vie' },
  { id: 'tk_5', title: 'Enviar información del desplazamiento a las familias', done: false, priority: 'baja', dueDate: iso(3), teamId: 't_infantil', link: '/app/mensajes' },
  { id: 'tk_6', title: 'Hablar con el fisio sobre Adrià', done: true, priority: 'media', teamId: 't_sub17' },
];

export const activity: ActivityItem[] = [
  { id: 'ac_1', kind: 'sesion', text: 'Has creado el entrenamiento «Táctica colectiva — presión tras pérdida».', at: new Date(Date.now() - 55 * 60000).toISOString(), link: '/app/planificaciones/s_hoy' },
  { id: 'ac_2', kind: 'convocatoria', text: 'Sergi Vidal ha confirmado asistencia al partido del sábado.', at: new Date(Date.now() - 2 * 3600000).toISOString(), link: '/app/convocatorias/c_m_1' },
  { id: 'ac_3', kind: 'asistencia', text: 'Marc Sastre ha justificado su ausencia del lunes (examen).', at: new Date(Date.now() - 5 * 3600000).toISOString(), link: '/app/asistencia' },
  { id: 'ac_4', kind: 'convocatoria', text: 'La convocatoria del sábado tiene 3 jugadores pendientes.', at: new Date(Date.now() - 8 * 3600000).toISOString(), link: '/app/convocatorias/c_m_1' },
  { id: 'ac_5', kind: 'mensaje', text: 'Nuevo mensaje recibido de la familia de Dani Adrover.', at: new Date(Date.now() - 12 * 3600000).toISOString(), link: '/app/mensajes' },
  { id: 'ac_6', kind: 'jugador', text: 'Has actualizado la disponibilidad de Iván Pons a «duda».', at: new Date(Date.now() - 26 * 3600000).toISOString(), link: '/app/jugadores' },
];

export const integrations: IntegrationState[] = [
  { id: 'whatsapp', name: 'WhatsApp Business', connected: false, provider: 'WhatsApp Cloud API', detail: 'Sin conectar — los envíos se simulan y se marcan como demo.' },
  { id: 'ia', name: 'Asistente IA', connected: false, provider: 'Modelo compatible (Claude / OpenAI)', detail: 'Sin API configurada — respuestas generadas con el motor local de demostración.' },
  { id: 'calendario', name: 'Calendario externo', connected: false, provider: 'Google Calendar / iCal', detail: 'Sin conectar — la exportación .ics sí está disponible.' },
];

export const seedClubData = (): ClubData => ({
  staff, teams, players, drills, sessions, matches, callups, attendance,
  messages, templates, notifications, tasks, activity, integrations,
});
