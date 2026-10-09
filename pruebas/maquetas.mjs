/**
 * Las maquetas de la portada, a todos los anchos.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ VIGILA. Dos cosas que ya pasaron y no se ven en una captura de
 * escritorio:
 *
 *  1. QUE NADA SE SALGA DE SU CAJA. Las tarjetas flotantes miden 348 px en un
 *     escritorio ancho y la mitad en un iPad. Con los tamaños clavados en
 *     píxeles, los rótulos de las cajas de tres columnas («DISPONIBLES»,
 *     «LESIONADAS») desbordaban y se pisaban unos a otros. Aquí se compara
 *     `scrollWidth` con `clientWidth` de cada caja: si el contenido no cabe,
 *     falla.
 *
 *  2. QUE LA TARJETA ENTERA QUEPA EN LA VENTANA. Las tarjetas vuelan hacia
 *     fuera de la pizarra con desplazamientos en porcentaje; entre 768 y
 *     1279 px el contenedor ya tocaba los bordes y la de la izquierda se
 *     salía de la pantalla.
 *
 * No comprueba que sea bonito. Comprueba que se lea.
 */
import { chromium } from 'playwright';

const ANCHOS = [
  ['movil', 390, 844, 3],
  ['tablet', 768, 1024, 2],
  ['ipad', 834, 1112, 2],
  ['portatil', 1024, 768, 2],
  ['escritorio', 1440, 900, 2],
  ['ancho', 1920, 1080, 1],
];

const base = process.env.URL ?? 'http://localhost:4173/';
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM });
const fallos = [];

for (const [nombre, w, h, d] of ANCHOS) {
  const ctx = await navegador.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: d,
    isMobile: w < 500, hasTouch: w < 900,
  });
  const p = await ctx.newPage();
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);

  // Recorrer la página entera: las maquetas aparecen con el desplazamiento.
  await p.evaluate(async () => {
    const paso = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(500);

  const medido = await p.evaluate(() => {
    const ventana = document.documentElement.clientWidth;
    const desbordes = [];
    const fuera = [];
    const tarjetas = [...document.querySelectorAll('.maqueta')];

    for (const tarjeta of tarjetas) {
      const caja = tarjeta.getBoundingClientRect();
      if (caja.width === 0) continue;

      // ¿La tarjeta entera cabe de lado a lado?
      if (caja.left < -0.5 || caja.right > ventana + 0.5) {
        fuera.push({
          titulo: tarjeta.querySelector('span.truncate')?.textContent?.trim() ?? '?',
          izq: Math.round(caja.left), der: Math.round(caja.right), ancho: Math.round(caja.width),
        });
      }

      // ¿Algo de dentro no cabe en su propia caja?
      for (const el of tarjeta.querySelectorAll('*')) {
        // El SVG no tiene caja de desplazamiento: `scrollWidth` ahí no
        // significa nada. Y dentro de la pizarra está el componente de
        // verdad, que tiene sus propias pruebas.
        if (el.ownerSVGElement || el.tagName === 'svg') continue;
        if (el.scrollWidth <= el.clientWidth + 1) continue;
        const cs = getComputedStyle(el);
        // `truncate` y `overflow-hidden` recortan a propósito: no es un fallo.
        if (cs.textOverflow === 'ellipsis' || cs.overflowX !== 'visible') continue;
        desbordes.push({
          etiqueta: el.tagName.toLowerCase(),
          texto: (el.textContent ?? '').trim().slice(0, 28),
          contenido: el.scrollWidth, caja: el.clientWidth,
        });
      }
    }
    return { tarjetas: tarjetas.length, desbordes, fuera };
  });

  const linea = `${nombre} (${w}px): ${medido.tarjetas} maquetas`;
  if (medido.fuera.length) {
    fallos.push(`${linea} — ${medido.fuera.length} se salen de la ventana: ${JSON.stringify(medido.fuera)}`);
  }
  if (medido.desbordes.length) {
    fallos.push(`${linea} — ${medido.desbordes.length} desbordes internos: ${JSON.stringify(medido.desbordes.slice(0, 6))}`);
  }
  if (!medido.tarjetas) fallos.push(`${linea} — no se encontró ninguna maqueta`);
  if (!medido.fuera.length && !medido.desbordes.length && medido.tarjetas) console.log(`  ✓ ${linea}`);

  await ctx.close();
}

await navegador.close();

if (fallos.length) {
  console.error('\n✗ maquetas\n' + fallos.map((f) => '  ' + f).join('\n'));
  process.exit(1);
}
console.log('\n✓ maquetas: nada se sale, a ningún ancho');
