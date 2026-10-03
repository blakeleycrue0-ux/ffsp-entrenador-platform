/**
 * La pizarra vista desde todas partes.
 *
 * La cámara se comprueba con números en `camara.mjs`. Lo que se comprueba
 * aquí es lo otro: que el dibujo de verdad, en el navegador, aguanta todas
 * las vistas. Lo que más importa no es que se vea bonito —eso hay que
 * mirarlo— sino que **siga siendo usable**: que al tocar una ficha se
 * seleccione ESA ficha y no la de al lado, con el campo girado e inclinado.
 * Si la cuenta de ida y la de vuelta no encajaran, arrastrar se iría de sitio
 * y la pizarra no serviría para nada.
 *
 * Deja las capturas en `salida-pizarra/`, que está fuera del repositorio.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { mock, SUPA, USER, CLUB, j } from './mock.mjs';

const BASE = 'http://localhost:4173';
const CARPETA = process.env.CAPTURAS ?? null;
const JUGADA = '33333333-3333-3333-3333-333333333333';

/* Una jugada con una pieza de cada clase: es lo que hay que mirar cuando se
   cambia el dibujo de las piezas. Las posiciones están separadas para que
   nada tape a nada en ninguna vista. */
const escena = (camara) => ({
  version: 1,
  pitch: 'completo',
  camara,
  surface: 'cesped',
  durationMs: 6000,
  objects: [
    { id: 'p1', kind: 'portera', label: '1' },
    { id: 'p4', kind: 'jugadora', label: '4' },
    { id: 'p9', kind: 'jugadora', label: '9' },
    { id: 'r2', kind: 'rival', label: '2' },
    { id: 'co', kind: 'comodin', label: 'C' },
    { id: 'b', kind: 'balon', label: '' },
    { id: 'c1', kind: 'cono', label: '' },
    { id: 'c2', kind: 'cono', label: '' },
    { id: 'pi', kind: 'pica', label: '', rot: 30 },
    { id: 'mp', kind: 'miniporteria', label: '', w: 0.7, h: 2 },
    { id: 'po', kind: 'porteria', label: '', w: 1, h: 5 },
    { id: 'z', kind: 'zona', label: 'Presión', w: 20, h: 14 },
    { id: 'n', kind: 'nota', label: 'Salida' },
  ],
  tracks: {
    p1: [{ t: 0, x: 6, y: 34 }],
    p4: [{ t: 0, x: 24, y: 12 }, { t: 2500, x: 44, y: 9, move: 'carrera' }],
    p9: [{ t: 0, x: 70, y: 40 }],
    r2: [{ t: 0, x: 58, y: 24 }],
    co: [{ t: 0, x: 36, y: 56 }],
    b: [{ t: 0, x: 12, y: 34 }, { t: 2500, x: 44, y: 12, move: 'pase' }],
    c1: [{ t: 0, x: 84, y: 14 }],
    c2: [{ t: 0, x: 90, y: 22 }],
    pi: [{ t: 0, x: 78, y: 54 }],
    mp: [{ t: 0, x: 96, y: 52 }],
    po: [{ t: 0, x: 60, y: 62 }],
    z: [{ t: 0, x: 30, y: 34 }],
    n: [{ t: 0, x: 18, y: 62 }],
  },
  drawings: [
    { id: 'd1', kind: 'flecha', points: [{ x: 46, y: 20 }, { x: 64, y: 8 }], color: '#FFFFFF', width: 0.36 },
    { id: 'd2', kind: 'curva', points: [{ x: 66, y: 52 }, { x: 78, y: 40 }, { x: 92, y: 44 }], color: '#E2A33C', width: 0.36 },
  ],
});

const VISTAS = [
  ['cenital', { giro: 0, inclinacion: 0 }],
  ['vertical', { giro: 90, inclinacion: 0 }],
  ['banda', { giro: 0, inclinacion: 46 }],
  ['tras-porteria', { giro: 90, inclinacion: 50 }],
  ['esquina', { giro: 34, inclinacion: 40 }],
  ['extrema', { giro: 213, inclinacion: 62 }],
];

const fallos = [];
const ok = (bien, que, detalle = '') => {
  console.log(`   ${bien ? 'ok' : '✗ '} ${que}${detalle && !bien ? ` — ${detalle}` : ''}`);
  if (!bien) fallos.push(que);
};

if (CARPETA) mkdirSync(CARPETA, { recursive: true });

/**
 * Cuánto se separa de la recta la estela más curvada que haya en pantalla, en
 * píxeles. Es la manera de ver «esto ya no va derecho» sin leer el estado de
 * la aplicación: se mide lo que se dibuja.
 */
const desvio = () => {
  let peor = 0;
  for (const el of document.querySelectorAll('svg.board-surface [data-capa="estelas"] polyline')) {
    const ps = [...el.points ?? []];
    if (ps.length < 3) continue;
    const a = ps[0];
    const b = ps[ps.length - 1];
    const largo = Math.hypot(b.x - a.x, b.y - a.y);
    if (largo < 8) continue;
    for (const p of ps) {
      const d = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / largo;
      if (d > peor) peor = d;
    }
  }
  return peor;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();
await mock(page);
await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);

let camaraActual = VISTAS[0][1];
await page.route(`${SUPA}/rest/v1/plays**`, (route) => {
  const fila = {
    id: JUGADA, name: 'Prueba', description: '', team_id: 't1', club_id: CLUB,
    duration_ms: 6000, scene: escena(camaraActual),
    updated_at: new Date().toISOString(), created_at: new Date().toISOString(), created_by: USER,
  };
  const u = new URL(route.request().url());
  return route.fulfill(j(u.searchParams.has('id') ? fila : [fila]));
});

const errores = [];
page.on('pageerror', (e) => errores.push(String(e).split('\n')[0]));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !/ERR_CERT|favicon|Failed to load resource/.test(t)) errores.push(t.slice(0, 180));
});

for (const [nombre, camara] of VISTAS) {
  camaraActual = camara;
  errores.length = 0;
  console.log(`\n· ${nombre} (giro ${camara.giro}°, inclinación ${camara.inclinacion}°)`);

  await page.goto(`${BASE}/app/pizarra/${JUGADA}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('svg.board-surface', { timeout: 10000 });
  await page.waitForTimeout(500);

  ok(errores.length === 0, 'se dibuja sin errores', errores[0]);

  /* 1. El campo ocupa el lienzo. Si la caja estuviera mal calculada, el campo
        se saldría o quedaría diminuto en una esquina. */
  const encaje = await page.evaluate(() => {
    const svg = document.querySelector('svg.board-surface');
    const vb = svg.viewBox.baseVal;
    const mundo = svg.querySelector('g');
    const b = mundo.getBBox();
    return {
      dentro: b.x >= vb.x - 0.6 && b.y >= vb.y - 0.6
        && b.x + b.width <= vb.x + vb.width + 0.6
        && b.y + b.height <= vb.y + vb.height + 0.6,
      llenado: (b.width * b.height) / (vb.width * vb.height),
    };
  });
  ok(encaje.dentro, 'todo el dibujo cabe en el lienzo');
  ok(encaje.llenado > 0.55, 'y lo llena, no se queda en una esquina',
    `ocupa el ${(encaje.llenado * 100).toFixed(0)} %`);

  /* 2. LO IMPORTANTE: tocar una ficha selecciona ESA ficha. Es la prueba de
        que proyectar y desproyectar encajan: si no, el dedo caería en otro
        sitio del campo y arrastrar se iría de madre. */
  const caja = await page.locator('svg.board-surface g[transform] >> text=/^9$/').first()
    .boundingBox().catch(() => null);
  if (caja) {
    await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.waitForTimeout(250);
    const seleccionada = await page.evaluate(() =>
      document.body.innerText.includes('Jugadora'));
    ok(seleccionada, 'al tocar la ficha 9 se selecciona una jugadora');
  } else {
    ok(false, 'al tocar la ficha 9 se selecciona una jugadora', 'no se encontró la ficha');
  }

  /* 3. Las piezas están todas ahí: ninguna se queda sin dibujar por una
        cuenta que se va a infinito o a NaN. */
  const sanas = await page.evaluate(() => {
    const malas = [];
    for (const el of document.querySelectorAll('svg.board-surface [points], svg.board-surface [d]')) {
      const v = el.getAttribute('points') ?? el.getAttribute('d') ?? '';
      if (/NaN|Infinity|undefined/.test(v)) malas.push(el.tagName);
    }
    return malas;
  });
  ok(sanas.length === 0, 'ninguna figura sale con un número imposible', sanas.join(', '));

  if (CARPETA) {
    await page.locator('svg.board-surface').screenshot({ path: `${CARPETA}/${nombre}.png` });
  }
}

/* ───────────────────── Doblar un tramo con el tirador ────────────────────── */
/*
 * Casi nada en un campo va en línea recta. Esto comprueba que se puede agarrar
 * un tramo por la mitad y abrirlo, y —lo que importa— que la curva pasa POR
 * DONDE SE SUELTA EL DEDO también con la cámara inclinada, que es donde la
 * cuenta de ida y la de vuelta podrían no encajar.
 */
for (const [nombre, camara] of [['cenital', VISTAS[0][1]], ['inclinada', VISTAS[2][1]]]) {
  camaraActual = camara;
  console.log(`\n· curvar un tramo, vista ${nombre}`);
  await page.goto(`${BASE}/app/pizarra/${JUGADA}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('svg.board-surface');
  await page.waitForTimeout(400);

  // Se selecciona la ficha 4, que es la única con un tramo recto.
  const ficha = await page.locator('svg.board-surface text', { hasText: /^4$/ }).first().boundingBox();
  await page.mouse.click(ficha.x + ficha.width / 2, ficha.y + ficha.height / 2);
  await page.waitForTimeout(300);

  const tirador = page.locator('svg.board-surface circle:has(title)').first();
  ok(await tirador.count() > 0, 'aparece un tirador en la mitad del tramo');

  const antes = await page.evaluate(desvio, null);
  const t = await tirador.boundingBox();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
  await page.mouse.down();
  await page.mouse.move(t.x + t.width / 2, t.y - 70, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);

  const despues = await page.evaluate(desvio, null);
  ok(antes < 0.6, 'el tramo empezaba recto', `desviación ${antes.toFixed(2)}`);
  ok(despues > 6, 'y después está curvado', `desviación ${despues.toFixed(2)}`);

  // Doble clic en el tirador: vuelve a ser recto.
  const t2 = await page.locator('svg.board-surface circle:has(title)').first().boundingBox();
  await page.mouse.dblclick(t2.x + t2.width / 2, t2.y + t2.height / 2);
  await page.waitForTimeout(350);
  ok(await page.evaluate(desvio, null) < 0.6, 'y con doble clic vuelve a ser recto');
}

/* ─────────── La jugada guardada sin cámara se abre como siempre ──────────── */
console.log('\n· una jugada de antes, sin cámara guardada');
camaraActual = undefined;
await page.goto(`${BASE}/app/pizarra/${JUGADA}`, { waitUntil: 'networkidle' });
await page.waitForSelector('svg.board-surface');
await page.waitForTimeout(400);
const caja = await page.evaluate(() => {
  const vb = document.querySelector('svg.board-surface').viewBox.baseVal;
  return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
});
ok(caja.x === -3 && caja.y === -3 && caja.w === 111 && caja.h === 74,
  'se abre exactamente con el encuadre de siempre', JSON.stringify(caja));

await navegador.close();
console.log(fallos.length ? `\n${fallos.length} comprobaciones fallan.` : '\nLa pizarra aguanta todas las vistas.');
process.exit(fallos.length ? 1 : 0);
