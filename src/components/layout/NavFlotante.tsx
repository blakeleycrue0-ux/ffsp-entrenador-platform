/**
 * La pastilla de navegación del móvil.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LAS CUATRO SECCIONES, Y NADA MÁS. Ya no hay un «Menú» que abra una lista de
 * once: la lista de once no existe. Lo que hay son cuatro sitios, cada uno con
 * sus pantallas dentro en pestañas, y los cuatro están aquí. Así que esta
 * pastilla ya no es un atajo a lo más usado con el resto escondido detrás: es
 * la navegación entera, a la vista, siempre.
 *
 * Eso quita de encima la pregunta que dejaba a la gente parada: «¿esto estará
 * en el menú o en la barra de abajo?». No hay dos sitios donde mirar.
 *
 *  · FLOTA. Tiene esquinas, aire a los lados y sombra: se lee como un objeto
 *    que está por encima de la página, no como el final de la pantalla. Es
 *    la diferencia entre «aquí se acaba» y «esto va contigo».
 *  · RESERVA SU SITIO. El alto está en `--nav-h` y todo lo que se coloca por
 *    encima de lo que haya abajo lo lee de ahí. Nada se queda debajo.
 *  · SIEMPRE MARCA DÓNDE ESTÁS, también dentro de una ficha: `seccionDe` sabe
 *    que la ficha de una jugadora es Equipo y que editar un partido es
 *    Calendario. Antes, en ocho de las once secciones, aquí abajo no se
 *    encendía nada.
 *
 * LAS CUATRO ETIQUETAS CABEN A 320 px, que es el motivo de que sean éstas y no
 * las once de antes: «Entrenamientos» o «Equipo técnico» miden más que su
 * celda a 11 px, y una etiqueta recortada en una navegación es peor que no
 * ponerla. Cada destino mide 68 px: 4 × 68 + huecos + relleno = 290, y entre
 * márgenes quedan 288 en la pantalla más estrecha.
 *
 * SIN DESENFOQUE. El fondo es un color opaco, no cristal. Un `backdrop-filter`
 * aquí obliga al navegador a recomponer todo lo que pasa por debajo en cada
 * fotograma del desplazamiento, y esto está encima de una lista que se
 * desplaza: es el sitio más caro de toda la aplicación para pedirlo.
 */

import { Link, useLocation } from 'react-router-dom';
import { SECCIONES, seccionActiva } from './navigation';
import { cn } from '@/lib/utils';

/* Cuatro destinos en 320 px: 4 × 68 + 3 × 2 de hueco + 12 de relleno = 290,
   y entre márgenes quedan 288. Se le quitan dos píxeles al relleno lateral
   del propio destino y cuadra sin apretar nada. */
const DESTINO =
  'flex h-[52px] w-[68px] flex-col items-center justify-center gap-1 rounded-[17px]'
  + ' transition-colors duration-150';
/* LO SELECCIONADO SE DISTINGUE POR CONTRASTE, NO POR COLOR: un fondo algo
   más oscuro dentro de una cápsula clara. Antes era blanco al 10 % sobre
   azul noche. */
const ACTIVO = 'bg-ink-900/[0.09] text-ink-900';
const REPOSO = 'text-ink-600 active:bg-ink-900/[0.05]';

export function NavFlotante() {
  const { pathname } = useLocation();
  /* EL DEGRADADO SE TIÑE DE LO QUE TIENE DEBAJO. En Inicio, debajo hay una
     imagen oscura; en el resto de pantallas, la hoja gris clara. Un velo
     claro sobre la imagen la dejaba lavada justo en la franja de abajo, y
     uno oscuro sobre la hoja clara parecía una sombra sucia. Son los dos
     extremos del mismo recurso. */

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
          /* UN SOLO VELO, DEL COLOR DEL TEMA. Había dos escritos a mano: uno
             negro para Inicio —del marco oscuro de antes— y otro gris claro
             fijo para el resto. El negro era la «franja de abajo» y el gris
             fijo se quedaba claro en modo oscuro. Los dos salían del mismo
             sitio: un color escrito en vez de heredado. */
          background:
            'linear-gradient(to top, rgb(var(--surface)) 0%,'
            + ' rgb(var(--surface) / 0.92) 42%, rgb(var(--surface) / 0) 100%)',
        }}
      />
      <nav
        aria-label="Navegación principal"
        /* UNA CÁPSULA CLARA TRANSLÚCIDA. Era azul noche opaco. El
           `backdrop-filter` que antes se evitaba aquí por caro vuelve, pero
           sólo el desenfoque corto: la cápsula mide 68 px de alto y se
           compone sobre un gris casi liso, no sobre la lista entera. */
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-line-sutil bg-raised/80 p-1.5 shadow-[0_10px_30px_rgb(var(--ink-900)/0.14)] backdrop-blur-md"
      >
        {SECCIONES.map((s) => {
          const Icono = s.icono;
          const aqui = seccionActiva(pathname, s);
          return (
            <Link
              key={s.to}
              to={s.to}
              aria-current={aqui ? 'page' : undefined}
              className={cn(DESTINO, aqui ? ACTIVO : REPOSO)}
            >
              <Icono size={19} strokeWidth={aqui ? 2.2 : 1.8} aria-hidden />
              <span className={cn('text-2xs leading-none', aqui ? 'font-semibold' : 'font-medium')}>
                {s.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
