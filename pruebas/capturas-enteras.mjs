/**
 * Ninguna captura de la portada sale a medias.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DE DÓNDE SALE ESTA PRUEBA. Durante una versión, en el móvil las capturas de
 * escritorio se desplazaban a la izquierda y se ensanchaban para tirar el
 * menú lateral de la aplicación: así la tabla crecía un 22 % y se leía. Lo
 * que se veía, en cambio, era una imagen cortada por el lado, y quien la miró
 * lo dijo con esas palabras: «las capturas salen a medias».
 *
 * Tenía razón. Un recorte deliberado y un fallo de maquetación se ven
 * exactamente igual, y en una portada el beneficio de la duda no existe. La
 * solución fue dejar de recortar y sacar la toma vertical de cada pantalla.
 *
 * Esto vigila que no vuelva a pasar, de la única manera que sirve: midiendo
 * qué parte de cada imagen llega al ojo. Para cada `<img>` se busca el primer
 * antecesor que recorta y se compara su caja con la de la imagen. Si falta un
 * trozo, falla y dice cuánto y por culpa de quién.
 *
 * TAMBIÉN COMPRUEBA QUE NO SE DEFORMEN. Una captura estirada o aplastada se
 * nota menos que un recorte pero miente igual: enseña una interfaz con
 * proporciones que no tiene.
 *
 *   npm run build && npm run preview
 *   node pruebas/capturas-enteras.mjs
 */
import { chromium } from 'playwright';
import { mock, SUPA, PLANES, j } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

const ANCHOS = [
  ['320', 320, 720, 2],
  ['movil', 390, 844, 3],
  ['430', 430, 932, 3],
  ['tablet', 768, 1024, 2],
  ['ipad', 834, 1112, 2],
  ['portatil', 1024, 768, 2],
  ['escritorio', 1440, 900, 2],
  ['ancho', 1920, 1080, 1],
];

let fallos = 0;
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

for (const [nombre, w, h, d] of ANCHOS) {
  const ctx = await navegador.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: d,
    isMobile: w < 500, hasTouch: w < 900,
  });
  const p = await ctx.newPage();
  await mock(p);
  await p.route(`${SUPA}/rest/v1/plans**`, (r) => r.fulfill(j(PLANES)));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  /* Recorrer la página entera: las imágenes son `lazy` y hasta que no se
     llega a ellas no existen con su tamaño. */
  await p.evaluate(async () => {
    const paso = window.innerHeight * 0.7;
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
  });
  await p.waitForTimeout(600);

  const medido = await p.evaluate(() => {
    const malas = [];
    for (const img of document.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      /* El primer antecesor que recorta. */
      let n = img.parentElement, caja = null, culpable = '';
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
          caja = n.getBoundingClientRect();
          culpable = `${n.tagName.toLowerCase()}.${n.className.toString().slice(0, 36)}`;
          break;
        }
        n = n.parentElement;
      }

      const archivo = (img.getAttribute('src') || '').split('/').pop();

      if (caja) {
        const fuera = {
          izq: Math.max(0, caja.left - r.left),
          der: Math.max(0, r.right - caja.right),
          arr: Math.max(0, caja.top - r.top),
          aba: Math.max(0, r.bottom - caja.bottom),
        };
        const perdidoX = (fuera.izq + fuera.der) / r.width;
        const perdidoY = (fuera.arr + fuera.aba) / r.height;
        /* Medio píxel de holgura: el redondeo de un borde no es un recorte. */
        if (perdidoX * r.width > 0.5 || perdidoY * r.height > 0.5) {
          malas.push(`${archivo}: se pierde ${Math.round(perdidoX * 100)}% de ancho y ${Math.round(perdidoY * 100)}% de alto por ${culpable}`);
        }
      }

      /* Deformada: la proporción pintada contra la del archivo. */
      if (img.naturalWidth > 0) {
        const propio = img.naturalWidth / img.naturalHeight;
        const pintado = r.width / r.height;
        if (Math.abs(pintado - propio) / propio > 0.02) {
          malas.push(`${archivo}: deformada, ${pintado.toFixed(2)} contra ${propio.toFixed(2)}`);
        }
      }
    }
    return { total: document.querySelectorAll('img').length, malas };
  });

  if (medido.malas.length) {
    fallos += medido.malas.length;
    console.log(`  ✗ ${nombre} (${w}px)`);
    for (const m of medido.malas) console.log(`      ${m}`);
  } else {
    console.log(`  ✓ ${nombre} (${w}px): ${medido.total} capturas, todas enteras`);
  }
  await ctx.close();
}

await navegador.close();
console.log(fallos === 0
  ? '\n  Ninguna captura sale a medias, a ningún ancho.'
  : `\n  ${fallos} problema(s).`);
process.exit(fallos === 0 ? 0 : 1);
