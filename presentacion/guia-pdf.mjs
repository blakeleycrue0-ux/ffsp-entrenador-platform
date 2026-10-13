/**
 * LA GUÍA, EN PDF. A4, PARA ADJUNTARLA AL CORREO DE BIENVENIDA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tercer documento del proyecto y tercer script, por lo mismo que los otros
 * dos están separados: la presentación son láminas de 1920 × 1080 que no
 * fluyen, la hoja de administración es interna y lleva una comprobación de
 * claves, y esto es un documento que se le manda a un desconocido. Tres
 * reglas distintas; un script con tres `if` dentro sólo serviría para que
 * cada cambio en uno pudiera romper los otros.
 *
 * EL PDF SE ESCRIBE EN `public/`, NO AQUÍ. Es la única diferencia de verdad
 * con los otros dos: éste tiene que poder descargarse desde la web, porque
 * el correo de bienvenida lo adjunta por dirección —se lo descarga Brevo— y
 * además lo enlaza en el cuerpo por si el adjunto se queda por el camino.
 * Todo lo que vive en `public/` acaba publicado tal cual en playoff360.site.
 *
 *   node presentacion/guia-pdf.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = join(aqui, 'guia.html');
const destino = join(aqui, '..', 'public', 'Playoff360-guia.pdf');

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const page = await navegador.newPage();
await page.goto(pathToFileURL(origen).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

await page.pdf({
  path: destino,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%; padding:0 16mm; font-family:sans-serif; font-size:7.5pt;
                color:#8A90A0; display:flex; justify-content:space-between;">
      <span>Playoff360 · Cómo funciona · playoff360.site</span>
      <span class="pageNumber"></span>/<span class="totalPages"></span>
    </div>`,
  margin: { top: '17mm', right: '16mm', bottom: '16mm', left: '16mm' },
});

await navegador.close();

const pdf = readFileSync(destino, 'latin1');
const paginas = (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
const kb = statSync(destino).size / 1024;

console.log(`\n  ${destino}`);
console.log(`  ${paginas} páginas · ${kb.toFixed(0)} kB`);

/* UN ADJUNTO GORDO NO LLEGA. Los proveedores de correo rechazan o mandan a
   spam los mensajes pesados, y éste va a TODAS las altas: si la guía engorda
   hasta tres megas, el correo que peor puede fallar es justo el primero que
   recibe alguien. Mejor enterarse aquí que en la bandeja de spam de otro. */
if (kb > 1500) {
  console.error(`\n  DEMASIADO PESADA: ${kb.toFixed(0)} kB. El límite son 1500.`);
  console.error('  Va adjunta a cada correo de bienvenida; un PDF gordo acaba en spam.\n');
  process.exit(1);
}
console.log('');
