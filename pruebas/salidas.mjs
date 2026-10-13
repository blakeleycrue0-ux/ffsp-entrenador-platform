/**
 * CUÁNDO SALE CADA UNA: RETRASAR ES RETRASAR, NO CORRER MÁS.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `circuito.mjs` ya comprobaba que una ficha cuyo primer fotograma está en el
 * segundo 2 se queda quieta hasta el segundo 2. Eso seguía siendo verdad. Lo
 * que no comprobaba nadie es QUÉ PASA AL MOVER EL MANDO, y ahí estaba el
 * fallo que se veía en la pizarra:
 *
 * 1 · «Sale en» movía el primer fotograma con `patchKeyframe`, que sujeta
 *     cada fotograma dentro de su hueco —el techo del primero es el segundo
 *     menos dos décimas—. Así que arrastrarlo no retrasaba la salida:
 *     ACORTABA LA CARRERA. La jugadora llegaba al cono a la misma hora,
 *     corriendo el doble de rápido. En un circuito eso es justo lo contrario
 *     de lo que se pide.
 *
 * 2 · Y el mando pedía un número de milisegundos a ojo. Un circuito se piensa
 *     en orden —«ésta sale cuando la anterior llegue»—, y además el número
 *     se quedaba viejo: bastaba alargar el recorrido de la primera para que
 *     todas las demás saliesen antes de tiempo.
 *
 *   node pruebas/salidas.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'salidas-'));
const salida = join(dir, 'scene.mjs');
execFileSync('npx', ['esbuild', 'src/features/board/scene.ts', '--bundle', '--format=esm',
  `--outfile=${salida}`, '--log-level=error'], { stdio: 'inherit' });
const {
  sampleScene, moveTrack, patchKeyframe, setSalida, reajustaSalidas, puedeEsperar,
  tramoDeTrack, duracionDeTrack, moveObject,
} = await import(salida);

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ══════════════════════════════════════════════════════════════════════════
   LA JUGADA: tres jugadoras en fila india, el circuito más corriente que hay.
   Tal como nacen todas al dibujarlas: las tres arrancando en el segundo 0.
   ══════════════════════════════════════════════════════════════════════════ */
const base = {
  version: 1,
  pitch: 'completo',
  durationMs: 10000,
  objects: [
    { id: 'ana', kind: 'jugadora', label: '7' },
    { id: 'bea', kind: 'jugadora', label: '9' },
    { id: 'cris', kind: 'jugadora', label: '11' },
  ],
  tracks: {
    ana: [{ t: 0, x: 20, y: 34 }, { t: 2000, x: 50, y: 34, move: 'carrera' }],
    bea: [{ t: 0, x: 20, y: 30 }, { t: 2000, x: 50, y: 30, move: 'carrera' }],
    cris: [{ t: 0, x: 20, y: 26 }, { t: 2000, x: 50, y: 26, move: 'carrera' }],
  },
  drawings: [],
};

console.log('\n  esto es lo que hacía el mando de antes\n');

/* El fallo, medido. No se arregla `patchKeyframe` —hace bien su trabajo, que
   es mover un fotograma sin pisar a los vecinos—: lo que estaba mal era
   usarlo para retrasar una salida. */
{
  const viejo = patchKeyframe(base, 'bea', 0, { t: 1500 });
  const tr = viejo.tracks.bea;
  comprueba(
    'la ficha sí sale más tarde, eso funcionaba',
    tr[0].t === 1500,
  );
  comprueba(
    'pero la carrera se ha encogido a la cuarta parte',
    duracionDeTrack(tr) === 500,
    `${duracionDeTrack(tr)} ms, cuando duraba 2000`,
  );
  comprueba(
    'llegando a la misma hora que antes: no se ha retrasado, ha corrido más',
    tr[tr.length - 1].t === 2000,
  );
}

console.log('\n  retrasar una ficha mueve su recorrido entero\n');

{
  const tarde = moveTrack(base, 'bea', 1500);
  const tr = tarde.tracks.bea;
  comprueba('sale cuando se le ha pedido', tr[0].t === 1500);
  comprueba('la carrera dura lo mismo que antes', duracionDeTrack(tr) === 2000, `${duracionDeTrack(tr)} ms`);
  comprueba('y llega 1,5 s más tarde', tr[tr.length - 1].t === 3500);

  comprueba(
    'en el segundo 1 todavía no se ha movido',
    dist(sampleScene(tarde, 1000).bea, { x: 20, y: 30 }) < 0.01,
  );
  comprueba(
    'a mitad de su carrera va por la mitad del camino',
    Math.abs(sampleScene(tarde, 2500).bea.x - 35) < 0.5,
    `x = ${sampleScene(tarde, 2500).bea.x.toFixed(1)}`,
  );
}

/* No se puede empujar un recorrido fuera de la jugada: lo que no se ve no
   sirve de nada. */
{
  const pasada = moveTrack(base, 'bea', 99000);
  comprueba(
    'y no se la puede empujar fuera de la jugada',
    tramoDeTrack(pasada.tracks.bea).termina === 10000,
    `termina en ${tramoDeTrack(pasada.tracks.bea).termina} de 10000`,
  );
}

console.log('\n  «sale cuando llegue la anterior»\n');

{
  let j = setSalida(base, 'bea', { tras: 'ana' });
  comprueba(
    'Bea sale justo cuando Ana llega',
    tramoDeTrack(j.tracks.bea).sale === tramoDeTrack(j.tracks.ana).termina,
    `Bea en ${tramoDeTrack(j.tracks.bea).sale}, Ana llega en ${tramoDeTrack(j.tracks.ana).termina}`,
  );

  j = setSalida(j, 'cris', { tras: 'bea', espera: 500 });
  comprueba(
    'y Cris medio segundo después de Bea: la cadena se resuelve entera',
    tramoDeTrack(j.tracks.cris).sale === 4500,
    `${tramoDeTrack(j.tracks.cris).sale} ms`,
  );
  comprueba(
    'las tres salen escalonadas y no a la vez',
    new Set(['ana', 'bea', 'cris'].map((id) => tramoDeTrack(j.tracks[id]).sale)).size === 3,
    ['ana', 'bea', 'cris'].map((id) => tramoDeTrack(j.tracks[id]).sale).join(' · '),
  );

  /* Lo que de verdad se ve en el campo: en el segundo 1 sólo corre una. */
  const enMarcha = (escena, t) => ['ana', 'bea', 'cris'].filter((id) => {
    const a = sampleScene(escena, t - 50)[id];
    const b = sampleScene(escena, t + 50)[id];
    return dist(a, b) > 0.05;
  });
  comprueba(
    'en el segundo 1 sólo se mueve Ana',
    enMarcha(j, 1000).join() === 'ana',
    enMarcha(j, 1000).join(' · ') || 'ninguna',
  );
  comprueba(
    'en el segundo 3 sólo se mueve Bea',
    enMarcha(j, 3000).join() === 'bea',
    enMarcha(j, 3000).join(' · ') || 'ninguna',
  );
  comprueba(
    'y antes del arreglo se movían las tres a la vez',
    enMarcha(base, 1000).length === 3,
    `${enMarcha(base, 1000).length} en marcha en el segundo 1`,
  );

  /* ─────────────────────────────────────────────────────────────────────────
     Y AQUÍ ESTÁ LA DIFERENCIA ENTRE GUARDAR UN NÚMERO Y GUARDAR EL ORDEN.
     Se alarga la carrera de Ana. Con un número a ojo, Bea saldría antes de
     que Ana llegase y el circuito quedaría descuadrado sin tocarlo. */
  const masLarga = {
    ...j,
    tracks: { ...j.tracks, ana: [{ t: 0, x: 20, y: 34 }, { t: 3500, x: 50, y: 34, move: 'carrera' }] },
  };
  const recolocada = reajustaSalidas(masLarga);
  comprueba(
    'si se alarga la carrera de Ana, Bea se va detrás sola',
    tramoDeTrack(recolocada.tracks.bea).sale === 3500,
    `${tramoDeTrack(recolocada.tracks.bea).sale} ms`,
  );
  comprueba(
    'y Cris detrás de Bea, con su medio segundo',
    tramoDeTrack(recolocada.tracks.cris).sale === 6000,
    `${tramoDeTrack(recolocada.tracks.cris).sale} ms`,
  );
  comprueba(
    'recolocar dos veces no la mueve dos veces',
    tramoDeTrack(reajustaSalidas(recolocada).tracks.cris).sale === 6000,
  );
}

console.log('\n  tocar una ficha retrasada no le borra el retraso\n');

/* ═══════════════════════════════════════════════════════════════════════════
   EL FOTOGRAMA QUE APARECÍA SOLO.
   ═══════════════════════════════════════════════════════════════════════════
   Retrasar funcionaba, y aun así «no funciona, lo tengo que eliminar, es como
   que se pone solo». Tenía razón y era esto: con una ficha que sale en el
   segundo 2, bastaba con arrastrarla con el cabezal en el cero —recolocarla
   un metro, lo primero que hace cualquiera— para que se le metiera un
   fotograma NUEVO en el cero. La pista pasaba de [2000, 4000] a
   [0, 2000, 4000] y volvía a arrancar desde el principio.

   Lo peor no era el fallo, era que no se veía: el mando seguía diciendo lo
   que se había puesto, y había aparecido un fotograma que nadie pidió.
   ═══════════════════════════════════════════════════════════════════════════ */
{
  const tarde = moveTrack(base, 'bea', 2000);
  const tocada = moveObject(tarde, 'bea', 0, { x: 25, y: 31 });

  comprueba(
    'arrastrarla en el segundo 0 NO le añade un fotograma',
    tocada.tracks.bea.length === 2,
    tocada.tracks.bea.map((k) => k.t).join(' · '),
  );
  comprueba(
    'y sigue saliendo cuando se le dijo',
    tramoDeTrack(tocada.tracks.bea).sale === 2000,
    `${tramoDeTrack(tocada.tracks.bea).sale} ms`,
  );
  comprueba(
    'lo que sí se mueve es de dónde sale: el recorrido entero se traslada',
    Math.abs(tocada.tracks.bea[0].x - 25) < 0.01
      && Math.abs(tocada.tracks.bea[1].x - 55) < 0.01,
    `sale de x=${tocada.tracks.bea[0].x}, llega a x=${tocada.tracks.bea[1].x}`,
  );

  /* Con «cuando llegue Ana» puesto, igual: ni fotograma de más ni descuadre. */
  const encadenada = setSalida(base, 'bea', { tras: 'ana' });
  const tocada2 = reajustaSalidas(moveObject(encadenada, 'bea', 0, { x: 25, y: 31 }));
  comprueba(
    'con «cuando llegue Ana» tampoco',
    tocada2.tracks.bea.length === 2 && tramoDeTrack(tocada2.tracks.bea).sale === 2000,
    tocada2.tracks.bea.map((k) => k.t).join(' · '),
  );

  /* Y DESPUÉS de salir sí se anima, que es lo que se pide ahí: arrastrarla a
     mitad de carrera tiene que doblar el recorrido, no trasladarlo. */
  const aMitad = moveObject(tarde, 'bea', 3000, { x: 40, y: 20 });
  comprueba(
    'pero a mitad de carrera sí crea un fotograma, que es lo que se pide ahí',
    aMitad.tracks.bea.length === 3,
    aMitad.tracks.bea.map((k) => k.t).join(' · '),
  );
}

console.log('\n  nadie se espera a sí mismo\n');

{
  comprueba('una ficha no puede esperarse a sí misma', !puedeEsperar(base, 'ana', 'ana'));

  const j = setSalida(setSalida(base, 'bea', { tras: 'ana' }), 'cris', { tras: 'bea' });
  comprueba('Ana no puede esperar a Cris, que ya espera a Bea', !puedeEsperar(j, 'ana', 'cris'));
  comprueba('pero Ana sí podría esperar a una suelta', puedeEsperar(base, 'ana', 'bea'));

  /* Una cadena cerrada a mano no congela la jugada ni se queda dando vueltas. */
  const rota = {
    ...j,
    objects: j.objects.map((o) => (o.id === 'ana' ? { ...o, salida: { tras: 'cris' } } : o)),
  };
  const sobrevive = reajustaSalidas(rota);
  comprueba('y una cadena cerrada a mano no cuelga ni borra la jugada', !!sobrevive.tracks.ana);

  /* Esperar a una ficha borrada deja el recorrido donde estaba. */
  const huerfana = {
    ...base,
    objects: base.objects.map((o) => (o.id === 'bea' ? { ...o, salida: { tras: 'fantasma' } } : o)),
  };
  comprueba(
    'esperar a una ficha que ya no está deja el recorrido como estaba',
    tramoDeTrack(reajustaSalidas(huerfana).tracks.bea).sale === 0,
  );
}

console.log(
  fallos === 0
    ? '\n  Retrasar retrasa, y el circuito se recoloca solo.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
