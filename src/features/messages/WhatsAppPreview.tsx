/**
 * Vista previa y envío por WhatsApp.
 * ---------------------------------------------------------------------------
 * Único punto de la aplicación desde el que sale comunicación externa. Muestra
 * el mensaje EXACTO que recibirán las familias y, mientras la integración no
 * esté conectada, deja claro que el envío es una simulación.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Link2, PencilLine, Send, Users } from 'lucide-react';
import { Badge, Button, Modal, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { whatsapp, type WhatsAppRecipient } from '@/services/whatsapp';
import { useClub } from '@/store/store';
import { cn } from '@/lib/utils';

export interface SendPayload {
  body: string;
  recipients: WhatsAppRecipient[];
  teamId: string;
  subject: string;
}

export function WhatsAppPreviewModal({
  open, onClose, body, recipients, teamId, subject, onSent,
}: {
  open: boolean;
  onClose: () => void;
  body: string;
  recipients: WhatsAppRecipient[];
  teamId: string;
  subject: string;
  onSent?: (payload: SendPayload & { simulated: boolean }) => void;
}) {
  const { data } = useClub();
  const toast = useToast();
  const [text, setText] = useState(body);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const integration = data.integrations.find((i) => i.id === 'whatsapp');
  const connected = integration?.connected ?? false;

  useEffect(() => {
    if (open) {
      setText(body);
      setEditing(false);
    }
  }, [open, body]);

  const send = async () => {
    setBusy(true);
    const result = await whatsapp.send({ teamId, kind: 'convocatoria', body: text, recipients });
    setBusy(false);
    onSent?.({ body: text, recipients, teamId, subject, simulated: result.simulated });
    if (result.simulated) {
      toast.success(
        'Mensaje registrado en la plataforma ✓',
        `Preparado para ${result.deliveredTo} destinatarios. WhatsApp no está conectado: el mensaje NO ha salido del VLE.`,
      );
    } else {
      toast.success('Convocatoria enviada ✓', `Entregada a ${result.deliveredTo} destinatarios.`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Vista previa del mensaje"
      subtitle={`${recipients.length} destinatario${recipients.length === 1 ? '' : 's'} · así lo recibirán exactamente`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="outline" icon={<PencilLine size={15} />} onClick={() => setEditing((e) => !e)}>
            {editing ? 'Ver previa' : 'Editar'}
          </Button>
          <Button variant="whatsapp" icon={<Send size={16} />} loading={busy} onClick={send}>
            Enviar por WhatsApp
          </Button>
        </>
      }
    >
      {!connected && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-sun/30 bg-sun/5 p-3.5">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#B87C1C]" />
          <div className="text-[12.5px] leading-relaxed text-[#8A5A10]">
            <p className="font-semibold">WhatsApp no está conectado</p>
            <p className="mt-1">
              El envío quedará registrado en la plataforma y marcado como simulación: no llegará a ningún teléfono.
              Puedes conectar WhatsApp Business desde Configuración → Integraciones.
            </p>
          </div>
        </div>
      )}

      {editing ? (
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[320px] font-mono text-[13px]" />
      ) : (
        <div className="rounded-xl bg-[#ECE5DD] p-4">
          <div className="relative max-w-[92%] rounded-xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
            <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-800">{text}</p>
            <p className="mt-2 text-right text-[10.5px] text-ink-400">
              {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · vista previa
            </p>
          </div>
        </div>
      )}

      {/* Destinatarios */}
      <div className="mt-4">
        <p className="flex items-center gap-2 text-[12.5px] font-medium text-ink-600">
          <Users size={14} className="text-ink-400" /> Destinatarios
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recipients.slice(0, 12).map((r) => (
            <span key={r.phone + r.name} className="rounded-lg bg-ink-100 px-2 py-1 text-[12px] text-ink-600">
              {r.name}
            </span>
          ))}
          {recipients.length > 12 && (
            <span className="rounded-lg bg-ink-100 px-2 py-1 text-[12px] text-ink-500">
              +{recipients.length - 12} más
            </span>
          )}
        </div>
      </div>

      {/* Alternativa inmediata: abrir el WhatsApp del propio entrenador */}
      {recipients.length === 1 && recipients[0].phone && (
        <a
          href={whatsapp.deepLink(recipients[0].phone, text)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-2 text-[12.5px] font-medium text-brand-700 hover:text-brand-800"
        >
          <Link2 size={14} /> Abrir en mi WhatsApp para enviarlo yo mismo
        </a>
      )}
    </Modal>
  );
}

/** Chip de estado de la integración, reutilizable en cabeceras. */
export function WhatsAppStatusChip({ className }: { className?: string }) {
  const { data } = useClub();
  const connected = data.integrations.find((i) => i.id === 'whatsapp')?.connected ?? false;
  return (
    <Badge tone={connected ? 'success' : 'warning'} size="sm" className={cn(className)} dot>
      {connected ? 'WhatsApp conectado' : 'WhatsApp sin conectar'}
    </Badge>
  );
}
