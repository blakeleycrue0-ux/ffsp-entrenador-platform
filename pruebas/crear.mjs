/**
 * ¿SE PUEDE CREAR UN ENTRENAMIENTO?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esta prueba existe por una queja concreta y bien fundada: «no me deja crear
 * un entrenamiento, y me dice ve a crear, le doy a crear, crear evento, no me
 * deja». Tenía razón tres veces:
 *
 *  1. El calendario tenía un botón «Nuevo evento» que no creaba nada: sacaba
 *     un aviso mandando al menú de «Crear».
 *  2. En ese menú, la opción «Evento» traía otra vez al calendario. Círculo
 *     cerrado, y ninguna de las dos pantallas dejaba escribir nada.
 *  3. Y el formulario de entrenamiento exigía al menos un ejercicio para
 *     guardar. Un club recién creado no tiene ninguno: era imposible.
 *
 * Y una cuarta cosa que faltaba: meter treinta entrenamientos de una vez,
 * desde el horario del equipo o desde un archivo de calendario.
 *
 * LO QUE SE COMPRUEBA ES QUE SE ESCRIBE EN LA BASE DE DATOS, no que haya un
 * botón bonito. Cada caso mira las peticiones que salen: si no sale un POST a
 * `sessions`, no se ha creado nada, diga lo que diga la pantalla.
 *
 *   npm run build && npm run preview
 *   node pruebas/crear.mjs
 */
import { chromium } from 'playwright';
import { mock, j, TEAMS, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

/* Un equipo con horario de verdad: martes y jueves. El del mock no tiene
   ninguno, y sin horario la mitad de esta pantalla no se puede probar. */
const EQUIPOS = [
  {
    ...TEAMS[0],
    training_slots: [
      { weekday: 2, start: '18:00', end: '19:30', venue: 'Campo Municipal' },
      { weekday: 4, start: '18:30', end: '20:00', venue: 'Campo Municipal' },
    ],
  },
  TEAMS[1],
];

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/**
 * Abre la aplicación y devuelve la página junto con `escrituras`, donde se van
 * apuntando los entrenamientos que de verdad se mandan al servidor.
 */
async function abre(ruta, ancho = 1280, { ejercicios = true, sesiones } = {}) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: ancho < 500 ? 844 : 900 },
    deviceScaleFactor: 2, isMobile: ancho < 500, hasTouch: ancho < 900,
  });
  const page = await ctx.newPage();
  const escrituras = [];
  await mock(page, { equipos: EQUIPOS, ...(sesiones ? { sessions: sesiones } : {}) });

  /* Las rutas registradas después mandan sobre las del mock, así que aquí se
     atiende la ESCRITURA de entrenamientos —que el mock contesta con la lista
     de siempre— y se devuelve lo que devolvería la base: las filas creadas,
     con su identificador. */
  await page.route('**/rest/v1/sessions**', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.fallback();
    const cuerpo = JSON.parse(req.postData() ?? '[]');
    const filas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).map((f, i) => ({
      ...f, id: `nueva${escrituras.length}_${i}`, blocks: f.blocks ?? [], material: f.material ?? [],
    }));
    escrituras.push(filas);
    return route.fulfill(j(filas));
  });
  /* Sin ejercicios en la biblioteca: es el caso del club recién creado, el que
     hacía imposible guardar. */
  if (!ejercicios) await page.route('**/rest/v1/drills**', (r) => r.fulfill(j([])));

  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return { page, ctx, escrituras };
}

/* ══════════════ 1. El calendario tiene botones que crean de verdad ═════════ */
{
  console.log('\n  El calendario\n');
  const { page, ctx } = await abre('/app/calendario');

  comprueba(
    'ya no hay ningún «Nuevo evento»',
    (await page.getByRole('button', { name: /nuevo evento/i }).count()) === 0,
  );

  const entreno = page.getByRole('link', { name: /nuevo entrenamiento/i }).first();
  comprueba('hay un enlace a crear entrenamiento', await entreno.isVisible());
  comprueba(
    'y lleva al formulario',
    (await entreno.getAttribute('href')) === '/app/entrenamientos/nuevo',
    await entreno.getAttribute('href'),
  );

  const partido = page.getByRole('link', { name: /^partido$/i }).first();
  comprueba(
    'y otro a crear partido',
    (await partido.getAttribute('href')) === '/app/partidos/nuevo',
    await partido.getAttribute('href'),
  );

  /* La leyenda no puede anunciar tipos que no existen. */
  const leyenda = await page.locator('span:has-text("Convocatoria")').first().isVisible();
  comprueba('la leyenda tiene Convocatoria', leyenda);
  comprueba(
    'y no tiene Reunión ni Evento',
    (await page.locator('span', { hasText: /^Reunión$/ }).count()) === 0
    && (await page.locator('span', { hasText: /^Evento$/ }).count()) === 0,
  );

  await ctx.close();
}

/* ══════════════ 2. El horario del equipo llena el calendario ═══════════════ */
{
  console.log('\n  Muchos de una vez, desde el horario\n');
  const { page, ctx, escrituras } = await abre('/app/calendario');

  await page.getByRole('button', { name: /añadir varios/i }).first().click();
  await page.waitForTimeout(500);

  const hoja = page.getByRole('dialog');
  comprueba('se abre la hoja de importar', await hoja.isVisible());

  await hoja.getByRole('button', { name: /los días que entrenáis/i }).click();
  await page.waitForTimeout(250);
  comprueba(
    'enseña los días que ya están guardados',
    /martes a las 18:00/i.test(await hoja.textContent()),
  );

  await hoja.getByRole('button', { name: /ver lo que entraría/i }).click();
  await page.waitForTimeout(400);

  const filas = await hoja.locator('li').count();
  comprueba('sale la lista de lo que entraría', filas > 10, `${filas} filas`);

  const crear = hoja.getByRole('button', { name: /crear \d+ entrenamiento/i });
  const etiqueta = await crear.textContent();
  const cuantos = Number(etiqueta.match(/\d+/)[0]);
  comprueba('el botón dice cuántos va a crear', cuantos === filas, `${etiqueta} vs ${filas} filas`);

  /* Se quita uno de la lista: tiene que bajar la cuenta. */
  await hoja.locator('li').first().locator('button[role="checkbox"]').click();
  await page.waitForTimeout(150);
  comprueba(
    'quitar uno baja la cuenta',
    Number((await crear.textContent()).match(/\d+/)[0]) === cuantos - 1,
    await crear.textContent(),
  );

  await crear.click();
  await page.waitForTimeout(900);

  comprueba('se escribe en el servidor', escrituras.length === 1, `${escrituras.length} escrituras`);
  const filasEscritas = escrituras[0] ?? [];
  comprueba(
    'en UNA sola petición, con todos dentro',
    filasEscritas.length === cuantos - 1,
    `${filasEscritas.length} filas`,
  );
  comprueba(
    'cada una con equipo, día, hora y duración',
    filasEscritas.every((f) => f.team_id && /^\d{4}-\d{2}-\d{2}$/.test(f.date) && /^\d{2}:\d{2}$/.test(f.start_time) && f.duration > 0),
    JSON.stringify(filasEscritas[0] ?? {}),
  );
  comprueba(
    'y ningún entrenamiento se inventa ejercicios',
    filasEscritas.every((f) => Array.isArray(f.blocks) && f.blocks.length === 0),
  );
  comprueba('la hoja se cierra al acabar', (await page.getByRole('dialog').count()) === 0);

  await ctx.close();
}

/* ═══════ 2 bis. SIN NINGÚN HORARIO GUARDADO, QUE ES EL CASO NORMAL ════════ */
{
  console.log('\n  Un equipo sin horario guardado\n');
  /* Esto es lo que se encuentra cualquiera el primer día, y es lo que estaba
     roto: la opción del horario salía apagada y el único camino abierto era
     buscar un archivo .ics, que en un móvil no hay forma de conseguir. Ahora
     los días se marcan aquí mismo. */
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const escrituras = [];
  await mock(page, { equipos: [TEAMS[0], TEAMS[1]] }); // training_slots: [] en los dos
  await page.route('**/rest/v1/sessions**', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.fallback();
    const cuerpo = JSON.parse(req.postData() ?? '[]');
    const filas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).map((f, i) => ({ ...f, id: `n${i}`, blocks: [], material: [] }));
    escrituras.push(filas);
    return route.fulfill(j(filas));
  });
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app/calendario`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.getByRole('button', { name: /añadir varios/i }).first().click();
  await page.waitForTimeout(400);
  const hoja = page.getByRole('dialog');

  const opcion = hoja.getByRole('button', { name: /los días que entrenáis/i });
  comprueba('la opción de los días NO está apagada', await opcion.isEnabled());
  await opcion.click();
  await page.waitForTimeout(250);

  comprueba('pregunta qué días entrenáis', /qué días entrenáis/i.test(await hoja.textContent()));
  const letras = hoja.locator('button[aria-pressed]');
  comprueba('hay siete días que tocar', (await letras.count()) === 7, `${await letras.count()}`);

  const caja = await letras.first().boundingBox();
  comprueba('y se pueden tocar con el dedo', caja.height >= 40 && caja.width >= 32,
    `${Math.round(caja.width)}×${Math.round(caja.height)}`);

  /* Martes y jueves. */
  await hoja.getByRole('button', { name: 'martes' }).click();
  await hoja.getByRole('button', { name: 'jueves' }).click();
  await page.waitForTimeout(150);
  comprueba(
    'quedan marcados los dos',
    (await hoja.locator('button[aria-pressed="true"]').count()) === 2,
  );

  await hoja.getByRole('button', { name: /ver lo que entraría/i }).click();
  await page.waitForTimeout(400);
  const filas = await hoja.locator('li').count();
  comprueba('sale la lista de los tres meses', filas > 20, `${filas} filas`);

  await hoja.getByRole('button', { name: /crear \d+ entrenamiento/i }).click();
  await page.waitForTimeout(900);
  comprueba('y se crean sin haber tocado ningún archivo', (escrituras[0] ?? []).length === filas,
    `${(escrituras[0] ?? []).length} de ${filas}`);
  comprueba(
    'todos el día y la hora que se marcaron',
    (escrituras[0] ?? []).every((f) => f.start_time === '18:00'),
    (escrituras[0] ?? [])[0]?.start_time,
  );

  await ctx.close();
}

/* ══════════════ 3. Lo que ya está no se duplica ════════════════════════════ */
{
  console.log('\n  Sin duplicados\n');
  /* Un entrenamiento ya guardado el próximo martes a las 18:00: justo uno de
     los que generaría el horario. */
  const proximoMartes = (() => {
    const d = new Date();
    d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7 || 7));
    return d.toISOString().slice(0, 10);
  })();
  const { page, ctx } = await abre('/app/calendario', 1280, {
    sesiones: [{
      id: 'ya', team_id: 't1', date: proximoMartes, start_time: '18:00', duration: 90,
      title: 'Ya estaba', objective: '', venue: 'Campo Municipal', expected_players: 16,
      blocks: [], status: 'planificado', material: [], created_by: USER,
    }],
  });

  await page.getByRole('button', { name: /añadir varios/i }).first().click();
  await page.waitForTimeout(400);
  const hoja = page.getByRole('dialog');
  await hoja.getByRole('button', { name: /los días que entrenáis/i }).click();
  await hoja.getByRole('button', { name: /ver lo que entraría/i }).click();
  await page.waitForTimeout(400);

  comprueba('se avisa de lo que ya estaba', /ya estaba en el calendario/i.test(await hoja.textContent()));
  const marcado = await hoja.locator('li:has-text("Ya está") button[role="checkbox"]').first().getAttribute('aria-checked');
  comprueba('y viene desmarcado', marcado === 'false', `aria-checked=${marcado}`);

  const total = await hoja.locator('li').count();
  const aCrear = Number((await hoja.getByRole('button', { name: /crear \d+ entrenamiento/i }).textContent()).match(/\d+/)[0]);
  comprueba('así que se crea uno menos de los que hay', aCrear === total - 1, `${aCrear} de ${total}`);

  await ctx.close();
}

/* ══════════════ 4. Un archivo .ics de verdad ═══════════════════════════════ */
{
  console.log('\n  Desde un archivo de calendario\n');
  const { page, ctx, escrituras } = await abre('/app/calendario');

  await page.getByRole('button', { name: /añadir varios/i }).first().click();
  await page.waitForTimeout(400);
  const hoja = page.getByRole('dialog');
  await hoja.getByRole('button', { name: /un calendario que ya tienes/i }).click();
  await page.waitForTimeout(250);

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:a@club', 'DTSTART;TZID=Europe/Madrid:20261013T180000',
    'DTEND;TZID=Europe/Madrid:20261013T193000',
    'RRULE:FREQ=WEEKLY;BYDAY=TU;COUNT=3',
    'SUMMARY:Entrenamiento del Cadete A', 'LOCATION:Campo Municipal',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');

  await hoja.locator('input[type="file"]').setInputFiles({
    name: 'temporada.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics),
  });
  await page.waitForTimeout(500);

  const filas = await hoja.locator('li').count();
  comprueba('las tres repeticiones del archivo salen en la lista', filas === 3, `${filas} filas`);
  comprueba('con su título', /Entrenamiento del Cadete A/.test(await hoja.textContent()));
  comprueba('y su hora', /18:00 – 19:30/.test(await hoja.textContent()));

  /* EL TROPIEZO DE VERDAD: Google Calendar no exporta un .ics, exporta un
     .zip con el .ics dentro. Si eso sólo dice «no parece un calendario», se
     queda ahí tirado. Se vuelve al selector para probarlo. */
  await hoja.getByRole('button', { name: /^atrás$/i }).click();
  await page.waitForTimeout(250);
  await hoja.locator('input[type="file"]').setInputFiles({
    name: 'calendario.zip', mimeType: 'application/zip', buffer: Buffer.from('PK\u0003\u0004algo comprimido'),
  });
  await page.waitForTimeout(400);
  const quejaZip = await hoja.textContent();
  comprueba('un .zip se reconoce', /archivo comprimido/i.test(quejaZip));
  comprueba('y se dice qué hacer con él', /Descomprímelo/i.test(quejaZip));
  comprueba('sin ofrecer crear nada', await hoja.getByRole('button', { name: /^crear entrenamientos$/i }).isDisabled());

  /* EL SELECTOR NO PUEDE LLEVAR FILTRO: con `accept=".ics"`, en el iPhone no
     aparece ningún archivo —los deja todos en gris— y no hay manera de
     elegirlo. Fue la queja. */
  await hoja.getByRole('button', { name: /^atrás$/i }).click();
  await page.waitForTimeout(250);
  comprueba(
    'el selector de archivos no filtra por tipo',
    (await hoja.locator('input[type="file"]').getAttribute('accept')) === null,
  );

  /* Y se puede pegar el texto, que en un móvil es más fácil que encontrar un
     archivo. */
  await hoja.locator('textarea').fill(ics);
  await hoja.getByRole('button', { name: /leer lo pegado/i }).click();
  await page.waitForTimeout(400);
  comprueba('pegar el texto también vale', (await hoja.locator('li').count()) === 3,
    `${await hoja.locator('li').count()} filas`);

  /* Se vuelve atrás y se elige el bueno. */
  await hoja.getByRole('button', { name: /^atrás$/i }).click();
  await page.waitForTimeout(250);
  await hoja.locator('input[type="file"]').setInputFiles({
    name: 'temporada.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics),
  });
  await page.waitForTimeout(400);

  await hoja.getByRole('button', { name: /crear 3 entrenamiento/i }).click();
  await page.waitForTimeout(900);
  comprueba('se crean los tres', (escrituras[0] ?? []).length === 3, `${(escrituras[0] ?? []).length}`);
  comprueba(
    'con las fechas del archivo',
    (escrituras[0] ?? []).map((f) => f.date).join(' ') === '2026-10-13 2026-10-20 2026-10-27',
    (escrituras[0] ?? []).map((f) => f.date).join(' '),
  );

  await ctx.close();
}

/* ══════════ 5. Un entrenamiento se guarda SIN ejercicios ═══════════════════ */
{
  console.log('\n  El formulario, con la biblioteca vacía\n');
  const { page, ctx, escrituras } = await abre('/app/entrenamientos/nuevo', 1280, { ejercicios: false });

  comprueba(
    'no manda a arrastrar ejercicios que no existen',
    !/arrastra aquí tu primer ejercicio/i.test(await page.locator('main').textContent()),
  );
  comprueba(
    'dice que todavía no hay ninguno',
    /todavía no tienes ejercicios/i.test(await page.locator('main').textContent()),
  );

  const titulo = await page.locator('input').first().inputValue();
  comprueba('el título viene propuesto', /^Entrenamiento del /.test(titulo), titulo);

  await page.getByRole('button', { name: /^guardar$/i }).click();
  await page.waitForTimeout(900);

  comprueba(
    'no sale «la sesión está vacía»',
    !/la sesión está vacía/i.test(await page.locator('body').textContent()),
  );
  comprueba('se guarda de verdad', escrituras.length === 1, `${escrituras.length} escrituras`);
  const fila = escrituras[0]?.[0] ?? {};
  comprueba('con duración, no con cero', fila.duration === 90, `duration=${fila.duration}`);
  comprueba('y con el equipo puesto', fila.team_id === 't1', `team_id=${fila.team_id}`);

  await ctx.close();
}

/* ══════════ 6. La fecha del día vacío llega al formulario ══════════════════ */
{
  console.log('\n  Del día vacío al formulario\n');
  const { page, ctx } = await abre('/app/entrenamientos/nuevo?fecha=2027-03-09');
  const fecha = await page.locator('input[type="date"]').first().inputValue();
  comprueba('el formulario llega con el día puesto', fecha === '2027-03-09', fecha);
  const titulo = await page.locator('input').first().inputValue();
  comprueba('y el título es de ese día', /martes/i.test(titulo), titulo);
  await ctx.close();
}

/* ══════════ 7. El menú de crear no da vueltas ══════════════════════════════ */
{
  console.log('\n  El menú de «Crear»\n');
  const { page, ctx } = await abre('/app');

  await page.getByRole('button', { name: /^crear$/i }).first().click();
  await page.waitForTimeout(400);
  const hoja = page.getByRole('dialog');
  const texto = await hoja.textContent();

  comprueba('ya no hay una opción «Evento» que no crea nada', !/Reunión, charla/.test(texto));
  comprueba('y sí una para meter varios entrenamientos', /Varios entrenamientos/.test(texto));

  await hoja.getByRole('button', { name: /varios entrenamientos/i }).click();
  await page.waitForTimeout(900);
  comprueba('que abre la hoja de importar', (await page.getByRole('dialog').count()) === 1
    && /los días que entrenáis/i.test(await page.getByRole('dialog').textContent()));
  comprueba(
    'y la dirección queda limpia para que recargar no la vuelva a abrir',
    !page.url().includes('importar'),
    page.url(),
  );

  await ctx.close();
}

/* ══════════ 8. Lo que el importar deja: sesiones sin ejercicios ════════════ */
{
  console.log('\n  Una sesión recién metida en el calendario\n');
  /* Es lo que crea el importar, en cantidad: hueco reservado y nada dentro.
     Si esas pantallas se ven como un error, importar la temporada deja la
     aplicación llena de errores aparentes. */
  const SIN_BLOQUES = [{
    id: 'vacia', team_id: 't1', date: '2027-03-09', start_time: '18:00', duration: 90,
    title: 'Entrenamiento del martes', objective: '', venue: 'Campo Municipal',
    expected_players: 16, blocks: [], status: 'planificado', material: [], created_by: USER,
  }];

  const lista = await abre('/app/entrenamientos', 1280, { sesiones: SIN_BLOQUES });
  const tarjeta = await lista.page.locator('main').textContent();
  comprueba('la tarjeta no dice «0 bloques»', !/0 bloques/.test(tarjeta));
  comprueba('dice lo que falta por hacer', /Sin ejercicios/.test(tarjeta));
  await lista.ctx.close();

  const ficha = await abre('/app/entrenamientos/vacia', 1280, { sesiones: SIN_BLOQUES });
  const texto = await ficha.page.locator('main').textContent();
  comprueba('la ficha lo explica', /Todavía no tiene ejercicios/.test(texto));
  comprueba('y dice el hueco que está reservado', /18:00 – 19:30/.test(texto));
  comprueba(
    'no queda la barra de colores explicando colores que no hay',
    !/Calentamiento y vuelta a la calma en tono claro/.test(texto),
  );
  comprueba(
    'y hay por dónde montarla',
    (await ficha.page.getByRole('link', { name: /montar la sesión/i }).count()) === 1,
  );
  comprueba('el material vacío se dice', /Sin material apuntado/.test(texto));
  await ficha.ctx.close();
}

/* ══════════ 9. Todo esto cabe en un iPhone ═════════════════════════════════ */
{
  console.log('\n  En el móvil\n');
  const { page, ctx } = await abre('/app/calendario', 390);

  await page.getByRole('button', { name: /añadir varios/i }).first().click();
  await page.waitForTimeout(500);
  const hoja = page.getByRole('dialog');
  await hoja.getByRole('button', { name: /los días que entrenáis/i }).click();
  await hoja.getByRole('button', { name: /ver lo que entraría/i }).click();
  await page.waitForTimeout(400);

  const desborde = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  comprueba('la hoja no desborda a lo ancho', desborde <= 0, `${desborde}px de más`);

  const caja = await hoja.boundingBox();
  const alto = page.viewportSize().height;
  comprueba('y cabe en la pantalla', caja.y >= 0 && caja.y + caja.height <= alto + 1,
    `${Math.round(caja.y)}…${Math.round(caja.y + caja.height)} de ${alto}`);

  const boton = await hoja.getByRole('button', { name: /crear \d+ entrenamiento/i }).boundingBox();
  comprueba('el botón de crear se ve sin desplazar la hoja', boton.y + boton.height <= alto + 1,
    `acaba en ${Math.round(boton.y + boton.height)}`);
  comprueba('y se puede pulsar con el dedo', boton.height >= 40, `${Math.round(boton.height)}px`);

  await ctx.close();
}

await navegador.close();
console.log(
  fallos === 0
    ? '\n  Crear un entrenamiento es dar a un botón y que aparezca.\n'
    : `\n  ${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
