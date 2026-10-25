/**
 * EL MAPA DEL SITIO DICE LA VERDAD, Y DEVUELVE XML.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dos cosas distintas, y las dos fallaban en silencio:
 *
 * 1 · QUE SE SIRVA COMO XML. No existía `sitemap.xml`, así que la petición
 *     caía en el comodín `/* → /index.html` de Netlify y devolvía LA PORTADA
 *     con un 200. Search Console no decía «no existe»: decía que no podía
 *     leerlo, que es mucho más difícil de diagnosticar. Un 404 habría sido
 *     más honesto que una portada disfrazada de XML.
 *
 * 2 · QUE LA LISTA SEA LA DE VERDAD. Un mapa escrito a mano envejece: alguien
 *     añade una ruta pública y se queda fuera del índice durante meses, o
 *     quita una y el mapa sigue mandando a Google a un sitio que ya no está.
 *     Esta prueba lee los <Route> REALES de src/App.tsx y los compara con el
 *     mapa, en los dos sentidos.
 *
 * Lo primero necesita el servidor en marcha; lo segundo, no. Si no hay
 * servidor se hace sólo la parte de los archivos y se dice.
 *
 *   npm run build && npm run preview &
 *   node pruebas/sitemap.mjs
 */
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const DOMINIO = 'https://playoff360.site';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

const app = lee('src/App.tsx');
const mapa = lee('public/sitemap.xml');
const robots = lee('public/robots.txt');
const canonico = lee('src/components/Canonico.tsx');

/* ── 1 · LAS RUTAS PÚBLICAS DE VERDAD ──────────────────────────────────────
   Las que están al nivel de arriba (empiezan por «/») y no cuelgan de /app.
   De ellas se descarta /entrar: es un formulario de acceso y no se indexa a
   propósito, así que el mapa tiene que NO tenerla. */
const NO_SE_INDEXAN = ['/entrar'];

const enElCodigo = [...app.matchAll(/<Route\s+path="(\/[^"]*)"/g)]
  .map((m) => m[1])
  .filter((r) => r === '/' || (!r.startsWith('/app') && !r.includes('*')))
  .filter((r) => !NO_SE_INDEXAN.includes(r));

const enElMapa = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(DOMINIO, '') || '/');

console.log('\n  el mapa coincide con las rutas que existen\n');

comprueba('hay rutas públicas que mapear', enElCodigo.length > 0, enElCodigo.join(' '));

for (const r of enElCodigo) {
  comprueba(`«${r}» existe en el código y está en el mapa`, enElMapa.includes(r));
}
for (const r of enElMapa) {
  comprueba(`«${r}» está en el mapa y existe en el código`, enElCodigo.includes(r));
}
for (const r of NO_SE_INDEXAN) {
  comprueba(`«${r}» NO está en el mapa, que es lo correcto`, !enElMapa.includes(r));
}
comprueba(
  'ninguna dirección de /app se ha colado',
  !enElMapa.some((r) => r.startsWith('/app')),
);

console.log('\n  el XML está bien formado\n');

comprueba('declara la versión y la codificación', mapa.trimStart().startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
comprueba('usa el espacio de nombres de sitemaps.org', mapa.includes('http://www.sitemaps.org/schemas/sitemap/0.9'));
comprueba('abre y cierra <urlset>', /<urlset[\s>]/.test(mapa) && mapa.includes('</urlset>'));
comprueba(
  'todas las direcciones son absolutas y del dominio bueno',
  enElMapa.length > 0 && [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].every((m) => m[1].startsWith(`${DOMINIO}/`)),
);
comprueba(
  'y ninguna lleva http, www ni otro dominio',
  !/<loc>(?!https:\/\/playoff360\.site\/)/.test(mapa),
);

console.log('\n  robots.txt\n');

comprueba('señala el mapa del sitio', robots.includes(`Sitemap: ${DOMINIO}/sitemap.xml`));
comprueba('no bloquea la raíz', /^Allow:\s*\/$/m.test(robots));
comprueba('deja fuera la pantalla de acceso', /^Disallow:\s*\/entrar$/m.test(robots));
comprueba('deja fuera la aplicación', /^Disallow:\s*\/app$/m.test(robots));
for (const publica of enElMapa) {
  const tapada = [...robots.matchAll(/^Disallow:\s*(\S+)$/gm)]
    .map((m) => m[1])
    .some((d) => d !== '/' && publica.startsWith(d));
  comprueba(`no tapa «${publica}», que sí se indexa`, !tapada);
}

console.log('\n  la canónica y lo que se comparte\n');

const indice = lee('index.html');
comprueba(
  'og:image es absoluta (si no, se comparte sin imagen)',
  indice.includes(`<meta property="og:image" content="${DOMINIO}/`),
);
comprueba('hay og:url', indice.includes('property="og:url"'));
comprueba(
  'NO hay canónica fija en el índice: diría que todas las páginas son la portada',
  !/rel="canonical"/.test(indice),
);
comprueba(
  'la canónica la pone la ruta, y sólo para las públicas',
  /rel="canonical"/.test(canonico) && canonico.includes(DOMINIO),
);

/* La lista de `Canonico` y la del mapa tienen que ser la misma. */
const enCanonico = (canonico.match(/export const PUBLICAS = \[([^\]]+)\]/)?.[1] ?? '')
  .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
comprueba(
  'la lista de públicas de Canonico es la misma que la del mapa',
  enCanonico.length === enElMapa.length && enCanonico.every((r) => enElMapa.includes(r)),
  `${enCanonico.join(' ')} contra ${enElMapa.join(' ')}`,
);

/* ── 2 · CADA PÁGINA CUENTA LO SUYO ────────────────────────────────────────
   Había UN título y UNA descripción para todo el sitio, en `index.html`: la
   portada, las dos legales, la pantalla de acceso y cualquier dirección
   inventada salían iguales. Para un buscador son páginas que dicen ser la
   misma, y compiten entre ellas en los resultados. */
console.log('\n  cada página pública tiene título y descripción propios\n');

const cabeceras = [...canonico.matchAll(/'(\/[^']*)': \{\s*titulo:\s*\n?\s*'([^']+)',\s*\n?\s*descripcion:\s*\n?\s*([\s\S]*?),\n  \}/g)]
  .map((m) => ({ ruta: m[1], titulo: m[2] }));

comprueba('hay cabeceras definidas', cabeceras.length > 0, `${cabeceras.length}`);
for (const r of enElMapa) {
  comprueba(`«${r}» tiene título propio`, cabeceras.some((c) => c.ruta === r));
}
const titulos = cabeceras.map((c) => c.titulo);
comprueba(
  'y ningún título se repite',
  new Set(titulos).size === titulos.length,
  titulos.length ? `${titulos.length} títulos` : 'ninguno',
);
for (const t of titulos) {
  /* Entre 15 y 65: por debajo no dice nada y por encima Google lo corta. */
  comprueba(`«${t.slice(0, 44)}…» mide bien`, t.length >= 15 && t.length <= 65, `${t.length} caracteres`);
}

console.log('\n  lo privado se marca, no sólo se pide que no se mire\n');
comprueba(
  'hay una instrucción noindex para lo que no es público',
  /name="robots"/.test(canonico) && /noindex/.test(canonico),
);
comprueba(
  'y robots.txt no es la única defensa: lo dice el propio código',
  /TAMPOCO LEE/.test(canonico),
);

console.log('\n  datos estructurados\n');
comprueba('hay ficha JSON-LD', /application\/ld\+json/.test(canonico));

/* SE MIRA EL DATO, NO LA PROSA. Esto comprobaba el archivo entero y fallaba
   por su propio comentario, que explica por qué NO se ponen estrellas: la
   palabra estaba escrita, pero en una explicación, no en la ficha. Una prueba
   que no distingue el código de lo que se dice sobre el código acusa en
   falso, y a la tercera vez que acusa en falso deja de creerse. */
const laFicha = canonico.slice(canonico.indexOf('const FICHA = {'), canonico.indexOf('};', canonico.indexOf('const FICHA = {')));
comprueba('la ficha se ha podido aislar', laFicha.length > 50);
comprueba(
  'sin valoraciones inventadas: no hay ni una sola valoración real',
  !/aggregateRating|ratingValue|reviewCount/.test(laFicha),
);
comprueba('sin número de usuarios inventado', !/userInteractionCount|interactionStatistic/.test(laFicha));
comprueba('sin precios, que viven en la base de datos', !/price|offers/.test(laFicha));
comprueba('y sólo en la portada', /limpio === '\/'/.test(canonico));

/* ── 3 · QUE EL SERVIDOR LO SIRVA COMO XML ─────────────────────────────── */
console.log('\n  lo que devuelve el servidor\n');

let vivo = true;
try {
  await fetch(BASE, { signal: AbortSignal.timeout(2500) });
} catch {
  vivo = false;
}

if (!vivo) {
  console.log('    — sin servidor en marcha: esta parte no se ha comprobado.');
  console.log('      npm run build && npm run preview &');
} else {
  for (const [ruta, tipo] of [['/sitemap.xml', 'xml'], ['/robots.txt', 'text/plain']]) {
    const r = await fetch(`${BASE}${ruta}`);
    const cuerpo = await r.text();
    comprueba(`${ruta} responde 200`, r.status === 200, `${r.status}`);
    comprueba(
      `${ruta} se sirve como ${tipo}`,
      (r.headers.get('content-type') ?? '').includes(tipo),
      r.headers.get('content-type') ?? 'sin tipo',
    );
    /* LO QUE FALLABA: devolvía la portada. Si el cuerpo trae <!doctype html>
       es que el comodín se lo ha tragado otra vez. */
    comprueba(
      `${ruta} NO devuelve la portada`,
      !/<!doctype html>/i.test(cuerpo) && !cuerpo.includes('<div id="root">'),
    );
  }

  const r = await fetch(`${BASE}/sitemap.xml`);
  const xml = await r.text();
  comprueba('el cuerpo servido es el mapa, con sus cuatro direcciones',
    [...xml.matchAll(/<loc>/g)].length === enElMapa.length,
    `${[...xml.matchAll(/<loc>/g)].length} direcciones`);
}

console.log(
  fallos === 0
    ? '\n  El mapa dice la verdad, se sirve como XML y no tapa nada público.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
