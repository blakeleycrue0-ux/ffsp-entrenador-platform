import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { Button, Desplegable, Panel, Field, Input, PageHeader, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { humanError } from '@/services/supabase';
import { DrillBoardEditor } from '@/features/board/DrillBoard';
import { cn } from '@/lib/utils';
import type { Drill, DrillTag } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';

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
  /* El ancho lo decide la tarea, no la pantalla. */
  useAnchura('ancho');
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
      toast.success(existing ? 'Ejercicio actualizado' : 'Ejercicio guardado en la biblioteca');
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
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink-900"
      >
        <ArrowLeft size={15} /> Ejercicios
      </Link>

      <PageHeader
        title={existing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
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

      {/* UN EJERCICIO SON TRES COSAS: cómo se llama, para qué sirve y cuánto
          dura. Había siete campos, once etiquetas, el material, las
          progresiones y el editor de esquemas, todo a la vez: veinticinco
          cosas que pulsar y dos botones peleándose por ser el principal. Las
          etiquetas y el material no se deciden mientras se escribe el
          ejercicio; se deciden después, o nunca. */}
      <div className="space-y-4">
        <Panel className="p-4 sm:p-5">
          <div className="space-y-4">
            <Field label="Nombre">
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ej.: Rondo 5v2 a un toque" />
            </Field>
            <Field label="Para qué sirve">
              <Input
                value={form.objective}
                onChange={(e) => patch({ objective: e.target.value })}
                placeholder="¿Qué se busca desarrollar con este ejercicio?"
              />
            </Field>
            <Field label="Dura" hint="Minutos.">
              <Input
                type="number"
                inputMode="numeric"
                value={form.duration}
                onChange={(e) => patch({ duration: Number(e.target.value) })}
              />
            </Field>
            <Field label="Cómo se hace">
              <Textarea
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Espacio, número de jugadoras, reglas, puntuación, rotaciones…"
                className="min-h-[120px]"
              />
            </Field>
          </div>
        </Panel>

        {/* EL ESQUEMA, PLEGADO. Es lo mejor que tiene esta pantalla y también
            lo más caro: un campo entero con fichas que se arrastran, y el
            segundo botón que se pintaba como acción principal. Plegado, el
            ejercicio se puede escribir y guardar en treinta segundos; abierto,
            está igual que antes. */}
        <Desplegable
          titulo="Dibujar el esquema"
          pista="Coloca a las jugadoras y, si hace falta, muévelas"
          abierto={!!form.animation}
        >
          <DrillBoardEditor
            value={form.animation}
            onChange={(scene) => patch({ animation: scene ?? undefined })}
          />
        </Desplegable>

        <Desplegable titulo="Más opciones" pista="Etiquetas, material, jugadoras, edad y progresiones">
          <Field label="Etiquetas" hint="Determinan en qué filtros aparece.">
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    patch({ tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })
                  }
                  className={cn(
                    'inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors',
                    form.tags.includes(t)
                      ? 'bg-ink-50 text-ink-900 ring-1 ring-inset ring-ink-200'
                      : 'text-muted ring-1 ring-inset ring-line hover:bg-ink-50',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Jugadoras">
              <Input value={form.players} onChange={(e) => patch({ players: e.target.value })} placeholder="12 – 18" />
            </Field>
            <Field label="Edad recomendada">
              <Input value={form.ageRange} onChange={(e) => patch({ ageRange: e.target.value })} placeholder="U15 – Senior" />
            </Field>
          </div>

          <Field label="Material">
            <div className="flex flex-wrap gap-2">
              {form.material.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-700"
                >
                  {m}
                  <button
                    onClick={() => patch({ material: form.material.filter((x) => x !== m) })}
                    className="-mr-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-raised hover:text-bad"
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
                /* 40 px y letra de 16: por debajo de 16, Safari en el iPhone
                   amplía la página entera al enfocar. */
                className="h-10 rounded-xl border border-dashed border-line-fuerte bg-transparent px-3 text-md outline-none placeholder:text-ink-500 focus:border-marca-500"
              />
            </div>
          </Field>

          <Field label="Progresiones" hint="Variantes para subir o bajar la exigencia.">
            <ul className="space-y-2">
              {(form.progressions ?? []).map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-ink-50 text-2xs font-bold text-ink-900">
                    {i + 1}
                  </span>
                  <input
                    value={p}
                    onChange={(e) => {
                      const next = [...(form.progressions ?? [])];
                      next[i] = e.target.value;
                      patch({ progressions: next });
                    }}
                    className="h-10 flex-1 rounded-xl border border-line bg-transparent px-3 text-md outline-none focus:border-marca-500"
                  />
                  <button
                    onClick={() => patch({ progressions: (form.progressions ?? []).filter((_, k) => k !== i) })}
                    className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-raised hover:text-bad"
                    aria-label="Quitar progresión"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              block
              className="mt-3"
              icon={<Plus size={15} />}
              onClick={() => patch({ progressions: [...(form.progressions ?? []), ''] })}
            >
              Añadir progresión
            </Button>
          </Field>
        </Desplegable>
      </div>
    </>
  );
}
