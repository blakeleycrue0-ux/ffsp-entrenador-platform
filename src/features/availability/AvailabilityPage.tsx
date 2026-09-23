/**
 * Disponibilidad y lesiones.
 * ---------------------------------------------------------------------------
 * Aquí se ve de un vistazo con quién se puede contar. Los partes los escribe el
 * cuerpo técnico y sólo contienen lo que alguien ha anotado: la plataforma no
 * diagnostica, no estima riesgos ni recomienda tratamientos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useClub } from '@/store/store';
import { squadOf, visibleTeams } from '@/store/selectors';
import {
  Button, EmptyState, ErrorState, Field, Figure, Input, Modal, PageHeader, Panel, Select, SkeletonRows, Tabs, Tag, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { humanError } from '@/services/supabase';
import {
  INJURY_STATE, INJURY_STATES, injuries as api,
  type Injury, type InjuryState, type InjuryUpdate,
} from '@/services/injuries';
import { longDate, longDateInline, toISODate, today } from '@/lib/utils';

export default function AvailabilityPage() {
  const { data, teamId, setTeamId, userId } = useClub();
  const toast = useToast();
  const teams = visibleTeams(data);
  const squad = useMemo(() => squadOf(data, teamId).filter((p) => !p.archivedAt), [data, teamId]);

  const [rows, setRows] = useState<Injury[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('abiertos');
  const [editing, setEditing] = useState<Partial<Injury> | null>(null);
  const [detail, setDetail] = useState<Injury | null>(null);
  const [updates, setUpdates] = useState<InjuryUpdate[] | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!teamId) {
      setRows([]);
      return;
    }
    setRows(null);
    setError(null);
    api
      .listByTeam(teamId)
      .then(setRows)
      .catch((e) => setError(humanError(e)));
  }, [teamId]);

  useEffect(load, [load]);

  const open = (rows ?? []).filter((r) => !r.resolvedOn);
  const closed = (rows ?? []).filter((r) => r.resolvedOn);
  const visible = tab === 'abiertos' ? open : closed;

  const playerName = (id: string) => squad.find((p) => p.id === id)?.name ?? 'Jugadora dada de baja';

  const openDetail = async (injury: Injury) => {
    setDetail(injury);
    setUpdates(null);
    try {
      setUpdates(await api.updatesOf(injury.id));
    } catch (e) {
      toast.error('No hemos podido cargar el seguimiento', humanError(e));
      setUpdates([]);
    }
  };

  const saveInjury = async () => {
    if (!editing?.playerId || !teamId || !userId) {
      toast.error('Falta la jugadora', 'Elige a quién corresponde el parte.');
      return;
    }
    setBusy(true);
    try {
      await api.save({ ...editing, playerId: editing.playerId, teamId, userId });
      setEditing(null);
      load();
      toast.success('Parte guardado');
    } catch (e) {
      toast.error('No hemos podido guardarlo', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!detail || !userId || note.trim().length < 3) return;
    setBusy(true);
    try {
      const saved = await api.addUpdate({ injuryId: detail.id, note, userId });
      setUpdates((u) => [saved, ...(u ?? [])]);
      setNote('');
    } catch (e) {
      toast.error('No hemos podido guardar la nota', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const closeInjury = async (injury: Injury) => {
    setBusy(true);
    try {
      await api.close(injury.id, toISODate(today()));
      setDetail(null);
      load();
      toast.success('Alta registrada');
    } catch (e) {
      toast.error('No hemos podido cerrarlo', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  if (teams.length === 0) {
    return (
      <>
        <PageHeader title="Disponibilidad y lesiones" />
        <Panel>
          <EmptyState
            title="Todavía no tienes ningún equipo asignado"
            description="Quien administra el club puede asignártelo desde Equipo técnico."
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Disponibilidad y lesiones"
        description="Con quién puedes contar esta semana y en qué situación está cada jugadora."
        actions={
          <Button
            icon={<Plus size={15} />}
            onClick={() =>
              setEditing({ state: 'lesionada', startedOn: toISODate(today()), playerId: squad[0]?.id })
            }
            disabled={squad.length === 0}
          >
            Nuevo parte
          </Button>
        }
      />

      <Panel className="mb-3 p-3">
        <Field label="Equipo" className="max-w-xs">
          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </Panel>

      {/* Resumen: sólo cuenta lo que hay registrado */}
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <Figure label="En plantilla" value={squad.length} />
        </Panel>
        <Panel className="p-4">
          <Figure
            label="Partes abiertos"
            value={rows === null ? '—' : open.length}
            tone={open.length > 0 ? 'warn' : undefined}
          />
        </Panel>
        <Panel className="p-4">
          <Figure
            label="Sin parte"
            value={rows === null ? '—' : squad.length - new Set(open.map((r) => r.playerId)).size}
            hint="No significa que estén bien: sólo que nadie ha anotado nada."
          />
        </Panel>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : (
        <Panel>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'abiertos', label: 'Abiertos', count: open.length },
              { id: 'cerrados', label: 'Cerrados', count: closed.length },
            ]}
          />

          {rows === null ? (
            <SkeletonRows className="p-3" />
          ) : visible.length === 0 ? (
            <EmptyState
              title={tab === 'abiertos' ? 'No hay ningún parte abierto' : 'No hay partes cerrados'}
              description={
                tab === 'abiertos'
                  ? 'Cuando una jugadora se lesione o tenga molestias, anótalo aquí para que quede constancia del seguimiento.'
                  : 'Aquí se guardan los partes ya resueltos, con su historial.'
              }
              action={
                tab === 'abiertos' && squad.length > 0 ? (
                  <Button
                    onClick={() =>
                      setEditing({ state: 'lesionada', startedOn: toISODate(today()), playerId: squad[0]?.id })
                    }
                  >
                    Nuevo parte
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => void openDetail(r)}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-navy-900">
                        {playerName(r.playerId)}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">
                        Desde el {longDateInline(r.startedOn)}
                        {r.expectedReturn && ` · Previsión de vuelta: ${longDateInline(r.expectedReturn)}`}
                      </span>
                    </span>
                    <Tag tone={INJURY_STATE[r.state].tone} size="sm">
                      {INJURY_STATE[r.state].label}
                    </Tag>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
        La plataforma guarda lo que anota el cuerpo técnico. No genera diagnósticos, ni previsiones de
        recaída, ni valoraciones médicas: para eso está el personal sanitario del club.
      </p>

      {/* Alta o edición de un parte */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar el parte' : 'Nuevo parte'}
        description="Sólo lo que hayáis observado, con fechas."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={saveInjury}>
              Guardar
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Jugadora" required>
              <Select
                value={editing.playerId ?? ''}
                onChange={(e) => setEditing({ ...editing, playerId: e.target.value })}
              >
                {squad.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number}. {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Situación">
              <Select
                value={editing.state ?? 'lesionada'}
                onChange={(e) => setEditing({ ...editing, state: e.target.value as InjuryState })}
              >
                {INJURY_STATES.map((s) => (
                  <option key={s} value={s}>
                    {INJURY_STATE[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Desde">
                <Input
                  type="date"
                  value={editing.startedOn ?? ''}
                  onChange={(e) => setEditing({ ...editing, startedOn: e.target.value })}
                />
              </Field>
              <Field label="Previsión de vuelta" hint="Si no se sabe, déjalo vacío.">
                <Input
                  type="date"
                  value={editing.expectedReturn ?? ''}
                  onChange={(e) => setEditing({ ...editing, expectedReturn: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Qué ha pasado">
              <Textarea
                value={editing.description ?? ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Cuándo ocurrió y qué se observó."
              />
            </Field>
            <Field label="Limitaciones para entrenar" hint="Qué puede hacer y qué no, según os hayan indicado.">
              <Textarea
                value={editing.restrictions ?? ''}
                onChange={(e) => setEditing({ ...editing, restrictions: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Seguimiento */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? playerName(detail.playerId) : ''}
        description={detail ? `Parte abierto el ${longDateInline(detail.startedOn)}` : ''}
        footer={
          detail && !detail.resolvedOn ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(detail)}>
                Editar
              </Button>
              <Button loading={busy} onClick={() => void closeInjury(detail)}>
                Dar el alta
              </Button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={INJURY_STATE[detail.state].tone}>{INJURY_STATE[detail.state].label}</Tag>
              {detail.resolvedOn && <Tag tone="ok">Alta el {longDateInline(detail.resolvedOn)}</Tag>}
            </div>

            {detail.description && (
              <div>
                <p className="eyebrow mb-1">Qué ha pasado</p>
                <p className="text-base leading-relaxed text-navy-700">{detail.description}</p>
              </div>
            )}
            {detail.restrictions && (
              <div>
                <p className="eyebrow mb-1">Limitaciones</p>
                <p className="text-base leading-relaxed text-navy-700">{detail.restrictions}</p>
              </div>
            )}

            <div>
              <p className="eyebrow mb-1.5">Seguimiento</p>
              {!detail.resolvedOn && (
                <div className="mb-3 flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Cómo ha evolucionado hoy"
                    onKeyDown={(e) => e.key === 'Enter' && void addNote()}
                  />
                  <Button loading={busy} onClick={addNote} disabled={note.trim().length < 3}>
                    Anotar
                  </Button>
                </div>
              )}
              {updates === null ? (
                <SkeletonRows rows={2} />
              ) : updates.length === 0 ? (
                <p className="text-sm text-muted">Todavía no hay anotaciones.</p>
              ) : (
                <ul className="space-y-2">
                  {updates.map((u) => (
                    <li key={u.id} className="border-l-2 border-line pl-3">
                      <p className="text-base leading-relaxed text-navy-800">{u.note}</p>
                      <p className="mt-0.5 text-xs text-muted">{longDate(u.notedOn)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link
              to={`/app/plantilla/${detail.playerId}`}
              className="inline-block text-sm text-navy-700 underline underline-offset-2 hover:text-navy-900"
            >
              Ver la ficha completa
            </Link>
          </div>
        )}
      </Modal>
    </>
  );
}
