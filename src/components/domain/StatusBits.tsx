/**
 * Piezas de dominio compartidas: estados de disponibilidad, asistencia,
 * respuestas de convocatoria y mensajes. Un único lugar decide qué color y
 * qué palabra corresponde a cada estado en toda la plataforma.
 */

import type { AttendanceMark, AvailabilityStatus, CallupResponse, EventKind, MessageStatus } from '@/types';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ─────────────────────────────── Disponibilidad ──────────────────────────── */

export const AVAILABILITY: Record<
  AvailabilityStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; dot: string }
> = {
  disponible: { label: 'Disponible', tone: 'success', dot: 'bg-pitch' },
  duda: { label: 'Duda', tone: 'warning', dot: 'bg-sun' },
  lesionado: { label: 'Lesionado', tone: 'danger', dot: 'bg-danger' },
  enfermo: { label: 'Enfermo', tone: 'danger', dot: 'bg-danger' },
  sancionado: { label: 'Sancionado', tone: 'danger', dot: 'bg-danger' },
  ausente: { label: 'Ausente', tone: 'neutral', dot: 'bg-ink-400' },
};

export const AvailabilityBadge = ({ status, size = 'md' }: { status: AvailabilityStatus; size?: 'sm' | 'md' }) => {
  const a = AVAILABILITY[status];
  return (
    <Badge tone={a.tone} size={size} dot>
      {a.label}
    </Badge>
  );
};

export const AvailabilityDot = ({ status, className }: { status: AvailabilityStatus; className?: string }) => (
  <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', AVAILABILITY[status].dot, className)} />
);

/* ─────────────────────────────── Asistencia ──────────────────────────────── */

export const ATTENDANCE: Record<
  AttendanceMark,
  { label: string; short: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; bg: string; ring: string; text: string }
> = {
  presente: { label: 'Presente', short: 'P', tone: 'success', bg: 'bg-pitch', ring: 'ring-pitch', text: 'text-pitch' },
  justificado: { label: 'Justificado', short: 'J', tone: 'warning', bg: 'bg-sun', ring: 'ring-sun', text: 'text-sun' },
  ausente: { label: 'Ausente', short: 'A', tone: 'danger', bg: 'bg-danger', ring: 'ring-danger', text: 'text-danger' },
  pendiente: { label: 'Pendiente', short: '—', tone: 'neutral', bg: 'bg-ink-300', ring: 'ring-ink-300', text: 'text-ink-400' },
};

/* ─────────────────────────── Respuesta a convocatoria ────────────────────── */

export const CALLUP_RESPONSE: Record<CallupResponse, { label: string; tone: 'success' | 'warning' | 'danger'; icon: string }> = {
  confirmado: { label: 'Confirmado', tone: 'success', icon: '✅' },
  pendiente: { label: 'Pendiente', tone: 'warning', icon: '❓' },
  rechazado: { label: 'No puede', tone: 'danger', icon: '❌' },
};

export const CallupResponseBadge = ({ response }: { response: CallupResponse }) => {
  const r = CALLUP_RESPONSE[response];
  return (
    <Badge tone={r.tone} size="sm" dot>
      {r.label}
    </Badge>
  );
};

/* ─────────────────────────────── Mensajería ──────────────────────────────── */

export const MESSAGE_STATUS: Record<MessageStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'brand' | 'warning' }> = {
  borrador: { label: 'Borrador', tone: 'neutral' },
  programado: { label: 'Programado', tone: 'warning' },
  enviado: { label: 'Enviado', tone: 'info' },
  entregado: { label: 'Entregado', tone: 'info' },
  leido: { label: 'Leído', tone: 'brand' },
  respondido: { label: 'Respondido', tone: 'success' },
};

/* ────────────────────────────── Tipos de evento ──────────────────────────── */

export const EVENT_KIND: Record<EventKind, { label: string; bar: string; chip: string; dot: string }> = {
  entrenamiento: { label: 'Entrenamiento', bar: 'bg-brand-600', chip: 'bg-brand-50 text-brand-800 border-brand-200/70', dot: 'bg-brand-600' },
  partido: { label: 'Partido', bar: 'bg-brand-800', chip: 'bg-brand-100 text-brand-900 border-brand-300/70', dot: 'bg-brand-800' },
  convocatoria: { label: 'Convocatoria', bar: 'bg-sun', chip: 'bg-sun/10 text-[#9A6412] border-sun/30', dot: 'bg-sun' },
  reunion: { label: 'Reunión', bar: 'bg-sea', chip: 'bg-sea/10 text-[#28618C] border-sea/25', dot: 'bg-sea' },
  evento: { label: 'Evento', bar: 'bg-ink-400', chip: 'bg-ink-100 text-ink-600 border-ink-200', dot: 'bg-ink-400' },
};
