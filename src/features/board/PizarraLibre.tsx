/**
 * LA PIZARRA SIN CUENTA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ EXISTE, CON LOS NÚMEROS DELANTE.
 *
 * El anuncio que trajo a los dos primeros clubes vende LA PIZARRA: es la foto,
 * es lo que llama la atención y es lo mejor que hay construido. Y lo primero
 * que se encuentra quien pulsa es un formulario de alta, y detrás un club, y
 * detrás un equipo, y detrás una plantilla.
 *
 * Lo que pasó después está en la base de datos y no admite discusión: uno
 * configuró el horario y se le llenaron cuarenta entrenamientos de la
 * temporada; el otro metió una jugadora y creó un partido. Los dos trastearon
 * de verdad. Y **ninguno de los dos ha creado una sola jugada**. Ni una.
 * Llegaron buscando el juguete y se encontraron una hoja de inscripción.
 *
 * Así que esto es el campo, directo, sin cuenta y sin pedir nada. Se arrastran
 * fichas, se anima y se le da al play. Cuando hay algo hecho, entonces —y sólo
 * entonces— se ofrece guardarlo, que es cuando crear una cuenta tiene sentido:
 * ya se ha visto que funciona.
 *
 * ── LO QUE SE DIBUJA AQUÍ NO SE PIERDE ─────────────────────────────────────
 * La jugada se guarda en `localStorage` según se toca. No es un apaño: sin
 * sesión no hay a dónde guardarla en el servidor, y perder diez minutos de
 * trabajo por recargar sin querer es la forma más rápida de que alguien no
 * vuelva. Al darse de alta, `RescataLaJugada` la recoge de ahí y la guarda en
 * el club de verdad.
 *
 * ── Y NO SE PROMETE NADA QUE NO SEA ────────────────────────────────────────
 * No se dice «gratis para siempre» ni «sin límites». Se dice lo que es: esto
 * es la pizarra, se puede usar sin cuenta, y para guardarla hace falta una.
 */

import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { Marca } from '@/components/ui/Brand';
import { BoardEditor, useBoardHistory } from './BoardEditor';
import { usePlayback } from './playback';
import { escenaNueva, type Scene } from './scene';

/** Donde espera la jugada hasta que haya una cuenta donde ponerla. */
export const CAJON = 'playoff360:jugada-de-prueba';

/** Lee lo que hubiera guardado, o nada. Nunca lanza: un cajón roto no es nada. */
export function jugadaGuardada(): Scene | null {
  try {
    const crudo = localStorage.getItem(CAJON);
    if (!crudo) return null;
    const s = JSON.parse(crudo) as Scene;
    /* Se comprueba que parezca una escena antes de devolverla: en este cajón
       puede haber quedado cualquier cosa de una versión anterior. */
    return s && Array.isArray(s.objects) && s.tracks ? s : null;
  } catch {
    return null;
  }
}

export function olvidaLaJugada() {
  try { localStorage.removeItem(CAJON); } catch { /* da igual */ }
}

export default function PizarraLibre() {
  const [scene, setScene] = useState<Scene>(() => jugadaGuardada() ?? escenaNueva());
  const playback = usePlayback(scene.durationMs);

  /* Se guarda al vuelo, no con un botón: quien está probando no sabe que
     tiene que guardar, y no tiene por qué saberlo. */
  const cambiar = useCallback((s: Scene) => {
    setScene(s);
    try { localStorage.setItem(CAJON, JSON.stringify(s)); } catch { /* sin sitio */ }
  }, []);

  const history = useBoardHistory(scene, cambiar);
  const hayAlgo = scene.objects.length > 0;

  /* El título de la pestaña lo pone `Canonico`, con el resto de la cabecera.
     Aquí había un `useEffect` que lo ponía por su cuenta: dos sitios
     escribiendo lo mismo es una carrera, y gana el que corra después. */

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-ink-900">
          <Marca size={24} />
          <span className="text-md font-semibold">Playoff360</span>
        </Link>
        {/* ES UN <h1>, Y SE VE EXACTAMENTE IGUAL — pero sólo porque se le
            devuelve la letra del cuerpo a mano.

            Era un <p>, así que esta página no tenía NINGÚN encabezado de
            primer nivel: empezaba directa en H3 y un buscador no encontraba
            de qué va. Es la página a la que apunta el anuncio.

            `font-sans font-normal` NO SOBRAN, y se midió. `index.css` pone a
            todos los encabezados `font-display` y `font-weight: 560`, así
            que al cambiar la etiqueta el texto salía en Space Grotesk y más
            grueso: 1822 píxeles distintos, concentrados justo en esta línea
            (143,24)-(418,37). Con estas dos clases la cabecera vuelve a ser
            idéntica al píxel. Se comprueba en `pruebas/sitemap.mjs`. */}
        <h1 className="hidden font-sans text-sm font-normal text-ink-500 sm:block">
          Pizarra táctica · sin cuenta, sin instalar nada
        </h1>

        <div className="ml-auto flex items-center gap-2">
          {/* Mientras el campo está vacío no se pide nada: pedir que te
              registres para guardar algo que no existe es ruido. */}
          {hayAlgo && (
            <span className="hidden text-sm text-ink-600 md:inline">
              ¿Te la guardas?
            </span>
          )}
          <Link to="/entrar?crear=1">
            <Button size="sm" icon={<ArrowRight size={15} />}>
              {hayAlgo ? 'Guardar esta jugada' : 'Crear cuenta gratis'}
            </Button>
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 px-2 py-2 sm:px-3">
        <BoardEditor
          scene={scene}
          playback={playback}
          history={history}
          nombreDeLaJugada="Jugada de prueba"
        />
      </div>

      <footer className="border-t border-line px-4 py-3 text-sm leading-relaxed text-ink-500">
        {hayAlgo
          ? 'Lo que dibujes se queda guardado en este navegador. Al crear una cuenta se lleva contigo.'
          : 'Arrastra una ficha al campo para empezar. Cambia a «Animar» y muévela en otro instante para que se mueva.'}
      </footer>
    </div>
  );
}
