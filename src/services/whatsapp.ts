/**
 * Capa de integración con WhatsApp.
 * ---------------------------------------------------------------------------
 * HONESTIDAD DEL PRODUCTO: mientras `connected` sea false, NADA sale de la
 * plataforma. `send()` devuelve un resultado marcado como `simulated: true` y
 * la UI lo etiqueta como demostración. No se afirma en ningún sitio que un
 * mensaje haya llegado a un teléfono real.
 *
 * Para conectar de verdad basta con implementar `transport` contra la
 * WhatsApp Cloud API (plantillas aprobadas + webhook de estados) y devolver
 * `simulated: false`. El resto de la aplicación no cambia.
 */

import type { Callup, Match, MessageTemplate, MessageTemplateKind, Player, Team } from '@/types';
import { CLUB_NAME, longDate } from '@/lib/utils';

export interface WhatsAppRecipient {
  name: string;
  phone: string;
  playerId?: string;
}

export interface SendRequest {
  teamId: string;
  kind: MessageTemplateKind;
  body: string;
  recipients: WhatsAppRecipient[];
  scheduledFor?: string;
}

export interface SendResult {
  ok: boolean;
  simulated: boolean;
  deliveredTo: number;
  /** Identificador que devolvería el proveedor real. */
  providerMessageId: string;
  message: string;
}

let connected = false;

export const whatsapp = {
  isConnected: () => connected,

  /** Alta de la integración. Con proveedor real aquí iría el flujo OAuth / QR. */
  async connect(): Promise<{ ok: boolean; reason?: string }> {
    await new Promise((r) => setTimeout(r, 700));
    return {
      ok: false,
      reason:
        'La conexión con WhatsApp Business requiere credenciales del club (WhatsApp Cloud API: número verificado, ' +
        'token permanente y plantillas aprobadas por Meta). La interfaz y la capa de integración ya están listas: ' +
        'en cuanto se introduzcan las credenciales, los envíos dejarán de ser simulados.',
    };
  },

  async send(req: SendRequest): Promise<SendResult> {
    await new Promise((r) => setTimeout(r, 900));
    if (!connected) {
      return {
        ok: true,
        simulated: true,
        deliveredTo: req.recipients.length,
        providerMessageId: `demo_${Date.now().toString(36)}`,
        message:
          `Vista previa registrada para ${req.recipients.length} destinatario(s). ` +
          'WhatsApp no está conectado: el mensaje NO ha salido de la plataforma.',
      };
    }
    // Punto de extensión real: POST /v20.0/{phone_number_id}/messages
    throw new Error('Transporte real de WhatsApp no implementado en esta versión.');
  },

  /** Enlace wa.me — permite enviarlo hoy mismo desde el WhatsApp de la entrenadora. */
  deepLink(phone: string, body: string): string {
    return `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(body)}`;
  },
};

/* ─────────────────────────── Composición de mensajes ─────────────────────── */

export const renderTemplate = (tpl: MessageTemplate, vars: Record<string, string>): string =>
  tpl.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);

/** Genera el texto exacto de una convocatoria tal y como se verá en WhatsApp. */
export function buildCallupMessage(
  callup: Callup,
  match: Match,
  team: Team,
  squad: Player[],
): string {
  const called = callup.entries
    .filter((e) => e.selected)
    .map((e) => squad.find((p) => p.id === e.playerId))
    .filter(Boolean) as Player[];

  const list = called
    .sort((a, b) => a.number - b.number)
    .map((p, i) => `${i + 1}. ${p.shortName}`)
    .join('\n');

  const fixture = match.home
    ? `${CLUB_NAME} vs ${match.opponent}`
    : `${match.opponent} vs ${CLUB_NAME}`;

  return [
    '*CONVOCATORIA*',
    `${CLUB_NAME} — ${team.name}`,
    '',
    `⚽ ${fixture}`,
    `📅 ${longDate(match.date)}`,
    `🕐 ${match.start}`,
    `📍 ${match.venue}`,
    '',
    `⏰ Citación: ${callup.meetingTime} — ${callup.meetingPlace}`,
    `👕 ${callup.kit}`,
    ...(callup.notes ? ['', `📝 ${callup.notes}`] : []),
    '',
    `*Convocadas (${called.length}):*`,
    list,
    '',
    'Confirmad asistencia respondiendo a este mensaje:',
    '✅ Voy   ❌ No puedo   ❓ Aún no lo sé',
  ].join('\n');
}
