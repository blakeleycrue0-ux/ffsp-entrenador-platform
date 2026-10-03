/**
 * Las capturas de la portada, hechas desde la aplicación de verdad.
 *
 * POR QUÉ ESTÁ ESTO EN EL REPOSITORIO. Las imágenes de `public/producto` son
 * lo que ve alguien antes de entrar, y se quedan viejas en cuanto se toca el
 * diseño: después del rediseño monocromo seguían enseñando la interfaz azul
 * anterior, es decir, la portada anunciaba un producto que ya no existe. Con
 * esto se rehacen en un minuto en vez de a mano, así que no hay excusa para
 * dejarlas desfasadas.
 *
 * Los datos son los del simulador (`mock.mjs`): un club de ejemplo, no un club
 * de verdad. Nada de lo que sale aquí es información de nadie.
 *
 *   npm run build && npm run preview
 *   node pruebas/capturas.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { mock, SUPA, USER, CLUB, j } from './mock.mjs';

const BASE = 'http://localhost:4173';
const DESTINO = 'public/producto';
const JUGADA = '44444444-4444-4444-4444-444444444444';

/* Una jugada para la captura de la pizarra: salida desde atrás, en
   perspectiva, que es lo que distingue a esta pizarra de un dibujo plano. */
const JUGADA_DEMO = {
  version: 1,
  pitch: 'completo',
  camara: { giro: 0, inclinacion: 38 },
  surface: 'cesped',
  durationMs: 7000,
  objects: [
    { id: 'p1', kind: 'portera', label: '1' },
    { id: 'p4', kind: 'jugadora', label: '4' },
    { id: 'p6', kind: 'jugadora', label: '6' },
    { id: 'p8', kind: 'jugadora', label: '8' },
    { id: 'p10', kind: 'jugadora', label: '10' },
    { id: 'p11', kind: 'jugadora', label: '11' },
    { id: 'r2', kind: 'rival', label: '2' },
    { id: 'r7', kind: 'rival', label: '7' },
    { id: 'b', kind: 'balon', label: '' },
    { id: 'c1', kind: 'cono', label: '' },
    { id: 'c2', kind: 'cono', label: '' },
  ],
  tracks: {
    p1: [{ t: 0, x: 7, y: 34 }, { t: 1400, x: 12, y: 34, move: 'carrera' }],
    p4: [{ t: 0, x: 22, y: 13 }, { t: 2600, x: 42, y: 9, move: 'carrera' }],
    p6: [{ t: 0, x: 30, y: 34 }, { t: 2800, x: 44, y: 30, move: 'carrera' }],
    p8: [{ t: 0, x: 48, y: 46 }, { t: 3200, x: 66, y: 44, move: 'carrera' }],
    p10: [{ t: 0, x: 62, y: 24 }, { t: 3600, x: 80, y: 20, move: 'desmarque' }],
    p11: [{ t: 0, x: 40, y: 60 }, { t: 3400, x: 62, y: 62, move: 'carrera' }],
    r2: [{ t: 0, x: 58, y: 20 }],
    r7: [{ t: 0, x: 52, y: 48 }],
    b: [
      { t: 0, x: 12, y: 34 },
      { t: 2600, x: 42, y: 11, move: 'pase' },
      { t: 4200, x: 66, y: 42, cx: 52, cy: 18, move: 'pase' },
    ],
    c1: [{ t: 0, x: 88, y: 16 }],
    c2: [{ t: 0, x: 92, y: 24 }],
  },
  drawings: [
    { id: 'd1', kind: 'flecha', points: [{ x: 68, y: 44 }, { x: 88, y: 34 }], color: '#FFFFFF', width: 0.4 },
  ],
};

/** Qué se captura, dónde y con qué tamaño. */
/* OJO CON EL ANCHO. A 1020 px la aplicación todavía da la maqueta de móvil
   —el corte está en 1024—, así que la primera tanda salió con el dique abajo y
   el panel de la pizarra tapando el campo. Las de escritorio van a 1280. */
const TOMAS = [
  ['pizarra.png', `/app/pizarra/${JUGADA}`, 1280, 810, 1.6],
  ['plantilla.png', '/app/plantilla', 1280, 810, 1.6],
  ['entrenamientos.png', '/app/entrenamientos', 1280, 810, 1.6],
  ['calendario.png', '/app/calendario', 1280, 810, 1.6],
  ['analiticas.png', '/app/analiticas', 1280, 810, 1.6],
  ['plantilla-movil.png', '/app/plantilla', 390, 780, 2],
  ['entrenamientos-movil.png', '/app/entrenamientos', 390, 780, 2],
];

mkdirSync(DESTINO, { recursive: true });

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

for (const [archivo, ruta, ancho, alto, escala] of TOMAS) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: escala,
    isMobile: ancho < 500,
    hasTouch: ancho < 500,
  });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.route(`${SUPA}/rest/v1/plays**`, (route) => {
    const fila = {
      id: JUGADA, name: 'Salida desde atrás', description: '', team_id: 't1', club_id: CLUB,
      duration_ms: 7000, scene: JUGADA_DEMO,
      updated_at: new Date().toISOString(), created_at: new Date().toISOString(), created_by: USER,
    };
    const u = new URL(route.request().url());
    return route.fulfill(j(u.searchParams.has('id') ? fila : [fila]));
  });

  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  /* Sin animaciones: una captura a medio camino de una transición se ve
     borrosa y no hay forma de saber por qué. */
  await page.screenshot({ path: `${DESTINO}/${archivo}`, animations: 'disabled' });
  console.log(`  ${archivo}  ${ancho * escala}×${alto * escala}`);
  await ctx.close();
}

/* La imagen de compartir: el panel de inicio, recortado a 1200 × 630. */
{
  const ctx = await navegador.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${DESTINO}/og.png`, animations: 'disabled' });
  console.log('  og.png  1200×630');
  await ctx.close();
}

await navegador.close();
console.log('\nCapturas rehechas desde la aplicación actual.');
