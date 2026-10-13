/**
 * LA HOJA DE ADMINISTRACIÓN, A A4 PARA IMPRIMIR.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Va aparte de `construir.mjs` porque son dos documentos con dos reglas
 * distintas: la presentación son láminas de 1920 × 1080 que NO pueden fluir
 * —una lámina es una página y punto— y esto es un documento de texto que sí
 * fluye, se parte por donde haga falta y puede ocupar las páginas que pida el
 * contenido. Meter las dos cosas en un script con un `if` dentro sólo habría
 * servido para que cada cambio en una pudiera romper la otra.
 *
 * LO QUE SÍ COMPRUEBA: que no se haya colado una clave de verdad. Este
 * documento se guarda en un repositorio público y lleva una tabla llena de
 * nombres de claves con una línea en blanco al lado; es exactamente la clase
 * de archivo donde alguien, con toda la buena intención, acaba pegando la
 * clave «sólo un momento para tenerla a mano». Si eso pasa, esto no genera el
 * PDF y lo dice.
 *
 *   node presentacion/imprimible.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = join(aqui, 'administracion.html');
const destino = join(aqui, 'Playoff360-administracion.pdf');

/* ── NINGUNA CLAVE DE VERDAD, Y SE COMPRUEBA ANTES DE IMPRIMIR ───────────
   Cada patrón es el principio literal de una credencial real. Los nombres
   —«empieza por sk_live_»— son texto explicativo y no casan, porque lo que
   se busca es el prefijo SEGUIDO del cuerpo de la clave. */
const PELIGROS = [
  [/\bsk_live_[A-Za-z0-9]{8,}/, 'una clave secreta de Stripe'],
  [/\brk_live_[A-Za-z0-9]{8,}/, 'una clave restringida de Stripe'],
  [/\bpk_live_[A-Za-z0-9]{8,}/, 'una clave publicable de Stripe'],
  [/\bwhsec_[A-Za-z0-9]{8,}/, 'un secreto de webhook de Stripe'],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, 'un JWT (anon o service_role de Supabase)'],
];

const fuente = readFileSync(origen, 'utf8');
for (const [patron, qué] of PELIGROS) {
  const m = fuente.match(patron);
  if (m) {
    console.error(`\n  NO SE GENERA EL PDF: el documento contiene ${qué}.`);
    console.error(`  Encontrado: ${m[0].slice(0, 12)}…\n`);
    console.error('  Las claves no se escriben aquí. Este archivo está en un repositorio');
    console.error('  público: lo que se guarde dentro queda publicado.\n');
    process.exit(1);
  }
}

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
  /* El pie con el número de página. En un documento que se imprime, se
     rellena a mano y se guarda en un cajón, saber si falta una hoja importa
     más que en la pantalla. */
  footerTemplate: `
    <div style="width:100%; padding:0 16mm; font-family:sans-serif; font-size:7.5pt;
                color:#8A90A0; display:flex; justify-content:space-between;">
      <span>Playoff360 · Hoja de administración · interno</span>
      <span class="pageNumber"></span>/<span class="totalPages"></span>
    </div>`,
  margin: { top: '17mm', right: '16mm', bottom: '16mm', left: '16mm' },
});

await navegador.close();

const pdf = readFileSync(destino, 'latin1');
const paginas = (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`\n  ${destino}`);
console.log(`  ${paginas} páginas · ${(statSync(destino).size / 1024).toFixed(0)} kB\n`);
