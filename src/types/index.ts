/**
 * FFSP — Modelo de dominio
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

/** Roles con permiso para crear equipos y asignar cuerpo técnico. */
export const COORDINATOR_ROLES: StaffRole[] = ['coordinadora', 'directora-deportiva', 'admin-club'];

/* ────────────────────────────────── Equipos ───────────────────────────────── */

export interface TrainingSlot {
  weekday: number;
  start: string;
  end: string;
  venue: string;
}

export interface Team {
  id: string;
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
  tactic: TacticShape[];
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

export type AttendanceMark = 'presente' | 'justificada' | 'ausente' | 'pendiente';

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
  /** Sólo el personal visible: uno mismo, o todo el club si eres coordinadora. */
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
