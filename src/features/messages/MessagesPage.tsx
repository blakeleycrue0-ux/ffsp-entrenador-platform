import { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCheck, Clock, FileText, MessageSquare, Plus, Send, Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Tabs } from '@/components/ui';
import { MESSAGE_STATUS } from '@/components/domain/StatusBits';
import { WhatsAppStatusChip } from './WhatsAppPreview';
import { cn, relativeTime } from '@/lib/utils';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'equipos', label: 'Equipos' },
  { id: 'individuales', label: 'Individuales' },
  { id: 'plantillas', label: 'Plantillas' },
  { id: 'programados', label: 'Programados' },
];

export default function MessagesPage() {
  const { data } = useClub();
  const teams = visibleTeams(data);
  const [tab, setTab] = useState('todos');

  const messages = useMemo(() => {
    const mine = data.messages.filter((m) => teams.some((t) => t.id === m.teamId));
    const sorted = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (tab === 'equipos') return sorted.filter((m) => m.scope === 'equipo');
    if (tab === 'individuales') return sorted.filter((m) => m.scope === 'individual');
    if (tab === 'programados') return sorted.filter((m) => m.status === 'programado');
    return sorted;
  }, [data.messages, teams, tab]);

  const counts = useMemo(() => {
    const mine = data.messages.filter((m) => teams.some((t) => t.id === m.teamId));
    return {
      todos: mine.length,
      equipos: mine.filter((m) => m.scope === 'equipo').length,
      individuales: mine.filter((m) => m.scope === 'individual').length,
      plantillas: data.templates.length,
      programados: mine.filter((m) => m.status === 'programado').length,
    };
  }, [data.messages, data.templates, teams]);

  const whatsappConnected = data.integrations.find((i) => i.id === 'whatsapp')?.connected ?? false;

  return (
    <>
      <PageHeader
        eyebrow={<WhatsAppStatusChip />}
        title="Mensajes"
        description="Convocatorias, horarios, cambios y recordatorios. Todo con vista previa antes de enviar."
        actions={
          <LinkButton to="/app/mensajes/nuevo" size="sm" icon={<Plus size={16} />}>
            Nuevo mensaje
          </LinkButton>
        }
      />

      {!whatsappConnected && (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 border-sun/30 bg-sun/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#B87C1C]" />
            <div>
              <p className="text-[14px] font-medium text-[#8A5A10]">WhatsApp Business no está conectado</p>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#8A5A10]/85">
                La interfaz y la capa de integración están completas, pero hasta que el club introduzca sus credenciales
                los envíos se registran dentro de la plataforma y se marcan como no enviados. Nunca decimos que un mensaje ha
                salido si no lo ha hecho.
              </p>
            </div>
          </div>
          <LinkButton to="/app/configuracion" size="sm" variant="outline">
            Conectar WhatsApp
          </LinkButton>
        </Card>
      )}

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={TABS.map((t) => ({ ...t, count: counts[t.id as keyof typeof counts] }))}
      />

      {tab === 'plantillas' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.templates.map((t) => (
            <Card key={t.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <FileText size={17} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold leading-tight">{t.name}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{t.description}</p>
                </div>
              </div>

              <pre className="mt-4 max-h-32 overflow-hidden whitespace-pre-wrap rounded-xl bg-ink-50 p-3 font-sans text-[12px] leading-relaxed text-ink-600">
                {t.body.slice(0, 200)}
                {t.body.length > 200 && '…'}
              </pre>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.variables.slice(0, 5).map((v) => (
                  <span key={v} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>

              <LinkButton
                to="/app/mensajes/nuevo"
                state={{ templateId: t.id }}
                size="sm"
                variant="secondary"
                className="mt-4"
                block
              >
                Usar plantilla
              </LinkButton>
            </Card>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageSquare size={26} />}
            title="No hay mensajes en esta bandeja"
            description="Cuando envíes una convocatoria o un aviso al equipo, aparecerá aquí con su estado de entrega."
            action={
              <LinkButton to="/app/mensajes/nuevo" size="sm">
                Escribir mensaje
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const team = data.teams.find((t) => t.id === m.teamId);
            const s = MESSAGE_STATUS[m.status];
            return (
              <Card key={m.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-semibold leading-tight">{m.subject}</h3>
                      <Badge tone={s.tone} size="sm">
                        {s.label}
                      </Badge>
                      {m.simulated && (
                        <Badge tone="warning" size="sm">
                          Simulado
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-500">{m.body}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12.5px] text-ink-400">{relativeTime(m.sentAt ?? m.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-100 pt-3 text-[12.5px] text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="text-ink-400" /> {team?.name}
                    {m.scope === 'individual' && ' · individual'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Send size={13} className="text-ink-400" /> {m.recipients} destinatarios
                  </span>
                  {m.scheduledFor && (
                    <span className="flex items-center gap-1.5 text-[#9A6412]">
                      <Clock size={13} /> Programado para {relativeTime(m.scheduledFor)}
                    </span>
                  )}
                  {m.responses && (
                    <span className="ml-auto flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[#1F6B44]">
                        <CheckCheck size={13} /> {m.responses.confirmed} confirmados
                      </span>
                      <span className="text-danger">{m.responses.declined} no pueden</span>
                      <span className={cn(m.responses.unknown > 0 && 'text-[#9A6412]')}>
                        {m.responses.unknown} sin responder
                      </span>
                    </span>
                  )}
                </div>

                {m.status === 'borrador' && (
                  <div className="mt-3.5 flex gap-2">
                    <LinkButton to="/app/mensajes/nuevo" state={{ draft: m.body, teamId: m.teamId }} size="sm">
                      Continuar borrador
                    </LinkButton>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50/50 p-5">
        <h3 className="text-[14.5px] font-semibold">Cómo responden las familias</h3>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-500">
          Cada convocatoria incluye tres respuestas rápidas: <strong className="font-medium text-ink-700">✅ Voy</strong>,{' '}
          <strong className="font-medium text-ink-700">❌ No puedo</strong> y{' '}
          <strong className="font-medium text-ink-700">❓ Aún no lo sé</strong>. Cuando WhatsApp esté conectado, el
          webhook de respuestas actualizará el estado de cada jugadora en la convocatoria sin que tengas que anotar nada.
        </p>
      </div>
    </>
  );
}
