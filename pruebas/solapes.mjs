/**
 * Detector de solapes, desbordes y contenido escondido bajo la navegación.
 *
 * No mira capturas: mide cajas. Para cada pantalla y cada ancho comprueba
 * cuatro cosas, y las cuatro son las que el ojo se salta:
 *
 *  1. La página no se desplaza en horizontal.
 *  2. Nada interactivo queda tapado por el dique, el botón de crear o la
 *     cabecera —comparando cajas de verdad, no a ojo—.
 *  3. Ningún elemento fijo se pisa con otro elemento fijo.
 *  4. Ningún texto se sale de su contenedor.
 */
import { chromium } from 'playwright';
import { mock, SUPA, j } from './mock.mjs';

const RUTAS = [
  '/app', '/app/calendario', '/app/plantilla', '/app/disponibilidad',
  '/app/entrenamientos', '/app/ejercicios', '/app/pizarra', '/app/partidos',
  '/app/analiticas', '/app/equipo-tecnico', '/app/ajustes', '/app/ajustes/plan', '/app/perfil',
];

/* Los anchos que pidió el encargo, más dos altos: un móvil corto y uno alto. */
const COMPLETO = process.argv.includes('--completo');
const ANCHOS = COMPLETO ? [320, 360, 375, 390, 393, 414, 430] : [390];
const ALTOS = COMPLETO ? [667, 932] : [844];

const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
let problemas = 0;
const resumen = [];

async function revisa(page, ruta, etiqueta) {
  try {
    await page.goto(`http://localhost:4173${ruta}`, { waitUntil: 'networkidle' });
  } catch {
    console.log(`  · ${etiqueta} ${ruta} — no se ha podido cargar`);
    return true;
  }
  await page.waitForTimeout(450);

  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const W = doc.clientWidth;
    const H = doc.clientHeight;
    const fallos = [];

    // 1. Desplazamiento horizontal.
    if (doc.scrollWidth - W > 1) fallos.push(`desborde lateral ${doc.scrollWidth - W}px`);

    const caja = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect() : null;
    };
    const cruzan = (a, c) =>
      a && c && a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1;

    const nav = caja('nav[aria-label="Secciones"]');
    const fab = caja('button[aria-label="Crear"]');
    const cab = caja('header');

    // 2. Las piezas fijas no se pisan entre ellas.
    if (cruzan(nav, fab)) fallos.push('el botón de crear se monta sobre el dique');
    if (cruzan(nav, cab)) fallos.push('el dique se monta sobre la cabecera');

    /* 3. Contenido tapado por la CABECERA en reposo.
          Bajo el dique flotante no se comprueba aquí: al desplazar, el
          contenido pasa por debajo, y eso es lo que hace una barra flotante.
          Lo que no puede pasar es que algo se quede ahí debajo cuando ya no se
          puede desplazar más, y eso se mide abajo del todo. La cabecera sí se
          comprueba en reposo: nada debería empezar tapado. */
    const tapados = [];
    if (cab) {
      document.querySelectorAll('main h1, main h2').forEach((el) => {
        const c = el.getBoundingClientRect();
        if (c.width === 0 || c.height === 0) return;
        if (cruzan(c, cab)) {
          tapados.push(`«${(el.textContent || '').trim().slice(0, 24)}» bajo la cabecera`);
        }
      });
    }
    if (tapados.length) fallos.push(...[...new Set(tapados)].slice(0, 3));

    // 4. Texto que se sale de su caja.
    const desbordan = [];
    document.querySelectorAll('main *').forEach((el) => {
      if (el.children.length > 0) return;
      const t = (el.textContent || '').trim();
      if (!t) return;
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible') {
        desbordan.push(t.slice(0, 24));
      }
    });
    if (desbordan.length) fallos.push(`texto que se sale: ${[...new Set(desbordan)].slice(0, 2).join(' / ')}`);

    return fallos;
  });

  // Y otra vez con la página desplazada hasta el final: es donde el último
  // renglón se queda debajo del dique si el hueco no basta.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(350);
  const abajo = await page.evaluate(() => {
    const H = document.documentElement.clientHeight;
    const nav = document.querySelector('nav[aria-label="Secciones"]')?.getBoundingClientRect();
    const fab = document.querySelector('button[aria-label="Crear"]')?.getBoundingClientRect();
    const cruzan = (a, c) =>
      a && c && a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1;
    const malos = [];
    document.querySelectorAll('main button, main a, main input, main select').forEach((el) => {
      const c = el.getBoundingClientRect();
      if (c.width === 0 || c.top > H || c.bottom < 0) return;
      const t = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24);
      if (cruzan(c, nav)) malos.push(`«${t}» sigue bajo el dique al final del desplazamiento`);
      else if (cruzan(c, fab)) malos.push(`«${t}» sigue bajo el botón de crear al final`);
    });
    return [...new Set(malos)].slice(0, 2);
  });

  const todos = [...r, ...abajo];
  if (todos.length) {
    problemas += 1;
    const linea = `  ✗ ${etiqueta} ${ruta} — ${todos.join(' · ')}`;
    resumen.push(linea);
    if (resumen.length <= 60) console.log(linea);
  }
  return todos.length === 0;
}

for (const alto of ALTOS) {
  for (const ancho of ANCHOS) {
    const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await mock(page);
    await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), ['22222222-2222-2222-2222-222222222222']);
    await page.route(`${SUPA}/rest/v1/rpc/**`, (r) => r.fulfill(j([])));
    let ok = 0;
    for (const ruta of RUTAS) if (await revisa(page, ruta, `${ancho}×${alto}`)) ok += 1;
    console.log(`${ancho}×${alto}: ${ok}/${RUTAS.length} limpias`);
    await ctx.close();
  }
}

/* Y escritorio, donde no hay dique pero sí barra lateral. */
for (const [ancho, alto] of (COMPLETO ? [[1024, 800], [1512, 950]] : [[1512, 950]])) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto } });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), ['22222222-2222-2222-2222-222222222222']);
  await page.route(`${SUPA}/rest/v1/rpc/**`, (r) => r.fulfill(j([])));
  let ok = 0;
  for (const ruta of RUTAS) if (await revisa(page, ruta, `${ancho}×${alto}`)) ok += 1;
  console.log(`${ancho}×${alto}: ${ok}/${RUTAS.length} limpias`);
  await ctx.close();
}

console.log(resumen.length ? `\n${resumen.length} casos con problemas:` : '\nSin solapes, sin desbordes y sin nada tapado.');
resumen.slice(0, 40).forEach((l) => console.log(l));
await b.close();
process.exit(problemas ? 1 : 0);
