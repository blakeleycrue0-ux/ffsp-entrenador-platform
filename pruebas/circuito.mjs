/**
 * UN CIRCUITO: EL BALÓN VA CON QUIEN LO LLEVA Y CADA UNA SALE CUANDO LE TOCA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Las dos cosas que hacían imposible montar un circuito en la pizarra, y las
 * dos se miden aquí sobre las posiciones de verdad de la jugada en cada
 * instante — no sobre lo que diga un botón.
 *
 * 1 · EL BALÓN SE QUEDABA CLAVADO. «Conducción» existía, pero sólo cambiaba el
 *     trazo de la estela: la jugadora salía corriendo y el balón se quedaba
 *     donde estaba. Para llevárselo había que animar el balón aparte, con su
 *     propio recorrido, cuadrando los tiempos a mano para que no se separasen.
 *     Y en cuanto alguien tocaba una de las dos duraciones, se separaban.
 *
 * 2 · TODO EL MUNDO ARRANCABA EN EL SEGUNDO CERO. Se podía decir cuándo LLEGA
 *     un movimiento, pero no cuándo SALE: el primer fotograma estaba clavado
 *     en cero. Un circuito es exactamente lo contrario —una sale, llega al
 *     cono, y entonces sale la siguiente— y no había forma de escribirlo.
 *
 * Esto no abre un navegador: son las funciones que calculan la jugada, que es
 * donde está la lógica. Una prueba de pantalla aquí tardaría veinte veces más
 * y comprobaría menos.
 *
 *   node pruebas/circuito.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/* El código de la jugada está en TypeScript. Se compila a un archivo suelto
   con `esbuild` —que ya viene con Vite— y se importa. Así la prueba usa EL
   MISMO código que la aplicación, no una copia. */
const dir = mkdtempSync(join(tmpdir(), 'circuito-'));
const salida = join(dir, 'scene.mjs');
execFileSync('npx', ['esbuild', 'src/features/board/scene.ts', '--bundle', '--format=esm',
  `--outfile=${salida}`, '--log-level=error'], { stdio: 'inherit' });
const { sampleScene } = await import(salida);

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ══════════════════════════════════════════════════════════════════════════
   LA JUGADA: dos jugadoras y un balón.

   · ANA lleva el balón de (20,34) a (50,34) entre el segundo 0 y el 2. El
     tramo es una CONDUCCIÓN, así que el balón tiene que ir con ella.
   · BEA no sale hasta el segundo 2 —cuando Ana llega— y corre hasta el 4.
     Su primer fotograma está en 2000, no en cero: eso es el relevo.
   ══════════════════════════════════════════════════════════════════════════ */
const jugada = {
  pitch: 'f11',
  durationMs: 4000,
  objects: [
    { id: 'ana', kind: 'jugadora', label: '7' },
    { id: 'bea', kind: 'jugadora', label: '9' },
    { id: 'bal', kind: 'balon', label: '' },
  ],
  tracks: {
    ana: [
      { t: 0, x: 20, y: 34 },
      { t: 2000, x: 50, y: 34, move: 'conduccion' },
    ],
    bea: [
      { t: 2000, x: 50, y: 10 },
      { t: 4000, x: 80, y: 10, move: 'carrera' },
    ],
    bal: [{ t: 0, x: 20, y: 34 }],
  },
  drawings: [],
};

console.log('\n  el balón va con quien lo conduce\n');

for (const t of [0, 500, 1000, 1500, 2000]) {
  const p = sampleScene(jugada, t);
  comprueba(
    `en el segundo ${(t / 1000).toFixed(1)} el balón está pegado a Ana`,
    dist(p.ana, p.bal) < 1.2,
    `${dist(p.ana, p.bal).toFixed(2)} m`,
  );
}

/* Y no se queda atrás: a mitad del recorrido tiene que haberse movido de
   verdad, no seguir en el punto de salida. */
{
  const medio = sampleScene(jugada, 1000);
  comprueba(
    'y ha avanzado con ella, no se ha quedado en la salida',
    medio.bal.x > 30,
    `x = ${medio.bal.x.toFixed(1)} (salió de 20)`,
  );
}

console.log('\n  cada una sale cuando le toca\n');

{
  const alPrincipio = sampleScene(jugada, 0);
  const justoAntes = sampleScene(jugada, 1900);
  const alFinal = sampleScene(jugada, 4000);

  comprueba(
    'Bea no se ha movido en el segundo 0',
    dist(alPrincipio.bea, { x: 50, y: 10 }) < 0.01,
    `${alPrincipio.bea.x.toFixed(1)}, ${alPrincipio.bea.y.toFixed(1)}`,
  );
  comprueba(
    'Bea sigue quieta justo antes de que llegue Ana',
    dist(justoAntes.bea, { x: 50, y: 10 }) < 0.01,
    `${justoAntes.bea.x.toFixed(1)}, ${justoAntes.bea.y.toFixed(1)}`,
  );
  comprueba(
    'y al final ha hecho su recorrido entero',
    dist(alFinal.bea, { x: 80, y: 10 }) < 0.01,
    `${alFinal.bea.x.toFixed(1)}, ${alFinal.bea.y.toFixed(1)}`,
  );
  comprueba(
    'Ana ya había llegado cuando Bea salió',
    dist(sampleScene(jugada, 2000).ana, { x: 50, y: 34 }) < 0.01,
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Y EL PASE MANDA SOBRE LA CONDUCCIÓN.
   Si el balón tiene recorrido propio en ese tramo, sale disparado y deja de
   ir pegado: es justo el instante en que una conducción se convierte en pase,
   y tiene que poder contarse.
   ══════════════════════════════════════════════════════════════════════════ */
console.log('\n  un pase rompe la conducción\n');
{
  const conPase = {
    ...jugada,
    tracks: {
      ...jugada.tracks,
      bal: [
        { t: 0, x: 20, y: 34 },
        { t: 1000, x: 20, y: 34 },
        { t: 1600, x: 20, y: 60, move: 'pase' },
      ],
    },
  };
  const durante = sampleScene(conPase, 1500);
  comprueba(
    'mientras va el pase, el balón NO está pegado a Ana',
    dist(durante.ana, durante.bal) > 5,
    `${dist(durante.ana, durante.bal).toFixed(1)} m de separación`,
  );
  comprueba(
    'y el pase llega a donde se dibujó',
    dist(sampleScene(conPase, 1600).bal, { x: 20, y: 60 }) < 0.01,
  );
}

console.log(
  fallos === 0
    ? '\n  El balón va con quien lo lleva, y cada una sale cuando le toca.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
