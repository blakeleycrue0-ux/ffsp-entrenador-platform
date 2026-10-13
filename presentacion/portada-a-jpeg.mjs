/**
 * La portada, de PNG a JPEG, sin tocar un píxel de la composición.
 *
 * El archivo que llegó pesa 2,4 MB en PNG. Es una fotografía: en PNG cada
 * degradado del cielo se guarda sin pérdida y ocupa lo que ocupa, y dentro de
 * un PDF ese peso va entero. Pasada a JPEG con calidad 0,92 es la misma
 * imagen, al mismo tamaño, en una décima parte.
 *
 * Se hace con el navegador que ya está instalado —un lienzo y `toDataURL`— en
 * vez de añadir una dependencia de imágenes al proyecto para una conversión
 * que se hace una vez.
 *
 *   node presentacion/portada-a-jpeg.mjs <origen.png> <destino.jpg>
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const [origen, destino] = process.argv.slice(2);
if (!origen || !destino) {
  console.error('Uso: node presentacion/portada-a-jpeg.mjs <origen.png> <destino.jpg>');
  process.exit(1);
}

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const page = await navegador.newPage();
const base64 = readFileSync(origen).toString('base64');

const { jpeg, ancho, alto } = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return {
    jpeg: c.toDataURL('image/jpeg', 0.92).split(',')[1],
    ancho: img.naturalWidth,
    alto: img.naturalHeight,
  };
}, base64);

await navegador.close();
writeFileSync(destino, Buffer.from(jpeg, 'base64'));
const antes = readFileSync(origen).length;
const ahora = readFileSync(destino).length;
console.log(`${ancho}×${alto}  ${(antes / 1024 / 1024).toFixed(2)} MB → ${(ahora / 1024).toFixed(0)} kB`);
