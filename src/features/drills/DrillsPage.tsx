import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Star, Users } from 'lucide-react';
import { useClub } from '@/store/store';
import { Tag, Panel, EmptyState, Input, LinkButton, PageHeader } from '@/components/ui';
import { cn, normalize } from '@/lib/utils';
import type { DrillTag } from '@/types';

const TAGS: DrillTag[] = [
  'Posesión', 'Finalización', 'Defensa', 'Ataque', 'Presión', 'Transición',
  'Técnica', 'Táctica', 'Preparación física', 'Calentamiento',
];

export default function DrillsPage() {
  const { data, actions } = useClub();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<DrillTag[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);

  const drills = useMemo(
    () =>
      data.drills
        .filter((d) => (onlyFav ? d.favorite : true))
        .filter((d) => (active.length ? active.every((t) => d.tags.includes(t)) : true))
        .filter((d) =>
          query.trim()
            ? normalize(d.name).includes(normalize(query)) ||
              normalize(d.objective).includes(normalize(query)) ||
              normalize(d.description).includes(normalize(query))
            : true,
        ),
    [data.drills, query, active, onlyFav],
  );

  const toggleTag = (t: DrillTag) =>
    setActive((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]));

  return (
    <>
      <PageHeader
        title="Ejercicios"
        description="La biblioteca del club. Fíltralos, úsalos en un entrenamiento o crea los tuyos."
        actions={
          <LinkButton to="/app/ejercicios/nuevo" size="sm" icon={<Plus size={16} />}>
            Crear ejercicio
          </LinkButton>
        }
      />

      <Panel className="mb-5 p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, objetivo o descripción…"
            className="pl-10"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setOnlyFav((f) => !f)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
              onlyFav ? 'bg-warn/10 text-[#9A6412] ring-1 ring-inset ring-warn/30' : 'text-muted hover:bg-navy-100',
            )}
          >
            <Star size={14} className={onlyFav ? 'fill-current' : ''} /> Favoritos
          </button>
          <span className="mx-1 h-5 w-px bg-line" />
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                active.includes(t)
                  ? 'bg-navy-50 text-navy-900 ring-1 ring-inset ring-navy-200'
                  : 'text-muted hover:bg-navy-100',
              )}
            >
              {t}
            </button>
          ))}
          {(active.length > 0 || onlyFav || query) && (
            <button
              onClick={() => {
                setActive([]);
                setOnlyFav(false);
                setQuery('');
              }}
              className="ml-1 text-[12.5px] font-medium text-navy-900 hover:text-navy-900"
            >
              Limpiar filtros
            </button>
          )}
          <span className="ml-auto text-[12.5px] text-navy-400">{drills.length} ejercicios</span>
        </div>
      </Panel>

      {drills.length === 0 ? (
        <Panel>
          <EmptyState
           
            title="Ningún ejercicio coincide con el filtro"
            description="Prueba con otras etiquetas o crea un ejercicio nuevo para la biblioteca del club."
            action={
              <LinkButton to="/app/ejercicios/nuevo" size="sm">
                Crear ejercicio
              </LinkButton>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {drills.map((d) => (
            <Panel key={d.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/app/ejercicios/${d.id}`} className="min-w-0 flex-1">
                  <h3 className="text-[15.5px] font-semibold leading-tight text-navy-900 hover:text-navy-900">
                    {d.name}
                  </h3>
                </Link>
                <button
                  onClick={() => void actions.toggleFavorite(d)}
                  className={cn(
                    'shrink-0 rounded-lg p-1.5 transition-colors',
                    d.favorite ? 'text-warn' : 'text-navy-300 hover:text-warn',
                  )}
                  aria-label="Marcar favorito"
                >
                  <Star size={16} className={d.favorite ? 'fill-current' : ''} />
                </button>
              </div>

              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{d.objective}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {d.tags.slice(0, 3).map((t) => (
                  <Tag key={t} tone="solid" size="sm">
                    {t}
                  </Tag>
                ))}
                {d.tags.length > 3 && (
                  <Tag tone="neutral" size="sm">
                    +{d.tags.length - 3}
                  </Tag>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4 border-t border-navy-100 pt-3 text-[12.5px] text-muted">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-navy-400" /> {d.players}
                </span>
                <span className="tabular-nums">{d.duration}′</span>
                <span className="truncate">{d.ageRange}</span>
              </div>

              <div className="mt-3.5 flex gap-2">
                <LinkButton to="/app/planificaciones/nuevo" size="sm" variant="secondary" className="flex-1">
                  Usar en entrenamiento
                </LinkButton>
                <LinkButton to={`/app/ejercicios/${d.id}`} size="sm" variant="secondary">
                  Ver
                </LinkButton>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
