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
import { CalendarDays, Home, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const DESTINOS = [
  { to: '/app', etiqueta: 'Inicio', icono: Home },
  { to: '/app/calendario', etiqueta: 'Calendario', icono: CalendarDays },
  { to: '/app/plantilla', etiqueta: 'Plantilla', icono: Users },
] as const;

/** Inicio sólo está activo en la raíz; los demás, también en sus subpáginas. */
const activo = (ruta: string, destino: string) =>
  destino === '/app' ? ruta === '/app' : ruta === destino || ruta.startsWith(`${destino}/`);

export function NavFlotante() {
  const { pathname } = useLocation();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-nav flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: 'calc(var(--nav-gap) + var(--safe-bottom))' }}
    >
      <nav
        aria-label="Navegación principal"
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-[#0C1628] p-1.5 shadow-pop"
      >
        {DESTINOS.map(({ to, etiqueta, icono: Icono }) => {
          const aqui = activo(pathname, to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={aqui ? 'page' : undefined}
              className={cn(
                'flex h-[52px] w-[84px] flex-col items-center justify-center gap-1 rounded-[18px] transition-colors duration-150',
                aqui ? 'bg-white/[0.10] text-ink-900' : 'text-ink-600 active:bg-white/[0.05]',
              )}
            >
              <Icono size={19} strokeWidth={aqui ? 2.2 : 1.8} aria-hidden />
              <span className={cn('text-2xs leading-none', aqui ? 'font-semibold' : 'font-medium')}>
                {etiqueta}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
