/**
 * LA DIRECCIÓN CANÓNICA DE CADA PÁGINA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * No pinta nada: sólo mantiene al día dos etiquetas de la cabecera cuando se
 * cambia de ruta. No toca el diseño, ni la sesión, ni los datos.
 *
 * QUÉ ARREGLA. No había ninguna canónica. Sin ella, cada variante de la misma
 * dirección —con y sin barra final, con `?utm_source=…` pegado por un
 * anuncio, con mayúsculas— es una página distinta para un buscador, que
 * reparte entre todas ellas lo que debería ir a una sola. Con la canónica
 * puesta, todas apuntan a la misma.
 *
 * ── POR QUÉ NO ESTÁ ESCRITA EN `index.html` ────────────────────────────────
 *
 * Porque ahí sólo cabe UNA, y esto es una sola página que cambia de ruta por
 * dentro. Una canónica fija apuntando a la portada le diría a Google que
 * /pizarra, /aviso-legal y /privacidad SON la portada, y las sacaría del
 * índice. Eso es peor que no tener canónica: no poner ninguna deja que el
 * buscador use la dirección que pidió, que casi siempre es la correcta.
 *
 * Por eso tampoco se deja una por defecto y luego se corrige: si el
 * JavaScript no llegara a ejecutarse, la mentira se quedaría puesta. Aquí no
 * hay nada hasta que hay algo cierto.
 *
 * ── SÓLO LAS PÚBLICAS ──────────────────────────────────────────────────────
 *
 * Dentro de /app no se pone canónica ninguna, y se quita si venía de antes.
 * Son pantallas detrás de la sesión: no se indexan, así que declarar cuál es
 * su dirección «buena» no significa nada. Y la lista es cerrada —sólo las
 * cuatro que están en el mapa del sitio—, así que una ruta nueva no se
 * autoanuncia sola: hay que añadirla a los dos sitios, que es justo lo que
 * comprueba `pruebas/sitemap.mjs`.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const DOMINIO = 'https://playoff360.site';

/** Las que existen de verdad, se pueden abrir sin cuenta y queremos indexar. */
export const PUBLICAS = ['/', '/pizarra', '/aviso-legal', '/privacidad'] as const;

/** Crea la etiqueta si no está, la actualiza si está, la quita si sobra. */
function etiqueta(selector: string, crear: () => HTMLElement, valor: string | null) {
  const cabeza = document.head;
  let el = cabeza.querySelector(selector);
  if (valor === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = crear();
    cabeza.appendChild(el);
  }
  if (el instanceof HTMLLinkElement) el.href = valor;
  else el.setAttribute('content', valor);
}

export function Canonico() {
  const { pathname } = useLocation();

  useEffect(() => {
    /* La barra final cuenta: «/pizarra» y «/pizarra/» son dos direcciones
       distintas para un buscador, y la del mapa del sitio es la de sin. */
    const limpio = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const esPublica = (PUBLICAS as readonly string[]).includes(limpio);
    const url = esPublica ? `${DOMINIO}${limpio === '/' ? '/' : limpio}` : null;

    etiqueta(
      'link[rel="canonical"]',
      () => {
        const l = document.createElement('link');
        l.rel = 'canonical';
        return l;
      },
      url,
    );

    /* `og:url` sí viene puesta de serie en el índice, apuntando a la portada.
       Aquí se corrige para las demás; fuera de las públicas se deja la de la
       portada en vez de quitarla, porque una previsualización sin dirección
       es peor que una que lleve a la página de inicio. */
    if (url) {
      etiqueta(
        'meta[property="og:url"]',
        () => {
          const m = document.createElement('meta');
          m.setAttribute('property', 'og:url');
          return m;
        },
        url,
      );
    }
  }, [pathname]);

  return null;
}
