/**
 * DE LAS LÁMINAS AL PDF.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Abre `presentacion.html` en el navegador que ya está instalado y lo imprime
 * a 1920 × 1080 px por página, que es la proporción de la portada y la de
 * cualquier pantalla donde se vaya a enseñar.
 *
 * TRES COSAS QUE NO SON OBVIAS Y QUE CUESTAN UNA TARDE CADA UNA:
 *
 *  1 · `document.fonts.ready`. Sin esperarlo, la primera lámina sale con la
 *      letra del sistema y el resto con la buena. Las fuentes son archivos
 *      locales y tardan un suspiro, pero el suspiro llega después del PDF.
 *
 *  2 · `printBackground: true`. Por omisión Chromium NO imprime los fondos, y
 *      una presentación con cinco láminas negras saldría en blanco con el
 *      texto blanco encima: un PDF de dieciséis páginas vacías.
 *
 *  3 · Comprobar que salen las páginas que tiene que haber. Un `overflow` mal
 *      puesto parte una lámina en dos y nadie lo ve hasta abrirlo. Si el
 *      número de páginas no coincide con el de láminas, esto falla.
 *
 *   node presentacion/construir.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = join(aqui, 'presentacion.html');
const destino = join(aqui, 'Playoff360.pdf');

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const page = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });

const fallos = [];
page.on('requestfailed', (r) => fallos.push(r.url()));

await page.goto(pathToFileURL(origen).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

/* ¿Falta alguna imagen? Un hueco gris en una presentación se nota más que
   cualquier otra cosa, y desde aquí no se ve. */
const rotas = await page.evaluate(() =>
  [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')),
);
if (rotas.length) {
  console.error('  Imágenes que no han cargado:', rotas);
  process.exit(1);
}
if (fallos.length) {
  console.error('  Peticiones fallidas:', fallos);
  process.exit(1);
}

const laminas = await page.locator('.lamina').count();

/* ¿Cabe todo? Una lámina más alta de 1080 px se recorta por abajo sin avisar:
   `overflow: hidden` esconde el problema en vez de cantarlo. Aquí se canta. */
const desbordadas = await page.evaluate(() => {
  /* Lo que sale del canto A PROPÓSITO —los móviles cortados por abajo— se
     esconde para medir. Si no, cuenta como desbordamiento y la comprobación
     canta un fallo que no lo es. Al PDF le da igual: lo recorta la página. */
  const sangran = [...document.querySelectorAll('[data-sangra]')];
  sangran.forEach((e) => (e.style.display = 'none'));
  const malas = [...document.querySelectorAll('.lamina')]
    .map((s, i) => ({ n: i + 1, alto: s.scrollHeight, ancho: s.scrollWidth }))
    .filter((x) => x.alto > 1081 || x.ancho > 1921);
  sangran.forEach((e) => (e.style.display = ''));
  return malas;
});
if (desbordadas.length) {
  console.error('  Láminas que no caben en 1920 × 1080:',
    desbordadas.map((d) => `#${d.n} (${d.ancho}×${d.alto})`).join(', '));
  process.exit(1);
}

/* Y LO MISMO UN NIVEL MÁS ABAJO, que es donde se esconde de verdad.
   Pasó con la lámina de precios: la pieza de los tres planes se encogió sola
   —un hijo flexible con `overflow: hidden` puede menguar hasta cero— y se
   comió cuatro líneas de la columna de Gratis. La lámina medía 1080 clavados,
   así que la comprobación de arriba decía que todo iba bien mientras el PDF
   salía con la lista cortada a la mitad. Esto mira CADA caja: si su contenido
   no cabe dentro de ella, se dice. */
const recortados = await page.evaluate(() => {
  const malos = [];
  document.querySelectorAll('.lamina').forEach((lam, i) => {
    lam.querySelectorAll('*').forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow !== 'visible') {
        malos.push(`#${i + 1} ${el.className || el.tagName} (${el.scrollHeight} en ${el.clientHeight})`);
      }
    });
  });
  return malos;
});
if (recortados.length) {
  console.error('  Contenido recortado dentro de una caja:\n   ', recortados.join('\n    '));
  process.exit(1);
}

await page.pdf({
  path: destino,
  width: '1920px',
  height: '1080px',
  printBackground: true,
  pageRanges: `1-${laminas}`,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});

await navegador.close();

/* El contador de páginas del propio PDF, leído del archivo. Si Chromium ha
   partido una lámina, aquí sale un número distinto al de láminas. */
const pdf = readFileSync(destino, 'latin1');
const paginas = (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
const kb = (statSync(destino).size / 1024).toFixed(0);

console.log(`\n  ${destino}`);
console.log(`  ${laminas} láminas → ${paginas} páginas · ${kb} kB\n`);

if (paginas !== laminas) {
  console.error(`  El PDF tiene ${paginas} páginas y debería tener ${laminas}.`);
  process.exit(1);
}
