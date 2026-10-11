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
import { mock, j, filasEnviadas, TEAMS, USER } from './mock.mjs';

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
    /* Lo que vería la base de datos, con la regla de `columns` aplicada: si
       el cliente manda la clave `id` vacía, aquí llega como null y la columna
       es NOT NULL. */
    const enviadas = filasEnviadas(req);
    escrituras.push(enviadas);
    const filas = enviadas.map((f, i) => ({
      ...f, id: `nueva${escrituras.length - 1}_${i}`, blocks: f.blocks ?? [], material: f.material ?? [],
    }));
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
  comprueba('se abre la hoja', await hoja.isVisible());

  comprueba(
    'los días guardados del equipo vienen marcados',
    (await hoja.locator('button[aria-pressed="true"]').count()) === 2,
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
  /* NINGUNA FILA PUEDE LLEVAR UN IDENTIFICADOR VACÍO. La columna es NOT NULL y
     lo pone la base: si el cliente manda `id` —aunque sea sin valor—,
     PostgREST lo traduce a NULL y la escritura entera se cae. Pasó en
     producción con veintisiete entrenamientos: «null value in column "id" of
     relation "sessions" violates not-null constraint». */
  comprueba(
    'y ninguna manda el identificador vacío',
    filasEscritas.every((f) => !('id' in f) || (typeof f.id === 'string' && f.id.length > 0)),
    'id' in (filasEscritas[0] ?? {}) ? `id=${JSON.stringify(filasEscritas[0].id)}` : 'sin la clave, como debe ser',
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
    const enviadas = filasEnviadas(req);
    escrituras.push(enviadas);
    return route.fulfill(j(enviadas.map((f, i) => ({ ...f, id: `n${i}`, blocks: [], material: [] }))));
  });
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app/calendario`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.getByRole('button', { name: /añadir varios/i }).first().click();
  await page.waitForTimeout(400);
  const hoja = page.getByRole('dialog');

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

/* ═══════ 4. UNA HORA POR DÍA: el lunes no es el viernes ══════════════════ */
{
  console.log('\n  cada día a su hora\n');
  /* Es lo normal en un club: los campos se reparten y el viernes el equipo
     anterior acaba más tarde. Antes esta hoja pedía UNA hora para todos los
     días marcados, así que quien entrena a horas distintas tenía que pasar por
     aquí dos veces o corregir treinta sesiones a mano. */
  const { page, ctx, escrituras } = await abre('/app/calendario', 390);

  await page.getByRole('button', { name: /añadir varios/i }).first().click();
  await page.waitForTimeout(500);
  const hoja = page.getByRole('dialog');

  comprueba('ya no se puede subir ningún archivo', (await hoja.locator('input[type="file"]').count()) === 0);
  comprueba('ni pegar el texto de un calendario', (await hoja.locator('textarea').count()) === 0);
  comprueba('ni se nombra el .ics', !/\.ics/i.test(await hoja.textContent()));

  /* El equipo del mock entrena martes y jueves: vienen marcados con su hora. */
  comprueba('los días guardados vienen marcados',
    (await hoja.locator('button[aria-pressed="true"]').count()) === 2,
    `${await hoja.locator('button[aria-pressed="true"]').count()}`);
  comprueba('cada uno con su fila de hora',
    (await hoja.locator('input[type="time"]').count()) === 2);

  /* Lunes a las 18:45 de hora y cuarto; viernes a las 19:30 de hora y media.
     Se quitan los dos que venían del horario para que la cuenta sea limpia. */
  await hoja.getByRole('button', { name: 'martes' }).click();
  await hoja.getByRole('button', { name: 'jueves' }).click();
  await hoja.getByRole('button', { name: 'lunes' }).click();
  await hoja.getByRole('button', { name: 'viernes' }).click();
  await page.waitForTimeout(250);

  await hoja.getByLabel('Hora del lunes').fill('18:45');
  await hoja.getByLabel('Duración del lunes').selectOption('75');
  await hoja.getByLabel('Hora del viernes').fill('19:30');
  await hoja.getByLabel('Duración del viernes').selectOption('90');
  await page.waitForTimeout(250);

  await hoja.getByRole('button', { name: /ver lo que entraría/i }).click();
  await page.waitForTimeout(400);

  const texto = await hoja.textContent();
  comprueba('la lista enseña la hora del lunes', /18:45 – 20:00/.test(texto));
  comprueba('y la del viernes, distinta', /19:30 – 21:00/.test(texto));

  await hoja.getByRole('button', { name: /crear \d+ entrenamiento/i }).click();
  await page.waitForTimeout(1000);

  const filas = escrituras[0] ?? [];
  comprueba('se crean en una sola petición', escrituras.length === 1 && filas.length > 20,
    `${escrituras.length} escrituras, ${filas.length} filas`);

  const lunes = filas.filter((f) => new Date(`${f.date}T12:00:00`).getDay() === 1);
  const viernes = filas.filter((f) => new Date(`${f.date}T12:00:00`).getDay() === 5);
  comprueba('hay lunes y viernes, y nada más',
    lunes.length > 0 && viernes.length > 0 && lunes.length + viernes.length === filas.length,
    `${lunes.length} lunes · ${viernes.length} viernes · ${filas.length} en total`);
  comprueba('TODOS los lunes a las 18:45 y 75 minutos',
    lunes.every((f) => f.start_time === '18:45' && f.duration === 75),
    `${lunes[0]?.start_time} · ${lunes[0]?.duration} min`);
  comprueba('TODOS los viernes a las 19:30 y 90 minutos',
    viernes.every((f) => f.start_time === '19:30' && f.duration === 90),
    `${viernes[0]?.start_time} · ${viernes[0]?.duration} min`);
  comprueba('y ninguna manda el identificador vacío',
    filas.every((f) => !('id' in f) || (typeof f.id === 'string' && f.id.length > 0)));

  await ctx.close();
}

/* ══════════ 5. El formulario: cuatro preguntas y guardar ══════════════════ */
{
  console.log('\n  El formulario de un entrenamiento\n');
  /* Sin ejercicios en la biblioteca: era el caso que hacía imposible guardar,
     y ahora ni siquiera se pregunta por ellos aquí. */
  const { page, ctx, escrituras } = await abre('/app/entrenamientos/nuevo', 390, { ejercicios: false });
  const main = page.locator('main');

  comprueba(
    'no hay biblioteca de ejercicios en el formulario',
    !/biblioteca de ejercicios/i.test(await main.textContent()),
  );
  comprueba(
    'ni se pide arrastrar nada',
    !/arrastra/i.test(await main.textContent()),
  );

  /* Lo que se ve son cinco campos: equipo (hay dos en el club), día, hora,
     duración y repetición. Lo demás está detrás de «Más opciones». */
  const aLaVista = await page.evaluate(() => {
    const abierto = (el) => !el.closest('details:not([open]) > *:not(summary)');
    return Array.from(document.querySelectorAll('main input, main select, main textarea'))
      .filter(abierto).length;
  });
  comprueba('cinco campos a la vista, no once', aLaVista === 5, `${aLaVista}`);
  comprueba('y el resto detrás de «Más opciones»', (await page.getByText('Más opciones').count()) === 1);

  comprueba(
    'dice lo que va a pasar antes de pulsar',
    /Se apunta el .+ de \d{2}:\d{2} a \d{2}:\d{2}/.test(await main.textContent()),
    (await main.textContent()).match(/Se apunta el [^.]*/)?.[0],
  );

  await page.getByRole('button', { name: /apuntar entrenamiento/i }).click();
  await page.waitForTimeout(900);
  comprueba('se guarda', escrituras.length === 1, `${escrituras.length} escrituras`);
  const fila = escrituras[0]?.[0] ?? {};
  comprueba('con duración, no con cero', fila.duration === 90, `duration=${fila.duration}`);
  comprueba('con el equipo puesto', fila.team_id === 't1', `team_id=${fila.team_id}`);
  comprueba('con un título que se reconoce', /^Entrenamiento del /.test(fila.title ?? ''), fila.title);
  comprueba('y sin ejercicios inventados', Array.isArray(fila.blocks) && fila.blocks.length === 0);

  await ctx.close();
}

/* ══════════ 6. «Se repite» apunta el trimestre entero ═════════════════════ */
{
  console.log('\n  Se repite\n');
  const { page, ctx, escrituras } = await abre('/app/entrenamientos/nuevo?fecha=2027-03-09', 390);
  const main = page.locator('main');

  const fecha = await page.locator('input[type="date"]').first().inputValue();
  comprueba('llega con el día que se tocó en el calendario', fecha === '2027-03-09', fecha);

  /* El desplegable de repetición es el último `select` a la vista. */
  await page.getByLabel('Se repite').selectOption('semanal');
  await page.waitForTimeout(300);
  await page.getByLabel('Hasta').fill('2027-05-11');
  await page.waitForTimeout(300);

  const resumen = (await main.textContent()).match(/Son \d+ entrenamientos[^.]*/)?.[0] ?? '';
  comprueba('dice cuántos y entre qué fechas', /Son 10 entrenamientos/.test(resumen), resumen);

  const boton = page.getByRole('button', { name: /apuntar 10 entrenamientos/i });
  comprueba('y el botón dice lo mismo', (await boton.count()) === 1);

  await boton.click();
  await page.waitForTimeout(1000);
  comprueba('se escriben en UNA petición', escrituras.length === 1, `${escrituras.length}`);
  const filas = escrituras[0] ?? [];
  comprueba('los diez', filas.length === 10, `${filas.length}`);
  comprueba('todos en martes', filas.every((f) => new Date(`${f.date}T12:00:00`).getDay() === 2));
  comprueba('todos a la misma hora', new Set(filas.map((f) => f.start_time)).size === 1, filas[0]?.start_time);
  comprueba(
    'del 9 de marzo al 11 de mayo',
    filas[0]?.date === '2027-03-09' && filas.at(-1)?.date === '2027-05-11',
    `${filas[0]?.date} … ${filas.at(-1)?.date}`,
  );

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
  comprueba('que abre la hoja de varios', (await page.getByRole('dialog').count()) === 1
    && /qué días entrenáis/i.test(await page.getByRole('dialog').textContent()));
  comprueba(
    'y la dirección queda limpia para que recargar no la vuelva a abrir',
    !page.url().includes('varios'),
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

/* ══════════ 10. Y en la pantalla más estrecha que existe ══════════════════ */
{
  console.log('\n  a 320 px\n');
  /* Las filas de hora son lo más apretado de la aplicación: el nombre del día,
     un campo de hora y un desplegable de duración, los tres en una fila. */
  const { page, ctx } = await abre('/app/calendario', 320);

  await page.getByRole('button', { name: /añadir varios/i }).first().click();
  await page.waitForTimeout(500);
  const hoja = page.getByRole('dialog');
  await hoja.getByRole('button', { name: 'miércoles' }).click();
  await page.waitForTimeout(250);

  const desborde = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  comprueba('nada se sale a lo ancho', desborde <= 0, `${desborde}px de más`);

  const dentro = await hoja.evaluate((el) => el.scrollWidth - el.clientWidth);
  comprueba('ni dentro de la hoja', dentro <= 0, `${dentro}px de más`);

  /* Los siete días y la fila de hora, todos tocables. */
  const dias = await hoja.locator('button[aria-pressed]').all();
  const cajas = await Promise.all(dias.map((d) => d.boundingBox()));
  comprueba('los siete días se pueden tocar', cajas.every((c) => c.width >= 32 && c.height >= 40),
    `${Math.round(cajas[0].width)}×${Math.round(cajas[0].height)}`);

  const hora = await hoja.locator('input[type="time"]').first().boundingBox();
  comprueba('y el campo de la hora también', hora.width >= 70 && hora.height >= 40,
    `${Math.round(hora.width)}×${Math.round(hora.height)}`);

  await ctx.close();
}

await navegador.close();
console.log(
  fallos === 0
    ? '\n  Crear un entrenamiento es dar a un botón y que aparezca.\n'
    : `\n  ${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
