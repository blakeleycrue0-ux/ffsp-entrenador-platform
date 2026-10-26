/**
 * Las pestañas de la sección.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SUSTITUYEN AL TÍTULO DE LA PANTALLA, no lo acompañan. Antes, en Plantilla,
 * lo primero eran dos líneas: «Plantilla» en grande y «Gestiona las fichas,
 * posiciones y disponibilidad de tus jugadores» debajo. Eso es un cartel que
 * dice dónde estás a alguien que acaba de pulsar para llegar ahí —y que ocupa
 * el sitio de la primera jugador—. La pestaña encendida dice lo mismo en una
 * palabra, y de paso enseña a dónde más se puede ir desde aquí.
 *
 * SE PINTAN SOLAS, desde el armazón. Una pantalla no tiene que acordarse de
 * ponerlas, y por eso no puede pasar que una sección nueva se quede sin ellas
 * o que una las pinte en otro sitio.
 *
 * NO LLEVAN CONTADORES. Se probó: «Plantilla 16 · Disponibilidad 3 · Datos».
 * Un número al lado de una palabra se lee como un aviso —«tres cosas que
 * atender»— y aquí no lo era: eran tres jugadores tocadas, que es información,
 * no una tarea. Los números van dentro, donde significan algo.
 */

import { Link, useLocation } from 'react-router-dom';
import { paginaExacta } from './navigation';
import { cn } from '@/lib/utils';

export function PestañasDeSeccion() {
  const { pathname } = useLocation();
  const donde = paginaExacta(pathname);
  /* Sin pestañas en Inicio —es una sección de una sola pantalla— ni dentro de
     una ficha o un formulario. */
  if (!donde || donde.seccion.paginas.length < 2) return null;

  return (
    <nav
      aria-label={donde.seccion.label}
      /* A lo ancho de la página, saliéndose de los márgenes en el móvil para
         que la primera pestaña empiece donde empieza el texto y la última se
         pueda arrastrar hasta el borde. */
      className="mb-4 max-sm:-mx-[var(--pagina-x)] max-sm:px-[var(--pagina-x)] max-sm:overflow-x-auto max-sm:no-scrollbar sm:mb-5"
    >
      <ul className="flex gap-1.5">
        {donde.seccion.paginas.map((p) => {
          const aqui = p.to === donde.pagina.to;
          return (
            <li key={p.to} className="shrink-0">
              <Link
                to={p.to}
                aria-current={aqui ? 'page' : undefined}
                className={cn(
                  /* 40 px de alto: es una navegación y se toca con el pulgar. */
                  'flex h-10 items-center rounded-full px-4 text-base transition-colors',
                  aqui
                    ? 'bg-ink-900 font-semibold text-ink-0'
                    : 'bg-panel font-medium text-ink-600 active:bg-raised sm:hover:bg-raised sm:hover:text-ink-900',
                )}
              >
                {p.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
