/**
 * Acceso flotante al asistente (escritorio) + panel lateral deslizante.
 * En móvil el asistente vive en la pestaña "Más" y en su página propia, para
 * no competir con el botón de creación rápida sobre el pulgar.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Maximize2, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AssistantPanel } from './AssistantPanel';
import { useClub } from '@/store/store';
import { teamById } from '@/store/selectors';

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const { data, teamId } = useClub();
  const { pathname } = useLocation();
  const team = teamById(data, teamId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // En su propia página el lanzador estorba.
  if (pathname.startsWith('/app/asistente')) return null;

  return (
    <>
      {/* Botón compacto: se expande al pasar el ratón para no tapar contenido. */}
      <button
        onClick={() => setOpen(true)}
        title="FFSP Assistant (⌘J)"
        className="group fixed bottom-6 right-6 z-40 hidden h-[52px] items-center gap-2.5 overflow-hidden rounded-full bg-brand-700 py-3 pl-3.5 pr-3.5 shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:pr-5 lg:flex"
      >
        <Sparkles size={20} className="shrink-0 text-white" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13.5px] font-medium text-white opacity-0 transition-all duration-200 group-hover:max-w-[140px] group-hover:opacity-100">
          FFSP Assistant
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[65]">
          <div className="absolute inset-0 bg-ink-900/20 backdrop-blur-[2px] animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-white shadow-pop animate-fade-in">
            <div className="flex items-center justify-between border-b border-ink-200/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700">
                  <Sparkles size={17} className="text-white" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold leading-tight text-ink-900">FFSP Assistant</p>
                  <p className="text-[12px] text-ink-500">Contexto: {team?.name ?? 'sin equipo'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  to="/app/asistente"
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                  aria-label="Abrir a pantalla completa"
                >
                  <Maximize2 size={17} />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                  aria-label="Cerrar asistente"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <AssistantPanel />
          </div>
        </div>
      )}
    </>
  );
}
