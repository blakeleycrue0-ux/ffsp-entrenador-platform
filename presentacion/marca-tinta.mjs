/**
 * LA MARCA EN NEGRO, PARA LO QUE NO SABE ENMASCARAR.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `public/playoff360.png` es BLANCO con transparencia. En la aplicación eso
 * es lo correcto y es deliberado: se usa como máscara CSS, el color sale de
 * `currentColor` y así no hay que mantener una imagen por cada fondo.
 *
 * El problema es todo lo que no sabe enmascarar. Un correo electrónico no
 * tiene máscaras CSS —Outlook y Gmail recortan medio hoja de estilo—, así que
 * ahí sólo cabe un `<img>`, y un logotipo blanco sobre el fondo blanco de un
 * correo es un cuadrado vacío. Que es exactamente lo que se veía.
 *
 * Esto deriva la versión en tinta de la blanca, en vez de guardar un segundo
 * PNG dibujado a mano: si algún día cambia el logotipo, se vuelve a correr
 * esto y las dos versiones siguen siendo la misma figura. Un binario que
 * nadie sabe regenerar es un binario que acaba desincronizado.
 *
 * Se conserva el canal alfa tal cual —los bordes suavizados son lo que hace
 * que no se vea dentado— y sólo se cambia el color de los píxeles.
 *
 *   node presentacion/marca-tinta.mjs
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = join(aqui, '..', 'public', 'playoff360.png');
const destino = join(aqui, '..', 'public', 'playoff360-tinta.png');

/** La misma tinta que el resto de los documentos y de la aplicación. */
const TINTA = '#10131A';

/* Se hace en un navegador y no con una librería de imágenes: Playwright ya
   está aquí para generar los PDF, y añadir una dependencia nativa que hay que
   compilar en cada máquina sólo para repintar un PNG no sale a cuenta. */
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const page = await navegador.newPage();

const base64 = readFileSync(origen).toString('base64');
const { datos, ancho, alto } = await page.evaluate(async ([b64, tinta]) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();

  const lienzo = document.createElement('canvas');
  lienzo.width = img.width;
  lienzo.height = img.height;
  const ctx = lienzo.getContext('2d');

  /* `source-in` conserva el ALFA del dibujo y le pone el color encima. El
     alfa es donde vive la forma, incluidos los bordes suavizados que son lo
     que hace que no se vea dentado; tocarlo sería estropearlo. */
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = tinta;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  return {
    datos: lienzo.toDataURL('image/png').split(',')[1],
    ancho: img.width,
    alto: img.height,
  };
}, [base64, TINTA]);

await navegador.close();

writeFileSync(destino, Buffer.from(datos, 'base64'));
console.log(`\n  ${destino}`);
console.log(`  ${ancho} × ${alto} · ${(statSync(destino).size / 1024).toFixed(1)} kB\n`);
