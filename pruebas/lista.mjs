/**
 * PASAR LISTA, que es lo que más se usa.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dos veces por semana, de pie en el campo, con el móvil en una mano. Era la
 * peor pantalla de la aplicación —`complejidad.mjs` le contó 99 cosas que
 * pulsar, 2.681 px de alto y ninguna acción principal— porque pedía elegir uno
 * de cinco estados para cada una de las dieciséis jugadoras: ochenta botones
 * para decir que faltaron dos.
 *
 * Esta prueba no comprueba que haya menos botones: eso lo cuenta la auditoría.
 * Comprueba LO QUE SE GUARDA, que es lo único que importa de una lista:
 *
 *  · que la sesión sea la de la dirección y no otra —se podía estar pasando
 *    lista de otro día sin enterarse—;
 *  · que «Vinieron todas» no pise a quien tiene parte médico, porque eso es un
 *    dato de la base y no una suposición;
 *  · que un toque en la fila cambie a esa jugadora y a ninguna más;
 *  · que los cinco estados sigan existiendo, preguntados sólo de quien faltó;
 *  · y que lo que llega al servidor sea exactamente lo que se ve en pantalla.
 *
 *   npm run build && npm run preview
 *   node pruebas/lista.mjs
 */
import { chromium } from 'playwright';
import { mock, j, PLAYERS, SESSIONS, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

/* La plantilla del mock: dieciséis, con la cuarta lesionada y la octava en
   duda. La lesionada es la que no se puede pisar. */
const LESIONADA = PLAYERS[3];
const PLANTILLA = PLAYERS.filter((p) => p.team_id === 't1');

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
const escrituras = [];
await mock(page);
/* La escritura de la lista: se devuelve lo que llegaría de la base. */
await page.route('**/rest/v1/attendance**', async (route) => {
  const req = route.request();
  if (req.method() !== 'POST') return route.fallback();
  const cuerpo = JSON.parse(req.postData() ?? '{}');
  escrituras.push(Array.isArray(cuerpo) ? cuerpo[0] : cuerpo);
  return route.fulfill(j([{ ...(Array.isArray(cuerpo) ? cuerpo[0] : cuerpo), id: 'nueva' }]));
});
await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
await page.goto(`${BASE}/app/entrenamientos/${SESSIONS[0].id}/asistencia`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);

const main = page.locator('main');

/* ───────────────── 1. La sesión es la de la dirección ─────────────────────── */
console.log('\n  de qué entrenamiento es la lista\n');
{
  const texto = await main.textContent();
  comprueba('dice el día y la hora de la sesión', /18:30/.test(texto), texto.match(/\d{2}:\d{2}/)?.[0]);
  comprueba(
    'y NO hay un desplegable que pueda cambiarte de día',
    (await main.locator('select').count()) === 0,
    `${await main.locator('select').count()} desplegables`,
  );
  comprueba('hay vuelta a la ficha del entrenamiento', (await page.getByRole('link', { name: /presión tras pérdida/i }).count()) === 1);
}

/* ───────────────── 2. Una fila, un toque ──────────────────────────────────── */
console.log('\n  la lista\n');
{
  const filas = main.locator('ul > li');
  comprueba('están las dieciséis', (await filas.count()) === PLANTILLA.length, `${await filas.count()}`);

  /* Como mucho dos cosas por fila: el interruptor y, si faltó, el motivo. */
  const porFila = await filas.first().locator('button').count();
  comprueba('como mucho dos botones por fila, no cinco', porFila <= 2, `${porFila}`);

  const caja = await filas.first().locator('button').first().boundingBox();
  comprueba('la fila entera es el interruptor', caja.width > 250, `${Math.round(caja.width)}px de ancho`);
  comprueba('y se puede acertar con el pulgar', caja.height >= 44, `${Math.round(caja.height)}px de alto`);

  comprueba(
    'la lesionada entra ya justificada, sin preguntar',
    /Lesionada/.test(await filas.nth(3).textContent()),
    (await filas.nth(3).textContent()).trim().replace(/\s+/g, ' ').slice(0, 60),
  );
}

/* ───────────────── 3. «Vinieron todas» y las excepciones ──────────────────── */
console.log('\n  vinieron todas, menos las que no\n');
{
  const atajo = page.getByRole('button', { name: /^vinieron todas$/i });
  comprueba('el atajo es la acción principal', (await atajo.count()) === 1);
  const cajaAtajo = await atajo.boundingBox();
  comprueba('a lo ancho de la pantalla', cajaAtajo.width > 300, `${Math.round(cajaAtajo.width)}px`);
  comprueba('y alto de dedo', cajaAtajo.height >= 48, `${Math.round(cajaAtajo.height)}px`);

  await atajo.click();
  await page.waitForTimeout(400);

  const vinieron = await main.locator('ul > li', { hasText: 'Vino' }).count();
  comprueba('quedan quince con «Vino»', vinieron === PLANTILLA.length - 1, `${vinieron}`);
  comprueba(
    'y la lesionada NO se pisa',
    /Lesionada/.test(await main.locator('ul > li').nth(3).textContent()),
  );
  comprueba('el resumen lo dice', /15 de 16 vinieron/.test(await main.textContent()),
    (await main.textContent()).match(/\d+ de \d+ vinieron[^·]*/)?.[0]);

  /* Una falta: se toca su fila. */
  const fila = main.locator('ul > li').nth(1);
  await fila.locator('button').first().click();
  await page.waitForTimeout(300);
  comprueba('tocar una fila la pasa a «No vino»', /No vino/.test(await fila.textContent()));
  comprueba(
    'y no cambia a ninguna otra',
    (await main.locator('ul > li', { hasText: 'No vino' }).count()) === 1,
  );

  /* El motivo sale en las filas con falta y en ninguna más: la lesionada
     —que ya lo era— y la que acaba de faltar. En las otras catorce no hay
     nada que preguntar, y eso es lo que quita setenta botones. */
  const conMotivo = await main.getByRole('button', { name: '¿Por qué?' }).count();
  const conFalta = await main.locator('ul > li').evaluateAll((lis) =>
    lis.filter((li) => /No vino|Lesionada|Justificada|Llegó tarde/.test(li.innerText)).length);
  comprueba('el «¿Por qué?» sale en las filas con falta y en ninguna más',
    conMotivo === conFalta && conMotivo === 2, `${conMotivo} motivos para ${conFalta} faltas`);

  await fila.getByRole('button', { name: '¿Por qué?' }).click();
  await page.waitForTimeout(400);
  const hoja = page.getByRole('dialog');
  const motivos = await hoja.locator('button').allInnerTexts();
  comprueba(
    'con los estados de siempre',
    ['Llegó tarde', 'Justificada', 'Lesionada', 'No avisó'].every((m) => motivos.some((x) => x.includes(m))),
    motivos.map((m) => m.trim()).join(' · '),
  );
  await hoja.getByRole('button', { name: 'Justificada' }).click();
  await page.waitForTimeout(400);
  comprueba('y se queda como justificada', /Justificada/.test(await fila.textContent()));
}

/* ───────────────── 4. Lo que llega al servidor ────────────────────────────── */
console.log('\n  lo que se guarda\n');
{
  await page.getByRole('button', { name: /^guardar$/i }).click();
  await page.waitForTimeout(1000);

  comprueba('se guarda en una escritura', escrituras.length === 1, `${escrituras.length}`);
  const fila = escrituras[0] ?? {};
  comprueba('de esta sesión', fila.session_id === SESSIONS[0].id, fila.session_id);
  comprueba('y de este equipo', fila.team_id === 't1', fila.team_id);

  const marcas = fila.marks ?? {};
  comprueba('con una marca por jugadora', Object.keys(marcas).length === PLANTILLA.length, `${Object.keys(marcas).length}`);
  const cuenta = (m) => Object.values(marcas).filter((x) => x.mark === m).length;
  comprueba('catorce presentes', cuenta('presente') === 14, `${cuenta('presente')}`);
  comprueba('una justificada', cuenta('justificada') === 1, `${cuenta('justificada')}`);
  comprueba(
    'y la lesionada sigue lesionada',
    marcas[LESIONADA.id]?.mark === 'lesionada',
    marcas[LESIONADA.id]?.mark,
  );
  comprueba('ninguna sin registrar', cuenta('sin_registrar') === 0, `${cuenta('sin_registrar')}`);
}

/* ───────────────── 5. Cabe en el móvil ────────────────────────────────────── */
console.log('\n  en el móvil\n');
{
  const desborde = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  comprueba('sin desplazamiento lateral', desborde <= 0, `${desborde}px de más`);

  const alto = await page.evaluate(() => document.querySelector('main').scrollHeight);
  comprueba('y en menos de dos pantallas por jugadora', alto < 1800, `${alto}px para 16 jugadoras`);
}

await navegador.close();
console.log(
  fallos === 0
    ? '\n  Pasar lista es un toque por jugadora que falta.\n'
    : `\n  ${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
