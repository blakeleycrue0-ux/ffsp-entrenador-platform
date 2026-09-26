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
  ausente: { label: 'Ausente', tone: 'neutral', dot: 'bg-ink-400' },
};

export const AVAILABILITY_ORDER: AvailabilityStatus[] = [
  'disponible', 'duda', 'lesionada', 'enferma', 'sancionada', 'ausente',
];

/** Lo que se enseña cuando la base dice algo que esta versión no conoce. */
const DISPONIBILIDAD_DESCONOCIDA = {
  label: 'Sin estado', tone: 'neutral', dot: 'bg-ink-300',
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

/* Sobre negro el mismo tono no vale: hace falta un fondo tintado oscuro y el
   texto claro, o la etiqueta se convierte en una mancha pálida. */
export const LINEA: Record<Linea, { label: string; chip: string; dot: string }> = {
  porteria: { label: 'Portería', chip: 'bg-pos-portera/15 text-pos-portera border-transparent', dot: 'bg-pos-portera' },
  defensa: { label: 'Defensa', chip: 'bg-pos-defensa/15 text-pos-defensa border-transparent', dot: 'bg-pos-defensa' },
  medio: { label: 'Medio', chip: 'bg-pos-medio/15 text-pos-medio border-transparent', dot: 'bg-pos-medio' },
  ataque: { label: 'Ataque', chip: 'bg-pos-delantera/15 text-pos-delantera border-transparent', dot: 'bg-pos-delantera' },
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
  sin_registrar: { label: 'Sin registrar', short: '—', tone: 'neutral', bg: 'bg-ink-300', text: 'text-ink-400' },
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
  /* Entrenamiento y partido se distinguían por dos tonos de gris que, sobre
     negro, acaban siendo el mismo punto blanco. El partido es lo que de
     verdad marca la semana, así que se queda el blanco; el entrenamiento
     baja a gris medio, que sí se diferencia. */
  entrenamiento: {
    label: 'Entrenamiento',
    bar: 'bg-ink-500',
    chip: 'bg-ink-100 text-ink-700 border-transparent',
    dot: 'bg-ink-500',
  },
  partido: {
    label: 'Partido',
    bar: 'bg-ink-900',
    chip: 'bg-ink-900 text-ink-0 border-transparent',
    dot: 'bg-ink-900',
  },
  convocatoria: {
    label: 'Convocatoria',
    bar: 'bg-warn',
    chip: 'bg-warn/15 text-warn border-transparent',
    dot: 'bg-warn',
  },
  reunion: { label: 'Reunión', bar: 'bg-info', chip: 'bg-info/15 text-info border-transparent', dot: 'bg-info' },
  evento: { label: 'Evento', bar: 'bg-ink-300', chip: 'bg-ink-100 text-ink-600 border-transparent', dot: 'bg-ink-300' },
};
