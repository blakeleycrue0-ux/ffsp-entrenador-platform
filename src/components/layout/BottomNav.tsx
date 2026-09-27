/**
 * Navegación en móvil. Cuatro destinos fijos y una hoja «Más» con el resto:
 * en pantalla pequeña no se esconde ninguna sección.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Dumbbell, LogOut, Plus, Swords, UserRound, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClub } from '@/store/store';
import { currentStaff } from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { Avatar } from '@/components/ui';
import { ALL_NAV_ITEMS, MOBILE_NAV, isActive } from './navigation';

const TABS = MOBILE_NAV.map((to) => ALL_NAV_ITEMS.find((i) => i.to === to)!).filter(Boolean);
const MORE = ALL_NAV_ITEMS.filter((i) => !MOBILE_NAV.includes(i.to));

const QUICK = [
  { label: 'Nuevo entrenamiento', to: '/app/entrenamientos/nuevo', icon: ClipboardList },
  { label: 'Nuevo partido', to: '/app/partidos/nuevo', icon: Swords },
  { label: 'Nueva jugadora', to: '/app/plantilla/nueva', icon: Users },
  { label: 'Nuevo ejercicio', to: '/app/ejercicios/nuevo', icon: Dumbbell },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, signOut } = useClub();
  const staff = currentStaff(data);
  const [sheet, setSheet] = useState<null | 'more' | 'create'>(null);

  const moreActive = MORE.some((m) => isActive(pathname, m));

  const go = (to: string) => {
    navigate(to);
    setSheet(null);
  };

  /* El dique se comprime al bajar y vuelve al subir. Es lo único que hace
     falta para que se note que flota por encima del contenido y no forma
     parte de la página. */
  const [compacto, setCompacto] = useState(false);
  const ultimo = useRef(0);
  useEffect(() => {
    const alScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - ultimo.current) > 8) {
        setCompacto(y > ultimo.current && y > 40);
        ultimo.current = y;
      }
    };
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  return (
    <>
      {/* Acción rápida: pequeña, azul y justo encima del dique. */}
      <button
        onClick={() => setSheet('create')}
        aria-label="Crear"
        className={cn(
          'fixed right-4 z-40 grid h-[52px] w-[52px] place-items-center rounded-full text-white',
          'shadow-azul [background:linear-gradient(180deg,#168BFF,#087AF0)]',
          'transition-[transform,bottom] duration-300 ease-out active:scale-95 lg:hidden',
          compacto ? 'bottom-[calc(76px+var(--safe-bottom))]' : 'bottom-[calc(88px+var(--safe-bottom))]',
        )}
      >
        <Plus size={23} strokeWidth={2.2} />
      </button>

      {/* ── EL DIQUE ──────────────────────────────────────────────────────────
          Flota: separado de los bordes y por encima del área segura, para no
          chocar nunca con los controles del navegador ni con la barra del
          iPhone. Es cristal de verdad — desenfoca lo que pasa por debajo — y
          lo activo se marca con un punto azul, no pintando el dique entero. */}
      <nav
        className={cn(
          'cristal fixed inset-x-3 z-40 rounded-3xl transition-[transform,bottom,height] duration-300 lg:hidden',
          'ease-[cubic-bezier(.22,1,.36,1)]',
          compacto
            ? 'bottom-[calc(8px+var(--safe-bottom))] h-[56px]'
            : 'bottom-[calc(12px+var(--safe-bottom))] h-[64px]',
        )}
      >
        <div className="flex h-full items-stretch">
          {TABS.map((tab) => {
            const on = isActive(pathname, tab);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={on ? 'page' : undefined}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-all duration-200',
                    on ? 'bg-azul-600 shadow-azul' : 'bg-transparent',
                  )}
                />
                <span
                  className={cn(
                    'max-w-full truncate text-[11px] transition-colors',
                    on ? 'font-semibold text-white' : 'font-medium text-white/45',
                  )}
                >
                  {tab.short ?? tab.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSheet('more')}
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1"
          >
            <span
              aria-hidden
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-all duration-200',
                moreActive ? 'bg-azul-600 shadow-azul' : 'bg-transparent',
              )}
            />
            <span className={cn('text-[11px] transition-colors', moreActive ? 'font-semibold text-white' : 'font-medium text-white/45')}>
              Más
            </span>
          </button>
        </div>
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink-900/35 animate-fade-in" onClick={() => setSheet(null)} />
          {/* Hoja de cristal, con su tirador. Sube desde abajo, no aparece
              en el centro como un cuadro de diálogo de escritorio. */}
          <div className="cristal absolute inset-x-0 bottom-0 max-h-[82vh] animate-sheet-in overflow-y-auto rounded-t-4xl pb-[calc(1rem+var(--safe-bottom))]">
            <span aria-hidden className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25" />
            <div className="flex items-center justify-between px-5 pb-2 pt-6">
              <p className="text-md font-semibold">{sheet === 'create' ? 'Crear' : 'Todas las secciones'}</p>
              <button
                onClick={() => setSheet(null)}
                className="-mr-1 rounded p-1.5 text-ink-400 hover:bg-surface hover:text-ink-900"
                aria-label="Cerrar"
              >
                <X size={17} />
              </button>
            </div>

            {sheet === 'create' ? (
              <div className="p-2">
                {QUICK.map((q) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={q.label}
                      onClick={() => go(q.to)}
                      className="flex w-full items-center gap-3 rounded px-3 py-3 text-left transition-colors active:bg-surface"
                    >
                      <Icon size={17} className="text-ink-400" />
                      <span className="text-base font-medium text-ink-900">{q.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <ul className="p-2">
                  {MORE.map((m) => {
                    const on = isActive(pathname, m);
                    return (
                      <li key={m.to}>
                        <button
                          onClick={() => go(m.to)}
                          className={cn(
                            'flex w-full items-center rounded-2xl px-4 py-3 text-left text-md transition-colors',
                            on ? 'bg-ink-900 font-semibold text-ink-0' : 'font-medium text-ink-700 active:bg-raised',
                          )}
                        >
                          {m.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-2 border-t border-line p-2">
                  <button
                    onClick={() => go('/app/perfil')}
                    className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left active:bg-surface"
                  >
                    <Avatar name={staff?.name ?? '—'} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-ink-900">{staff?.name}</span>
                      <span className="block text-xs text-muted">{staff ? ROLE_LABEL[staff.role] : ''}</span>
                    </span>
                    <UserRound size={16} className="text-ink-300" />
                  </button>
                  <button
                    onClick={() => void signOut()}
                    className="mt-1 flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-base font-medium text-bad active:bg-bad/5"
                  >
                    <LogOut size={17} /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
