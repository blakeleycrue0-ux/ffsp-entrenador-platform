/**
 * Densidad: que la aplicación no gaste pantalla en no decir nada.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esto nació de una queja concreta y medible: en el móvil, un club recién
 * creado tenía un inicio de más de dos pantallas y media de alto SIN UN SOLO
 * DATO dentro. Eran cajas vacías —«no hay entrenamientos», «no hay partidos»,
 * «sin convocatoria»— de doscientos y pico píxeles cada una, todas centradas
 * y todas del mismo tamaño que las que sí llevaban información.
 *
 * Una prueba de diseño no puede medir si algo es bonito. Sí puede medir tres
 * cosas que, cuando se tuercen, siempre son el mismo problema:
 *
 *  1. CUÁNTO MIDE UN VACÍO. Decir «todavía no hay nada» no puede ocupar más
 *     que una fila de dos renglones con su botón. El tope son 180 px: por
 *     encima, es un cartel.
 *  2. CUÁNTO MIDE UNA PANTALLA VACÍA. El inicio de un club sin nada montado
 *     tiene que caber en dos pantallas de móvil contando la guía de primeros
 *     pasos. Si se va de ahí, es que se ha vuelto a llenar de huecos.
 *  3. QUE NADA SE SALGA DE LADO, a los seis anchos del encargo.
 *
 * El vacío de PANTALLA COMPLETA —una plantilla sin jugadoras— está exento: ahí
 * el hueco no sobra, porque no hay nada más que enseñar. Se reconoce porque
 * es lo único que hay dentro del `main`.
 *
 *   npm run build && npm run preview
 *   node pruebas/densidad.mjs
 */
import { chromium } from 'playwright';
import { mock, SUPA, j, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

/* Los seis anchos que pidió el encargo. */
const ANCHOS = [320, 375, 390, 430, 768, 1280];

/** Lo que mide, como mucho, un «todavía no hay nada» dentro de una pantalla
 *  que sí tiene otras cosas. Dos renglones de texto y un botón caben en 150;
 *  180 deja margen para una descripción de tres líneas en 320 px. */
const TOPE_VACIO = 180;

/** El inicio de un club sin nada, contando la guía. Dos pantallas de 844. */
const TOPE_INICIO_VACIO = 1700;

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

async function abre(ruta, ancho, opciones = {}) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: ancho < 500 ? 844 : 900 },
    isMobile: ancho < 500,
    hasTouch: ancho < 900,
  });
  const page = await ctx.newPage();
  await mock(page, opciones);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.route(`${SUPA}/rest/v1/rpc/**`, (r) => r.fulfill(j([])));
  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return { ctx, page };
}

/* El club que no tiene nada: ni equipos, ni jugadoras, ni sesiones. Es el
   primer día de quien se acaba de registrar, y la pantalla que peor estaba. */
const CLUB_VACIO = { equipos: [], players: [], sessions: [], matches: [], attendance: [] };
/* Un club con equipo pero sin nada dentro: aquí es donde salían los vacíos
   mezclados con datos, que es el caso que medía esta prueba. */
const CLUB_A_MEDIAS = { players: [], sessions: [], matches: [], attendance: [] };

/* ══════════════════════════════════════════════════════════════════════════
   1 · Ningún vacío ocupa más que una fila
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  los «todavía no hay nada», medidos');
  for (const [ruta, datos] of [
    ['/app', CLUB_A_MEDIAS],
    ['/app/entrenamientos', CLUB_A_MEDIAS],
    ['/app/partidos', CLUB_A_MEDIAS],
    ['/app/plantilla', CLUB_A_MEDIAS],
  ]) {
    for (const ancho of [320, 390]) {
      const { ctx, page } = await abre(ruta, ancho, datos);
      /* SE MIDEN POR SU MARCA, NO POR SU TEXTO. El primer intento buscaba las
         frases («no hay», «todavía no…») y medía el bloque más pequeño que
         las contenía: como el titular TAMBIÉN contiene la frase, acababa
         midiendo el `<h3>` de veinte píxeles y daba por bueno un cartel de
         doscientos cincuenta. Se comprobó devolviendo `EmptyState` a su
         versión antigua: la prueba pasaba igual, que es lo peor que puede
         hacer una prueba. `EmptyState` marca su raíz con `data-vacio` y aquí
         se mide eso. */
      const gordos = await page.evaluate((tope) => {
        const malos = [];
        document.querySelectorAll('main [data-vacio="fila"]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.height > tope) {
            malos.push(`${Math.round(r.height)}px · ${(el.textContent || '').trim().slice(0, 40)}`);
          }
        });
        return [...new Set(malos)];
      }, TOPE_VACIO);
      comprueba(`${ruta} @${ancho}: ningún vacío pasa de ${TOPE_VACIO} px`, gordos.length === 0, gordos.join(' / '));
      await ctx.close();
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · El primer día cabe en dos pantallas
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  el inicio de un club recién creado');
  const { ctx, page } = await abre('/app', 390, CLUB_VACIO);
  const alto = await page.evaluate(() => document.body.scrollHeight);
  comprueba(
    `cabe en ${TOPE_INICIO_VACIO} px`,
    alto <= TOPE_INICIO_VACIO,
    `${alto}px · dos pantallas de móvil son 1.688`,
  );
  /* Y lo que se ve sin desplazarse tiene que llevar a algún sitio: una
     primera pantalla sin una sola acción es una pantalla muerta. */
  const acciones = await page.evaluate(() => {
    const H = document.documentElement.clientHeight;
    return [...document.querySelectorAll('main a, main button')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.top < H && r.bottom > 0;
      })
      .map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim())
      .filter(Boolean);
  });
  comprueba('y la primera pantalla ofrece algo que hacer', acciones.length > 0, acciones.slice(0, 3).join(' · '));
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Nada se sale de lado, a los seis anchos
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  sin desplazamiento lateral, a los seis anchos');
  for (const ancho of ANCHOS) {
    const { ctx, page } = await abre('/app', ancho);
    const sobra = await page.evaluate(() => {
      const d = document.documentElement;
      return d.scrollWidth - d.clientWidth;
    });
    comprueba(`${ancho} px`, sobra <= 1, `${sobra}px de más`);
    await ctx.close();
  }
}

await navegador.close();
console.log(fallos === 0
  ? '\n  La aplicación no gasta pantalla en no decir nada.'
  : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
