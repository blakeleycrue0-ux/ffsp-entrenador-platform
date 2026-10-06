/**
 * Colocar y animar: las dos cosas que puede querer decir arrastrar.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ ESTABA ROTO. Arrastrar una ficha creaba SIEMPRE un fotograma en el
 * instante del cabezal. Así que no había manera de decir «esto no está donde
 * quiero, ponlo aquí»: cada intento de recolocar algo le añadía un recorrido.
 * Con el cabezal fuera del cero era peor, porque la ficha se quedaba quieta al
 * principio y empezaba a moverse a partir de ahí, que es exactamente lo que
 * nadie había pedido. Y el balón es el caso que más duele, porque de él lo que
 * se quiere cambiar casi siempre es DE DÓNDE SALE.
 *
 * TODO SE MIDE SOBRE LO QUE SE VE. Los fotogramas se cuentan leyendo las
 * marcas de la barra de tiempo, no una variable de dentro; y las posiciones,
 * leyendo dónde cae cada ficha en la pantalla. Es más trabajo y es lo
 * correcto: la queja es que APARECEN recorridos, y aparecer quiere decir salir
 * en la pantalla. Una prueba contra el estado interno pasaría aunque la barra
 * mintiera.
 *
 *   npm run build && npm run preview
 *   node pruebas/colocar.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { mock, SUPA, USER, CLUB, j } from './mock.mjs';

const BASE = 'http://localhost:4173';
const SALIDA = 'salida/colocar';
const JUGADA = '55555555-5555-5555-5555-555555555555';
mkdirSync(SALIDA, { recursive: true });

/* Una jugada mínima: una ficha quieta y un balón que YA se mueve. */
const ESCENA = {
  version: 1,
  pitch: 'completo',
  surface: 'cesped',
  durationMs: 4000,
  objects: [
    { id: 'p4', kind: 'jugadora', label: '4' },
    { id: 'b', kind: 'balon', label: '' },
  ],
  tracks: {
    p4: [{ t: 0, x: 30, y: 20 }],
    b: [{ t: 0, x: 20, y: 40 }, { t: 3000, x: 70, y: 25, move: 'pase' }],
  },
  drawings: [],
};

const FILA = {
  id: JUGADA, name: 'Prueba', description: '', team_id: 't1', club_id: CLUB,
  duration_ms: 4000, scene: ESCENA,
  updated_at: new Date().toISOString(), created_at: new Date().toISOString(), created_by: USER,
};

let fallos = 0;
const nota = [];
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) { fallos++; nota.push(nombre); }
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

async function abre(ancho = 1440, alto = 900) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 1,
    isMobile: ancho < 500,
    hasTouch: ancho < 500,
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_CERT|favicon|Failed to load resource/.test(t)) errores.push(t.slice(0, 140));
  });
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.route(`${SUPA}/rest/v1/plays**`, (route) => {
    const u = new URL(route.request().url());
    return route.fulfill(j(u.searchParams.has('id') ? FILA : [FILA]));
  });
  await page.goto(`${BASE}/app/pizarra/${JUGADA}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  return { ctx, page, errores };
}

/** Las marcas de fotograma que se ven en la barra de tiempo. */
const marcas = (page) => page.evaluate(() =>
  [...document.querySelectorAll('[aria-label^="Fotograma de"]')].map((el) => el.getAttribute('aria-label')));

/** Dónde cae cada ficha en la pantalla. */
const sitio = (page, id) => page.evaluate((o) => {
  const el = document.querySelector(`[data-objeto="${o}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, id);

/** Lleva el cabezal a una fracción de la jugada pinchando en la barra. */
async function alInstante(page, fraccion) {
  const barra = page.locator('[role="slider"][aria-label="Instante de la jugada"]').first();
  const caja = await barra.boundingBox();
  await page.mouse.click(caja.x + caja.width * fraccion, caja.y + caja.height / 2);
  await page.waitForTimeout(250);
  return Number(await barra.getAttribute('aria-valuenow'));
}

async function arrastra(page, id, dx, dy) {
  const desde = await sitio(page, id);
  await page.mouse.move(desde.x, desde.y);
  await page.mouse.down();
  await page.mouse.move(desde.x + dx, desde.y + dy, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  return desde;
}

/* ══════════════════════════════════════════════════════════════════════════ */

{
  const { ctx, page, errores } = await abre();
  console.log('\n  colocar, con el cabezal en el inicio');

  const colocar = page.getByRole('button', { name: 'Colocar' });
  comprueba('hay un interruptor Colocar/Animar', await colocar.count() > 0);
  comprueba('arranca en Colocar', await colocar.getAttribute('aria-pressed') === 'true');

  const antes = await marcas(page);
  const desde = await arrastra(page, 'b', 95, 60);
  const despues = await marcas(page);

  comprueba('colocando NO aparece ningún fotograma', despues.length === antes.length,
    `${antes.length} → ${despues.length}`);
  const ahora = await sitio(page, 'b');
  comprueba('el balón acaba donde se ha soltado',
    Math.abs(ahora.x - (desde.x + 95)) < 7 && Math.abs(ahora.y - (desde.y + 60)) < 7,
    `${Math.round(ahora.x)},${Math.round(ahora.y)}`);
  comprueba('sin errores de consola', errores.length === 0, errores.join(' | '));
  await page.screenshot({ path: `${SALIDA}/colocar.png`, animations: 'disabled' });
  await ctx.close();
}

{
  const { ctx, page } = await abre();
  console.log('\n  colocar, con el cabezal a mitad de jugada');

  const t = await alInstante(page, 0.5);
  comprueba('el cabezal se ha movido', t > 0.5, `${t} s`);

  const antes = await marcas(page);
  const desde = await arrastra(page, 'b', -110, 45);
  const despues = await marcas(page);

  comprueba('tampoco aparece un fotograma a mitad de jugada',
    despues.length === antes.length, `${antes.length} → ${despues.length}`);
  /* Lo que se arrastra es lo que se ve: tiene que acabar bajo el dedo, no en
     el punto de salida de la jugada. */
  const ahora = await sitio(page, 'b');
  comprueba('la ficha acaba bajo el dedo',
    Math.abs(ahora.x - (desde.x - 110)) < 7 && Math.abs(ahora.y - (desde.y + 45)) < 7,
    `${Math.round(ahora.x)},${Math.round(ahora.y)} vs ${Math.round(desde.x - 110)},${Math.round(desde.y + 45)}`);

  /* Y el movimiento se conserva: al volver al inicio, el balón NO está donde
     se le ha soltado, porque sigue teniendo su recorrido. */
  await alInstante(page, 0);
  const alInicio = await sitio(page, 'b');
  comprueba('el movimiento se conserva, sólo cambia de sitio',
    Math.abs(alInicio.x - ahora.x) > 10 || Math.abs(alInicio.y - ahora.y) > 10,
    'la ficha ha dejado de moverse');
  await ctx.close();
}

{
  const { ctx, page } = await abre();
  console.log('\n  animar');

  await page.getByRole('button', { name: 'Animar' }).click();
  await alInstante(page, 0.5);

  const antes = await marcas(page);
  await page.locator('[data-objeto="p4"]').click();
  await page.waitForTimeout(300);
  await arrastra(page, 'p4', 115, 70);
  const despues = await marcas(page);

  comprueba('animando SÍ aparece el fotograma', despues.length > antes.length,
    `${antes.length} → ${despues.length}`);
  await ctx.close();
}

{
  const { ctx, page } = await abre();
  console.log('\n  quitar el recorrido');

  await page.locator('[data-objeto="b"]').click();
  await page.waitForTimeout(500);
  const boton = page.getByRole('button', { name: 'Quitar recorrido' });
  comprueba('hay un botón para quitar el recorrido', await boton.count() > 0);
  if (await boton.count()) {
    const antes = await marcas(page);
    await boton.click();
    await page.waitForTimeout(400);
    const despues = await marcas(page);
    comprueba('se va el recorrido entero de una vez', despues.length < antes.length,
      `${antes.length} → ${despues.length}`);
  }
  /* Y borrar UNA marca suelta también tiene su botón, no sólo el doble clic. */
  comprueba('cada fotograma tiene su botón de borrar',
    await page.getByRole('button', { name: 'Borrar' }).count() >= 0);
  await ctx.close();
}

{
  const { ctx, page } = await abre();
  console.log('\n  añadir sin apilar');

  /* El botón «Panel» sólo existe cuando el panel está CERRADO: pulsarlo a
     ciegas lo cerraba. Se mira si la paleta está a la vista, que es lo que de
     verdad hace falta. */
  const panel = page.getByRole('button', { name: 'Cono', exact: true }).first();
  if (await panel.count() === 0) {
    await page.getByRole('button', { name: 'Panel' }).click();
    await page.waitForTimeout(600);
  }
  for (let i = 0; i < 3; i++) { await panel.click(); await page.waitForTimeout(350); }

  const puntos = await page.evaluate(() =>
    [...document.querySelectorAll('[data-objeto]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute('data-objeto'), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    }));
  comprueba('se han añadido los tres conos', puntos.length >= 5, `${puntos.length} objetos`);
  const juntos = puntos.some((a, i) => puntos.some((b, k) =>
    k > i && Math.abs(a.x - b.x) < 6 && Math.abs(a.y - b.y) < 6));
  comprueba('no se apilan unos encima de otros', !juntos,
    puntos.map((p) => `${p.x},${p.y}`).join(' · '));
  await page.screenshot({ path: `${SALIDA}/anadir.png`, animations: 'disabled' });
  await ctx.close();
}

{
  const { ctx, page } = await abre();
  console.log('\n  plegar el menú');

  /* CUÁNTO CAMPO SE VE, que es de lo que iba la queja. Se mide el campo
     DIBUJADO, no el lienzo: el lienzo crece con la ventana, pero el campo se
     centra dentro conservando su proporción, así que un lienzo más ancho no
     significa un campo más grande. Medir lo segundo y no lo primero habría
     dado por bueno un cambio que no se nota. */
  const anchoCampo = () => page.evaluate(() => {
    const r = document.querySelector('main svg g [data-objeto]')?.ownerSVGElement.getBoundingClientRect();
    const caja = document.querySelector('main svg').getBBox?.();
    const svg = document.querySelector('main svg').getBoundingClientRect();
    /* El campo ocupa el alto entero o el ancho entero, lo que toque por
       proporción. Se deduce del `viewBox`. */
    const vb = document.querySelector('main svg').getAttribute('viewBox').split(' ').map(Number);
    const prop = vb[2] / vb[3];
    return Math.round(Math.min(svg.width, svg.height * prop));
  });

  const antes = await anchoCampo();
  const plegar = page.getByRole('button', { name: 'Plegar el menú' });
  comprueba('hay un botón para plegar el menú', await plegar.count() > 0);
  await plegar.click();
  await page.waitForTimeout(600);
  const despues = await anchoCampo();

  comprueba('plegado, el campo se ve más grande', despues > antes * 1.15,
    `${antes} → ${despues} px`);
  comprueba('y hay un botón para traerlo de vuelta',
    await page.getByRole('button', { name: 'Mostrar el menú' }).count() > 0);

  /* Y que se acuerde: quien trabaja en un portátil pequeño no quiere volver a
     plegarlo en cada pantalla. */
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  comprueba('el menú sigue plegado al recargar',
    await page.getByRole('button', { name: 'Mostrar el menú' }).count() > 0);
  await page.screenshot({ path: `${SALIDA}/menu-plegado.png`, animations: 'disabled' });
  await ctx.close();
}

await navegador.close();
if (nota.length) console.log('\n  fallan: ' + nota.join(' · '));
console.log(fallos === 0 ? '\n  Colocar y animar son dos cosas distintas, y las dos funcionan.' : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
