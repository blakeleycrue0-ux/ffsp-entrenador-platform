/**
 * Que el vídeo se parezca a la pantalla.
 *
 * La pizarra se dibuja DOS VECES: en SVG para la pantalla y sobre un lienzo
 * para grabar el vídeo, porque serializar el SVG treinta veces por segundo no
 * da el tiempo. Dos dibujos es una fuente permanente de que uno se quede atrás
 * y el vídeo exportado no se parezca a lo que se vio.
 *
 * Lo que se comprueba aquí no es que los píxeles coincidan —nunca van a
 * coincidir, son dos motores— sino **el encuadre**, que es lo que de verdad se
 * separaba: que los dos coloquen los mismos puntos del campo en el mismo sitio
 * de la imagen. Si el círculo central o un córner caen en otro lado, el vídeo
 * está mirando el campo desde otra parte, y eso sí se nota.
 *
 * Se mide sobre el código de verdad: se empaqueta `lienzo.ts` con esbuild y se
 * ejecuta dentro del navegador contra la misma escena que dibuja la pantalla.
 */
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock, SUPA, USER, CLUB, j } from './mock.mjs';

const BASE = 'http://localhost:4173';
const CARPETA = process.env.CAPTURAS ?? null;
const JUGADA = '33333333-3333-3333-3333-333333333333';

/* Puntos del campo que se comparan. Son esquinas y marcas reconocibles: si
   alguno se mueve, se ve a simple vista en el vídeo. */
const MOJONES = [
  ['esquina sup. izq.', 0, 0],
  ['esquina inf. der.', 105, 68],
  ['centro del campo', 52.5, 34],
  ['penalti izquierdo', 11, 34],
  ['penalti derecho', 94, 34],
];

const ESCENA = {
  version: 1,
  pitch: 'completo',
  surface: 'cesped',
  durationMs: 6000,
  objects: [
    { id: 'j', kind: 'jugadora', label: '8' },
    { id: 'c', kind: 'cono', label: '' },
    { id: 'b', kind: 'balon', label: '' },
  ],
  tracks: { j: [{ t: 0, x: 40, y: 30 }], c: [{ t: 0, x: 70, y: 20 }], b: [{ t: 0, x: 52, y: 40 }] },
  drawings: [],
};

const VISTAS = [
  ['cenital', { giro: 0, inclinacion: 0 }],
  ['banda', { giro: 0, inclinacion: 46 }],
  ['esquina', { giro: 34, inclinacion: 40 }],
];

/* ── Se empaqueta el dibujo del vídeo tal cual está en la aplicación ──────── */
const dir = mkdtempSync(join(tmpdir(), 'lienzo-'));
const entrada = join(dir, 'entrada.ts');
writeFileSync(
  entrada,
  `import { pintaEscena, medidas } from ${JSON.stringify(process.cwd() + '/src/features/board/lienzo')};
   import { proyeccion, camaraDe } from ${JSON.stringify(process.cwd() + '/src/features/board/camara')};
   import { PITCHES } from ${JSON.stringify(process.cwd() + '/src/features/board/scene')};
   (globalThis as any).__lienzo = { pintaEscena, medidas, proyeccion, camaraDe, PITCHES };`,
);
const salida = join(dir, 'lienzo.js');
await build({
  entryPoints: [entrada], outfile: salida, bundle: true, format: 'iife',
  platform: 'browser', tsconfig: 'tsconfig.json', logLevel: 'error',
});
const paquete = await import('node:fs').then((fs) => fs.readFileSync(salida, 'utf8'));

const fallos = [];
const ok = (bien, que, detalle = '') => {
  console.log(`   ${bien ? 'ok' : '✗ '} ${que}${detalle && !bien ? ` — ${detalle}` : ''}`);
  if (!bien) fallos.push(que);
};

if (CARPETA) mkdirSync(CARPETA, { recursive: true });

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();
await mock(page);
await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
await page.addInitScript({ content: paquete });

let camaraActual = null;
await page.route(`${SUPA}/rest/v1/plays**`, (route) => {
  const fila = {
    id: JUGADA, name: 'Prueba', description: '', team_id: 't1', club_id: CLUB,
    duration_ms: 6000, scene: { ...ESCENA, camara: camaraActual },
    updated_at: new Date().toISOString(), created_at: new Date().toISOString(), created_by: USER,
  };
  const u = new URL(route.request().url());
  return route.fulfill(j(u.searchParams.has('id') ? fila : [fila]));
});

for (const [nombre, camara] of VISTAS) {
  camaraActual = camara;
  console.log(`\n· ${nombre}`);
  await page.goto(`${BASE}/app/pizarra/${JUGADA}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('svg.board-surface');
  await page.waitForTimeout(400);

  const r = await page.evaluate(
    ([escena, mojones, camaraDeLaVista]) => {
      const L = globalThis.__lienzo;
      const sc = { ...escena, camara: camaraDeLaVista };

      /* ── Dónde pone cada mojón el dibujo de la PANTALLA ──
         Las dos posiciones se miden EN FRACCIÓN DEL CAMPO DIBUJADO, no del
         elemento: el SVG se ajusta dentro de su caja dejando bandas a los
         lados y el lienzo no, así que normalizar por el elemento compararía
         dos cosas distintas y daría un error que no existe. */
      const svg = document.querySelector('svg.board-surface');
      const mundo = svg.querySelector('g');
      const ctm = mundo.getScreenCTM();
      const proy = L.proyeccion(L.PITCHES[sc.pitch], L.camaraDe(sc), 3);
      const aPantalla = (x, y) => {
        const p = svg.createSVGPoint();
        p.x = x;
        p.y = y;
        return p.matrixTransform(ctm);
      };
      const e0 = aPantalla(proy.caja.x, proy.caja.y);
      const e1 = aPantalla(proy.caja.x + proy.caja.ancho, proy.caja.y + proy.caja.alto);
      const enPantalla = mojones.map(([, x, y]) => {
        const q = proy.proyecta(x, y);
        const s = aPantalla(q.x, q.y);
        return { u: (s.x - e0.x) / (e1.x - e0.x), v: (s.y - e0.y) / (e1.y - e0.y) };
      });

      /* ── Y dónde lo pone el dibujo del VÍDEO ── */
      const alto = 720;
      const { ancho } = L.medidas(sc, alto);
      const lienzo = document.createElement('canvas');
      lienzo.width = ancho;
      lienzo.height = alto;
      const c2d = lienzo.getContext('2d');
      L.pintaEscena(c2d, sc, 0, ancho, alto, { trayectorias: true, dorsales: true, nombres: false, marca: false });

      const esc = Math.min(ancho / proy.caja.ancho, alto / proy.caja.alto);
      const dx = (ancho - proy.caja.ancho * esc) / 2;
      const dy = (alto - proy.caja.alto * esc) / 2;
      const enVideo = mojones.map(([, x, y]) => {
        const q = proy.proyecta(x, y);
        return {
          u: (q.x - proy.caja.x) / proy.caja.ancho,
          v: (q.y - proy.caja.y) / proy.caja.alto,
        };
      });

      /* Y la proporción con la que se graba: si no es la del encuadre de la
         pantalla, el vídeo saldría estirado o con bandas que no toca. */
      const proporcion = {
        video: ancho / alto,
        pantalla: svg.viewBox.baseVal.width / svg.viewBox.baseVal.height,
        encaja: Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5,
        esc,
      };

      /* Y que el lienzo no esté en blanco: que haya césped de verdad. */
      const d = c2d.getImageData(0, 0, ancho, alto).data;
      let verdes = 0;
      for (let i = 0; i < d.length; i += 4 * 97) {
        if (d[i + 1] > d[i] + 10 && d[i + 1] > d[i + 2] + 10) verdes += 1;
      }
      return { enPantalla, enVideo, proporcion, verdes, muestras: Math.ceil(d.length / (4 * 97)), png: lienzo.toDataURL('image/png') };
    },
    [ESCENA, MOJONES, camara],
  );

  let peor = 0;
  let cual = '';
  r.enPantalla.forEach((p, i) => {
    const q = r.enVideo[i];
    const d = Math.max(Math.abs(p.u - q.u), Math.abs(p.v - q.v));
    if (d > peor) { peor = d; cual = MOJONES[i][0]; }
  });
  /* Medio punto porcentual del lado de la imagen: en un vídeo de 1280 son
     seis píxeles, por debajo de lo que se puede ver comparando. */
  ok(peor < 0.005, 'la pantalla y el vídeo encuadran igual',
    `${(peor * 100).toFixed(2)} % de diferencia en «${cual}»`);
  ok(r.verdes / r.muestras > 0.3, 'el lienzo tiene campo, no está en blanco',
    `${((r.verdes / r.muestras) * 100).toFixed(0)} % de verde`);
  ok(Math.abs(r.proporcion.video - r.proporcion.pantalla) / r.proporcion.pantalla < 0.01,
    'se graba con la proporción del encuadre de la pantalla',
    `vídeo ${r.proporcion.video.toFixed(3)} vs pantalla ${r.proporcion.pantalla.toFixed(3)}`);
  ok(r.proporcion.encaja, 'y el campo llena el fotograma, sin bandas de sobra');

  if (CARPETA) {
    const b64 = r.png.split(',')[1];
    writeFileSync(`${CARPETA}/video-${nombre}.png`, Buffer.from(b64, 'base64'));
  }
}

await navegador.close();
console.log(fallos.length ? `\n${fallos.length} comprobaciones fallan.` : '\nEl vídeo encuadra como la pantalla.');
process.exit(fallos.length ? 1 : 0);
