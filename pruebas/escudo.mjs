/**
 * El escudo del club: que se pueda subir de verdad.
 *
 * QUÉ SE COMPRUEBA. Hasta ahora la pantalla pedía «pega una URL pública», que
 * es pedirle a un entrenador que se busque la vida con un alojamiento de
 * imágenes. Aquí se abre la pestaña «Datos del club» —que no es la que sale al
 * entrar, así que hay que pulsarla— y se mira que estén el botón de subir, el
 * campo de archivo oculto con los formatos correctos y la vista previa.
 *
 * También se mira la pantalla de bloqueo, que es donde más se nota el escudo.
 *
 *   npm run build && npm run preview
 *   node pruebas/escudo.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { mock, SUPA, USER, j } from './mock.mjs';

const BASE = 'http://localhost:4173';
const SALIDA = 'salida/escudo';
mkdirSync(SALIDA, { recursive: true });

let fallos = 0;
const comprueba = (bien, texto) => {
  console.log(`  ${bien ? '✓' : '✗'} ${texto}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/* ──────────────────── 1 · El panel de «Datos del club» ──────────────────── */
{
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errores = [];
  /* El error del certificado es del proxy de este entorno al pedir las
     fuentes de Google, no de la aplicación. */
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_CERT|favicon|Failed to load resource/.test(t)) errores.push(t.slice(0, 180));
  });
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);

  await page.goto(`${BASE}/app/equipo-tecnico/club`, { waitUntil: 'networkidle' });
  /* La pestaña no es la que sale al entrar y no es un `button` a ojos de
     accesibilidad: el componente le pone `role="tab"`. */
  await page.getByRole('tab', { name: 'Datos del club' }).click();
  await page.waitForTimeout(500);

  const subir = page.getByRole('button', { name: /Subir imagen|Cambiar imagen/ });
  comprueba(await subir.isVisible(), 'hay un botón para subir la imagen');

  const entrada = page.locator('input[type="file"]');
  comprueba(await entrada.count() === 1, 'hay un campo de archivo');
  const acepta = await entrada.getAttribute('accept');
  comprueba(
    /png/.test(acepta ?? '') && /jpeg/.test(acepta ?? '') && /webp/.test(acepta ?? ''),
    `acepta sólo mapas de bits (${acepta})`,
  );
  comprueba(!/svg/i.test(acepta ?? ''), 'no acepta SVG');

  const viejo = await page.getByText(/pega una URL pública/i).count();
  comprueba(viejo === 0, 'ya no se le pide a nadie que pegue una URL');

  const ancho = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  comprueba(ancho <= 0, `sin desbordamiento horizontal (${ancho}px)`);
  comprueba(errores.length === 0, `sin errores de consola (${errores.join(" | ")})`);

  await page.screenshot({ path: `${SALIDA}/datos-del-club.png`, animations: 'disabled' });
  await ctx.close();
}

/* ─────────────────── 2 · El escudo en la pantalla de bloqueo ─────────────── */
for (const [nombre, ancho, alto] of [['movil', 390, 844], ['escritorio', 1440, 900]]) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 2,
    isMobile: ancho < 500,
    hasTouch: ancho < 500,
  });
  const page = await ctx.newPage();
  const errores = [];
  /* El error del certificado es del proxy de este entorno al pedir las
     fuentes de Google, no de la aplicación. */
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_CERT|favicon|Failed to load resource/.test(t)) errores.push(t.slice(0, 180));
  });
  await mock(page);
  /* Sin la marca de desbloqueo Y con un código puesto: así sale el teclado.
     El manejador va DESPUÉS de `mock` a propósito: en Playwright gana el
     último que se registra, y el de `mock` se traga todo lo que no reconoce. */
  await page.route(`${SUPA}/rest/v1/rpc/passcode_estado`, (route) =>
    route.fulfill(j({ tiene: true, bloqueado_hasta: null, restantes: 5 })));
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const teclas = await page.getByRole('button', { name: /^[0-9]$/ }).count();
  comprueba(teclas === 10, `${nombre}: están las diez cifras (${teclas})`);

  const desborde = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  comprueba(desborde.x <= 0, `${nombre}: sin desbordamiento horizontal (${desborde.x}px)`);
  comprueba(desborde.y <= 1, `${nombre}: cabe en una pantalla (${desborde.y}px)`);
  comprueba(errores.length === 0, `${nombre}: sin errores de consola (${errores.join(" | ")})`);

  await page.screenshot({ path: `${SALIDA}/bloqueo-${nombre}.png`, animations: 'disabled' });
  await ctx.close();
}

await navegador.close();
console.log(fallos === 0 ? '\nTodo correcto.' : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
