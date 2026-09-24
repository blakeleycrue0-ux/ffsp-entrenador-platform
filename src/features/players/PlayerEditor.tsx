/**
 * Alta y edición de jugadoras.
 * Sólo se piden los datos imprescindibles para empezar: nombre, dorsal y
 * posición. Todo lo demás es opcional y se puede completar más adelante.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { squadOf, visibleTeams } from '@/store/selectors';
import { canSeePersonalData } from '@/services/auth';
import { humanError } from '@/services/supabase';
import { Button, Panel, Field, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { AVAILABILITY, AVAILABILITY_ORDER } from '@/components/domain/StatusBits';
import { cn } from '@/lib/utils';
import { POSITIONS, type Guardian, type Player, type PlayerPosition } from '@/types';

const blank = (teamId: string, number: number): Player => ({
  id: '',
  teamId,
  name: '',
  shortName: '',
  number,
  position: '',
  foot: 'Diestra',
  guardians: [],
  availability: { status: 'disponible' },
  stats: { matches: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0 },
  joinedAt: new Date().toISOString().slice(0, 10),
});

export default function PlayerEditor() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, teamId, actions } = useClub();
  const teams = visibleTeams(data);

  const existing = playerId ? data.players.find((p) => p.id === playerId) : undefined;

  const nextNumber = useMemo(() => {
    const used = new Set(squadOf(data, teamId).map((p) => p.number));
    for (let n = 1; n < 100; n++) if (!used.has(n)) return n;
    return 1;
  }, [data, teamId]);

  const [form, setForm] = useState<Player>(existing ?? blank(teamId || teams[0]?.id || '', nextNumber));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = (p: Partial<Player>) => setForm((f) => ({ ...f, ...p }));
  const canSeeContact = canSeePersonalData(data.profile);

  const duplicateNumber = useMemo(
    () => squadOf(data, form.teamId).some((p) => p.number === form.number && p.id !== form.id),
    [data, form.teamId, form.number, form.id],
  );

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Falta el nombre', 'Escribe al menos el nombre de la jugadora.');
      return;
    }
    if (!form.teamId) {
      toast.error('Falta el equipo', 'Selecciona a qué equipo pertenece.');
      return;
    }
    setBusy(true);
    try {
      const short = form.shortName.trim() || form.name.trim().split(' ').slice(0, 2).join(' ');
      const saved = await actions.savePlayer({ ...form, shortName: short });
      await actions.log({
        kind: 'jugadora',
        teamId: saved.teamId,
        text: existing
          ? `Has actualizado la ficha de ${saved.shortName}.`
          : `Has dado de alta a ${saved.shortName} en la plantilla.`,
        link: `/app/plantilla/${saved.id}`,
      });
      toast.success(existing ? 'Ficha actualizada' : 'Jugadora añadida');
      navigate(`/app/plantilla/${saved.id}`);
    } catch (e) {
      toast.error('No hemos podido guardar la ficha', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await actions.deletePlayer(existing.id);
      toast.success('Jugadora eliminada');
      navigate('/app/plantilla');
    } catch (e) {
      toast.error('No hemos podido eliminarla', humanError(e));
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const setGuardian = (i: number, g: Partial<Guardian>) =>
    patch({ guardians: form.guardians.map((x, k) => (k === i ? { ...x, ...g } : x)) });

  if (teams.length === 0) {
    return (
      <>
        <PageHeader title="Nueva jugadora" />
        <Panel className="p-8 text-center">
          <p className="text-[14px] text-navy-600">
            Todavía no tienes ningún equipo asignado. Pídeselo a quien administra el club.
          </p>
        </Panel>
      </>
    );
  }

  return (
    <>
      <Link
        to={existing ? `/app/plantilla/${existing.id}` : '/app/plantilla'}
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted transition-colors hover:text-navy-900"
      >
        <ArrowLeft size={15} /> {existing ? existing.shortName : 'Jugadoras'}
      </Link>

      <PageHeader
        title={existing ? 'Editar ficha' : 'Nueva jugadora'}
        description="Con el nombre y el dorsal ya puedes empezar. El resto lo completas cuando quieras."
        actions={
          <>
            {existing && (
              <Button variant="danger" size="sm" icon={<Trash2 size={15} />} onClick={() => setConfirmDelete(true)}>
                Eliminar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button size="sm" icon={<Save size={15} />} loading={busy} onClick={save}>
              Guardar
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Panel className="p-5">
            <h2 className="text-[15px] font-semibold">Datos básicos</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre y apellidos" className="sm:col-span-2">
                <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Nombre y apellidos" />
              </Field>
              <Field label="Nombre corto" hint="El que aparece en listas y convocatorias.">
                <Input
                  value={form.shortName}
                  onChange={(e) => patch({ shortName: e.target.value })}
                  placeholder={form.name.split(' ').slice(0, 2).join(' ') || 'Nombre corto'}
                />
              </Field>
              <Field
                label="Dorsal"
                error={duplicateNumber ? 'Ese dorsal ya lo lleva otra jugadora del equipo.' : undefined}
              >
                <Input type="number" min={1} value={form.number} onChange={(e) => patch({ number: Number(e.target.value) })} />
              </Field>
              <Field label="Equipo">
                <Select value={form.teamId} onChange={(e) => patch({ teamId: e.target.value })}>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha de nacimiento">
                <Input type="date" value={form.birthDate ?? ''} onChange={(e) => patch({ birthDate: e.target.value })} />
              </Field>
              <Field label="Posición principal">
                <Select
                  value={form.position}
                  onChange={(e) => patch({ position: e.target.value as PlayerPosition })}
                >
                  <option value="">Sin definir</option>
                  {POSITIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Posición secundaria">
                <Select
                  value={form.secondaryPosition ?? ''}
                  onChange={(e) =>
                    patch({ secondaryPosition: (e.target.value || undefined) as PlayerPosition | undefined })
                  }
                >
                  <option value="">Ninguna</option>
                  {POSITIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Pie dominante">
                <Select value={form.foot} onChange={(e) => patch({ foot: e.target.value as Player['foot'] })}>
                  <option>Diestra</option>
                  <option>Zurda</option>
                  <option>Ambidiestra</option>
                </Select>
              </Field>
              <Field label="Alta en el club">
                <Input type="date" value={form.joinedAt} onChange={(e) => patch({ joinedAt: e.target.value })} />
              </Field>
            </div>
          </Panel>

          {canSeeContact && (
            <Panel className="p-5">
              <h2 className="text-[15px] font-semibold">Contacto</h2>
              <p className="mt-1 text-[12.5px] text-muted">
                Datos personales. Sólo los ven los perfiles con permiso y nunca aparecen en listados.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Teléfono de la jugadora">
                  <Input value={form.phone ?? ''} onChange={(e) => patch({ phone: e.target.value })} placeholder="+34 …" />
                </Field>
                <Field label="Correo electrónico">
                  <Input type="email" value={form.email ?? ''} onChange={(e) => patch({ email: e.target.value })} />
                </Field>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-medium text-navy-800">Familia o tutores</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={15} />}
                    onClick={() =>
                      patch({ guardians: [...form.guardians, { name: '', relation: 'Madre', phone: '' }] })
                    }
                  >
                    Añadir
                  </Button>
                </div>

                {form.guardians.length === 0 ? (
                  <p className="mt-3 text-[13px] text-muted">
                    Sin contactos registrados. Si la jugadora es menor, añade al menos uno para poder enviar
                    convocatorias.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {form.guardians.map((g, i) => (
                      <div key={i} className="rounded-xl border border-line p-3.5">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Field label="Nombre">
                            <Input value={g.name} onChange={(e) => setGuardian(i, { name: e.target.value })} />
                          </Field>
                          <Field label="Parentesco">
                            <Select
                              value={g.relation}
                              onChange={(e) => setGuardian(i, { relation: e.target.value as Guardian['relation'] })}
                            >
                              <option>Madre</option>
                              <option>Padre</option>
                              <option>Tutor/a</option>
                            </Select>
                          </Field>
                          <Field label="Teléfono">
                            <Input value={g.phone} onChange={(e) => setGuardian(i, { phone: e.target.value })} placeholder="+34 …" />
                          </Field>
                        </div>
                        <button
                          onClick={() => patch({ guardians: form.guardians.filter((_, k) => k !== i) })}
                          className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-navy-400 transition-colors hover:text-bad"
                        >
                          <X size={13} /> Quitar contacto
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel className="p-5">
            <h2 className="text-[14.5px] font-semibold">Disponibilidad</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {AVAILABILITY_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => patch({ availability: { ...form.availability, status: s } })}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all',
                    form.availability.status === s
                      ? 'border-navy-400 bg-navy-50 text-navy-900 ring-2 ring-navy-100'
                      : 'border-line text-navy-600 hover:border-navy-200',
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', AVAILABILITY[s].dot)} />
                  {AVAILABILITY[s].label}
                </button>
              ))}
            </div>

            <Field label="Motivo" className="mt-4">
              <Textarea
                value={form.availability.note ?? ''}
                onChange={(e) => patch({ availability: { ...form.availability, note: e.target.value } })}
                placeholder="Ej.: esguince de tobillo, vuelve en dos semanas."
                className="min-h-[70px]"
              />
            </Field>

            <Field label="Retorno estimado" className="mt-3">
              <Input
                type="date"
                value={form.availability.until ?? ''}
                onChange={(e) => patch({ availability: { ...form.availability, until: e.target.value } })}
              />
            </Field>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-[14.5px] font-semibold">Notas de la entrenadora</h2>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Observaciones deportivas, evolución, objetivos individuales…"
              className="mt-3 min-h-[120px]"
            />
          </Panel>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`¿Eliminar a ${existing?.shortName}?`}
        description="Se borrará su ficha y su historial de asistencia. No se puede deshacer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={busy} onClick={remove}>
              Eliminar jugadora
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-navy-600">
          Si sólo se ha marchado temporalmente, es mejor cambiar su disponibilidad a «Ausente» en lugar de eliminarla:
          así conservas su historial.
        </p>
      </Modal>
    </>
  );
}
