/**
 * Piezas de dominio compartidas: disponibilidad, asistencia, respuestas de
 * convocatoria, mensajes y tipos de evento. Un único lugar decide qué color y
 * qué palabra corresponde a cada estado en toda la plataforma.
 */

import type { AttendanceMark, AvailabilityStatus, CallupResponse, EventKind, MessageStatus } from '@/types';
import { Tag } from '@/components/ui';
import { cn } from '@/lib/utils';

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

export const AvailabilityBadge = ({ status, size = 'md' }: { status: AvailabilityStatus; size?: 'sm' | 'md' }) => {
  const a = AVAILABILITY[status];
  return (
    <Tag tone={a.tone} size={size} dot>
      {a.label}
    </Tag>
  );
};

export const AvailabilityDot = ({ status, className }: { status: AvailabilityStatus; className?: string }) => (
  <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', AVAILABILITY[status].dot, className)} />
);

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

/* ─────────────────────────── Respuesta a convocatoria ────────────────────── */

export const CALLUP_RESPONSE: Record<
  CallupResponse,
  { label: string; tone: 'ok' | 'warn' | 'bad' }
> = {
  confirmada: { label: 'Confirmada', tone: 'ok' },
  pendiente: { label: 'Pendiente', tone: 'warn' },
  rechazada: { label: 'No puede', tone: 'bad' },
};

export const CallupResponseBadge = ({ response }: { response: CallupResponse }) => {
  const r = CALLUP_RESPONSE[response];
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
