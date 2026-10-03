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

import { useEffect, useState } from 'react';
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

/**
 * ¿Está abierto el teclado del móvil?
 *
 * No hay un evento para esto, así que se mira lo que sí se puede medir: el
 * `visualViewport` —lo que de verdad se ve— se encoge cuando el teclado sube.
 * Con más de 140 px de diferencia no hay otra explicación razonable; por
 * debajo, es la barra del navegador escondiéndose.
 *
 * Hace falta porque el dique y el botón de crear van `fixed`, y con el teclado
 * abierto se quedan flotando ENCIMA de las teclas: tapan lo que se escribe y
 * se pulsan sin querer al ir a por una letra.
 */
function useTecladoAbierto(): boolean {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const mirar = () => setAbierto(window.innerHeight - vv.height > 140);
    mirar();
    vv.addEventListener('resize', mirar);
    return () => vv.removeEventListener('resize', mirar);
  }, []);

  return abierto;
}

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, signOut } = useClub();
  const staff = currentStaff(data);
  const [sheet, setSheet] = useState<null | 'more' | 'create'>(null);
  const teclado = useTecladoAbierto();

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
      {/* ── EL DIQUE ──────────────────────────────────────────────────────────
          Flota: separado de los bordes y por encima del área segura, para no
          chocar con los controles del navegador ni con la barra del iPhone. Es
          cristal de verdad, desenfoca lo que pasa por debajo, y no lleva ni
          brillo ni color: se tiene que notar poco. */}
      <nav
        aria-label="Secciones"
        /* `hidden` y no una animación: con el teclado abierto el dique estorba
           de verdad, y sacarlo del árbol evita además que el lector de
           pantalla lo recorra mientras se escribe. */
        className={cn('cristal-firme fixed inset-x-4 z-nav rounded-3xl lg:hidden', teclado && 'hidden')}
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
                {/* Crear, desde cualquier sección y a un toque del dique.
                    Antes esto era un botón redondo azul fijo en la esquina: se
                    montaba sobre las tarjetas de Inicio, competía con
                    «Guardar» en asistencia y repetía el «Añadir jugadora» que
                    ya estaba en la cabecera de cada lista. */}
                <div className="px-2 pt-1">
                  <button
                    onClick={() => setSheet('create')}
                    className="flex w-full items-center gap-3 rounded-2xl bg-raised px-4 py-3 text-left text-md font-semibold text-ink-900 active:opacity-80"
                  >
                    <Plus size={18} /> Crear…
                  </button>
                </div>
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
