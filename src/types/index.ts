/**
 * FFSP VLE — Modelo de dominio
 * ---------------------------------------------------------------------------
 * Estos tipos son el contrato entre la capa de datos (hoy: repositorio local
 * con datos de demostración; mañana: API real), los servicios (IA, WhatsApp)
 * y la UI. Ningún componente debería inventar su propia forma de los datos.
 */

/* ────────────────────────────── Identidad y accesos ───────────────────────── */

export type StaffRole =
  | 'entrenador'
  | 'segundo-entrenador'
  | 'preparador-fisico'
  | 'director-deportivo'
  | 'coordinador'
  | 'admin-club';

export type Permission =
  | 'teams.read'
  | 'teams.write'
  | 'players.read'
  | 'players.read.sensitive'
  | 'players.write'
  | 'sessions.read'
  | 'sessions.write'
  | 'matches.write'
  | 'callups.write'
  | 'attendance.write'
  | 'messages.send'
  | 'club.admin';

export interface Staff {
  id: string;
  name: string;
  avatar?: string;
  role: StaffRole;
  email: string;
  phone?: string;
  licence?: string; // UEFA B, Nivel 2...
  teamIds: string[]; // equipos asignados → base del control de acceso
  permissions: Permission[];
}

/* ────────────────────────────────── Equipos ───────────────────────────────── */

export type Category =
  | 'Primer Equipo'
  | 'Juvenil'
  | 'Cadete'
  | 'Infantil'
  | 'Alevín'
  | 'Benjamín';

export interface Team {
  id: string;
  name: string; // "Sub-17"
  category: Category;
  season: string; // "2025/26"
  competition: string;
  colorAccent?: string;
  staffIds: string[];
  venue: string;
  trainingSlots: { weekday: number; start: string; end: string; venue: string }[];
}

/* ───────────────────────────────── Jugadores ──────────────────────────────── */

export type PlayerPosition =
  | 'Portero'
  | 'Central'
  | 'Lateral derecho'
  | 'Lateral izquierdo'
  | 'Pivote'
  | 'Interior'
  | 'Mediapunta'
  | 'Extremo derecho'
  | 'Extremo izquierdo'
  | 'Delantero';

export type AvailabilityStatus =
  | 'disponible'
  | 'lesionado'
  | 'enfermo'
  | 'ausente'
  | 'sancionado'
  | 'duda';

export interface Availability {
  status: AvailabilityStatus;
  note?: string;
  since?: string; // ISO
  until?: string; // ISO — retorno estimado
}

export interface Guardian {
  name: string;
  relation: 'Padre' | 'Madre' | 'Tutor/a';
  phone: string;
  email?: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  shortName: string;
  photo?: string;
  number: number;
  position: PlayerPosition;
  secondaryPosition?: PlayerPosition;
  foot: 'Diestro' | 'Zurdo' | 'Ambidiestro';
  birthDate: string; // ISO
  phone?: string;
  email?: string;
  guardians: Guardian[];
  availability: Availability;
  stats: {
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    yellow: number;
    red: number;
  };
  notes?: string;
  joinedAt: string;
}

/* ──────────────────────────── Ejercicios y sesiones ───────────────────────── */

export type DrillTag =
  | 'Posesión'
  | 'Finalización'
  | 'Defensa'
  | 'Ataque'
  | 'Presión'
  | 'Transición'
  | 'Técnica'
  | 'Táctica'
  | 'Preparación física'
  | 'Calentamiento';

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
  ageRange: string; // "U15 – U19"
  players: string; // "12 – 18"
  duration: number; // minutos
  material: string[];
  description: string;
  progressions?: string[];
  tactic?: TacticShape[];
  favorite?: boolean;
  createdBy: 'club' | 'entrenador' | 'ia';
}

export interface SessionBlock {
  id: string;
  drillId?: string;
  title: string;
  duration: number;
  tags: DrillTag[];
  notes?: string;
  series?: string; // "4 x 4' / 90'' desc."
}

export type SessionStatus = 'borrador' | 'planificado' | 'completado';

export interface TrainingSession {
  id: string;
  teamId: string;
  title: string;
  date: string; // ISO
  start: string; // "19:00"
  duration: number; // minutos
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
  date: string; // ISO
  start: string;
  venue: string;
  home: boolean;
  matchday?: number;
  status: 'programado' | 'jugado' | 'aplazado';
  result?: { own: number; rival: number };
  notes?: string;
  lineup?: { playerId: string; x: number; y: number }[];
  formation?: string;
}

export type CallupResponse = 'confirmado' | 'pendiente' | 'rechazado';

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
  slots: number; // convocados máximos
  meetingTime: string;
  meetingPlace: string;
  kit: string;
  notes?: string;
  entries: CallupEntry[];
  sentAt?: string;
  status: 'borrador' | 'enviada';
}

/* ───────────────────────────────── Asistencia ─────────────────────────────── */

export type AttendanceMark = 'presente' | 'justificado' | 'ausente' | 'pendiente';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  teamId: string;
  date: string;
  marks: Record<string, { mark: AttendanceMark; reason?: string }>; // playerId → marca
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
  date: string; // ISO date (yyyy-mm-dd)
  start: string;
  end?: string;
  venue?: string;
  refId?: string; // id de la sesión / partido / convocatoria
}

/* ───────────────────────────── Mensajes / WhatsApp ────────────────────────── */

export type MessageChannel = 'whatsapp' | 'interno';
export type MessageStatus = 'borrador' | 'programado' | 'enviado' | 'entregado' | 'leido' | 'respondido';

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
  body: string; // con {{variables}}
  variables: string[];
}

export interface MessageThread {
  id: string;
  channel: MessageChannel;
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
  demo?: boolean; // marcado como simulación: no ha salido de la plataforma
}

/* ─────────────────────── Notificaciones, tareas, actividad ────────────────── */

export interface Notification {
  id: string;
  icon: 'alerta' | 'calendario' | 'mensaje' | 'tarea' | 'partido';
  title: string;
  detail?: string;
  createdAt: string;
  read: boolean;
  link?: string; // ruta accionable
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
  actor?: string;
  kind: 'sesion' | 'asistencia' | 'convocatoria' | 'mensaje' | 'jugador';
  link?: string;
}

/* ──────────────────────────── Integraciones externas ──────────────────────── */

export type IntegrationId = 'whatsapp' | 'ia' | 'calendario';

export interface IntegrationState {
  id: IntegrationId;
  name: string;
  connected: boolean;
  provider?: string;
  detail?: string;
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
  /** Bloques enriquecidos que la UI sabe renderizar (sesión generada, tabla, etc.) */
  card?:
    | { type: 'session'; session: TrainingSession }
    | { type: 'attendance'; rows: { player: string; missed: number; pct: number }[] }
    | { type: 'callup'; matchId: string; suggested: string[]; excluded: { playerId: string; reason: string }[] }
    | { type: 'message'; draft: string; teamId: string; kind: MessageTemplateKind }
    | { type: 'summary'; bullets: string[] };
  actions?: AssistantAction[];
  at: string;
  pending?: boolean;
}

/* ───────────────────────────── Estado persistido ──────────────────────────── */

export interface ClubData {
  staff: Staff[];
  teams: Team[];
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
