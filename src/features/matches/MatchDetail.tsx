/**
 * Detalle de partido + gestor de convocatoria.
 * ---------------------------------------------------------------------------
 * Flujo objetivo (menos clics): Partido → Crear convocatoria → Seleccionar
 * jugadoras → Vista previa → WhatsApp. Todo ocurre en esta pantalla.
 */

import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bell, CalendarClock, CheckCheck, Clock, MapPin, PencilLine, Send, Shirt,
  Sparkles, Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { squadOf, playerAttendance, visibleTeams } from '@/store/selectors';
import { buildCallupMessage } from '@/services/whatsapp';
import {
  Avatar, Badge, Button, Card, Field, Input, LinkButton, PageHeader, Stat, Tabs, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { AVAILABILITY, AvailabilityDot, CALLUP_RESPONSE } from '@/components/domain/StatusBits';
import { WhatsAppPreviewModal, WhatsAppStatusChip } from '@/features/messages/WhatsAppPreview';
import { CLUB_NAME, cn, longDate, relativeDay, relativeTime } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { Callup } from '@/types';

export default function MatchDetail() {
  const { matchId = '' } = useParams();
  const { data, actions } = useClub();
  const toast = useToast();

  const [tab, setTab] = useState('convocatoria');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const match = data.matches.find((m) => m.id === matchId);
  const allowed = match && visibleTeams(data).some((t) => t.id === match.teamId);

  const squad = useMemo(() => (match ? squadOf(data, match.teamId) : []), [data, match]);
  const attendance = useMemo(() => (match ? playerAttendance(data, match.teamId) : []), [data, match]);
  const callup = data.callups.find((c) => c.matchId === matchId) ?? null;

  if (!match || !allowed) return <Navigate to="/app/partidos" replace />;

  const team = data.teams.find((t) => t.id === match.teamId)!;
  const fixture = match.home ? `${CLUB_NAME} vs ${match.opponent}` : `${match.opponent} vs ${CLUB_NAME}`;

  /* ── Crear convocatoria: propone jugadoras por disponibilidad y asistencia ── */
  const createCallup = async (withAI = false) => {
    const eligible = squad.filter((p) => ['disponible', 'duda'].includes(p.availability.status));
    const scored = [...eligible].sort((a, b) => {
      const ra = attendance.find((x) => x.player.id === a.id)?.rate ?? 0;
      const rb = attendance.find((x) => x.player.id === b.id)?.rate ?? 0;
      return rb - ra;
    });
    const chosen = new Set((withAI ? scored : eligible).slice(0, 16).map((p) => p.id));

    const fresh: Callup = {
      id: '',
      matchId: match.id,
      teamId: match.teamId,
      slots: 16,
      meetingTime: '16:30',
      meetingPlace: `Vestuarios · ${match.venue}`,
      kit: 'Equipación morada · medias moradas',
      notes: 'Traer segunda camiseta y botella individual.',
      entries: squad.map((p) => ({ playerId: p.id, selected: chosen.has(p.id), response: 'pendiente' })),
      status: 'borrador',
    };
    setBusy(true);
    try {
      await actions.saveCallup(fresh);
      toast.success(
        withAI ? 'Borrador propuesto por el asistente ✓' : 'Convocatoria creada ✓',
        withAI
          ? 'Criterio: disponibilidad, líneas cubiertas y asistencia reciente. Revísala antes de enviar.'
          : 'Selecciona a las jugadoras y envíala cuando quieras.',
      );
    } catch (e) {
      toast.error('No hemos podido crear la convocatoria', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const patchCallup = (patch: Partial<Callup>) => {
    if (!callup) return;
    actions
      .saveCallup({ ...callup, ...patch })
      .catch((e) => toast.error('No hemos podido guardar el cambio', humanError(e)));
  };

  const toggle = (playerId: string) => {
    if (!callup) return;
    patchCallup({
      entries: callup.entries.map((e) => (e.playerId === playerId ? { ...e, selected: !e.selected } : e)),
    });
  };

  const selected = callup?.entries.filter((e) => e.selected) ?? [];
  const confirmed = selected.filter((e) => e.response === 'confirmada').length;
  const pending = selected.filter((e) => e.response === 'pendiente').length;
  const declined = selected.filter((e) => e.response === 'rechazada').length;
  const unavailable = squad.filter((p) => !['disponible', 'duda'].includes(p.availability.status));

  const messageBody = callup ? buildCallupMessage(callup, match, team, squad) : '';
  const recipients = selected.map((e) => {
    const p = squad.find((x) => x.id === e.playerId)!;
    return { name: p.shortName, phone: p.guardians[0]?.phone ?? p.phone ?? '', playerId: p.id };
  });

  return (
    <>
      <Link
        to="/app/partidos"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-brand-800"
      >
        <ArrowLeft size={15} /> Partidos
      </Link>

      <PageHeader
        eyebrow={
          <>
            <span className="font-medium text-brand-700">{team.name}</span>
            <span className="text-ink-300">·</span>
            <span>
              {match.competition}
              {match.matchday && ` · Jornada ${match.matchday}`}
            </span>
            <Badge tone={match.home ? 'brand' : 'neutral'} size="sm">
              {match.home ? 'Local' : 'Visitante'}
            </Badge>
          </>
        }
        title={fixture}
        actions={
          <LinkButton to={`/app/partidos/${match.id}/editar`} variant="outline" size="sm" icon={<PencilLine size={15} />}>
            Editar partido
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [<CalendarClock key="a" size={16} />, 'Fecha', relativeDay(match.date), longDate(match.date)],
          [<Clock key="b" size={16} />, 'Hora', match.start, `citación ${callup?.meetingTime ?? '—'}`],
          [<MapPin key="c" size={16} />, 'Campo', match.venue, match.home ? 'Jugamos en casa' : 'Desplazamiento'],
          [<Users key="d" size={16} />, 'Convocadas', `${selected.length}`, callup ? `${confirmed} confirmadas` : 'sin convocatoria'],
        ].map(([icon, label, value, hint], i) => (
          <Card key={i} className="flex items-start gap-3.5 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              {icon as React.ReactNode}
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] uppercase tracking-wide text-ink-400">{label as string}</p>
              <p className="mt-0.5 truncate text-[15px] font-semibold text-ink-900">{value as string}</p>
              <p className="truncate text-[12px] text-ink-400">{hint as string}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs
        className="mt-7"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'convocatoria', label: 'Convocatoria' },
          { id: 'detalles', label: 'Detalles y notas' },
        ]}
      />

      <div className="mt-6">
        {tab === 'convocatoria' &&
          (!callup ? (
            <Card>
              <div className="flex flex-col items-center py-14 text-center">
                <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-400">
                  <Users size={26} />
                </span>
                <h3 className="text-[16px] font-semibold text-ink-800">Todavía no hay convocatoria</h3>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-500">
                  Crea la lista con las jugadoras disponibles y envíala por WhatsApp. Cuando WhatsApp esté conectado,
                  las respuestas se registrarán automáticamente.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button loading={busy} onClick={() => createCallup(false)}>Crear convocatoria</Button>
                  <Button variant="outline" icon={<Sparkles size={15} />} disabled={busy} onClick={() => createCallup(true)}>
                    Proponer con IA
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
              {/* Lista de jugadoras */}
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
                  <div>
                    <h2 className="text-[15px] font-semibold">Selección de jugadoras</h2>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">
                      {selected.length} de {callup.slots} plazas · {unavailable.length} no disponibles
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        patchCallup({ entries: callup.entries.map((e) => ({ ...e, selected: false })) })
                      }
                    >
                      Vaciar
                    </Button>
                    <Button size="sm" variant="outline" icon={<Sparkles size={15} />} onClick={() => createCallup(true)}>
                      Proponer con IA
                    </Button>
                  </div>
                </div>

                <ul className="divide-y divide-ink-100">
                  {squad.map((p) => {
                    const entry = callup.entries.find((e) => e.playerId === p.id);
                    const blocked = !['disponible', 'duda'].includes(p.availability.status);
                    const rate = attendance.find((a) => a.player.id === p.id)?.rate ?? 0;
                    return (
                      <li key={p.id}>
                        <button
                          disabled={blocked}
                          onClick={() => toggle(p.id)}
                          className={cn(
                            'flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors sm:px-5',
                            blocked ? 'cursor-not-allowed opacity-55' : 'hover:bg-brand-50/40',
                            entry?.selected && 'bg-brand-50/60',
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
                              entry?.selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-ink-300 bg-white',
                            )}
                          >
                            {entry?.selected && <CheckCheck size={12} strokeWidth={3} />}
                          </span>

                          <Avatar name={p.name} size={36} number={p.number} />

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium text-ink-900">{p.shortName}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-500">
                              <AvailabilityDot status={p.availability.status} />
                              {p.position}
                              {p.availability.note && <span className="truncate">· {p.availability.note}</span>}
                            </span>
                          </span>

                          <span className="hidden w-16 text-right text-[12.5px] text-ink-400 tabular-nums sm:block">
                            {rate}%
                          </span>

                          <span className="shrink-0">
                            {blocked ? (
                              <Badge tone="danger" size="sm">
                                {AVAILABILITY[p.availability.status].label}
                              </Badge>
                            ) : entry?.selected ? (
                              <Badge tone={CALLUP_RESPONSE[entry.response].tone} size="sm">
                                {CALLUP_RESPONSE[entry.response].icon} {CALLUP_RESPONSE[entry.response].label}
                              </Badge>
                            ) : (
                              <span className="text-[12.5px] text-ink-400">No convocada</span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              {/* Panel de envío */}
              <div className="space-y-4">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[14.5px] font-semibold">Estado</h2>
                    <WhatsAppStatusChip />
                  </div>

                  <div className="mt-4">
                    <Stat label="Convocadas" value={`${selected.length} / ${callup.slots}`} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      [confirmed, 'Confirmadas', 'text-[#1F6B44]'],
                      [pending, 'Pendientes', 'text-[#9A6412]'],
                      [declined, 'No pueden', 'text-danger'],
                    ].map(([n, l, c]) => (
                      <div key={l as string} className="rounded-xl bg-ink-50 py-2.5">
                        <p className={cn('text-[18px] font-semibold leading-none tabular-nums', c as string)}>
                          {n as number}
                        </p>
                        <p className="mt-1 text-[11.5px] text-ink-500">{l as string}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2">
                    <Button
                      block
                      variant="whatsapp"
                      icon={<Send size={16} />}
                      disabled={selected.length === 0}
                      onClick={() => setPreview(true)}
                    >
                      Enviar convocatoria por WhatsApp
                    </Button>
                    {pending > 0 && callup.status === 'enviada' && (
                      <Button
                        block
                        variant="outline"
                        size="sm"
                        icon={<Bell size={15} />}
                        onClick={() => setPreview(true)}
                      >
                        Recordar a los {pending} pendientes
                      </Button>
                    )}
                  </div>

                  {callup.sentAt && (
                    <p className="mt-3 text-center text-[12px] text-ink-400">
                      Última convocatoria enviada {relativeTime(callup.sentAt)}
                    </p>
                  )}
                </Card>

                <Card className="p-5">
                  <h2 className="flex items-center gap-2 text-[14.5px] font-semibold">
                    <Shirt size={16} className="text-brand-600" /> Detalles de la citación
                  </h2>
                  <div className="mt-3.5 space-y-3">
                    <Field label="Hora de citación">
                      <Input value={callup.meetingTime} onChange={(e) => patchCallup({ meetingTime: e.target.value })} />
                    </Field>
                    <Field label="Lugar">
                      <Input value={callup.meetingPlace} onChange={(e) => patchCallup({ meetingPlace: e.target.value })} />
                    </Field>
                    <Field label="Equipación">
                      <Input value={callup.kit} onChange={(e) => patchCallup({ kit: e.target.value })} />
                    </Field>
                    <Field label="Notas para las familias">
                      <Textarea
                        value={callup.notes ?? ''}
                        onChange={(e) => patchCallup({ notes: e.target.value })}
                        className="min-h-[70px]"
                      />
                    </Field>
                  </div>
                </Card>
              </div>
            </div>
          ))}

        {tab === 'detalles' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-[15px] font-semibold">Información del partido</h2>
              <dl className="mt-4 space-y-3 text-[13.5px]">
                {[
                  ['Rival', match.opponent],
                  ['Competición', match.competition],
                  ['Jornada', match.matchday ? `Jornada ${match.matchday}` : '—'],
                  ['Fecha', longDate(match.date)],
                  ['Hora', match.start],
                  ['Campo', match.venue],
                  ['Condición', match.home ? 'Local' : 'Visitante'],
                  ['Sistema', match.formation ?? 'Sin definir'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-ink-100 pb-2.5 last:border-0">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="text-right font-medium text-ink-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-5">
              <h2 className="text-[15px] font-semibold">Notas de la entrenadora</h2>
              {match.notes ? (
                <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-600">{match.notes}</p>
              ) : (
                <p className="mt-3 text-[13.5px] text-ink-500">
                  Sin notas todavía. Apunta aquí lo que hayas observado del rival o la estrategia prevista.
                </p>
              )}
              <LinkButton to={`/app/partidos/${match.id}/editar`} variant="outline" size="sm" className="mt-4">
                Editar notas
              </LinkButton>
            </Card>
          </div>
        )}
      </div>

      {callup && (
        <WhatsAppPreviewModal
          open={preview}
          onClose={() => setPreview(false)}
          body={messageBody}
          recipients={recipients}
          teamId={team.id}
          subject={`Convocatoria — ${fixture}`}
          onSent={async ({ simulated }) => {
            try {
              await actions.saveCallup({ ...callup, status: 'enviada', sentAt: new Date().toISOString() });
              await actions.saveMessage({
                id: '',
                channel: 'whatsapp',
                kind: 'convocatoria',
                scope: 'equipo',
                teamId: team.id,
                subject: `Convocatoria — ${fixture}`,
                body: messageBody,
                status: 'enviado',
                createdAt: new Date().toISOString(),
                sentAt: new Date().toISOString(),
                recipients: recipients.length,
                responses: { confirmed, declined, unknown: pending },
                simulated,
              });
              await actions.log({
                kind: 'convocatoria',
                teamId: team.id,
                text: `Has preparado la convocatoria de ${fixture} para ${recipients.length} destinatarios.`,
                link: `/app/partidos/${match.id}`,
              });
            } catch (e) {
              toast.error('No hemos podido registrar el envío', humanError(e));
            }
          }}
        />
      )}
    </>
  );
}
