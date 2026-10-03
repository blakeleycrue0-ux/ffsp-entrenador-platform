/**
 * La cámara de la pizarra, comprobada con números.
 *
 * Esto no se puede mirar en una captura: o las cuentas cuadran o no. Lo que
 * más importa es lo primero —que sin inclinación ni giro el dibujo sea
 * EXACTAMENTE el de siempre—, porque de eso depende que ninguna jugada
 * guardada se mueva al abrirla.
 *
 * Se compila `camara.ts` al vuelo con esbuild, que ya viene con Vite.
 */
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'camara-'));
const salida = join(dir, 'camara.mjs');
await build({
  entryPoints: ['src/features/board/camara.ts'],
  outfile: salida,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'error',
});
const C = await import(salida);

const CAMPO = {
  id: 'completo', label: '', length: 105, width: 68,
  boxLength: 16.5, boxWidth: 40.3, smallBoxLength: 5.5, smallBoxWidth: 18.3,
  goalWidth: 7.32, circleR: 9.15, half: false,
};
const F7 = { ...CAMPO, id: 'f7', length: 65, width: 45, goalWidth: 6, circleR: 7 };

const fallos = [];
const ok = (bien, que, detalle = '') => {
  console.log(`   ${bien ? 'ok' : '✗ '} ${que}${detalle && !bien ? ` — ${detalle}` : ''}`);
  if (!bien) fallos.push(que);
};
const cerca = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/** Una rejilla de puntos por todo el campo, bordes incluidos. */
const rejilla = (spec, n = 9) => {
  const ps = [];
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= n; j += 1) {
      ps.push({ x: (spec.length * i) / n, y: (spec.width * j) / n });
    }
  }
  return ps;
};

/* ───────────── 1. Sin inclinación ni giro, el dibujo de siempre ──────────── */
{
  console.log('1 · cenital: tiene que ser la identidad, no «casi»');
  const p = C.proyeccion(CAMPO, { giro: 0, inclinacion: 0 });
  let peor = 0;
  for (const q of rejilla(CAMPO, 12)) {
    const r = p.proyecta(q.x, q.y);
    peor = Math.max(peor, Math.abs(r.x - q.x), Math.abs(r.y - q.y));
  }
  ok(peor === 0, 'cada punto cae exactamente donde estaba', `desvío ${peor}`);
  ok(p.escala(0, 0) === 1 && p.escala(105, 68) === 1, 'nada encoge');
  ok(p.plana === true, 'se reconoce como plana y el dibujo puede tomar atajos');
}

/* ─────────────── 2. Vertical: el mismo giro de cuarto de vuelta ──────────── */
{
  console.log('\n2 · vertical: el cuarto de vuelta de antes');
  const p = C.proyeccion(CAMPO, { giro: 90, inclinacion: 0 });
  /* El giro de antes era (x, y) → (ancho − y, x). El de ahora cae desplazado
     —la caja se encarga de recolocarlo—, así que lo que hay que exigir es que
     la diferencia sea LA MISMA en todos los puntos: un desplazamiento, no una
     deformación. Si girase al revés, o escalase, esto se dispararía. */
  const base = p.proyecta(0, 0);
  const dx = CAMPO.width - 0 - base.x;
  const dy = 0 - base.y;
  let peor = 0;
  for (const q of rejilla(CAMPO, 8)) {
    const r = p.proyecta(q.x, q.y);
    peor = Math.max(
      peor,
      Math.abs(r.x + dx - (CAMPO.width - q.y)),
      Math.abs(r.y + dy - q.x),
    );
  }
  ok(cerca(peor, 0, 1e-9), 'coincide con el giro que se usaba, salvo desplazamiento', `desvío ${peor}`);
  ok(p.sinProfundidad === true, 'sigue sin profundidad: nada encoge');
}

/* ───────────────── 3. Ida y vuelta con cualquier cámara ──────────────────── */
{
  console.log('\n3 · desproyecta deshace proyecta (si no, no se puede arrastrar)');
  const camaras = [
    ...C.VISTAS.map((v) => v.camara),
    { giro: 17, inclinacion: 31 },
    { giro: 213, inclinacion: C.INCLINACION_MAXIMA },
    { giro: 359, inclinacion: 1 },
  ];
  let peor = 0;
  let peorCam = null;
  for (const cam of camaras) {
    for (const spec of [CAMPO, F7]) {
      const p = C.proyeccion(spec, cam);
      for (const q of rejilla(spec, 7)) {
        const r = p.proyecta(q.x, q.y);
        const v = p.desproyecta(r.x, r.y);
        const d = Math.max(Math.abs(v.x - q.x), Math.abs(v.y - q.y));
        if (d > peor) { peor = d; peorCam = cam; }
      }
    }
  }
  ok(peor < 1e-9, 'vuelve al mismo metro con todas las vistas',
    `peor ${peor.toExponential(2)} m en ${JSON.stringify(peorCam)}`);
}

/* ─────────────────── 4. La perspectiva va en el sentido bueno ────────────── */
{
  console.log('\n4 · lo lejano se ve más pequeño, y lo cercano más grande');
  const p = C.proyeccion(CAMPO, { giro: 0, inclinacion: 50 });
  const lejos = p.escala(52.5, 0);      // banda del fondo
  const centro = p.escala(52.5, 34);
  const cerca_ = p.escala(52.5, 68);    // banda de delante
  ok(lejos < centro && centro < cerca_, 'la escala crece según se acerca',
    `${lejos.toFixed(3)} < ${centro.toFixed(3)} < ${cerca_.toFixed(3)}`);
  ok(cerca(centro, 1, 1e-9), 'el centro del campo conserva su tamaño');

  // Y además la banda del fondo se dibuja más corta que la de delante.
  const fondo = Math.abs(p.proyecta(105, 0).x - p.proyecta(0, 0).x);
  const frente = Math.abs(p.proyecta(105, 68).x - p.proyecta(0, 68).x);
  ok(fondo < frente, 'la línea de fondo lejana sale más corta que la cercana',
    `${fondo.toFixed(1)} vs ${frente.toFixed(1)}`);

  const proporcion = fondo / frente;
  ok(proporcion > 0.55 && proporcion < 0.8,
    'la perspectiva se nota pero no es una caricatura',
    `el fondo mide el ${(proporcion * 100).toFixed(0)} % del frente`);
}

/* ──────────────── 5. Nada se va al infinito en ningún caso ───────────────── */
{
  console.log('\n5 · con la inclinación al máximo nada se desborda');
  let peor = 0;
  for (let giro = 0; giro < 360; giro += 7) {
    const p = C.proyeccion(CAMPO, { giro, inclinacion: C.INCLINACION_MAXIMA });
    for (const q of rejilla(CAMPO, 6)) {
      // También el punto más alto que se dibuja: el larguero de una portería.
      for (const z of [0, 2.44]) {
        const r = p.proyecta(q.x, q.y, z);
        peor = Math.max(peor, Math.abs(r.x), Math.abs(r.y));
      }
    }
  }
  ok(Number.isFinite(peor) && peor < 1000, 'ningún punto se dispara',
    `el más lejano a ${peor.toFixed(0)} unidades`);

  // La inclinación se recorta sola: nadie puede pedir mirar desde el césped.
  const exagerada = C.normalizaCamara({ giro: 0, inclinacion: 89 });
  ok(exagerada.inclinacion === C.INCLINACION_MAXIMA, 'la inclinación se recorta al máximo');
  const negativa = C.normalizaCamara({ giro: -90, inclinacion: -10 });
  ok(negativa.inclinacion === 0 && negativa.giro === 270, 'el giro se normaliza y la inclinación no baja de cero');
}

/* ─────────────── 6. La caja contiene de verdad todo el campo ─────────────── */
{
  console.log('\n6 · la caja no corta nada');
  let malas = 0;
  for (const cam of C.VISTAS.map((v) => v.camara)) {
    const p = C.proyeccion(CAMPO, cam, 3);
    const { x, y, ancho, alto } = p.caja;
    for (const q of rejilla(CAMPO, 10)) {
      const r = p.proyecta(q.x, q.y);
      if (r.x < x - 1e-9 || r.x > x + ancho + 1e-9 || r.y < y - 1e-9 || r.y > y + alto + 1e-9) malas += 1;
    }
  }
  ok(malas === 0, 'ningún punto del campo cae fuera de la caja', `${malas} fuera`);
}

/* ──────────────────── 7. La altura levanta, no desplaza ──────────────────── */
{
  console.log('\n7 · lo que tiene altura se dibuja hacia arriba');
  const p = C.proyeccion(CAMPO, { giro: 0, inclinacion: 45 });
  const suelo = p.proyecta(52.5, 34, 0);
  const alto = p.proyecta(52.5, 34, 2.44);
  ok(alto.y < suelo.y, 'el larguero queda por encima del punto de penalti', `${alto.y.toFixed(2)} < ${suelo.y.toFixed(2)}`);
  ok(cerca(alto.x, suelo.x, 1e-9), 'y justo encima, sin irse de lado');

  /* A vista de pájaro lo alto no se tumba hacia ningún lado: se abre desde el
     centro de la imagen hacia afuera, que es lo que hace una cámara cenital. */
  const plana = C.proyeccion(CAMPO, { giro: 0, inclinacion: 0 });
  const centro0 = plana.proyecta(52.5, 34, 0);
  const centro2 = plana.proyecta(52.5, 34, 2.44);
  ok(cerca(centro0.x, centro2.x, 1e-9) && cerca(centro0.y, centro2.y, 1e-9),
    'justo bajo la cámara, lo alto no se mueve');

  const bordeSuelo = plana.proyecta(0, 0, 0);
  const bordeAlto = plana.proyecta(0, 0, 2.44);
  const dSuelo = Math.hypot(bordeSuelo.x - 52.5, bordeSuelo.y - 34);
  const dAlto = Math.hypot(bordeAlto.x - 52.5, bordeAlto.y - 34);
  ok(dAlto > dSuelo, 'y en la esquina se abre hacia afuera, como en una foto cenital',
    `${dAlto.toFixed(2)} > ${dSuelo.toFixed(2)}`);
}

/* ───────────── 8. Las vistas con nombre son lo que dicen ser ─────────────── */
{
  console.log('\n8 · las vistas con nombre');
  ok(C.VISTAS.every((v) => v.label && v.pista), 'todas tienen nombre y una pista de para qué sirven');
  ok(C.vistaDe({ giro: 0, inclinacion: 0 }) === 'cenital', 'se reconoce la cenital');
  ok(C.vistaDe({ giro: 13, inclinacion: 7 }) === null, 'una cámara a mano no se hace pasar por una vista');
  ok(C.camaraDe({ vertical: true }).giro === 90, 'una jugada antigua en vertical sigue en vertical');
  ok(C.camaraDe({ vertical: true }).inclinacion === 0, 'y sigue sin inclinación');
  ok(C.camaraDe({}).giro === 0, 'una jugada antigua apaisada no se mueve');
  ok(C.camaraDe({ vertical: true, camara: { giro: 34, inclinacion: 12 } }).giro === 34,
    'si la jugada trae cámara, manda la cámara');
}

console.log(fallos.length ? `\n${fallos.length} comprobaciones fallan.` : '\nLa cámara cuadra.');
process.exit(fallos.length ? 1 : 0);
