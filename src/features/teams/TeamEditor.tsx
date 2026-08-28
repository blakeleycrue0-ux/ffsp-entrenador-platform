/**
 * Alta y edición de equipos — reservado a coordinación.
 * Incluye los horarios fijos de entrenamiento, que alimentan el calendario.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { humanError } from '@/services/supabase';
import { Button, Card, Field, Input, Modal, PageHeader, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import type { Team, TrainingSlot } from '@/types';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const currentSeason = () => {
  const now = new Date();
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
};

const blank = (): Team => ({
  id: '',
  name: '',
  category: '',
  season: currentSeason(),
  competition: '',
  venue: '',
  trainingSlots: [],
});

export default function TeamEditor() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, actions, setTeamId } = useClub();

  const existing = teamId ? data.teams.find((t) => t.id === teamId) : undefined;
  const [form, setForm] = useState<Team>(existing ?? blank());
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = (p: Partial<Team>) => setForm((f) => ({ ...f, ...p }));
  const setSlot = (i: number, s: Partial<TrainingSlot>) =>
    patch({ trainingSlots: form.trainingSlots.map((x, k) => (k === i ? { ...x, ...s } : x)) });

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Falta el nombre del equipo', 'Por ejemplo: «Sub-17» o «Primer equipo».');
      return;
    }
    setBusy(true);
    try {
      const saved = await actions.saveTeam(form);
      if (!existing) setTeamId(saved.id);
      await actions.log({
        kind: 'equipo',
        teamId: saved.id,
        text: existing ? `Has actualizado el equipo ${saved.name}.` : `Has creado el equipo ${saved.name}.`,
        link: `/app/equipos/${saved.id}`,
      });
      toast.success(existing ? 'Equipo actualizado ✓' : 'Equipo creado ✓', 'Ya puedes asignarle cuerpo técnico y jugadoras.');
      navigate(`/app/equipos/${saved.id}`);
    } catch (e) {
      toast.error('No hemos podido guardar el equipo', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await actions.deleteTeam(existing.id);
      toast.success('Equipo eliminado');
      navigate('/app/equipos');
    } catch (e) {
      toast.error('No hemos podido eliminarlo', humanError(e));
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Link
        to="/app/equipos"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-brand-800"
      >
        <ArrowLeft size={15} /> Equipos
      </Link>

      <PageHeader
        title={existing ? 'Editar equipo' : 'Nuevo equipo'}
        description="Los horarios que definas aquí aparecerán como referencia al planificar entrenamientos."
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
              Guardar equipo
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold">Datos del equipo</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" className="sm:col-span-2" hint="Como lo llamáis en el club.">
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ej.: Sub-17" />
            </Field>
            <Field label="Categoría">
              <Input
                value={form.category}
                onChange={(e) => patch({ category: e.target.value })}
                placeholder="Ej.: Juvenil, Cadete, Primer equipo"
              />
            </Field>
            <Field label="Temporada">
              <Input value={form.season} onChange={(e) => patch({ season: e.target.value })} placeholder="2026/27" />
            </Field>
            <Field label="Competición" className="sm:col-span-2">
              <Input
                value={form.competition}
                onChange={(e) => patch({ competition: e.target.value })}
                placeholder="Ej.: Liga Nacional Juvenil Femenina"
              />
            </Field>
            <Field label="Campo habitual" className="sm:col-span-2">
              <Input
                value={form.venue}
                onChange={(e) => patch({ venue: e.target.value })}
                placeholder="Ej.: Campo Municipal de Santa Ponsa"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14.5px] font-semibold">Horarios de entrenamiento</h2>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() =>
                patch({
                  trainingSlots: [
                    ...form.trainingSlots,
                    { weekday: 2, start: '18:00', end: '19:30', venue: form.venue },
                  ],
                })
              }
            >
              Añadir
            </Button>
          </div>

          {form.trainingSlots.length === 0 ? (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
              Sin horarios fijos. Puedes añadirlos ahora o planificar cada sesión con su propia hora.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {form.trainingSlots.map((s, i) => (
                <div key={i} className="rounded-xl border border-ink-200 p-3">
                  <Select value={s.weekday} onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })}>
                    {WEEKDAYS.map((d, k) => (
                      <option key={d} value={k}>
                        {d}
                      </option>
                    ))}
                  </Select>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Input type="time" value={s.start} onChange={(e) => setSlot(i, { start: e.target.value })} />
                    <Input type="time" value={s.end} onChange={(e) => setSlot(i, { end: e.target.value })} />
                  </div>
                  <Input
                    className="mt-2"
                    value={s.venue}
                    onChange={(e) => setSlot(i, { venue: e.target.value })}
                    placeholder="Campo"
                  />
                  <button
                    onClick={() => patch({ trainingSlots: form.trainingSlots.filter((_, k) => k !== i) })}
                    className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-400 transition-colors hover:text-danger"
                  >
                    <X size={13} /> Quitar horario
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`¿Eliminar ${existing?.name}?`}
        subtitle="Se borrarán también sus jugadoras, entrenamientos, partidos y asistencia."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={busy} onClick={remove}>
              Eliminar equipo
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-ink-600">
          Esta acción no se puede deshacer. Si el equipo simplemente ha terminado la temporada, es preferible dejarlo
          como está y crear uno nuevo para la temporada siguiente.
        </p>
      </Modal>
    </>
  );
}
