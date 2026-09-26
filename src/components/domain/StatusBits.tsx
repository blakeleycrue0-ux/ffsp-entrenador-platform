/**
 * Piezas de dominio compartidas: disponibilidad, asistencia, respuestas de
 * convocatoria, mensajes y tipos de evento. Un único lugar decide qué color y
 * qué palabra corresponde a cada estado en toda la plataforma.
 */

import type { AttendanceMark, AvailabilityStatus, CallupResponse, EventKind, MessageStatus } from '@/types';
import { Tag } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Búsqueda tolerante en las tablas de estados.
 * ---------------------------------------------------------------------------
 * Estas tablas traducen un valor de la BASE DE DATOS a una palabra y un color.
 * Leerlas con `TABLA[valor]` a secas es una bomba de relojería: basta con que
 * alguien añada un estado en la base, o que una fila antigua tenga el campo
 * vacío, para que salga `undefined` y la pantalla entera reviente al pedirle
 * `.tone`. Ocurrió con la plantilla.
 *
 * Un estado que no conocemos es un dato que no sabemos leer, no un motivo para
 * tirar la aplicación: se dice que no se sabe y se sigue.
 */
export function deTabla<T>(tabla: Record<string, T>, clave: unknown, respaldo: T): T {
  return (typeof clave === 'string' && tabla[clave]) || respaldo;
}

/* ─────────────────────────────── Disponibilidad ──────────────────────────── */

export const AVAILABILITY: Record<
  AvailabilityStatus,
  { label: string; tone: 'ok' | 'warn' | 'bad' | 'neutral'; dot: string }
> = {
  disponible: { label: 'Disponible', tone: 'ok', dot: 'bg-ok' },
  duda: { label: 'Duda', tone: 'warn', dot: 'bg-warn' },
  lesionada: { label: 'Lesionada', tone: 'bad', dot: 'bg-bad' },
  enferma: { label: 'Enferma', tone: 'bad', dot: 'bg-bad' },
  sancionada: { label: 'Sancionada', tone: 'bad', dot: 'bg-bad' },
  ausente: { label: 'Ausente', tone: 'neutral', dot: 'bg-navy-400' },
};

export const AVAILABILITY_ORDER: AvailabilityStatus[] = [
  'disponible', 'duda', 'lesionada', 'enferma', 'sancionada', 'ausente',
];

/** Lo que se enseña cuando la base dice algo que esta versión no conoce. */
const DISPONIBILIDAD_DESCONOCIDA = {
  label: 'Sin estado', tone: 'neutral', dot: 'bg-navy-300',
} as const;

/** Siempre por aquí, nunca `AVAILABILITY[x]` a pelo. */
export const disponibilidad = (status: unknown) =>
  deTabla<{ label: string; tone: 'ok' | 'warn' | 'bad' | 'neutral'; dot: string }>(
    AVAILABILITY, status, DISPONIBILIDAD_DESCONOCIDA,
  );

export const AvailabilityBadge = ({ status, size = 'md' }: { status: AvailabilityStatus; size?: 'sm' | 'md' }) => {
  const a = disponibilidad(status);
  return (
    <Tag tone={a.tone} size={size} dot>
      {a.label}
    </Tag>
  );
};

export const AvailabilityDot = ({ status, className }: { status: AvailabilityStatus; className?: string }) => (
  <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', disponibilidad(status).dot, className)} />
);

/* ─────────────────────────────── Posiciones ──────────────────────────────── */

/**
 * La línea del campo a la que pertenece cada posición, con su color.
 * ---------------------------------------------------------------------------
 * Una plantilla de veinte nombres con la posición escrita en gris se lee
 * nombre a nombre. Agrupada por color, se ve de un vistazo cuántas porteras
 * hay y si falta gente atrás. Es color CON SIGNIFICADO, que es el único que
 * merece la pena: nunca sustituye a la palabra, la acompaña.
 */
export type Linea = 'porteria' | 'defensa' | 'medio' | 'ataque';

const LINEA_DE: Record<string, Linea> = {
  Portera: 'porteria',
  Central: 'defensa',
  'Lateral derecha': 'defensa',
  'Lateral izquierda': 'defensa',
  Pivote: 'medio',
  Interior: 'medio',
  Mediapunta: 'medio',
  'Extremo derecha': 'ataque',
  'Extremo izquierda': 'ataque',
  Delantera: 'ataque',
};

export const LINEA: Record<Linea, { label: string; chip: string; dot: string }> = {
  porteria: { label: 'Portería', chip: 'bg-[#FBEDE4] text-[#8A480F] border-[#E9CDB6]', dot: 'bg-[#B25E09]' },
  defensa: { label: 'Defensa', chip: 'bg-[#E7EEFB] text-[#1B5099] border-[#C4D5F2]', dot: 'bg-[#1F63B8]' },
  medio: { label: 'Medio', chip: 'bg-[#E6F6EE] text-[#046040] border-[#BDE4D2]', dot: 'bg-[#047A4E]' },
  ataque: { label: 'Ataque', chip: 'bg-[#FBE9EC] text-[#93262F] border-[#EEC6CC]', dot: 'bg-[#B3372C]' },
};

/** Sin posición asignada no se inventa ninguna línea: se dice que no la hay. */
export const lineaDe = (position: string | undefined | null): Linea | null =>
  (position && LINEA_DE[position]) || null;

/* ─────────────────────────────── Asistencia ──────────────────────────────── */

export const ATTENDANCE: Record<
  AttendanceMark,
  { label: string; short: string; tone: 'ok' | 'warn' | 'bad' | 'neutral'; bg: string; text: string }
> = {
  presente: { label: 'Presente', short: 'P', tone: 'ok', bg: 'bg-ok', text: 'text-ok' },
  tarde: { label: 'Llegó tarde', short: 'T', tone: 'warn', bg: 'bg-warn', text: 'text-warn' },
  justificada: { label: 'Justificada', short: 'J', tone: 'warn', bg: 'bg-warn', text: 'text-warn' },
  lesionada: { label: 'Lesionada', short: 'L', tone: 'bad', bg: 'bg-bad', text: 'text-bad' },
  ausente: { label: 'Ausente', short: 'A', tone: 'bad', bg: 'bg-bad', text: 'text-bad' },
  sin_registrar: { label: 'Sin registrar', short: '—', tone: 'neutral', bg: 'bg-navy-300', text: 'text-navy-400' },
};

/** Orden en el que se ofrecen las marcas al pasar lista. */
export const ATTENDANCE_ORDER: AttendanceMark[] = [
  'presente', 'tarde', 'justificada', 'lesionada', 'ausente', 'sin_registrar',
];

/** Igual que en disponibilidad: una marca desconocida no tumba la lista. */
export const asistencia = (mark: unknown) =>
  deTabla(ATTENDANCE, mark, ATTENDANCE.sin_registrar);

/* ─────────────────────────── Respuesta a convocatoria ────────────────────── */

export const CALLUP_RESPONSE: Record<
  CallupResponse,
  { label: string; tone: 'ok' | 'warn' | 'bad' }
> = {
  confirmada: { label: 'Confirmada', tone: 'ok' },
  pendiente: { label: 'Pendiente', tone: 'warn' },
  rechazada: { label: 'No puede', tone: 'bad' },
};

export const respuesta = (r: unknown) =>
  deTabla(CALLUP_RESPONSE, r, { label: 'Sin respuesta', tone: 'warn' as const });

export const CallupResponseBadge = ({ response }: { response: CallupResponse }) => {
  const r = respuesta(response);
  return (
    <Tag tone={r.tone} size="sm" dot>
      {r.label}
    </Tag>
  );
};

/* ─────────────────────────────── Mensajería ──────────────────────────────── */

export const MESSAGE_STATUS: Record<
  MessageStatus,
  { label: string; tone: 'neutral' | 'info' | 'ok' | 'solid' | 'warn' }
> = {
  borrador: { label: 'Borrador', tone: 'neutral' },
  programado: { label: 'Programado', tone: 'warn' },
  enviado: { label: 'Enviado', tone: 'info' },
  entregado: { label: 'Entregado', tone: 'info' },
  leido: { label: 'Leído', tone: 'solid' },
  respondido: { label: 'Respondido', tone: 'ok' },
};

/* ────────────────────────────── Tipos de evento ──────────────────────────── */

export const EVENT_KIND: Record<EventKind, { label: string; bar: string; chip: string; dot: string }> = {
  entrenamiento: {
    label: 'Entrenamiento',
    bar: 'bg-navy-800',
    chip: 'bg-navy-50 text-navy-900 border-navy-200/70',
    dot: 'bg-navy-800',
  },
  partido: {
    label: 'Partido',
    bar: 'bg-navy-900',
    chip: 'bg-navy-100 text-navy-900 border-navy-300/70',
    dot: 'bg-navy-900',
  },
  convocatoria: {
    label: 'Convocatoria',
    bar: 'bg-warn',
    chip: 'bg-warn/10 text-warn border-warn/30',
    dot: 'bg-warn',
  },
  reunion: { label: 'Reunión', bar: 'bg-info', chip: 'bg-info/10 text-info border-info/25', dot: 'bg-info' },
  evento: { label: 'Evento', bar: 'bg-navy-400', chip: 'bg-navy-100 text-navy-600 border-line', dot: 'bg-navy-400' },
};
