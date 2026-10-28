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
import { mock, USER, CLUB } from './mock.mjs';

const BASE = 'http://localhost:4173';
/* Por omisión, las de la portada. La presentación en PDF pide las suyas
   —`DESTINO=presentacion/img`— porque enseña el producto de HOY y las de la
   portada son otra decisión, de otra persona, que no se toca desde aquí. */
const DESTINO = process.env.DESTINO ?? 'public/producto';


/** Qué se captura, dónde y con qué tamaño. */
/* OJO CON EL ANCHO. A 1020 px la aplicación todavía da la maqueta de móvil
   —el corte está en 1024—, así que la primera tanda salió con el dique abajo y
   Las de escritorio van a 1280. */
/* CADA PANTALLA, EN LOS DOS TAMAÑOS.
   Antes sólo había versión de móvil de dos de ellas, y la portada acababa
   metiendo la captura de escritorio en 350 px: o se leía un sello de letra de
   seis píxeles, o había que recortarle el menú por la izquierda y entonces
   parecía una imagen rota. Con la toma vertical hecha de verdad, en el móvil
   se enseña una pantalla de móvil y no hay nada que recortar. */
const TOMAS = [
  ['plantilla.png', '/app/plantilla', 1280, 810, 1.6],
  ['entrenamientos.png', '/app/entrenamientos', 1280, 810, 1.6],
  ['calendario.png', '/app/calendario', 1280, 810, 1.6],
  ['analiticas.png', '/app/analiticas', 1280, 810, 1.6],
  ['plantilla-movil.png', '/app/plantilla', 390, 780, 2],
  ['entrenamientos-movil.png', '/app/entrenamientos', 390, 780, 2],
  ['analiticas-movil.png', '/app/analiticas', 390, 780, 2],
  ['calendario-movil.png', '/app/calendario', 390, 780, 2],
  /* Cuotas entra en las capturas porque entra en lo que se enseña: la
     presentación tenía una lámina de la pizarra, que ya no existe, y hacía
     falta una foto de verdad de lo que la sustituye. */
  ['cuotas.png', '/app/cuotas', 1280, 810, 1.6],
  ['cuotas-movil.png', '/app/cuotas', 390, 780, 2],
];

/* Cuotas y recibos de ejemplo. Son del simulador, como todo lo demás: un
   club inventado y nombres inventados. Hace falta darlos porque por omisión
   el simulacro no tiene ninguna cuota —que es lo correcto para las otras
   pruebas, donde interesa el estado vacío— y aquí lo que se quiere enseñar
   es la pantalla llena. */
const CUOTA = {
  id: 'c1', club_id: CLUB, team_id: null, name: 'Cuota mensual 2026/27',
  amount_cents: 3500, period: 'mensual', due_day: 5, season: null,
  active: true, notes: null, created_at: '2026-09-01T00:00:00Z',
};
const PERIODO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();
const RECIBOS = ['pagado', 'pagado', 'pendiente', 'pagado', 'pendiente', 'exento', 'pagado', 'pendiente']
  .map((status, i) => ({
    id: `r${i}`, club_id: CLUB, fee_plan_id: 'c1', player_id: `p${i}`,
    concept: 'Cuota mensual 2026/27', amount_cents: 3500, period_label: PERIODO,
    due_date: `${PERIODO}-05`, paid_cents: status === 'pagado' ? 3500 : 0,
    status, paid_at: status === 'pagado' ? '2026-10-03T10:00:00Z' : null,
    method: status === 'pagado' ? 'efectivo' : null, note: '',
    created_at: `2026-10-01T00:00:0${i}Z`,
  }));

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
  await mock(page, { cuotas: [CUOTA], recibos: RECIBOS });
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);

  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  /* AQUÍ HABÍA UN APAÑO DE LA PIZARRA: cerrar su panel lateral antes de la
     foto, porque si no tapaba el campo. La pizarra ya no existe, y el
     servicio de jugadas que se simulaba para ella tampoco hacía falta. */
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
  await mock(page, { cuotas: [CUOTA], recibos: RECIBOS });
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${DESTINO}/og.png`, animations: 'disabled' });
  console.log('  og.png  1200×630');
  await ctx.close();
}

await navegador.close();
console.log('\nCapturas rehechas desde la aplicación actual.');
