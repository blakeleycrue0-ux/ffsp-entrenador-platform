/**
 * La pastilla de navegación del móvil.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * NO ES EL DIQUE QUE SE QUITÓ. Aquello era una barra de borde a borde pegada
 * al suelo, con cuatro atajos y una hoja «Más» donde vivían escondidas otras
 * siete secciones en un orden distinto al del escritorio. Esto es otra cosa:
 *
 *  · TRES SITIOS, no cuatro más un cajón de sastre. Los tres a los que se
 *    vuelve todo el rato. La lista completa de once sigue estando donde
 *    estaba, en el cajón que se abre desde la cabecera, y en el mismo orden
 *    que en el escritorio.
 *  · FLOTA. Tiene esquinas, aire a los lados y sombra: se lee como un objeto
 *    que está por encima de la página, no como el final de la pantalla. Es
 *    la diferencia entre «aquí se acaba» y «esto va contigo».
 *  · RESERVA SU SITIO. El alto está en `--nav-h` y todo lo que se coloca por
 *    encima de lo que haya abajo lo lee de ahí. Nada se queda debajo.
 *
 * POR QUÉ ESTAS TRES. Inicio es a donde se vuelve; Calendario es lo que
 * contesta «qué hay esta semana» —entrenamientos y partidos en el mismo
 * sitio—; Plantilla es la lista que se abre antes de cada sesión. Las
 * etiquetas caben enteras a 320 px, que es el motivo por el que no están
 * aquí «Entrenamientos» ni «Equipo técnico»: a 11 px miden más que su celda
 * y habría que partirlas o recortarlas, y una etiqueta recortada en una
 * navegación es peor que no ponerla.
 *
 * Y EL CUARTO ES EL MENÚ. Estaba de hamburguesa en la cabecera, y eso dejaba
 * la pastilla sin marcar en ocho de las once secciones: entrabas en
 * Entrenamientos y abajo no se encendía nada, como si estuvieras en ningún
 * sitio. Con el menú aquí dentro, la navegación siempre dice dónde estás —en
 * uno de los tres destinos o «en el menú»— y la cabecera se queda con lo
 * suyo: quién eres, buscar y los avisos.
 *
 * CADA DESTINO MIDE 84 px, no 92. Con 92, la pastilla entera medía 296 y a
 * 320 px de pantalla sólo quedan 288 entre los márgenes: se salía cuatro
 * píxeles por cada lado y quedaba pegada a los bordes. Con 84 son 272 y
 * respira.
 *
 * SIN DESENFOQUE. El fondo es un color opaco, no cristal. Un `backdrop-filter`
 * aquí obliga al navegador a recomponer todo lo que pasa por debajo en cada
 * fotograma del desplazamiento, y esto está encima de una lista que se
 * desplaza: es el sitio más caro de toda la aplicación para pedirlo.
 */

import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Home, Menu, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const DESTINOS = [
  { to: '/app', etiqueta: 'Inicio', icono: Home },
  { to: '/app/calendario', etiqueta: 'Calendario', icono: CalendarDays },
  { to: '/app/plantilla', etiqueta: 'Plantilla', icono: Users },
] as const;

/* Cuatro destinos en 320 px: 4 × 68 + 3 × 2 de hueco + 12 de relleno = 290,
   y entre márgenes quedan 288. Se le quitan dos píxeles al relleno lateral
   del propio destino y cuadra sin apretar nada. */
const DESTINO =
  'flex h-[52px] w-[68px] flex-col items-center justify-center gap-1 rounded-[17px]'
  + ' transition-colors duration-150';
const ACTIVO = 'bg-white/[0.10] text-ink-900';
const REPOSO = 'text-ink-600 active:bg-white/[0.05]';

/** Inicio sólo está activo en la raíz; los demás, también en sus subpáginas. */
const activo = (ruta: string, destino: string) =>
  destino === '/app' ? ruta === '/app' : ruta === destino || ruta.startsWith(`${destino}/`);

export function NavFlotante({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  /* Si no estás en ninguno de los tres, estás en una sección que vive en el
     menú: entonces el que se marca es el menú. */
  const enElMenu = !DESTINOS.some((d) => activo(pathname, d.to));

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-nav flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: 'calc(var(--nav-gap) + var(--safe-bottom))' }}
    >
      {/* EL DEGRADADO DE DEBAJO, Y ES LO QUE ARREGLA LA SENSACIÓN DE QUE LA
          BARRA «SE SUPERPONE». Que el contenido pase por debajo de algo que
          flota es lo normal —vuelve a verse al subir, y que no se quede
          tapado al final del todo lo mide `solapes.mjs`—, pero sin nada
          entre medias el texto aparecía cortado a cuchillo justo detrás de
          la pastilla y parecía un fallo de maquetación. Con el fondo
          desvaneciéndose, lo que pasa por debajo se apaga antes de llegar y
          se lee como profundidad en vez de como un corte.

          Es un degradado, no un desenfoque: cuesta cero al desplazarse. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10"
        style={{
          height: 'calc(var(--nav-h) + var(--nav-gap) + var(--safe-bottom) + 28px)',
          background:
            'linear-gradient(to top, #060C1B 0%, rgba(6,12,27,0.92) 42%, rgba(6,12,27,0) 100%)',
        }}
      />
      <nav
        aria-label="Navegación principal"
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-line bg-[#0C1628] p-1.5 shadow-pop"
      >
        {DESTINOS.map(({ to, etiqueta, icono: Icono }) => {
          const aqui = activo(pathname, to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={aqui ? 'page' : undefined}
              className={cn(DESTINO, aqui ? ACTIVO : REPOSO)}
            >
              <Icono size={19} strokeWidth={aqui ? 2.2 : 1.8} aria-hidden />
              <span className={cn('text-2xs leading-none', aqui ? 'font-semibold' : 'font-medium')}>
                {etiqueta}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMenu}
          aria-label="Abrir el menú"
          aria-current={enElMenu ? 'page' : undefined}
          className={cn(DESTINO, enElMenu ? ACTIVO : REPOSO)}
        >
          <Menu size={19} strokeWidth={enElMenu ? 2.2 : 1.8} aria-hidden />
          <span className={cn('text-2xs leading-none', enElMenu ? 'font-semibold' : 'font-medium')}>
            Menú
          </span>
        </button>
      </nav>
    </div>
  );
}
