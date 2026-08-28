import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, PencilLine, Plus, Star, Target, Users } from 'lucide-react';
import { useClub } from '@/store/store';
import { Badge, Button, Card, LinkButton, PageHeader } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { TacticBoard } from './TacticBoard';
import { cn, shortDate } from '@/lib/utils';

export default function DrillDetail() {
  const { drillId = '' } = useParams();
  const { data, actions } = useClub();
  const toast = useToast();

  const d = data.drills.find((x) => x.id === drillId);
  if (!d) return <Navigate to="/app/ejercicios" replace />;

  const usedIn = data.sessions.filter((s) => s.blocks.some((b) => b.drillId === d.id));

  return (
    <>
      <Link
        to="/app/ejercicios"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-brand-800"
      >
        <ArrowLeft size={15} /> Ejercicios
      </Link>

      <PageHeader
        eyebrow={d.tags.map((t) => (
          <Badge key={t} tone="brand" size="sm">
            {t}
          </Badge>
        ))}
        title={d.name}
        description={d.objective}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<Star size={15} className={d.favorite ? 'fill-current text-sun' : ''} />}
              onClick={() => {
                const wasFavorite = d.favorite;
                actions
                  .toggleFavorite(d)
                  .then(() => toast.success(wasFavorite ? 'Quitado de favoritos' : 'Guardado en favoritos ✓'))
                  .catch(() => toast.error('No hemos podido guardar el favorito'));
              }}
            >
              {d.favorite ? 'En favoritos' : 'Guardar favorito'}
            </Button>
            <LinkButton to={`/app/ejercicios/${d.id}/editar`} variant="outline" size="sm" icon={<PencilLine size={15} />}>
              Editar
            </LinkButton>
            <LinkButton to="/app/planificaciones/nuevo" size="sm" icon={<Plus size={15} />}>
              Usar en entrenamiento
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Pizarra */}
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Esquema táctico</h2>
            {d.tactic && d.tactic.length > 0 ? (
              <div className="mt-4">
                <TacticBoard shapes={d.tactic} readOnly />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-ink-200 py-12 text-center">
                <p className="text-[14px] font-medium text-ink-700">Este ejercicio aún no tiene esquema</p>
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">
                  Dibuja la situación en la pizarra táctica para que cualquier entrenador del club entienda el ejercicio
                  de un vistazo.
                </p>
                <LinkButton to={`/app/ejercicios/${d.id}/editar`} size="sm" variant="outline" className="mt-4">
                  Dibujar esquema
                </LinkButton>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Descripción</h2>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-600">{d.description}</p>
          </Card>

          {d.progressions && d.progressions.length > 0 && (
            <Card className="p-5">
              <h2 className="text-[15px] font-semibold">Progresiones</h2>
              <ol className="mt-3 space-y-2.5">
                {d.progressions.map((p, i) => (
                  <li key={p} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <span className="text-[13.5px] leading-relaxed text-ink-600">{p}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[14.5px] font-semibold">Ficha del ejercicio</h2>
            <dl className="mt-3.5 space-y-3">
              {[
                [<Clock key="a" size={15} />, 'Duración', `${d.duration} minutos`],
                [<Users key="b" size={15} />, 'Jugadoras', d.players],
                [<Target key="c" size={15} />, 'Edad recomendada', d.ageRange],
              ].map(([icon, label, value], i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-ink-400">{icon as React.ReactNode}</span>
                  <dt className="flex-1 text-[13px] text-ink-500">{label as string}</dt>
                  <dd className="text-[13.5px] font-medium text-ink-800">{value as string}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14.5px] font-semibold">Material</h2>
            <ul className="mt-3 space-y-2">
              {d.material.map((m) => (
                <li key={m} className="flex items-center gap-2.5 text-[13.5px] text-ink-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
                  {m}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14.5px] font-semibold">Uso en sesiones</h2>
            {usedIn.length === 0 ? (
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">
                Todavía no lo has incluido en ningún entrenamiento.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {usedIn.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/app/planificaciones/${s.id}`}
                      className="block truncate text-[13.5px] text-ink-700 hover:text-brand-800"
                    >
                      {s.title}
                    </Link>
                    <span className="text-[12px] text-ink-400">
                      {data.teams.find((t) => t.id === s.teamId)?.name} · {shortDate(s.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className={cn('p-5', 'bg-ink-50/60')}>
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              {!d.createdBy
                ? 'Ejercicio de la biblioteca del club. Puedes duplicarlo y adaptarlo a tu categoría.'
                : 'Ejercicio creado por el cuerpo técnico. Toda la biblioteca es compartida por el club.'}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
