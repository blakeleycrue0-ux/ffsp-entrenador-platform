import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, FileText, Save, Send, Users } from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, squadOf, visibleTeams } from '@/store/selectors';
import { renderTemplate } from '@/services/whatsapp';
import {
  Badge, Button, Card, Field, Input, PageHeader, Select, Textarea, Toggle,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { WhatsAppPreviewModal, WhatsAppStatusChip } from './WhatsAppPreview';
import { cn, longDate, uid } from '@/lib/utils';
import type { MessageTemplateKind } from '@/types';

interface ComposerState {
  draft?: string;
  teamId?: string;
  playerId?: string;
  templateId?: string;
  preview?: boolean;
}

export default function MessageComposer() {
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation() as { state?: ComposerState };
  const { data, session: auth, teamId: activeTeam, dispatch, log } = useClub();
  const staff = currentStaff(data, auth?.staffId);
  const teams = visibleTeams(data, staff);

  const st = location.state ?? {};
  const [teamId, setTeamId] = useState(st.teamId ?? activeTeam);
  const [scope, setScope] = useState<'equipo' | 'individual'>(st.playerId ? 'individual' : 'equipo');
  const [playerId, setPlayerId] = useState(st.playerId ?? '');
  const [templateId, setTemplateId] = useState(st.templateId ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(st.draft ?? '');
  const [scheduled, setScheduled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [preview, setPreview] = useState(Boolean(st.preview));

  const squad = useMemo(() => squadOf(data, teamId), [data, teamId]);
  const team = teams.find((t) => t.id === teamId);
  const template = data.templates.find((t) => t.id === templateId);

  /** Rellena la plantilla con datos reales del equipo y del próximo partido. */
  useEffect(() => {
    if (!template || !team) return;
    const match = data.matches
      .filter((m) => m.teamId === teamId && m.status === 'programado')
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const callup = match ? data.callups.find((c) => c.matchId === match.id) : undefined;
    const called = callup?.entries.filter((e) => e.selected) ?? [];
    const session = data.sessions
      .filter((s) => s.teamId === teamId)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    const vars: Record<string, string> = {
      equipo: team.name,
      rival: match ? (match.home ? `Santa Ponsa CF vs ${match.opponent}` : `${match.opponent} vs Santa Ponsa CF`) : 'Por confirmar',
      fecha: match ? longDate(match.date) : 'Por confirmar',
      hora: match?.start ?? '—',
      campo: match?.venue ?? team.venue,
      citacion: callup ? `${callup.meetingTime} — ${callup.meetingPlace}` : 'Por confirmar',
      equipacion: callup?.kit ?? 'Equipación morada',
      lista: called
        .map((e, i) => `${i + 1}. ${squad.find((p) => p.id === e.playerId)?.shortName ?? ''}`)
        .join('\n'),
      semana: session ? longDate(session.date) : '',
      detalle: team.trainingSlots
        .map((s) => `• ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][s.weekday]}: ${s.start} – ${s.end} (${s.venue})`)
        .join('\n'),
      hora_nueva: session?.start ?? '',
      motivo: 'Mantenimiento del campo',
      campo_nuevo: team.venue,
      desplazamiento: match?.home ? 'Sin desplazamiento' : 'Salida del autobús 1 h antes desde el club',
      que: session ? session.title : 'Entrenamiento',
      cuando: session ? `${longDate(session.date)} a las ${session.start}` : '',
    };
    setBody(renderTemplate(template, vars));
    setSubject(`${template.name} — ${team.name}`);
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const recipients = useMemo(() => {
    if (scope === 'individual') {
      const p = squad.find((x) => x.id === playerId);
      return p ? [{ name: p.shortName, phone: p.guardians[0]?.phone ?? p.phone ?? '', playerId: p.id }] : [];
    }
    return squad.map((p) => ({ name: p.shortName, phone: p.guardians[0]?.phone ?? p.phone ?? '', playerId: p.id }));
  }, [scope, playerId, squad]);

  const saveDraft = () => {
    if (!body.trim()) {
      toast.error('El mensaje está vacío', 'Escribe el texto o elige una plantilla antes de guardarlo.');
      return;
    }
    dispatch({
      type: 'message/upsert',
      message: {
        id: uid('msg'),
        channel: 'whatsapp',
        kind: (template?.kind ?? 'general') as MessageTemplateKind,
        scope,
        teamId,
        playerId: scope === 'individual' ? playerId : undefined,
        subject: subject || 'Mensaje sin asunto',
        body,
        status: scheduled ? 'programado' : 'borrador',
        createdAt: new Date().toISOString(),
        scheduledFor: scheduled && scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
        recipients: recipients.length,
        demo: true,
      },
    });
    toast.success(scheduled ? 'Mensaje programado ✓' : 'Borrador guardado ✓');
    navigate('/app/mensajes');
  };

  return (
    <>
      <Link
        to="/app/mensajes"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-brand-800"
      >
        <ArrowLeft size={15} /> Mensajes
      </Link>

      <PageHeader
        eyebrow={<WhatsAppStatusChip />}
        title="Nuevo mensaje"
        description="Elige destinatarios, escribe o usa una plantilla, y revisa la vista previa antes de enviar."
        actions={
          <>
            <Button variant="ghost" size="sm" icon={<Save size={15} />} onClick={saveDraft}>
              Guardar borrador
            </Button>
            <Button
              size="sm"
              icon={<Eye size={15} />}
              disabled={!body.trim() || recipients.length === 0}
              onClick={() => setPreview(true)}
            >
              Vista previa
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Destinatarios */}
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Users size={16} className="text-brand-600" /> Destinatarios
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Equipo">
                <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Ámbito">
                <div className="flex gap-2">
                  {(['equipo', 'individual'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setScope(s)}
                      className={cn(
                        'h-[42px] flex-1 rounded-xl border text-[13.5px] font-medium transition-all',
                        scope === s
                          ? 'border-brand-400 bg-brand-50 text-brand-800 ring-2 ring-brand-100'
                          : 'border-ink-200 text-ink-600 hover:border-brand-200',
                      )}
                    >
                      {s === 'equipo' ? 'Todo el equipo' : 'Individual'}
                    </button>
                  ))}
                </div>
              </Field>

              {scope === 'individual' && (
                <Field label="Jugador" className="sm:col-span-2">
                  <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                    <option value="">Selecciona un jugador…</option>
                    {squad.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.number}. {p.shortName} — {p.position}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>

            <p className="mt-3 text-[12.5px] text-ink-500">
              {recipients.length} destinatario{recipients.length === 1 ? '' : 's'}
              {scope === 'equipo' && ' (familias y jugadores mayores de edad del equipo)'}
            </p>
          </Card>

          {/* Contenido */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <FileText size={16} className="text-brand-600" /> Contenido
              </h2>
              <Select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-auto min-w-[200px]"
              >
                <option value="">Escribir desde cero</option>
                {data.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Asunto interno" hint="Sólo se ve dentro del VLE, para que localices el mensaje después.">
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej.: Cambio de campo — entrenamiento del martes"
                />
              </Field>

              <Field label="Mensaje" hint="Se envía tal cual. Puedes usar *negrita* y emojis como en WhatsApp.">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[280px] font-mono text-[13px] leading-relaxed"
                  placeholder="Hola familias 👋…"
                />
              </Field>
            </div>
          </Card>

          {/* Programación */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                  <Clock size={16} className="text-brand-600" /> Programar envío
                </h2>
                <p className="mt-1 text-[12.5px] text-ink-500">
                  Útil para recordatorios el día antes del partido.
                </p>
              </div>
              <Toggle checked={scheduled} onChange={setScheduled} />
            </div>
            {scheduled && (
              <Field label="Fecha y hora de envío" className="mt-4">
                <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
              </Field>
            )}
          </Card>
        </div>

        {/* Vista previa en vivo */}
        <div className="space-y-4">
          <Card className="overflow-hidden lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h2 className="text-[14.5px] font-semibold">Así lo verán</h2>
              <Badge tone="warning" size="sm">
                No enviado
              </Badge>
            </div>
            <div className="bg-[#ECE5DD] p-4">
              {body.trim() ? (
                <div className="rounded-xl rounded-tl-sm bg-white px-3.5 py-3 shadow-sm">
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-800">{body}</p>
                  <p className="mt-2 text-right text-[10px] text-ink-400">vista previa</p>
                </div>
              ) : (
                <p className="py-10 text-center text-[13px] text-ink-500">
                  Escribe el mensaje o elige una plantilla para ver la vista previa.
                </p>
              )}
            </div>
            <div className="border-t border-ink-100 p-4">
              <Button
                block
                variant="whatsapp"
                icon={<Send size={16} />}
                disabled={!body.trim() || recipients.length === 0}
                onClick={() => setPreview(true)}
              >
                Revisar y enviar
              </Button>
              <p className="mt-2.5 text-center text-[11.5px] text-ink-400">
                Nada se envía sin que confirmes en la vista previa.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <WhatsAppPreviewModal
        open={preview}
        onClose={() => setPreview(false)}
        body={body}
        recipients={recipients}
        teamId={teamId}
        subject={subject || 'Mensaje del entrenador'}
        onSent={({ simulated, body: sentBody }) => {
          dispatch({
            type: 'message/upsert',
            message: {
              id: uid('msg'),
              channel: 'whatsapp',
              kind: (template?.kind ?? 'general') as MessageTemplateKind,
              scope,
              teamId,
              playerId: scope === 'individual' ? playerId : undefined,
              subject: subject || 'Mensaje del entrenador',
              body: sentBody,
              status: 'enviado',
              createdAt: new Date().toISOString(),
              sentAt: new Date().toISOString(),
              recipients: recipients.length,
              demo: simulated,
            },
          });
          log({
            kind: 'mensaje',
            text: `Has enviado «${subject || 'un mensaje'}» a ${recipients.length} destinatarios.`,
            link: '/app/mensajes',
          });
          navigate('/app/mensajes');
        }}
      />
    </>
  );
}
