/**
 * El aviso de cookies, y el contador de visitas de la web pública.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dos piezas pequeñas que van juntas porque son la misma decisión: `Medicion`
 * mide las páginas públicas cuando hay permiso, y `AvisoDeCookies` es donde se
 * da o se niega ese permiso.
 *
 * LO QUE NO HACE ESTE AVISO, Y SE VE A LA PRIMERA:
 *
 *   · No pone una cookie para preguntar si puede poner cookies. Mientras no
 *     haya respuesta no se ha cargado nada de Google: el guardado ocurre AL
 *     responder, y lo que se guarda es la respuesta.
 *   · No hay un botón grande de «Aceptar» y un enlace gris de «configurar».
 *     Son dos botones del mismo tamaño, uno al lado del otro, y decir no es
 *     exactamente igual de fácil que decir sí. Un aviso donde rechazar cuesta
 *     tres pasos más que aceptar no está pidiendo permiso.
 *   · No vuelve a preguntar. Un no es un no hasta que alguien borre los datos
 *     del navegador.
 *   · No bloquea la página. No es un muro: es una barra abajo. Nadie necesita
 *     consentir nada para leer una web.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { decidir, decision, esPublica, medicionActiva, visita } from '@/services/analitica';

/**
 * Manda una visita en cada cambio de ruta pública. No dibuja nada.
 *
 * Va en la raíz de la aplicación, no dentro de la portada, porque la portada
 * no es la única página pública: la entrada y los dos textos legales también
 * cuentan, y el navegador no las recarga al pasar de una a otra.
 */
export function Medicion() {
  const { pathname } = useLocation();

  useEffect(() => {
    /* ESTE ES EL ÚNICO SITIO QUE ARRANCA LA MEDICIÓN, y lo hace a través de
       `visita`, que carga el script la primera vez. Que sea el único importa:
       la condición de que la ruta sea pública está escrita aquí, en la misma
       línea que el envío, y así no puede haber otro camino que cargue `gtag`
       dentro de `/app`.
       Lo hubo: el aviso de cookies arrancaba por su cuenta en cuanto veía un
       permiso guardado, también dentro de la aplicación. No mandaba ninguna
       visita, pero pedía el script a Google —y una petición lleva su propia
       cabecera `Referer` con la dirección entera, que ahí dentro es la ficha
       de una jugadora—. Lo cazó `pruebas/cookies.mjs`. */
    if (medicionActiva() && esPublica(pathname)) visita(pathname);
  }, [pathname]);

  return null;
}

export function AvisoDeCookies() {
  const { pathname } = useLocation();
  /* Se lee una vez al montar. Si ya hay respuesta guardada, este componente no
     llega a dibujar nada en ninguna visita posterior. */
  const [decidido, setDecidido] = useState(() => decision() !== null);

  /* Este componente NO arranca nada: sólo pregunta. De cargar el script se
     encarga `Medicion`, que es quien sabe si la ruta es pública. */
  if (decidido || !esPublica(pathname)) return null;

  const responder = (d: 'si' | 'no') => () => {
    decidir(d);
    setDecidido(true);
    /* Un sí cuenta la página en la que se dijo: es la visita de verdad, y
       perderla por el orden de los efectos sería medir de menos. */
    if (d === 'si') visita(pathname);
  };

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-nav px-3 pb-[max(12px,var(--safe-bottom))] sm:px-6 sm:pb-5"
    >
      <div className="mx-auto flex max-w-[48rem] flex-col gap-4 rounded-3xl border border-white/10 bg-abismo/95 p-5 text-white shadow-[0_24px_60px_-24px_rgba(6,12,27,0.75)] backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <p className="min-w-0 flex-1 text-base leading-relaxed text-white/75">
          Usamos una cookie de Google Analytics para saber cuánta gente entra. Nada más: no
          medimos nada de lo que pasa dentro de la aplicación y no hacemos publicidad.{' '}
          <Link
            to="/privacidad"
            className="font-medium text-white underline decoration-white/35 underline-offset-2 hover:decoration-white"
          >
            Cómo se usa
          </Link>
          .
        </p>
        {/* Los dos botones, del mismo tamaño y uno junto al otro. En el móvil
            caben en una fila de dos: partirlos en dos líneas dejaría uno
            arriba y otro abajo, y eso ya es jerarquía. */}
        <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:w-auto">
          <button type="button" onClick={responder('no')} className="btn btn-vidrio h-11 px-5 text-base">
            Solo lo necesario
          </button>
          <button type="button" onClick={responder('si')} className="btn btn-claro h-11 px-5 text-base">
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
