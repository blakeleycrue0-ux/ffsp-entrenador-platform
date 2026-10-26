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
 * /aviso-legal y /privacidad SON la portada, y las sacaría del
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
export const PUBLICAS = ['/', '/aviso-legal', '/privacidad'] as const;

/**
 * TÍTULO Y DESCRIPCIÓN DE CADA PÁGINA PÚBLICA.
 *
 * Antes había UNO SOLO para todo el sitio, escrito en `index.html`: la
 * portada, las dos legales, la pantalla de acceso y cualquier dirección
 * inventada salían con «Playoff360 · Sistema para entrenadores» y con la
 * misma descripción. Para un buscador eso son cinco páginas que dicen ser la
 * misma, y en los resultados aparecen compitiendo entre ellas.
 *
 * La descripción no es un resumen del sitio: es lo que se lee DEBAJO del
 * enlace en Google, así que cada una cuenta lo que hay en ESA página.
 *
 * Nada de esto se ve en la pantalla. Son la pestaña del navegador y el
 * resultado de búsqueda; el contenido visible no cambia ni una letra.
 */
const CABECERAS: Record<string, { titulo: string; descripcion: string }> = {
  '/': {
    titulo: 'Playoff360 · Sistema para entrenadores',
    descripcion:
      'Plantilla, asistencia, entrenamientos, partidos y convocatorias en un solo sitio. '
      + 'El sistema de gestión del club, para cualquier deporte.',
  },
  '/aviso-legal': {
    titulo: 'Aviso legal · Playoff360',
    descripcion: 'Titular del sitio, datos identificativos y condiciones de uso de Playoff360.',
  },
  '/privacidad': {
    titulo: 'Política de privacidad · Playoff360',
    descripcion:
      'Qué datos trata Playoff360, con qué base legal, dónde se guardan y cómo ejercer tus derechos.',
  },
};

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

/* El JSON-LD va SÓLO en la portada, que es la página que describe el
   producto. Ponerlo en el aviso legal sería decirle a Google que esa página
   es la aplicación, y no lo es.

   SIN VALORACIONES, SIN NÚMERO DE CLIENTES Y SIN PRECIOS. `aggregateRating`
   es lo que pinta las estrellas en los resultados y es la tentación evidente,
   pero no hay ni una sola valoración real: inventarla es falsear un resultado
   de búsqueda, y además Google penaliza los datos estructurados que no se
   corresponden con la página. Los precios tampoco: viven en la base de datos
   y aquí se quedarían viejos a la primera que se cambie. */
const FICHA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Playoff360',
  url: `${DOMINIO}/`,
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Navegador web',
  inLanguage: 'es',
  description:
    'Herramienta para el cuerpo técnico de un club de fútbol: plantilla, entrenamientos, '
    + 'partidos, control de asistencia, disponibilidad y calendario.',
  featureList: [
    'Plantilla y fichas de jugadoras',
    'Control de asistencia a entrenamientos',
    'Calendario de entrenamientos y partidos',
    'Disponibilidad y bajas',
    'Biblioteca de ejercicios',
    'Analíticas de asistencia',
  ],
};

export function Canonico() {
  const { pathname } = useLocation();

  useEffect(() => {
    /* La barra final cuenta: «/privacidad» y «/privacidad/» son dos direcciones
       distintas para un buscador, y la del mapa del sitio es la de sin. */
    const limpio = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const esPublica = (PUBLICAS as readonly string[]).includes(limpio);
    const url = esPublica ? `${DOMINIO}${limpio === '/' ? '/' : limpio}` : null;

    /* ── TÍTULO Y DESCRIPCIÓN ──────────────────────────────────────────── */
    const cab = CABECERAS[limpio];
    if (cab) {
      document.title = cab.titulo;
      etiqueta(
        'meta[name="description"]',
        () => {
          const m = document.createElement('meta');
          m.setAttribute('name', 'description');
          return m;
        },
        cab.descripcion,
      );
    }

    /* ── QUÉ SE INDEXA Y QUÉ NO ────────────────────────────────────────────
       `robots.txt` pide que no se rastree /entrar ni /app, pero eso es sólo
       una petición y, peor, es contraproducente por sí sola: si Google no
       rastrea la página, TAMPOCO LEE la instrucción de no indexarla, así que
       puede acabar en los resultados igualmente —sin descripción, a partir de
       enlaces de fuera—. La instrucción que de verdad manda es ésta, y para
       leerla hay que poder entrar.

       Y TODO LO QUE NO SEA UNA RUTA PÚBLICA CONOCIDA. Hoy las direcciones
       inventadas acaban en la portada —hay un `<Route path="*">` que redirige
       allí—, así que esta marca no les llega: para cuando se evalúa, la ruta
       ya es «/». Se deja igualmente porque cubre lo que sí pasa por aquí
       —/entrar y lo que haya dentro de /app— y porque el día que exista una
       página de «no encontrada» de verdad, ya estará marcada.

       Lo que NO arregla esto: el servidor sigue devolviendo 200 para una
       dirección que no existe. Eso sólo se arregla en `netlify.toml`, no se
       puede comprobar con la vista previa local y su fallo sería tumbar una
       página pública. Va propuesto, no aplicado. */
    const seIndexa = esPublica;
    etiqueta(
      'meta[name="robots"]',
      () => {
        const m = document.createElement('meta');
        m.setAttribute('name', 'robots');
        return m;
      },
      seIndexa ? null : 'noindex, follow',
    );

    /* ── LA FICHA DEL PRODUCTO, SÓLO EN LA PORTADA ─────────────────────── */
    const viejo = document.getElementById('ficha-jsonld');
    if (limpio === '/') {
      if (!viejo) {
        const sc = document.createElement('script');
        sc.id = 'ficha-jsonld';
        sc.type = 'application/ld+json';
        sc.textContent = JSON.stringify(FICHA);
        document.head.appendChild(sc);
      }
    } else {
      viejo?.remove();
    }

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
