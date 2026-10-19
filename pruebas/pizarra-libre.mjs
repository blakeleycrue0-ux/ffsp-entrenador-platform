/**
 * LA PIZARRA SIN CUENTA, Y QUE LA JUGADA SE LLEVE CONSIGO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esto no es una pantalla más: es a donde apunta el anuncio. Lo que vende el
 * anuncio es el campo, y hasta ahora lo primero que se encontraba quien
 * pulsaba era un formulario de alta. Lo que pasó después está medido: los dos
 * clubes que entraron trastearon de verdad —uno llenó cuarenta entrenamientos
 * de la temporada, el otro metió una jugadora y creó un partido— y NINGUNO
 * creó una sola jugada.
 *
 * Tres cosas que tienen que ser ciertas, y las tres fallan en silencio:
 *
 * 1 · QUE SE PUEDA ENTRAR SIN SESIÓN. Si `/pizarra` cayera dentro de
 *     `RequireAuth` —por un cambio en las rutas, por un orden distinto—, el
 *     anuncio llevaría otra vez al formulario y nadie se enteraría hasta
 *     mirar las altas del mes.
 *
 * 2 · QUE LO DIBUJADO NO SE PIERDA AL RECARGAR. Sin sesión no hay servidor
 *     donde guardar, así que vive en este navegador. Perder diez minutos de
 *     trabajo por recargar sin querer es la forma más rápida de no volver.
 *
 * 3 · QUE SE LA LLEVE AL CREAR LA CUENTA. Es lo que se promete en el botón.
 *     Prometerlo y no cumplirlo es peor que no prometerlo.
 *
 * Hace falta el servidor de vista previa en marcha.
 *
 *   npm run preview &
 *   node pruebas/pizarra-libre.mjs
 */
import { chromium } from 'playwright';
import { mock, USER } from './mock.mjs';

const BASE = 'http://localhost:4173';
const CAJON = 'playoff360:jugada-de-prueba';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();

/* SIN simular la sesión: eso es justo lo que se está comprobando. */
console.log('\n  se entra sin cuenta\n');

await page.goto(`${BASE}/pizarra`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

comprueba(
  'no redirige a la pantalla de entrar',
  new URL(page.url()).pathname === '/pizarra',
  page.url().replace(BASE, '') || '/',
);
comprueba('y el campo está ahí', (await page.locator('svg.board-surface').count()) === 1);
comprueba(
  'con las herramientas, no sólo mirando',
  (await page.locator('button:has-text("Animar")').count()) > 0,
);

console.log('\n  lo que se dibuja no se pierde\n');

/* Se pone una ficha en el campo del mismo modo que lo haría una persona:
   pulsando en la paleta. Si la paleta cambiara de forma, esto deja de
   encontrarla y la prueba lo dice. */
const paleta = page.locator('button:has-text("Jugadora")').first();
comprueba('hay una paleta donde pulsar', (await paleta.count()) > 0);
if (await paleta.count()) {
  await paleta.click();
  await page.waitForTimeout(600);
}

const fichas = async () => page.locator('svg.board-surface g[data-objeto]').count();
const puestas = await fichas();
comprueba('al pulsar se pone una ficha en el campo', puestas > 0, `${puestas} ficha(s)`);

const guardado = await page.evaluate((c) => localStorage.getItem(c), CAJON);
comprueba('y queda guardada en el navegador', !!guardado && guardado.includes('objects'));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const trasRecargar = await fichas();
comprueba(
  'tras recargar sigue estando',
  trasRecargar === puestas,
  `${trasRecargar} de ${puestas}`,
);

console.log('\n  el botón invita a guardarla, no antes\n');
comprueba(
  'con algo dibujado, el botón ofrece guardar',
  (await page.locator('button:has-text("Guardar esta jugada")').count()) > 0,
);

console.log('\n  y se la lleva al entrar\n');

/* Ahora sí, con sesión: la pizarra de dentro tiene que abrirse con lo que se
   estaba haciendo fuera, y decir de dónde ha salido. */
await mock(page);
await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
await page.goto(`${BASE}/app/pizarra`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const dentro = await fichas();
comprueba(
  'la pizarra de dentro se abre con la jugada de la prueba',
  dentro === puestas,
  `${dentro} ficha(s), esperadas ${puestas}`,
);
comprueba(
  'y dice de dónde ha salido',
  (await page.getByText(/empezaste antes de crear la cuenta/i).count()) > 0,
);

await navegador.close();

console.log(
  fallos === 0
    ? '\n  Se dibuja sin cuenta, no se pierde, y se la lleva al entrar.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
