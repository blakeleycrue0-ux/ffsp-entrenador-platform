import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { Button, Card, Field, Input, PageHeader, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { humanError } from '@/services/supabase';
import { TacticBoard } from './TacticBoard';
import { cn } from '@/lib/utils';
import type { Drill, DrillTag, TacticShape } from '@/types';

const TAGS: DrillTag[] = [
  'Posesión', 'Finalización', 'Defensa', 'Ataque', 'Presión', 'Transición',
  'Técnica', 'Táctica', 'Preparación física', 'Calentamiento',
];

const empty = (): Drill => ({
  id: '',
  name: '',
  objective: '',
  tags: [],
  ageRange: 'U13 – Senior',
  players: '10 – 16',
  duration: 15,
  material: ['Balones', 'Conos'],
  description: '',
  progressions: [],
  tactic: [],
});

export default function DrillEditor() {
  const { drillId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, actions } = useClub();

  const existing = drillId ? data.drills.find((d) => d.id === drillId) : undefined;
  const [form, setForm] = useState<Drill>(existing ?? empty());

  const patch = (p: Partial<Drill>) => setForm((f) => ({ ...f, ...p }));

  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Falta el nombre del ejercicio', 'Ponle un nombre reconocible para el resto del cuerpo técnico.');
      return;
    }
    if (form.tags.length === 0) {
      toast.error('Añade al menos una etiqueta', 'Sin etiquetas el ejercicio no aparecerá en los filtros.');
      return;
    }
    setBusy(true);
    try {
      const saved = await actions.saveDrill(form);
      toast.success(existing ? 'Ejercicio actualizado ✓' : 'Ejercicio guardado en la biblioteca ✓');
      navigate(`/app/ejercicios/${saved.id}`);
    } catch (e) {
      toast.error('No hemos podido guardar el ejercicio', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link
        to="/app/ejercicios"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-brand-800"
      >
        <ArrowLeft size={15} /> Ejercicios
      </Link>

      <PageHeader
        title={existing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        description="Define el ejercicio y dibuja el esquema para que se entienda sin explicación."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button size="sm" icon={<Save size={15} />} loading={busy} onClick={save}>
              Guardar ejercicio
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Definición</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" className="sm:col-span-2">
                <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ej.: Rondo 5v2 a un toque" />
              </Field>
              <Field label="Objetivo" className="sm:col-span-2">
                <Input
                  value={form.objective}
                  onChange={(e) => patch({ objective: e.target.value })}
                  placeholder="¿Qué se busca desarrollar con este ejercicio?"
                />
              </Field>
              <Field label="Duración (minutos)">
                <Input type="number" value={form.duration} onChange={(e) => patch({ duration: Number(e.target.value) })} />
              </Field>
              <Field label="Jugadoras">
                <Input value={form.players} onChange={(e) => patch({ players: e.target.value })} placeholder="12 – 18" />
              </Field>
              <Field label="Edad recomendada" className="sm:col-span-2">
                <Input value={form.ageRange} onChange={(e) => patch({ ageRange: e.target.value })} placeholder="U15 – Senior" />
              </Field>
            </div>

            <Field label="Etiquetas" className="mt-4" hint="Determinan en qué filtros aparece y cómo lo usa el asistente.">
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      patch({ tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })
                    }
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                      form.tags.includes(t)
                        ? 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200'
                        : 'text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Descripción" className="mt-4">
              <Textarea
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Espacio, número de jugadoras, reglas, puntuación, rotaciones…"
                className="min-h-[130px]"
              />
            </Field>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Editor táctico</h2>
            <p className="mt-1 text-[13px] text-ink-500">
              Coloca jugadoras, dibuja movimientos y marca zonas. El esquema se guarda dentro del ejercicio.
            </p>
            <div className="mt-4">
              <TacticBoard shapes={form.tactic ?? []} onChange={(t: TacticShape[]) => patch({ tactic: t })} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[14.5px] font-semibold">Material</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {form.material.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[13px] text-ink-700"
                >
                  {m}
                  <button
                    onClick={() => patch({ material: form.material.filter((x) => x !== m) })}
                    className="text-ink-300 transition-colors hover:text-danger"
                    aria-label={`Quitar ${m}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
              <input
                placeholder="+ Añadir"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v && !form.material.includes(v)) patch({ material: [...form.material, v] });
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="rounded-lg border border-dashed border-ink-300 px-2.5 py-1.5 text-[13px] outline-none placeholder:text-ink-400 focus:border-brand-400"
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14.5px] font-semibold">Progresiones</h2>
            <p className="mt-1 text-[12.5px] text-ink-500">Variantes para subir o bajar la exigencia.</p>
            <ul className="mt-3 space-y-2">
              {(form.progressions ?? []).map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-50 text-[10.5px] font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <input
                    value={p}
                    onChange={(e) => {
                      const next = [...(form.progressions ?? [])];
                      next[i] = e.target.value;
                      patch({ progressions: next });
                    }}
                    className="flex-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-brand-400"
                  />
                  <button
                    onClick={() => patch({ progressions: (form.progressions ?? []).filter((_, k) => k !== i) })}
                    className="mt-1.5 text-ink-300 transition-colors hover:text-danger"
                    aria-label="Quitar progresión"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              block
              className="mt-3"
              icon={<Plus size={15} />}
              onClick={() => patch({ progressions: [...(form.progressions ?? []), ''] })}
            >
              Añadir progresión
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
