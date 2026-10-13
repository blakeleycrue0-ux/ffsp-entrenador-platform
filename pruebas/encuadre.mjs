/**
 * LA PANTALLA LA TIENE QUE LLENAR LA JUGADA, NO EL CÉSPED.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * «Pantalla completa» ya existía y funcionaba: se iban los paneles y el campo
 * ocupaba la pantalla entera. Y aun así se seguía viendo todo diminuto, que
 * es lo que no cuadraba. Medido en un portátil de 1440 × 900 con un circuito
 * corriente: el campo llenaba el 70 % de la pantalla y la jugada —las fichas
 * y sus recorridos— ocupaba dentro de él un trozo del tamaño de un sello.
 *
 * Porque un rondó son veinte metros y un circuito treinta, y los dos se
 * dibujan sobre un campo de 105 × 68. Lo que llenaba la pantalla era césped
 * vacío. Encuadrar «todo» era encuadrar EL CAMPO; lo que hace falta es
 * encuadrar LA JUGADA.
 *
 * Esto mide el encuadre sobre la proyección de verdad —la misma que dibuja el
 * campo, con su cámara y su perspectiva—, no sobre una copia.
 *
 *   node pruebas/encuadre.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/* `encuadre.ts` es cuenta pura y no sabe nada de React, así que se compila
   solo. La prueba usa LA MISMA función que la pantalla, no una copia. */
const dir = mkdtempSync(join(tmpdir(), 'encuadre-'));
const puente = join(dir, 'puente.ts');
writeFileSync(puente, `
export { encuadraJugada } from '${process.cwd()}/src/features/board/encuadre';
export { proyeccion, camaraDe } from '${process.cwd()}/src/features/board/camara';
export { PITCHES } from '${process.cwd()}/src/features/board/scene';
`);
const salida = join(dir, 'puente.mjs');
execFileSync('npx', ['esbuild', puente, '--bundle', '--format=esm',
  `--outfile=${salida}`, '--log-level=error'], { stdio: 'inherit' });
const { encuadraJugada, proyeccion, camaraDe, PITCHES } = await import(salida);

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

/**
 * Qué porcentaje del lienzo ocupa la jugada con una vista dada.
 *
 * Se reproduce la transformación del mundo tal cual está en BoardStage —
 * escalar respecto al centro del lienzo y luego desplazar— y se mide la caja
 * de lo dibujado contra la caja del lienzo. Es lo que ve el entrenador.
 */
function ocupacion(scene, view) {
  const proy = proyeccion(PITCHES[scene.pitch], camaraDe(scene), 3);
  const { caja } = proy;
  const cx = caja.x + caja.ancho / 2;
  const cy = caja.y + caja.alto / 2;

  const puntos = [];
  for (const obj of scene.objects) {
    for (const k of scene.tracks[obj.id] ?? []) {
      const p = proy.proyecta(k.x, k.y);
      puntos.push({
        x: (p.x - cx) * view.s + cx + view.tx,
        y: (p.y - cy) * view.s + cy + view.ty,
      });
    }
  }
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const ancho = Math.max(...xs) - Math.min(...xs);
  const alto = Math.max(...ys) - Math.min(...ys);
  return {
    porcentaje: ((ancho * alto) / (caja.ancho * caja.alto)) * 100,
    centrada: Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - cx) < 0.5
      && Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - cy) < 0.5,
    dentro: Math.min(...xs) >= caja.x - 0.5 && Math.max(...xs) <= caja.x + caja.ancho + 0.5
      && Math.min(...ys) >= caja.y - 0.5 && Math.max(...ys) <= caja.y + caja.alto + 0.5,
  };
}

const VIEW_INICIAL = { s: 1, tx: 0, ty: 0 };

/* Un circuito de los de verdad: treinta metros de largo y doce de ancho, en
   una esquina del campo, que es donde se montan. */
const circuito = {
  version: 1,
  pitch: 'completo',
  camara: { giro: 0, inclinacion: 0, zoom: 1 },
  durationMs: 10000,
  objects: [
    { id: 'a', kind: 'jugadora', label: '7' },
    { id: 'b', kind: 'jugadora', label: '9' },
    { id: 'c', kind: 'jugadora', label: '11' },
    { id: 'k', kind: 'cono', label: '' },
  ],
  tracks: {
    a: [{ t: 0, x: 15, y: 50 }, { t: 2000, x: 45, y: 50, move: 'carrera' }],
    b: [{ t: 2000, x: 15, y: 56 }, { t: 4000, x: 45, y: 56, move: 'carrera' }],
    c: [{ t: 4000, x: 15, y: 62 }, { t: 6000, x: 45, y: 62, move: 'carrera' }],
    k: [{ t: 0, x: 47, y: 56 }],
  },
  drawings: [],
};

console.log('\n  un circuito de treinta metros en un campo de ciento cinco\n');

{
  const antes = ocupacion(circuito, VIEW_INICIAL);
  comprueba(
    'con el campo entero, la jugada es un sello',
    antes.porcentaje < 12,
    `${antes.porcentaje.toFixed(1)} % del lienzo`,
  );

  const vista = encuadraJugada(circuito);
  const despues = ocupacion(circuito, vista);
  comprueba(
    'ajustada a la jugada, ocupa muchísimo más',
    despues.porcentaje > antes.porcentaje * 4,
    `${antes.porcentaje.toFixed(1)} % → ${despues.porcentaje.toFixed(1)} %`,
  );
  comprueba('y queda centrada', despues.centrada);
  comprueba('sin que se salga nada por los bordes', despues.dentro);
  comprueba('con aire alrededor, no pegada al borde', despues.porcentaje < 92,
    `${despues.porcentaje.toFixed(1)} %`);
}

console.log('\n  y no hace tonterías\n');

{
  /* Una jugada que YA ocupa el campo entero no se puede agrandar más: el
     mínimo es el campo, nunca se aleja por debajo. */
  const todoElCampo = {
    ...circuito,
    tracks: {
      a: [{ t: 0, x: 2, y: 2 }, { t: 2000, x: 103, y: 66, move: 'carrera' }],
      b: [{ t: 0, x: 103, y: 2 }], c: [{ t: 0, x: 2, y: 66 }], k: [{ t: 0, x: 52, y: 34 }],
    },
  };
  comprueba('una jugada que ocupa el campo entero no se aleja', encuadraJugada(todoElCampo).s >= 1,
    `s = ${encuadraJugada(todoElCampo).s.toFixed(2)}`);

  /* Un campo vacío no se encuadra. */
  const vacio = { ...circuito, objects: [], tracks: {} };
  const v = encuadraJugada(vacio);
  comprueba('un campo vacío se queda como está',
    v.s === 1 && v.tx === 0 && v.ty === 0);

  /* Una sola ficha quieta: se acerca, pero sin pasarse. */
  const sola = {
    ...circuito,
    objects: [{ id: 'a', kind: 'jugadora', label: '7' }],
    tracks: { a: [{ t: 0, x: 52, y: 34 }] },
  };
  const u = encuadraJugada(sola);
  comprueba('una ficha sola se acerca sin pasarse', u.s > 1 && u.s <= 4, `s = ${u.s.toFixed(2)}`);

  /* El recorrido entero cuenta, no sólo dónde empieza. Si sólo se mirara el
     primer fotograma, media jugada se quedaría fuera de la pantalla. */
  const largo = {
    ...circuito,
    objects: [{ id: 'a', kind: 'jugadora', label: '7' }],
    tracks: { a: [{ t: 0, x: 10, y: 34 }, { t: 3000, x: 95, y: 34, move: 'carrera' }] },
  };
  comprueba(
    'el recorrido entero cabe, no sólo el punto de salida',
    ocupacion(largo, encuadraJugada(largo)).dentro,
  );
}

console.log('\n  con el campo girado y tumbado también\n');

for (const [nombre, camara] of [
  ['vertical', { giro: 90, inclinacion: 0, zoom: 1 }],
  ['banda', { giro: 0, inclinacion: 55, zoom: 1 }],
  ['esquina', { giro: 35, inclinacion: 45, zoom: 1 }],
]) {
  const j = { ...circuito, camara };
  const antes = ocupacion(j, VIEW_INICIAL);
  const despues = ocupacion(j, encuadraJugada(j));
  comprueba(
    `${nombre}: la jugada crece y cabe entera`,
    despues.porcentaje > antes.porcentaje && despues.dentro,
    `${antes.porcentaje.toFixed(1)} % → ${despues.porcentaje.toFixed(1)} %`,
  );
}

console.log(
  fallos === 0
    ? '\n  La pantalla la llena la jugada.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
