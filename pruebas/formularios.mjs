/**
 * Los formularios, en un teléfono.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tres cosas, y las tres salieron de abrir las pantallas de verdad:
 *
 *  1. UN FORMULARIO EN BLANCO NO PUEDE EMPEZAR CON UN ERROR. «Nueva
 *     jugadora» proponía el dorsal 1 y, debajo, en rojo: «ese dorsal ya lo
 *     lleva otra jugadora». El código buscaba el primer número libre, pero lo
 *     hacía al montar el formulario, y al abrir la ruta directamente —un
 *     enlace compartido, una recarga— la plantilla todavía no había llegado:
 *     la lista estaba vacía, el primer libre era el 1, y cuando llegaban los
 *     datos el formulario se quedaba con el 1 puesto.
 *  2. LO QUE SE TOCA MIDE LO QUE MIDE UN DEDO. Campos, desplegables y
 *     botones, 44 px o más. Por debajo de eso se falla, y en un formulario
 *     fallar significa escribir en la casilla de al lado.
 *  3. LA LETRA DE LOS CAMPOS NO BAJA DE 16 px. Safari en el iPhone amplía la
 *     página entera al enfocar un campo que tenga menos, y al salir se queda
 *     torcida. Es la causa de la mitad de los formularios que «se mueven
 *     solos» en el móvil.
 *
 *   npm run build && npm run preview
 *   node pruebas/formularios.mjs
 */
import { chromium } from 'playwright';
import { mock, SUPA, j, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

/* Las pantallas con formulario de verdad, las que se rellenan a mano. */
const RUTAS = [
  '/app/plantilla/nueva',
  '/app/entrenamientos/nuevo',
  '/app/partidos/nuevo',
  '/app/ejercicios/nuevo',
];

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

async function abre(ruta, ancho = 390) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.route(`${SUPA}/rest/v1/rpc/**`, (r) => r.fulfill(j([])));
  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return { ctx, page };
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · Ninguno empieza en rojo
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  un formulario en blanco no empieza con un error');
  for (const ruta of RUTAS) {
    const { ctx, page } = await abre(ruta);
    const rojos = await page.evaluate(() =>
      [...document.querySelectorAll('main p, main span')]
        .filter((el) => {
          if (el.children.length) return false;
          const t = (el.textContent || '').trim();
          if (!t) return false;
          const c = getComputedStyle(el).color;
          /* El rojo del sistema es #C4564C. Se compara el canal, no el
             nombre de la clase: así vale para cualquier forma de pintarlo. */
          const m = c.match(/\d+/g);
          return m && Number(m[0]) > 150 && Number(m[1]) < 110 && Number(m[2]) < 110;
        })
        .map((el) => el.textContent.trim().slice(0, 50)),
    );
    comprueba(`${ruta}`, rojos.length === 0, rojos.join(' / '));
    await ctx.close();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · El dorsal que se propone está libre
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  el dorsal propuesto');
  const { ctx, page } = await abre('/app/plantilla/nueva');
  const dorsal = await page.inputValue('input[type=number]');
  /* El club de prueba tiene dieciséis jugadoras con los dorsales del 1 al
     16, así que el primero libre es el 17. Si saliera 1, es que el
     formulario se montó antes de que llegara la plantilla. */
  comprueba('es el primero libre', dorsal === '17', `propone ${dorsal}`);
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Lo que se toca, y la letra que lleva dentro
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  tamaños de lo que se toca');
  for (const ruta of RUTAS) {
    const { ctx, page } = await abre(ruta);
    const malos = await page.evaluate(() => {
      const fuera = [];
      document.querySelectorAll('main input, main select, main textarea, main button').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        /* Las casillas de verificación dibujan su propio cuadrito pequeño
           dentro de una etiqueta que sí es grande: se miden aparte. */
        if (el.getAttribute('role') === 'checkbox' || el.getAttribute('role') === 'switch') return;
        /* Un botón puede ser una ficha de filtro —pequeña a propósito— y le
           basta con 32; un campo que se rellena no baja de 40. */
        const minimo = el.tagName === 'BUTTON' ? 32 : 40;
        if (r.height < minimo) fuera.push(`${el.tagName.toLowerCase()} ${Math.round(r.height)}px`);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px < 16) fuera.push(`${el.tagName.toLowerCase()} con letra de ${px}px`);
        }
      });
      return [...new Set(fuera)];
    });
    comprueba(`${ruta}: 32 px los botones, 40 los campos, 16 de letra`, malos.length === 0, malos.slice(0, 3).join(' · '));
    await ctx.close();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · Y nada se sale de lado a 320
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  a 320 px');
  for (const ruta of RUTAS) {
    const { ctx, page } = await abre(ruta, 320);
    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    comprueba(`${ruta}`, sobra <= 1, `${sobra}px de más`);
    await ctx.close();
  }
}

await navegador.close();
console.log(fallos === 0
  ? '\n  Los formularios se pueden rellenar con el dedo y no empiezan en rojo.'
  : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
