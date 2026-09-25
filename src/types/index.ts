/**
 * Playoff360 — Modelo de dominio
 * ---------------------------------------------------------------------------
 * Contrato único entre la base de datos (Supabase), los servicios y la interfaz.
 * Los valores de los estados coinciden exactamente con los tipos `enum` de
 * PostgreSQL definidos en supabase/migrations/0001_esquema_inicial.sql.
 */

/* ────────────────────────────── Identidad y accesos ───────────────────────── */

export type StaffRole =
  | 'entrenadora'
  | 'segunda-entrenadora'
  | 'preparadora-fisica'
  | 'directora-deportiva'
  | 'coordinadora'
  | 'admin-club';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licence?: string;
  role: StaffRole;
  avatar?: string;
  /** Equipos asignados en `team_staff`. Base del control de acceso. */
  teamIds: string[];
  createdAt?: string;
}

/**
 * El cargo que ocupa esa persona. Es descriptivo: **no concede permisos**.
 * Quién puede administrar el club lo dice `club_members.role`, y lo aplica el
 * servidor.
 */

/* ─────────────────────────────────── Club ─────────────────────────────────── */

/**
 * La plataforma es para cualquier club. Todo lo demás cuelga de aquí: quien no
 * pertenece a un club no ve nada, y el servidor lo impone con sus políticas de
 * acceso, no la interfaz.
 */
export type ClubRole = 'admin' | 'entrenadora' | 'asistente';

export const CLUB_ROLE_LABEL: Record<ClubRole, string> = {
  admin: 'Administración del club',
  entrenadora: 'Entrenadora',
  asistente: 'Asistente técnico',
};

export interface Club {
  id: string;
  name: string;
  /** El que cabe en un marcador: «Santa Ponsa CF», no su razón social. */
  shortName: string;
  city?: string;
  season?: string;
  crestUrl?: string;
  /** Rol de quien ha iniciado sesión dentro de este club. */
  role?: ClubRole;
}

/* ────────────────────────────────── Equipos ───────────────────────────────── */

export interface TrainingSlot {
  weekday: number;
  start: string;
  end: string;
  venue: string;
}

export interface Team {
  id: string;
  /**
   * El club al que pertenece. No es opcional en la base de datos: la política
   * de acceso rechaza un equipo sin club, porque un equipo huérfano no tendría
   * quién lo viera ni quién lo administrara.
   */
  clubId?: string;
  name: string;
  category: string;
  season: string;
  competition: string;
  venue: string;
  trainingSlots: TrainingSlot[];
  createdBy?: string;
}

export interface TeamStaffLink {
  teamId: string;
  profileId: string;
  role: StaffRole;
}

/* ───────────────────────────────── Jugadoras ──────────────────────────────── */

export const POSITIONS = [
  'Portera',
  'Central',
  'Lateral derecha',
  'Lateral izquierda',
  'Pivote',
  'Interior',
  'Mediapunta',
  'Extremo derecha',
  'Extremo izquierda',
  'Delantera',
] as const;

export type PlayerPosition = (typeof POSITIONS)[number];

export type AvailabilityStatus =
  | 'disponible'
  | 'lesionada'
  | 'enferma'
  | 'ausente'
  | 'sancionada'
  | 'duda';

export interface Availability {
  status: AvailabilityStatus;
  note?: string;
  since?: string;
  until?: string;
}

export interface Guardian {
  name: string;
  relation: 'Padre' | 'Madre' | 'Tutor/a';
  phone: string;
  email?: string;
}

export interface PlayerStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  shortName: string;
  photo?: string;
  number: number;
  position: PlayerPosition | '';
  secondaryPosition?: PlayerPosition;
  foot: 'Diestra' | 'Zurda' | 'Ambidiestra';
  birthDate?: string;
  phone?: string;
  email?: string;
  guardians: Guardian[];
  availability: Availability;
  stats: PlayerStats;
  notes?: string;
  joinedAt: string;
  /**
   * Una jugadora que deja el equipo se archiva, no se borra: su historial de
   * asistencia, partidos y minutos sigue siendo válido.
   */
  archivedAt?: string;
}

/* ──────────────────────────── Ejercicios y sesiones ───────────────────────── */

export const DRILL_TAGS = [
  'Posesión',
  'Finalización',
  'Defensa',
  'Ataque',
  'Presión',
  'Transición',
  'Técnica',
  'Táctica',
  'Preparación física',
  'Calentamiento',
] as const;

export type DrillTag = (typeof DRILL_TAGS)[number];

/** Elementos del editor táctico: se guardan dentro del ejercicio. */
export type TacticShape =
  | { id: string; kind: 'player'; x: number; y: number; label: string; team: 'own' | 'rival' }
  | { id: string; kind: 'ball'; x: number; y: number }
  | { id: string; kind: 'cone'; x: number; y: number }
  | { id: string; kind: 'goal'; x: number; y: number }
  | { id: string; kind: 'arrow'; x: number; y: number; x2: number; y2: number; style: 'pass' | 'run' | 'dribble' }
  | { id: string; kind: 'zone'; x: number; y: number; w: number; h: number }
  | { id: string; kind: 'text'; x: number; y: number; label: string };

export interface Drill {
  id: string;
  name: string;
  objective: string;
  tags: DrillTag[];
  ageRange: string;
  players: string;
  duration: number;
  material: string[];
  description: string;
  progressions: string[];
  /** Esquema estático heredado. Se conserva para no perder los ejercicios ya creados. */
  tactic: TacticShape[];
  /**
   * Escena animada de la pizarra (`BoardScene`). Se guarda como jsonb y se
   * valida al leerla, por eso el tipo es abierto aquí.
   */
  animation?: unknown;
  favorite?: boolean;
  createdBy?: string;
}

export interface SessionBlock {
  id: string;
  drillId?: string;
  title: string;
  duration: number;
  tags: DrillTag[];
  notes?: string;
  series?: string;
}

export type SessionStatus = 'borrador' | 'planificado' | 'completado';

export interface TrainingSession {
  id: string;
  teamId: string;
  title: string;
  date: string;
  start: string;
  duration: number;
  venue: string;
  objective: string;
  expectedPlayers: number;
  material: string[];
  notes?: string;
  blocks: SessionBlock[];
  status: SessionStatus;
  generatedByAI?: boolean;
}

/* ─────────────────────────── Partidos y convocatorias ─────────────────────── */

export interface Match {
  id: string;
  teamId: string;
  opponent: string;
  competition: string;
  date: string;
  start: string;
  venue: string;
  home: boolean;
  matchday?: number;
  status: 'programado' | 'jugado' | 'aplazado';
  result?: { own: number; rival: number };
  formation?: string;
  notes?: string;
}

export type CallupResponse = 'confirmada' | 'pendiente' | 'rechazada';

export interface CallupEntry {
  playerId: string;
  selected: boolean;
  response: CallupResponse;
  respondedAt?: string;
  reason?: string;
}

export interface Callup {
  id: string;
  matchId: string;
  teamId: string;
  slots: number;
  meetingTime: string;
  meetingPlace: string;
  kit: string;
  notes?: string;
  entries: CallupEntry[];
  sentAt?: string;
  status: 'borrador' | 'enviada';
}

/* ───────────────────────────────── Asistencia ─────────────────────────────── */

/**
 * Estados de asistencia. «sin_registrar» no es una ausencia: significa que
 * todavía nadie ha pasado lista, y así se muestra en toda la plataforma.
 */
export type AttendanceMark =
  | 'presente'
  | 'tarde'
  | 'justificada'
  | 'lesionada'
  | 'ausente'
  | 'sin_registrar';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  teamId: string;
  date: string;
  marks: Record<string, { mark: AttendanceMark; reason?: string }>;
  savedAt?: string;
}

/* ───────────────────────────── Calendario / eventos ───────────────────────── */

export type EventKind = 'entrenamiento' | 'partido' | 'convocatoria' | 'reunion' | 'evento';

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  title: string;
  subtitle?: string;
  teamId?: string;
  date: string;
  start: string;
  end?: string;
  venue?: string;
  refId?: string;
}

/* ───────────────────────────── Mensajes / WhatsApp ────────────────────────── */

export type MessageStatus =
  | 'borrador'
  | 'programado'
  | 'enviado'
  | 'entregado'
  | 'leido'
  | 'respondido';

export type MessageTemplateKind =
  | 'convocatoria'
  | 'horario'
  | 'cambio-entrenamiento'
  | 'cambio-campo'
  | 'info-partido'
  | 'recordatorio'
  | 'general'
  | 'individual';

export interface MessageTemplate {
  id: string;
  kind: MessageTemplateKind;
  name: string;
  description: string;
  body: string;
  variables: string[];
}

export interface MessageThread {
  id: string;
  channel: 'whatsapp' | 'interno';
  kind: MessageTemplateKind;
  scope: 'equipo' | 'individual';
  teamId: string;
  playerId?: string;
  subject: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
  recipients: number;
  responses?: { confirmed: number; declined: number; unknown: number };
  /** true mientras WhatsApp no esté conectado: el mensaje no ha salido. */
  simulated: boolean;
}

/* ─────────────────────── Notificaciones, tareas, actividad ────────────────── */

export interface Notification {
  id: string;
  icon: 'alerta' | 'calendario' | 'mensaje' | 'tarea' | 'partido';
  title: string;
  detail?: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export type TaskPriority = 'alta' | 'media' | 'baja';

export interface CoachTask {
  id: string;
  title: string;
  detail?: string;
  done: boolean;
  dueDate?: string;
  priority: TaskPriority;
  teamId?: string;
  link?: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  at: string;
  teamId?: string;
  kind: 'sesion' | 'asistencia' | 'convocatoria' | 'mensaje' | 'jugadora' | 'equipo';
  link?: string;
}

/* ──────────────────────────── Integraciones externas ──────────────────────── */

export type IntegrationId = 'whatsapp' | 'ia' | 'calendario';

export interface IntegrationState {
  id: IntegrationId;
  name: string;
  connected: boolean;
  provider: string;
  detail: string;
}

/* ───────────────────────────── Asistente de IA ────────────────────────────── */

export type AssistantIntent =
  | 'plan-sesion'
  | 'consulta-asistencia'
  | 'convocatoria'
  | 'mensaje'
  | 'resumen'
  | 'evolucion'
  | 'general';

export interface AssistantAction {
  id: string;
  label: string;
  kind: 'guardar-sesion' | 'editar' | 'compartir' | 'abrir' | 'enviar-whatsapp' | 'regenerar';
  payload?: unknown;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: AssistantIntent;
  card?:
    | { type: 'session'; session: TrainingSession }
    | { type: 'attendance'; rows: { player: string; missed: number; pct: number }[] }
    | { type: 'callup'; matchId: string; suggested: string[]; excluded: { playerId: string; reason: string }[] }
    | { type: 'message'; draft: string; teamId: string; kind: MessageTemplateKind }
    | { type: 'summary'; bullets: string[] };
  actions?: AssistantAction[];
  at: string;
}

/* ───────────────────────────── Estado de la sesión ────────────────────────── */

export interface ClubData {
  profile: Staff | null;
  /** El club de quien ha iniciado sesión. `null` mientras no tenga ninguno. */
  club: Club | null;
  /** El personal visible: quien comparte club, según decide el servidor. */
  staff: Staff[];
  teams: Team[];
  teamStaff: TeamStaffLink[];
  players: Player[];
  drills: Drill[];
  sessions: TrainingSession[];
  matches: Match[];
  callups: Callup[];
  attendance: AttendanceRecord[];
  messages: MessageThread[];
  templates: MessageTemplate[];
  notifications: Notification[];
  tasks: CoachTask[];
  activity: ActivityItem[];
  integrations: IntegrationState[];
}

export const EMPTY_CLUB_DATA: ClubData = {
  profile: null,
  club: null,
  staff: [],
  teams: [],
  teamStaff: [],
  players: [],
  drills: [],
  sessions: [],
  matches: [],
  callups: [],
  attendance: [],
  messages: [],
  templates: [],
  notifications: [],
  tasks: [],
  activity: [],
  integrations: [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      connected: false,
      provider: 'WhatsApp Cloud API',
      detail:
        'Sin conectar. Los mensajes se guardan en la plataforma y se marcan como no enviados hasta que el club ' +
        'introduzca sus credenciales.',
    },
    {
      id: 'ia',
      name: 'Asistente IA',
      connected: false,
      provider: 'Modelo compatible (Claude / OpenAI)',
      detail:
        'Sin API configurada. El asistente funciona con el motor local, que consulta tus datos reales pero no ' +
        'llama a ningún modelo externo.',
    },
    {
      id: 'calendario',
      name: 'Calendario externo',
      connected: false,
      provider: 'Google Calendar / iCal',
      detail: 'Sin conectar. La exportación en formato .ics sí está disponible.',
    },
  ],
};
