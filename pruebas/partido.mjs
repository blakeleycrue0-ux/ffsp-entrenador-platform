/**
 * PREPARAR UN PARTIDO, de principio a fin.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El encargo pide probar tres tareas concretas: crear un entrenamiento
 * —`crear.mjs`—, pasar lista —`lista.mjs`— y preparar un partido. Ésta es la
 * tercera, y se hace entera, como la haría una entrenadora el martes:
 *
 *   1. Apuntar el partido: contra quién, qué día y si es en casa.
 *   2. Abrirlo.
 *   3. Crear la convocatoria.
 *   4. Y tenerla lista para mandarla.
 *
 * LO QUE SE MIDE ES QUE LA TAREA SE PUEDA HACER SIN SABER NADA: que no haya
 * que rellenar lo que no se sabe todavía —la jornada, el sistema previsto—,
 * que cada paso lleve al siguiente sin volver atrás a buscarlo, y que lo que
 * llega al servidor sea lo que se escribió.
 *
 *   npm run build && npm run preview
 *   node pruebas/partido.mjs
 */
import { chromium } from 'playwright';
import { mock, j, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
/* Un iPhone: es donde se apunta un partido, en el coche o en el campo. */
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();

const partidos = [];
const convocatorias = [];
await mock(page, { matches: [] });
await page.route('**/rest/v1/matches**', async (route) => {
  const req = route.request();
  if (req.method() !== 'POST') return route.fallback();
  const cuerpo = JSON.parse(req.postData() ?? '{}');
  /* El identificador NO puede ser «nuevo»: `/app/partidos/nuevo` es la ruta
     del formulario, así que al navegar a la ficha del partido recién creado se
     volvería al formulario y la prueba se daría por buena sin que nadie
     hubiera llegado a ninguna ficha. Pasó. */
  const fila = { ...(Array.isArray(cuerpo) ? cuerpo[0] : cuerpo), id: 'm9' };
  partidos.push(fila);
  /* Una sola fila, no una lista: `saveMatch` usa `.single()` y con un array
     el mapeo sale vacío y el identificador llega sin valor. */
  return route.fulfill(j(fila));
});
await page.route('**/rest/v1/callups**', async (route) => {
  const req = route.request();
  if (req.method() !== 'POST') return route.fallback();
  const cuerpo = JSON.parse(req.postData() ?? '{}');
  const fila = { ...(Array.isArray(cuerpo) ? cuerpo[0] : cuerpo), id: 'conv' };
  convocatorias.push(fila);
  return route.fulfill(j(fila));
});
await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);

/* ═══════════════ 1. Desde el calendario, en dos toques ════════════════════ */
console.log('\n  llegar a apuntarlo\n');
{
  await page.goto(`${BASE}/app/calendario`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const boton = page.getByRole('link', { name: /^partido$/i }).first();
  comprueba('el calendario tiene un botón de partido', await boton.isVisible());
  await boton.click();
  await page.waitForTimeout(900);
  comprueba('y lleva al formulario', page.url().endsWith('/app/partidos/nuevo'), page.url().replace(BASE, ''));
}

/* ═══════════════ 2. Tres preguntas y guardar ══════════════════════════════ */
console.log('\n  apuntarlo\n');
{
  const main = page.locator('main');
  const aLaVista = await page.evaluate(() => {
    const abierto = (el) => !el.closest('details:not([open]) > *:not(summary)');
    return Array.from(document.querySelectorAll('main input, main select, main textarea'))
      .filter(abierto).length;
  });
  comprueba('cuatro campos a la vista, no nueve', aLaVista === 4, `${aLaVista}`);
  comprueba(
    'no se pide la jornada ni el sistema de salida',
    !/Jornada/.test(await page.evaluate(() => {
      const abierto = (el) => !el.closest('details:not([open]) > *:not(summary)');
      return Array.from(document.querySelectorAll('main label')).filter(abierto).map((l) => l.textContent).join(' ');
    })),
  );
  comprueba('y están en «Más opciones»', (await page.getByText('Más opciones').count()) === 1);

  await page.getByLabel('Rival').fill('CE Andratx');
  await page.getByLabel('Día').fill('2027-04-17');
  await page.getByLabel('Hora').fill('11:30');
  await page.getByRole('button', { name: /jugamos en casa/i }).click();
  await page.waitForTimeout(200);

  /* La vista previa dice quién es local, que es lo que no está escrito en
     ningún campo. */
  comprueba(
    'la vista previa dice quién es local',
    /vs/i.test(await main.textContent()) && /CE Andratx/.test(await main.textContent()),
  );

  await page.getByRole('button', { name: /guardar partido/i }).click();
  await page.waitForTimeout(1200);

  comprueba('se guarda', partidos.length === 1, `${partidos.length}`);
  const p = partidos[0] ?? {};
  comprueba('con el rival', p.opponent === 'CE Andratx', p.opponent);
  comprueba('el día y la hora', p.date === '2027-04-17' && p.start_time === '11:30', `${p.date} ${p.start_time}`);
  comprueba('en casa', p.home === true, String(p.home));
  comprueba('el equipo puesto solo', p.team_id === 't1', p.team_id);
  comprueba(
    'y el campo heredado del equipo, sin preguntarlo',
    p.venue === 'Campo Municipal',
    p.venue,
  );
  comprueba('y lleva a la ficha del partido recién creado',
    page.url().endsWith('/app/partidos/m9'), page.url().replace(BASE, ''));
}

/* ═══════════════ 3. La convocatoria, desde la ficha ══════════════════════ */
console.log('\n  la convocatoria\n');
{
  const main = page.locator('main');
  comprueba(
    'la ficha dice que no hay convocatoria',
    /Todavía no hay convocatoria/i.test(await main.textContent()),
  );

  const crear = page.getByRole('button', { name: /crear convocatoria/i });
  comprueba('y ofrece crearla ahí mismo', (await crear.count()) === 1);
  await crear.click();
  await page.waitForTimeout(1200);

  comprueba('se crea', convocatorias.length === 1, `${convocatorias.length}`);
  const c = convocatorias[0] ?? {};
  comprueba('para este partido', c.match_id === 'm9', c.match_id);

  const entradas = c.entries ?? [];
  comprueba('con una entrada por jugadora', entradas.length === 16, `${entradas.length}`);
  const convocadas = entradas.filter((e) => e.selected).length;
  comprueba(
    'parte de quien está disponible, no de la plantilla entera',
    convocadas > 0 && convocadas < 16,
    `${convocadas} de 16`,
  );
  /* La lesionada del mock no puede entrar convocada sola. */
  const lesionada = entradas.find((e) => e.playerId === 'p3');
  comprueba('y no convoca a la lesionada', lesionada && lesionada.selected === false,
    JSON.stringify(lesionada));
}

/* ═══════════════ 4. Y se puede mandar ════════════════════════════════════ */
console.log('\n  mandarla\n');
{
  const copiar = page.getByRole('button', { name: /copiar la convocatoria/i });
  comprueba('hay cómo copiarla para pegarla en el grupo', (await copiar.count()) === 1);

  const desborde = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  comprueba('la ficha no desborda en un iPhone', desborde <= 0, `${desborde}px de más`);
}

await navegador.close();
console.log(
  fallos === 0
    ? '\n  Apuntar un partido y convocar son tres toques y un nombre.\n'
    : `\n  ${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
