/**
 * Búsqueda global (⌘K / Ctrl+K).
 * Busca jugadores, equipos, entrenamientos, ejercicios, partidos y mensajes,
 * y muestra contexto útil en el propio resultado (asistencia, dorsal, fecha).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Dumbbell, MessageSquare, Search, Shield, Swords, User, UserSquare2 } from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, globalSearch, playerAttendance, visibleTeams, type SearchHit } from '@/store/selectors';
import { cn } from '@/lib/utils';

const ICONS: Record<SearchHit['kind'], typeof User> = {
  jugador: User,
  equipo: Shield,
  entrenamiento: UserSquare2,
  ejercicio: Dumbbell,
  partido: Swords,
  mensaje: MessageSquare,
};

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  jugador: 'Jugador',
  equipo: 'Equipo',
  entrenamiento: 'Entrenamiento',
  ejercicio: 'Ejercicio',
  partido: 'Partido',
  mensaje: 'Mensaje',
};

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, session } = useClub();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const staff = currentStaff(data, session?.staffId);
  const teamIds = useMemo(() => visibleTeams(data, staff).map((t) => t.id), [data, staff]);
  const hits = useMemo(() => globalSearch(data, teamIds, query), [data, teamIds, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  const go = (hit: SearchHit) => {
    navigate(hit.to);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter' && hits[cursor]) {
      go(hits[cursor]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  /** Contexto extra para jugadores: el entrenador quiere ver asistencia al buscar. */
  const playerMeta = (id: string) => {
    const player = data.players.find((p) => p.id === id);
    if (!player) return null;
    const row = playerAttendance(data, player.teamId).find((r) => r.player.id === id);
    return row ? `Asistencia ${row.rate}%` : null;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink-900/25 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop animate-scale-in">
        <div className="flex items-center gap-3 border-b border-ink-200/80 px-4">
          <Search size={18} className="shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar jugador, equipo, entrenamiento, ejercicio, partido…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-400"
          />
          <kbd className="hidden rounded-md border border-ink-200 px-1.5 py-0.5 text-[11px] font-medium text-ink-400 sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <div className="px-3 py-6">
              <p className="text-[12.5px] font-medium uppercase tracking-wide text-ink-400">Sugerencias</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Sergi', 'Sub-17', 'Presión', 'Rondo', 'Atlético Palma'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[13px] text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[14px] font-medium text-ink-700">Sin resultados para «{query}»</p>
              <p className="mt-1 text-[13px] text-ink-500">Prueba con el nombre de un jugador, un rival o una etiqueta.</p>
            </div>
          ) : (
            hits.map((hit, i) => {
              const Icon = ICONS[hit.kind];
              const meta = hit.kind === 'jugador' ? playerMeta(hit.id) : hit.meta;
              return (
                <button
                  key={`${hit.kind}-${hit.id}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(hit)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    i === cursor ? 'bg-brand-50' : 'hover:bg-ink-50',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                      i === cursor ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500',
                    )}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink-900">{hit.title}</span>
                    <span className="block truncate text-[12.5px] text-ink-500">{hit.subtitle}</span>
                  </span>
                  {meta && <span className="shrink-0 text-[12px] font-medium text-ink-400">{meta}</span>}
                  <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-400 ring-1 ring-ink-200">
                    {KIND_LABEL[hit.kind]}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-ink-200/80 bg-ink-50/60 px-4 py-2.5 text-[11.5px] text-ink-400">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">↑↓ navegar</span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={12} /> abrir
            </span>
          </span>
          <span>{hits.length > 0 && `${hits.length} resultado${hits.length === 1 ? '' : 's'}`}</span>
        </div>
      </div>
    </div>
  );
}
