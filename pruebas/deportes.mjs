/**
 * EL CATÁLOGO DE DEPORTES SE SOSTIENE SOLO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Desde que las posiciones y su agrupación en líneas salen de la tabla
 * `sports`, la interfaz no tiene ninguna lista escrita a mano con la que
 * cuadrar. Eso es lo que se quería —antes había tres copias y se
 * desincronizaron— pero significa que un error EN LA TABLA ya no lo caza
 * nadie: no hay compilador que mire dentro de un `jsonb`.
 *
 * Esto lo mira. Lee la tabla de verdad, con la clave pública, igual que la
 * aplicación, y comprueba lo que la interfaz da por hecho:
 *
 *   1. TODA POSICIÓN CAE EN UNA LÍNEA. Si no, esa jugador sale sin color y
 *      no entra en ningún filtro: existe pero no se puede encontrar.
 *   2. NINGUNA LÍNEA INVENTA POSICIONES. Una línea que agrupa un puesto que
 *      el deporte no ofrece es un filtro que nunca devuelve a nadie.
 *   3. NINGUNA POSICIÓN EN DOS LÍNEAS. Tendría dos colores y aparecería dos
 *      veces al filtrar.
 *   4. COMO MUCHO CUATRO LÍNEAS. El color lo pone la interfaz por el índice
 *      y la paleta tiene cuatro; con una quinta, dos líneas se pintarían
 *      igual y el color dejaría de distinguir, que es su único trabajo.
 *   5. UN DEPORTE SIN POSICIONES NO TIENE LÍNEAS, y al revés. Natación no
 *      tiene puestos; una línea allí sería una etiqueta vacía.
 *   6. LAS PALABRAS ESTÁN. Sin `player_noun` ni `match_noun` la interfaz se
 *      queda sin cómo llamar a nada.
 *
 * NO USA EL SIMULACRO. Un doble de pruebas con el catálogo bien escrito
 * pasaría siempre, y el fallo que importa vive en la fila de verdad.
 *
 * DOS MANERAS DE DARLE LAS FILAS, y las dos leen el catálogo de verdad:
 *
 *   · `SUPABASE_ANON_KEY=… node pruebas/deportes.mjs`
 *     pide la tabla, que es lo normal.
 *   · `SPORTS_JSON=volcado.json node pruebas/deportes.mjs`
 *     la lee de un archivo. Es para donde no hay salida a Supabase —el
 *     contenedor donde se escribió esto la tiene cerrada por política de
 *     red— y para poder comprobar en frío que la prueba sabe ponerse roja.
 *     El volcado se saca con un `select` y no se guarda en el repositorio:
 *     un catálogo copiado sería la cuarta lista escrita a mano.
 */

const REF = 'snywuosknlaewkynrtdc';
const SUPA = `https://${REF}.supabase.co`;

/* La clave pública, la misma que sirve el navegador. No es un secreto: viaja
   en el paquete de la portada y sólo puede leer lo que las políticas dejan. */
const CLAVE = process.env.SUPABASE_ANON_KEY ?? null;

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const ARCHIVO = process.env.SPORTS_JSON ?? null;

if (!CLAVE && !ARCHIVO) {
  console.log('');
  console.log('  Hace falta SUPABASE_ANON_KEY para leer el catálogo,');
  console.log('  o SPORTS_JSON apuntando a un volcado de la tabla.');
  console.log('');
  process.exit(2);
}

let deportes;
if (ARCHIVO) {
  const { readFileSync } = await import('node:fs');
  deportes = JSON.parse(readFileSync(ARCHIVO, 'utf8'));
  console.log(`\n  (leído de ${ARCHIVO}, no de la base)`);
} else {
  const res = await fetch(
    `${SUPA}/rest/v1/sports?select=code,name,player_noun,player_noun_pl,match_noun,match_noun_pl,positions,lines&order=orden`,
    { headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` } },
  );
  if (!res.ok) {
    console.log(`\n  No se ha podido leer la tabla: ${res.status} ${res.statusText}\n`);
    process.exit(1);
  }
  deportes = await res.json();
}

console.log('');
console.log(`  ${deportes.length} deportes en el catálogo`);
console.log('');

comprueba('hay deportes', deportes.length > 0, `${deportes.length}`);

for (const d of deportes) {
  console.log(`  ${d.name}`);

  const posiciones = d.positions ?? [];
  const lineas = d.lines ?? [];
  const enLineas = lineas.flatMap((l) => l.positions ?? []);

  comprueba('tiene cómo llamar a quien juega',
    Boolean(d.player_noun && d.player_noun_pl), `${d.player_noun} / ${d.player_noun_pl}`);
  comprueba('tiene cómo llamar a un encuentro',
    Boolean(d.match_noun && d.match_noun_pl), `${d.match_noun} / ${d.match_noun_pl}`);

  if (posiciones.length === 0) {
    comprueba('sin posiciones, sin líneas', lineas.length === 0,
      lineas.length === 0 ? 'ninguna, como debe ser' : `tiene ${lineas.length}`);
    continue;
  }

  comprueba('con posiciones, tiene líneas', lineas.length > 0, `${lineas.length}`);
  comprueba('no pasa de cuatro líneas', lineas.length <= 4, `${lineas.length}`);

  const huerfanas = posiciones.filter((p) => !enLineas.includes(p));
  comprueba('toda posición cae en una línea',
    huerfanas.length === 0, huerfanas.length ? huerfanas.join(', ') : `las ${posiciones.length}`);

  const inventadas = enLineas.filter((p) => !posiciones.includes(p));
  comprueba('ninguna línea inventa posiciones',
    inventadas.length === 0, inventadas.length ? inventadas.join(', ') : 'ninguna');

  const repetidas = enLineas.filter((p, i) => enLineas.indexOf(p) !== i);
  comprueba('ninguna posición en dos líneas',
    repetidas.length === 0, repetidas.length ? [...new Set(repetidas)].join(', ') : 'ninguna');

  const sinNombre = lineas.filter((l) => !l.id || !l.label);
  comprueba('cada línea tiene identificador y nombre',
    sinNombre.length === 0, sinNombre.length ? `${sinNombre.length} a medias` : `${lineas.length} completas`);
}

console.log('');
if (fallos > 0) {
  console.log(`  ✗ ${fallos} ${fallos === 1 ? 'cosa' : 'cosas'} que la interfaz da por hecho y la tabla no cumple.`);
  process.exit(1);
}
console.log('  ✓ El catálogo cuadra: cada posición tiene su línea y cada línea sus posiciones.');
