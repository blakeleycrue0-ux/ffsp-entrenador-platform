/**
 * Detalle de partido + gestor de convocatoria.
 * ---------------------------------------------------------------------------
 * Flujo objetivo (menos clics): Partido → Crear convocatoria → Seleccionar
 * jugadoras y se comparte la lista. Todo ocurre en esta pantalla.
 */

import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarClock, CheckCheck, ClipboardCopy, Clock, MapPin, PencilLine, Shirt,
  Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { clubShortName, squadOf, playerAttendance, visibleTeams } from '@/store/selectors';
import {
  Avatar, Button, Field, Figure, Input, LinkButton, Modal, PageHeader, Panel, Tabs, Tag, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { AVAILABILITY, AvailabilityDot, CALLUP_RESPONSE } from '@/components/domain/StatusBits';
import { cn, longDate, relativeDay, relativeTime } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { Callup } from '@/types';

export default function MatchDetail() {
  const { matchId = '' } = useParams();
  const { data, actions } = useClub();
  const ownName = clubShortName(data);
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
  const fixture = match.home ? `${ownName} vs ${match.opponent}` : `${match.opponent} vs ${ownName}`;

  /* ── Crear convocatoria: parte de quien está disponible, y tú decides ── */
  const createCallup = async () => {
    const eligible = squad.filter((p) => ['disponible', 'duda'].includes(p.availability.status));
    const chosen = new Set(eligible.slice(0, 16).map((p) => p.id));

    const fresh: Callup = {
      id: '',
      matchId: match.id,
      teamId: match.teamId,
      slots: 16,
      meetingTime: '16:30',
      meetingPlace: match.venue ? `Vestuarios · ${match.venue}` : '',
      kit: '',
      notes: '',
      entries: squad.map((p) => ({ playerId: p.id, selected: chosen.has(p.id), response: 'pendiente' })),
      status: 'borrador',
    };
    setBusy(true);
    try {
      await actions.saveCallup(fresh);
      toast.success('Convocatoria creada', 'Ajusta la selección y compártela cuando quieras.');
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

  /** La convocatoria en texto, para pegarla donde el club se comunique. */
  const callupText = [
    `Convocatoria · ${fixture}`,
    `${longDate(match.date)} · ${match.start} · ${match.venue || 'Campo por confirmar'}`,
    '',
    ...selected.map((e) => {
      const p = squad.find((x) => x.id === e.playerId);
      return p ? `${p.number}. ${p.name}` : '';
    }).filter(Boolean),
  ].join('\n');

  return (
    <>
      <Link
        to="/app/partidos"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted transition-colors hover:text-navy-900"
      >
        <ArrowLeft size={15} /> Partidos
      </Link>

      <PageHeader
        eyebrow={
          <>
            <span className="font-medium text-navy-900">{team.name}</span>
            <span className="text-navy-300">·</span>
            <span>
              {match.competition}
              {match.matchday && ` · Jornada ${match.matchday}`}
            </span>
            <Tag tone={match.home ? 'solid' : 'neutral'} size="sm">
              {match.home ? 'Local' : 'Visitante'}
            </Tag>
          </>
        }
        title={fixture}
        actions={
          <LinkButton to={`/app/partidos/${match.id}/editar`} variant="secondary" size="sm" icon={<PencilLine size={15} />}>
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
          <Panel key={i} className="flex items-start gap-3.5 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-900">
              {icon as React.ReactNode}
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] uppercase tracking-wide text-navy-400">{label as string}</p>
              <p className="mt-0.5 truncate text-[15px] font-semibold text-navy-900">{value as string}</p>
              <p className="truncate text-[12px] text-navy-400">{hint as string}</p>
            </div>
          </Panel>
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
            <Panel>
              <div className="flex flex-col items-center py-14 text-center">
                <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-navy-50 text-navy-400">
                  <Users size={26} />
                </span>
                <h3 className="text-[16px] font-semibold text-navy-800">Todavía no hay convocatoria</h3>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
                  Parte de las jugadoras disponibles, ajusta la selección y copia la lista para
                  compartirla. Las respuestas las registras tú según te vayan contestando.
                </p>
                <div className="mt-6 flex justify-center">
                  <Button loading={busy} onClick={() => createCallup()}>
                    Crear convocatoria
                  </Button>
                </div>
              </div>
            </Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
              {/* Lista de jugadoras */}
              <Panel className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
                  <div>
                    <h2 className="text-[15px] font-semibold">Selección de jugadoras</h2>
                    <p className="mt-0.5 text-[12.5px] text-muted">
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
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        patchCallup({
                          entries: callup.entries.map((e) => ({
                            ...e,
                            selected: ['disponible', 'duda'].includes(
                              squad.find((p) => p.id === e.playerId)?.availability.status ?? '',
                            ),
                          })),
                        })
                      }
                    >
                      Todas las disponibles
                    </Button>
                  </div>
                </div>

                <ul className="divide-y divide-navy-100">
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
                            blocked ? 'cursor-not-allowed opacity-55' : 'hover:bg-navy-50/40',
                            entry?.selected && 'bg-navy-50/60',
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
                              entry?.selected ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-300 bg-white',
                            )}
                          >
                            {entry?.selected && <CheckCheck size={12} strokeWidth={3} />}
                          </span>

                          <Avatar name={p.name} size={36} badge={p.number} />

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium text-navy-900">{p.shortName}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                              <AvailabilityDot status={p.availability.status} />
                              {p.position}
                              {p.availability.note && <span className="truncate">· {p.availability.note}</span>}
                            </span>
                          </span>

                          <span className="hidden w-16 text-right text-[12.5px] text-navy-400 tabular-nums sm:block">
                            {rate}%
                          </span>

                          <span className="shrink-0">
                            {blocked ? (
                              <Tag tone="bad" size="sm">
                                {AVAILABILITY[p.availability.status].label}
                              </Tag>
                            ) : entry?.selected ? (
                              <Tag tone={CALLUP_RESPONSE[entry.response].tone} size="sm">
                                {CALLUP_RESPONSE[entry.response].label}
                              </Tag>
                            ) : (
                              <span className="text-[12.5px] text-navy-400">No convocada</span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>

              {/* Panel de envío */}
              <div className="space-y-4">
                <Panel className="p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-md font-semibold">Estado</h2>
                  </div>

                  <div className="mt-4">
                    <Figure label="Convocadas" value={`${selected.length} / ${callup.slots}`} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      [confirmed, 'Confirmadas', 'text-[#1F6B44]'],
                      [pending, 'Pendientes', 'text-[#9A6412]'],
                      [declined, 'No pueden', 'text-bad'],
                    ].map(([n, l, c]) => (
                      <div key={l as string} className="rounded-xl bg-navy-50 py-2.5">
                        <p className={cn('text-[18px] font-semibold leading-none tabular-nums', c as string)}>
                          {n as number}
                        </p>
                        <p className="mt-1 text-[11.5px] text-muted">{l as string}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2">
                    <Button
                      block
                      icon={<ClipboardCopy size={15} />}
                      disabled={selected.length === 0}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(callupText);
                          toast.success('Convocatoria copiada', 'Ya puedes pegarla donde os comuniquéis.');
                        } catch {
                          setPreview(true);
                        }
                      }}
                    >
                      Copiar la convocatoria
                    </Button>
                    <p className="text-xs leading-relaxed text-muted">
                      La plataforma no envía mensajes: prepara la lista y tú la compartes por donde ya
                      habléis con el equipo.
                    </p>
                  </div>

                  {callup.sentAt && (
                    <p className="mt-3 text-center text-[12px] text-navy-400">
                      Última convocatoria enviada {relativeTime(callup.sentAt)}
                    </p>
                  )}
                </Panel>

                <Panel className="p-5">
                  <h2 className="flex items-center gap-2 text-[14.5px] font-semibold">
                    <Shirt size={16} className="text-navy-800" /> Detalles de la citación
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
                </Panel>
              </div>
            </div>
          ))}

        {tab === 'detalles' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-5">
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
                  <div key={k} className="flex justify-between gap-4 border-b border-navy-100 pb-2.5 last:border-0">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium text-navy-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-[15px] font-semibold">Notas de la entrenadora</h2>
              {match.notes ? (
                <p className="mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-navy-600">{match.notes}</p>
              ) : (
                <p className="mt-3 text-[13.5px] text-muted">
                  Sin notas todavía. Apunta aquí lo que hayas observado del rival o la estrategia prevista.
                </p>
              )}
              <LinkButton to={`/app/partidos/${match.id}/editar`} variant="secondary" size="sm" className="mt-4">
                Editar notas
              </LinkButton>
            </Panel>
          </div>
        )}
      </div>

      {callup && (
        <Modal
          open={preview}
          onClose={() => setPreview(false)}
          title="Convocatoria"
          description="Selecciona el texto y cópialo."
        >
          <pre className="whitespace-pre-wrap rounded-md border border-line bg-surface p-3 text-sm leading-relaxed text-navy-800">
            {callupText}
          </pre>
        </Modal>
      )}
    </>
  );
}
