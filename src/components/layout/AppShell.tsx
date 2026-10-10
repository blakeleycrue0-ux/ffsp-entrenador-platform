/**
 * El armazón de la aplicación.
 * ---------------------------------------------------------------------------
 * AQUÍ, Y SÓLO AQUÍ, SE DECIDE EL ESPACIO ENTRE LAS PIEZAS FIJAS Y LA PÁGINA.
 *
 * Antes cada página se apañaba sola: una reservaba sitio abajo para el dique,
 * otra se pegaba a una altura elegida a ojo, otra no reservaba nada y su
 * último renglón se quedaba debajo de la navegación. Y como cada número estaba
 * escrito en su archivo, cambiar el dique un par de píxeles dejaba mal a las
 * demás sin que nadie se enterara hasta verlo.
 *
 * El trato es éste:
 *
 *  · El armazón pone la cabecera, el ancho de la página, el margen lateral y
 *    el hueco de abajo, todo desde las variables de `index.css`.
 *  · Una página NO sabe que existe el dique ni cuánto mide la cabecera. Si una
 *    página necesita escribir `pb-[104px]` o `bottom-[76px]`, es que este
 *    archivo no está haciendo su trabajo.
 *  · Lo único que una página elige es CUÁNTO ANCHO necesita, porque eso
 *    depende de la tarea: un formulario se lee mal a mil píxeles y una
 *    plantilla de veintidós jugadoras se lee mal a setecientos.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MenuMovil } from './MenuMovil';
import { NavFlotante } from './NavFlotante';
import { CreateMenu } from './CreateMenu';
import { GlobalSearch } from './GlobalSearch';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * El ancho útil según la tarea, no según la pantalla.
 *
 *  · `formulario` — una columna que se lee de un vistazo. Una línea de texto
 *    de mil píxeles obliga a mover la cabeza para volver al principio.
 *  · `tabla` — listas con varias columnas: asistencia, partidos, sesiones.
 *  · `ancho` — plantillas, analíticas, calendarios: cuantas más quepan mejor.
 *  · `completo` — la pizarra, que se queda con todo.
 */
export type Anchura = 'formulario' | 'tabla' | 'ancho' | 'completo';

const MAXIMOS: Record<Anchura, string> = {
  formulario: '760px',
  tabla: '1080px',
  ancho: '1320px',
  completo: 'none',
};

const AnchuraContexto = createContext<(a: Anchura) => void>(() => {});

/**
 * Una página declara el ancho que le viene bien. No cambia nada más: ni
 * márgenes, ni huecos, ni capas.
 */
export function useAnchura(a: Anchura) {
  const set = useContext(AnchuraContexto);
  useEffect(() => {
    set(a);
    return () => set('ancho');
  }, [a, set]);
}

/**
 * ¿Está desplegado el menú de la izquierda?
 * ---------------------------------------------------------------------------
 * Va en `localStorage` y no en la base de datos a propósito: es una comodidad
 * de ESTE aparato, no un dato del club. Quien trabaja en un portátil pequeño lo
 * quiere plegado y en un monitor grande desplegado, y es la misma persona.
 *
 * La lectura va envuelta porque en una ventana privada o con el almacenamiento
 * bloqueado `localStorage` lanza en vez de devolver nulo, y eso tumbaría la
 * aplicación entera antes de pintar nada.
 */
const LLAVE_MENU = 'p360.menu';
function menuGuardado(): boolean {
  try {
    return window.localStorage.getItem(LLAVE_MENU) !== 'plegado';
  } catch {
    return true;
  }
}

export function AppShell() {
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(menuGuardado);
  const [cajon, setCajon] = useState(false);
  const [create, setCreate] = useState(false);
  const [anchura, setAnchura] = useState<Anchura>('ancho');
  const { pathname } = useLocation();

  const alternaMenu = useCallback(() => {
    setMenu((m) => {
      try { window.localStorage.setItem(LLAVE_MENU, m ? 'plegado' : 'abierto'); } catch { /* da igual */ }
      return !m;
    });
  }, []);

  // Atajos: ⌘K buscar · ⌘I crear · ⌘B plegar el menú
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (mod && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setCreate(true);
      }
      /* ⌘B, como en todos los editores. Quien trabaja en la pizarra lo va a
         usar cada dos por tres y no quiere ir a buscar el botón. */
      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        alternaMenu();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [alternaMenu]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setCajon(false);
  }, [pathname]);

  const openCreate = useCallback(() => setCreate(true), []);
  const ponAnchura = useCallback((a: Anchura) => setAnchura(a), []);
  const valor = useMemo(() => ponAnchura, [ponAnchura]);

  return (
    <AnchuraContexto.Provider value={valor}>
      {/* Plegar el menú es poner su ancho a cero: todo lo que se aparta de él
          —el contenido, la cabecera, el espacio de trabajo de la pizarra— lo
          hace leyendo esta misma variable, así que no hay dos sitios donde
          acordarse del número. */}
      <div
        className="min-h-screen bg-surface"
        style={menu ? undefined : ({ '--sidebar-w': '0px' } as React.CSSProperties)}
      >
        {menu && <Sidebar onCreate={openCreate} onPlegar={alternaMenu} />}

        <div className="lg:pl-[var(--sidebar-w)]">
          <Topbar
            onSearch={() => setSearch(true)}
            onCreate={openCreate}
            menu={menu}
            onMenu={alternaMenu}
            onCajon={() => setCajon(true)}
          />

          <main
            className="mx-auto w-full"
            style={{
              maxWidth: MAXIMOS[anchura],
              paddingInline: 'var(--pagina-x)',
              paddingTop: 'var(--pagina-top)',
              /* El hueco de abajo lo pone el armazón, no la página: así el
                 último renglón siempre se puede leer por encima del dique. */
              paddingBottom: 'var(--hueco-inferior)',
            }}
          >
            {/* El límite va DENTRO del armazón, no fuera: si una pantalla falla,
                el menú y la búsqueda siguen ahí y se puede ir a otro sitio. La
                clave es la ruta, así que navegar reintenta solo. */}
            <ErrorBoundary resetKey={pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>

        <NavFlotante />
        <MenuMovil abierto={cajon} onCerrar={() => setCajon(false)} onCreate={openCreate} />
        <GlobalSearch open={search} onClose={() => setSearch(false)} />
        <CreateMenu open={create} onClose={() => setCreate(false)} />
      </div>
    </AnchuraContexto.Provider>
  );
}
