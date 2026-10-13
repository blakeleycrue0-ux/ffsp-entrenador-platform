/**
 * LOS MANDOS NO SE PONEN ENCIMA DEL CAMPO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * «Está todo por el medio. Es imposible.» Dicho por quien intentaba montar
 * una jugada, y tenía razón: las dos islas de mandos iban SIEMPRE por encima
 * del campo. La idea era que el campo fuera la pantalla entera y sobre el
 * papel suena bien; en la mesa, la barra de herramientas tapa la franja de
 * arriba y la de reproducción tapa la de abajo, que son justamente las dos
 * zonas donde se montan los circuitos. Lo que quieres arrastrar está debajo
 * de un botón.
 *
 * Esto mide el SOLAPE DE VERDAD en píxeles: la caja de cada isla contra la
 * caja del campo. No se fía de que exista una clase ni de que una regla de
 * estilo esté escrita; mide lo que se ve.
 *
 * Acopladas arriba o abajo, el campo se aparta y el solape tiene que ser
 * prácticamente cero. Flotando sí se superponen, que es para lo que sirve
 * soltarlas en medio, y eso no se comprueba aquí.
 *
 * Hace falta el servidor de vista previa en marcha.
 *
 *   npm run preview &
 *   node pruebas/estorbo.mjs
 */
import { chromium } from 'playwright';
import { mock, SUPA, USER, CLUB, j } from './mock.mjs';

const BASE = 'http://localhost:4173';
const JUGADA = '33333333-3333-3333-3333-333333333333';

const escena = {
  version: 1,
  pitch: 'completo',
  camara: { giro: 0, inclinacion: 0, zoom: 1 },
  surface: 'cesped',
  durationMs: 10000,
  objects: [
    { id: 'a', kind: 'jugadora', label: '7' },
    { id: 'b', kind: 'jugadora', label: '9' },
  ],
  tracks: {
    a: [{ t: 0, x: 20, y: 40 }, { t: 2000, x: 50, y: 40, move: 'carrera' }],
    b: [{ t: 0, x: 20, y: 28 }, { t: 2000, x: 50, y: 28, move: 'carrera' }],
  },
  drawings: [],
};

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/** Cuánto del campo queda debajo de una isla, en tanto por ciento. */
const solape = (page) => page.evaluate(() => {
  const svg = document.querySelector('svg.board-surface').getBoundingClientRect();
  /* Sólo las islas de mandos: el cristal se usa también para cosas pequeñas
     —el botón de «Panel»— que no son barras y no estorban. */
  const islas = [...document.querySelectorAll('.cristal')]
    .map((e) => e.getBoundingClientRect())
    .filter((b) => b.width > 80 && b.height > 20);
  let tapado = 0;
  for (const b of islas) {
    const w = Math.max(0, Math.min(svg.right, b.right) - Math.max(svg.left, b.left));
    const h = Math.max(0, Math.min(svg.bottom, b.bottom) - Math.max(svg.top, b.top));
    tapado += w * h;
  }
  return {
    pct: (tapado / (svg.width * svg.height)) * 100,
    islas: islas.length,
    campo: [Math.round(svg.width), Math.round(svg.height)],
  };
});

for (const [nombre, width, height] of [
  ['portátil 1280×800', 1280, 800],
  ['portátil 1440×900', 1440, 900],
  ['sobremesa 1920×1080', 1920, 1080],
]) {
  const ctx = await navegador.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.route(`${SUPA}/rest/v1/plays**`, (route) => {
    const fila = {
      id: JUGADA, name: 'Circuito', description: '', team_id: 't1', club_id: CLUB,
      duration_ms: 10000, scene: escena,
      updated_at: new Date().toISOString(), created_at: new Date().toISOString(), created_by: USER,
    };
    const u = new URL(route.request().url());
    return route.fulfill(j(u.searchParams.has('id') ? fila : [fila]));
  });

  await page.goto(`${BASE}/app/pizarra/${JUGADA}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('svg.board-surface', { timeout: 15000 });
  await page.waitForTimeout(900);

  console.log(`\n  ${nombre}\n`);
  const r = await solape(page);
  comprueba(
    'las dos islas están, y no tapan el campo',
    r.islas >= 2 && r.pct < 3,
    `${r.islas} islas · ${r.pct.toFixed(1)} % tapado · campo ${r.campo[0]}×${r.campo[1]}`,
  );

  /* Y el campo tiene que seguir siendo un campo, no una rendija: si apartarlo
     de los mandos lo dejara en nada, el arreglo sería peor que el problema. */
  comprueba(
    'y sigue siendo grande',
    r.campo[1] > height * 0.4,
    `${r.campo[1]} px de alto en una ventana de ${height}`,
  );

  await ctx.close();
}

/* ── El botón de pantalla completa editando ─────────────────────────────── */

console.log('\n  pantalla completa sin dejar de editar\n');
{
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.route(`${SUPA}/rest/v1/plays**`, (route) => {
    const fila = {
      id: JUGADA, name: 'Circuito', description: '', team_id: 't1', club_id: CLUB,
      duration_ms: 10000, scene: escena,
      updated_at: new Date().toISOString(), created_at: new Date().toISOString(), created_by: USER,
    };
    const u = new URL(route.request().url());
    return route.fulfill(j(u.searchParams.has('id') ? fila : [fila]));
  });
  await page.goto(`${BASE}/app/pizarra/${JUGADA}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('svg.board-surface', { timeout: 15000 });
  await page.waitForTimeout(800);

  const hay = async (etiqueta) => (await page.locator(`[aria-label="${etiqueta}"]`).count()) > 0;
  comprueba('hay un botón de pantalla completa', await hay('Pantalla completa (F)'));
  comprueba('y otro, distinto, de presentar', await hay('Presentar'));

  /* `requestFullscreen` no funciona en un navegador sin ventana, así que no
     se puede comprobar que la pantalla se llene. Lo que SÍ se comprueba es
     que ampliar no es presentar: tras ampliar, las herramientas de edición
     siguen ahí. Presentando desaparecen, y ésa era toda la queja. */
  await page.keyboard.press('f');
  await page.waitForTimeout(700);
  comprueba(
    'tras ampliar, las herramientas siguen estando',
    await hay('Seleccionar') || (await page.locator('button:has-text("Animar")').count()) > 0,
  );
  comprueba('y el campo también', (await page.locator('svg.board-surface').count()) === 1);

  await ctx.close();
}

await navegador.close();

console.log(
  fallos === 0
    ? '\n  El campo está despejado, y se puede agrandar sin dejar de editar.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
