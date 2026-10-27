/**
 * UN CLUB QUE NO ES DE FÚTBOL VE SUS PROPIOS PUESTOS.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Playoff360 dice servir para cualquier deporte, y durante un tiempo eso fue
 * medio verdad: el alta dejaba elegir entre diez deportes y lo guardaba, pero
 * de ahí no salía. La plantilla seguía ofreciendo portero, lateral derecho y
 * delantero porque las posiciones estaban escritas a mano en tres sitios del
 * código. Un club de baloncesto elegía «Baloncesto», entraba, y se encontraba
 * un formulario de fútbol.
 *
 * Esto lo comprueba desde fuera, que es como se ve: se sirve un club de
 * baloncesto y se mira lo que sale en pantalla.
 *
 *   · el desplegable de posición ofrece base, escolta, alero, ala-pívot y
 *     pívot, y NINGÚN puesto de fútbol;
 *   · los filtros de la plantilla son las líneas del baloncesto —exterior,
 *     alero, interior— y no portería/defensa/medio/ataque;
 *   · filtrar por una línea deja sólo a quien juega ahí;
 *   · y un deporte sin puestos —natación— no enseña ni filtro ni posiciones,
 *     en vez de enseñar una lista vacía o, peor, la de fútbol.
 *
 * LA ÚLTIMA ES LA QUE MÁS IMPORTA. El deporte de reserva que usa la
 * aplicación cuando no reconoce el código no tiene posiciones a propósito:
 * si alguien le pusiera ahí una lista de fútbol «por si acaso», esta prueba
 * es la que se daría cuenta.
 *
 *   npm run build && npm run preview
 *   node pruebas/multideporte.mjs
 */
import { chromium } from 'playwright';
import { mock, USER, CLUB, PLAYERS, TEAMS } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const BALONCESTO = {
  code: 'baloncesto', name: 'Baloncesto',
  player_noun: 'jugador', player_noun_pl: 'jugadores',
  match_noun: 'partido', match_noun_pl: 'partidos',
  positions: ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot'],
  lines: [
    { id: 'exterior', label: 'Exterior', positions: ['Base', 'Escolta'] },
    { id: 'alero', label: 'Alero', positions: ['Alero'] },
    { id: 'interior', label: 'Interior', positions: ['Ala-pívot', 'Pívot'] },
  ],
  squad_size: 12, on_field: 5, match_minutes: 40, orden: 30,
};

const NATACION = {
  code: 'natacion', name: 'Natación',
  player_noun: 'nadador', player_noun_pl: 'nadadores',
  match_noun: 'competición', match_noun_pl: 'competiciones',
  positions: [], lines: [],
  squad_size: null, on_field: null, match_minutes: null, orden: 90,
};

const PUESTOS_DE_FUTBOL = ['Portero', 'Lateral derecho', 'Mediapunta', 'Delantero'];

/* Cinco jugadores con puestos de baloncesto, repartidos por las tres líneas. */
const PLANTILLA_BALONCESTO = ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot']
  .map((position, i) => ({ ...PLAYERS[i], position, secondary_position: null }));

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/** Abre la aplicación como un club del deporte que se le diga. */
async function comoClubDe(deporte, players = PLANTILLA_BALONCESTO) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await mock(page, {
    deportesDelClub: [deporte],
    players,
    club: {
      role: 'admin',
      clubs: {
        id: CLUB, name: 'Club de ejemplo', short_name: 'CE', city: 'Palma',
        season: '2026/27', crest_url: null, sport: deporte.code,
      },
    },
    equipos: [{ ...TEAMS[0], sport: deporte.code }],
  });
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  return { ctx, page };
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · La ficha ofrece los puestos del deporte
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  la ficha, en un club de baloncesto');
  const { ctx, page } = await comoClubDe(BALONCESTO);
  await page.goto(`${BASE}/app/plantilla/nueva`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const opciones = await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')]
      .find((s) => [...s.options].some((o) => /Sin definir/.test(o.textContent)));
    return sel ? [...sel.options].map((o) => o.textContent.trim()) : null;
  });

  comprueba('hay desplegable de posición', Boolean(opciones), opciones ? `${opciones.length} opciones` : 'no se encuentra');
  if (opciones) {
    const faltan = BALONCESTO.positions.filter((p) => !opciones.includes(p));
    comprueba('ofrece los cinco puestos del baloncesto', faltan.length === 0,
      faltan.length ? `faltan ${faltan.join(', ')}` : BALONCESTO.positions.join(', '));

    const coladas = PUESTOS_DE_FUTBOL.filter((p) => opciones.includes(p));
    comprueba('y ninguno de fútbol', coladas.length === 0,
      coladas.length ? `aparecen ${coladas.join(', ')}` : 'ninguno');
  }
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · Los filtros de la plantilla son las líneas del deporte
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  los filtros de la plantilla');
  const { ctx, page } = await comoClubDe(BALONCESTO);
  await page.goto(`${BASE}/app/plantilla`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const filtro = await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')]
      .find((s) => [...s.options].some((o) => /Cualquier puesto/.test(o.textContent)));
    return sel ? [...sel.options].map((o) => ({ v: o.value, t: o.textContent.trim() })) : null;
  });

  comprueba('hay filtro de puesto', Boolean(filtro));
  if (filtro) {
    const etiquetas = filtro.map((o) => o.t);
    for (const l of BALONCESTO.lines) {
      comprueba(`está la línea «${l.label}»`, etiquetas.includes(l.label), etiquetas.join(' · '));
    }
    /* LAS DOS GRAFÍAS. Los filtros de fútbol se llamaron «Porteras,
       Defensas, Medios, Delanteras» antes de que esto saliera de la tabla;
       buscando sólo los nombres de ahora, esta comprobación pasaba en verde
       sobre el código viejo, que es lo que se supone que tiene que cazar. */
    const futbol = ['Portería', 'Porteras', 'Defensa', 'Defensas', 'Medio', 'Medios', 'Ataque', 'Delanteras']
      .filter((l) => etiquetas.includes(l));
    comprueba('y ninguna línea de fútbol', futbol.length === 0,
      futbol.length ? `aparecen ${futbol.join(', ')}` : 'ninguna');
  }

  /* Y que el filtro FILTRE: «Interior» son ala-pívot y pívot, dos de cinco.
     Si la opción no existe no se espera a que aparezca: se cuenta como
     fallo y se sigue. Una prueba que revienta con un tiempo agotado deja sin
     ejecutar todo lo que venía detrás. */
  const hayInterior = await page.evaluate(() =>
    [...document.querySelectorAll('option')].some((o) => o.value === 'interior'));
  if (!hayInterior) {
    comprueba('filtrar por Interior deja a los dos de dentro', false, 'no existe esa línea');
  } else {
    await page.selectOption('select:has(option[value="interior"])', 'interior');
    await page.waitForTimeout(400);
    const visibles = await page.evaluate(() =>
      [...document.querySelectorAll('main')].map((m) => m.innerText).join('\n'));
    comprueba('filtrar por Interior deja a los dos de dentro',
      /Ala-pívot/.test(visibles) && /Pívot/.test(visibles) && !/Escolta/.test(visibles),
      visibles.includes('Escolta') ? 'sigue saliendo un escolta' : 'sólo los interiores');
  }

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Un deporte sin puestos no se los inventa
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  natación, que no tiene puestos');
  const sinPuestos = PLAYERS.slice(0, 4).map((p) => ({ ...p, position: null, secondary_position: null }));
  const { ctx, page } = await comoClubDe(NATACION, sinPuestos);

  await page.goto(`${BASE}/app/plantilla`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const hayFiltro = await page.evaluate(() =>
    [...document.querySelectorAll('select')].some((s) =>
      [...s.options].some((o) => /Cualquier puesto/.test(o.textContent))));
  comprueba('no hay filtro de puesto', !hayFiltro);

  const hayLineaDeFutbol = await page.evaluate(() =>
    /Portería|Delantero|Lateral derecho/.test(document.body.innerText));
  comprueba('ni rastro de puestos de fútbol', !hayLineaDeFutbol);

  await page.goto(`${BASE}/app/plantilla/nueva`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const opciones = await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')]
      .find((s) => [...s.options].some((o) => /Sin definir/.test(o.textContent)));
    return sel ? [...sel.options].map((o) => o.textContent.trim()) : null;
  });
  comprueba('la ficha no ofrece ningún puesto',
    Boolean(opciones) && opciones.length === 1 && /Sin definir/.test(opciones[0]),
    opciones ? opciones.join(' · ') : 'no hay desplegable');

  await ctx.close();
}

await navegador.close();

console.log('');
if (fallos > 0) {
  console.log(`  ✗ ${fallos} ${fallos === 1 ? 'cosa' : 'cosas'} que siguen siendo de fútbol.\n`);
  process.exit(1);
}
console.log('  Cada club ve los puestos de SU deporte, y quien no tiene, ninguno.\n');
