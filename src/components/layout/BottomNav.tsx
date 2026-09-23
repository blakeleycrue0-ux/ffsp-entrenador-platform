/**
 * Navegación en móvil. Cuatro destinos fijos y una hoja «Más» con el resto:
 * en pantalla pequeña no se esconde ninguna sección.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Dumbbell, LogOut, MoreHorizontal, Plus, Swords, UserRound, Users, X } from 'lucide-react';
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

  return (
    <>
      <button
        onClick={() => setSheet('create')}
        aria-label="Crear"
        className="fixed bottom-[calc(72px+var(--safe-bottom))] right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-navy-900 text-white shadow-raised transition-transform active:scale-95 lg:hidden"
      >
        <Plus size={22} strokeWidth={2.2} />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[var(--safe-bottom)] lg:hidden">
        <div className="flex h-[58px] items-stretch">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const on = isActive(pathname, tab);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={on ? 'page' : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-1"
              >
                {on && <span className="absolute top-0 h-0.5 w-8 bg-navy-900" />}
                <Icon size={19} strokeWidth={on ? 2.1 : 1.8} className={on ? 'text-navy-900' : 'text-navy-400'} />
                <span className={cn('text-[10px] font-medium', on ? 'text-navy-900' : 'text-muted')}>
                  {tab.short ?? tab.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSheet('more')}
            className="relative flex flex-1 flex-col items-center justify-center gap-1"
          >
            {moreActive && <span className="absolute top-0 h-0.5 w-8 bg-navy-900" />}
            <MoreHorizontal size={19} strokeWidth={moreActive ? 2.1 : 1.8} className={moreActive ? 'text-navy-900' : 'text-navy-400'} />
            <span className={cn('text-[10px] font-medium', moreActive ? 'text-navy-900' : 'text-muted')}>Más</span>
          </button>
        </div>
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-navy-900/35 animate-fade-in" onClick={() => setSheet(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-xl border-t border-line bg-white pb-[calc(1rem+var(--safe-bottom))] shadow-pop animate-slide-up">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-4 py-3">
              <p className="text-md font-semibold">{sheet === 'create' ? 'Crear' : 'Todas las secciones'}</p>
              <button
                onClick={() => setSheet(null)}
                className="-mr-1 rounded p-1.5 text-navy-400 hover:bg-surface hover:text-navy-900"
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
                      <Icon size={17} className="text-navy-400" />
                      <span className="text-base font-medium text-navy-900">{q.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <ul className="p-2">
                  {MORE.map((m) => {
                    const Icon = m.icon;
                    const on = isActive(pathname, m);
                    return (
                      <li key={m.to}>
                        <button
                          onClick={() => go(m.to)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-base transition-colors',
                            on ? 'bg-navy-900 font-medium text-white' : 'text-navy-800 active:bg-surface',
                          )}
                        >
                          <Icon size={17} className={on ? 'text-white' : 'text-navy-400'} />
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
                      <span className="block truncate text-base font-medium text-navy-900">{staff?.name}</span>
                      <span className="block text-xs text-muted">{staff ? ROLE_LABEL[staff.role] : ''}</span>
                    </span>
                    <UserRound size={16} className="text-navy-300" />
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
