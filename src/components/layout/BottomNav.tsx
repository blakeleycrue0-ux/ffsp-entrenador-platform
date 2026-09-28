/**
 * Navegación en móvil. Cuatro destinos fijos y una hoja «Más» con el resto:
 * en pantalla pequeña no se esconde ninguna sección.
 *
 * LO ACTIVO ES BLANCO, Y YA ESTÁ. Antes, encima de la sección activa había un
 * punto azul con un halo. No decía nada que el blanco de la palabra no dijera
 * ya, y dos señales para lo mismo se leen como una decoración: se quitó.
 *
 * NO SE COLOCA SOLO. Su alto y su separación del borde salen de `--nav-h` y
 * `--nav-gap`, las mismas variables con las que el armazón calcula el hueco
 * que deja la página por abajo. Si aquí se escribiera el número a mano, el
 * hueco de la página dejaría de cuadrar en cuanto uno de los dos cambiara.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Dumbbell, LogOut, Plus, Swords, UserRound, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClub } from '@/store/store';
import { currentStaff } from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { Avatar } from '@/components/ui';
import { ALL_NAV_ITEMS, MOBILE_NAV, admiteCrear, isActive } from './navigation';

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

  /* EL DIQUE YA NO SE ENCOGE AL DESPLAZAR. Cambiaba de alto —64 a 56 px— y con
     él cambiaba el sitio donde acababa la página, así que el contenido se movía
     bajo el dedo mientras se leía. Un alto fijo no salta. */

  return (
    <>
      {/* Acción rápida: pequeña, azul y justo encima del dique. Sólo donde de
          verdad se empieza algo nuevo — ver `admiteCrear`. */}
      {admiteCrear(pathname) && (
      <button
        onClick={() => setSheet('create')}
        aria-label="Crear"
        className={cn(
          'fixed right-4 z-flotante grid w-[var(--fab-h)] place-items-center rounded-full text-white',
          '[background:linear-gradient(180deg,#168BFF,#087AF0)] shadow-pop',
          'transition-transform duration-200 ease-out active:scale-95 lg:hidden',
        )}
        /* Siempre por encima del dique y con dieciséis píxeles de aire, se
           encoja éste o no: antes tenía sus propios 76 y 88 px y en cuanto el
           dique cambiaba de alto se le montaba encima. */
        style={{ height: 'var(--fab-h)', bottom: 'calc(var(--sobre-nav) + var(--fab-gap))' }}
      >
        <Plus size={22} strokeWidth={2.2} />
      </button>
      )}

      {/* ── EL DIQUE ──────────────────────────────────────────────────────────
          Flota: separado de los bordes y por encima del área segura, para no
          chocar con los controles del navegador ni con la barra del iPhone. Es
          cristal de verdad, desenfoca lo que pasa por debajo, y no lleva ni
          brillo ni color: se tiene que notar poco. */}
      <nav
        aria-label="Secciones"
        className="cristal fixed inset-x-4 z-nav rounded-3xl lg:hidden"
        style={{
          height: 'var(--nav-h)',
          bottom: 'calc(var(--nav-gap) + var(--safe-bottom))',
        }}
      >
        <div className="flex h-full items-stretch">
          {TABS.map((tab) => {
            const on = isActive(pathname, tab);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={on ? 'page' : undefined}
                className="flex min-w-0 flex-1 items-center justify-center px-1"
              >
                <span
                  className={cn(
                    'max-w-full truncate text-[11.5px] transition-colors',
                    on ? 'font-semibold text-white' : 'font-medium text-white/[0.42]',
                  )}
                >
                  {tab.short ?? tab.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSheet('more')}
            className="flex min-w-0 flex-1 items-center justify-center px-1"
          >
            <span className={cn('text-[11.5px] transition-colors', moreActive ? 'font-semibold text-white' : 'font-medium text-white/[0.42]')}>
              Más
            </span>
          </button>
        </div>
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-hoja lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={() => setSheet(null)} />
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
