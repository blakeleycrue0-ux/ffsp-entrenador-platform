/**
 * LA PANTALLA DE INSCRIPCIONES DEL CLUB, ABIERTA DE VERDAD.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LO QUE COMPRUEBA, Y POR QUÉ ES POCO PERO IMPORTANTE. Lo que esta pantalla
 * HACE —aprobar, rechazar, crear— se prueba contra un Postgres de verdad en
 * `pruebas/sql/20_inscripcion.sql`, que es donde están las funciones y las
 * políticas. Aquí se mira lo que esa prueba no puede ver:
 *
 *   1. QUE LA PANTALLA ABRA. Es nueva, tiene cuatro consultas y dos ventanas,
 *      y una pantalla que explota al entrar es lo primero que se encuentra
 *      quien la estrena.
 *   2. QUE EL ENLACE ESTÉ A LA VISTA Y SEA EL BUENO. Es lo único que el club
 *      tiene que repartir; si está mal, las familias no llegan.
 *   3. QUE UN BORRADOR SE DISTINGA DE UNO ABIERTO. Repartir un enlace que no
 *      abre, creyendo que abre, es el error más fácil de cometer aquí.
 *   4. QUE LO QUE ESPERA SE VEA ANTES QUE NADA. Una inscripción sin revisar
 *      es una familia esperando respuesta.
 *   5. QUE SIN LA MIGRACIÓN APLICADA LO DIGA, en vez de enseñar un error de
 *      PostgREST sobre la caché del esquema. Pasa de verdad: el programa se
 *      despliega antes de que alguien ejecute el SQL.
 *   6. QUE QUIEN NO ADMINISTRA EL CLUB NO LA VEA. Dentro hay DNI y direcciones
 *      de menores. Esto no es LA defensa —la defensa es la política de RLS,
 *      probada en el otro archivo— pero una pantalla que ofrece lo que el
 *      servidor va a negar es una pantalla que miente.
 *
 *   npm run build && npm run preview
 *   node pruebas/inscripciones-club.mjs
 */
import { chromium } from 'playwright';
import { mock, USER, CLUB, TEAMS, j } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';
const TOKEN = 'abcdef0123456789abcdef0123456789';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const FORM = {
  id: 'f1', club_id: CLUB, team_id: TEAMS[0].id, fee_plan_id: null,
  title: 'Inscripción Cadete A 2026/27', intro: null, season: '2026/27',
  token: TOKEN, status: 'abierta',
  opens_at: null, closes_at: null, max_submissions: 40,
  campos: [], documentos: [{ id: 'dni-jugador', label: 'DNI del jugador', obligatorio: true }],
  consentimientos: [], published_at: '2026-11-01T10:00:00Z', created_at: '2026-11-01T09:00:00Z',
  enrollments: [{ status: 'recibida' }, { status: 'aprobada' }],
};

const INSCRIPCION = {
  id: 'i1', form_id: 'f1', club_id: CLUB, codigo: 'INS-K5GCDFM4', status: 'recibida',
  player_name: 'Marc Soler Pons', player_birth_date: '2014-05-20', player_doc: '12345678Z',
  player_sex: null,
  guardian_name: 'Anna Soler Riera', guardian_doc: null, guardian_email: 'anna@ejemplo.test',
  guardian_phone: '600111222', guardian_relation: 'Madre',
  address: 'Carrer Gran, 1', postal_code: '07001', city: 'Palma',
  respuestas: {}, consentimientos: { datos: '2026-11-02T11:00:00Z' },
  player_id: null, reviewed_at: null, review_note: null, created_at: '2026-11-02T11:00:00Z',
  enrollment_documents: [{
    id: 'd1', kind: 'dni-jugador', storage_path: `${CLUB}/i1/dni-jugador.jpg`,
    filename: 'dni.jpg', mime: 'image/jpeg', size_bytes: 234567, uploaded_at: '2026-11-02T11:00:05Z',
  }],
};

/** Las tablas nuevas. `roto` imita la base sin la migración aplicada. */
async function monta(page, { formularios = [FORM], inscripciones = [INSCRIPCION], roto = false } = {}) {
  const faltaLaTabla = {
    status: 404, contentType: 'application/json',
    body: JSON.stringify({
      code: '42P01', message: 'relation "public.enrollment_forms" does not exist',
    }),
  };
  await page.route('**/rest/v1/enrollment_forms**', (r) =>
    r.fulfill(roto ? faltaLaTabla : j(formularios)));
  await page.route('**/rest/v1/enrollments**', (r) =>
    r.fulfill(roto ? faltaLaTabla : j(inscripciones)));
}

const abre = async (ctx, opciones = {}, mockOpciones = {}) => {
  const page = await ctx.newPage();
  await mock(page, mockOpciones);
  await monta(page, opciones);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app/inscripciones`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return page;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const movil = { viewport: { width: 393, height: 852 } };

/* ══════════════════════════════════════════════════════════════════════════
   1 · ABRE, Y ENSEÑA EL ENLACE
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  la pantalla, con un formulario abierto');
  const ctx = await navegador.newContext(movil);
  const page = await abre(ctx);

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('no ha explotado', !/algo ha ido mal|error inesperado/i.test(texto));
  comprueba('está el título del formulario', texto.includes('Inscripción Cadete A 2026/27'));
  comprueba('dice que está abierta', /abierta/i.test(texto));

  /* El enlace, que es lo único que el club reparte. */
  const enlace = await page.locator('input[readonly][data-enlace]').inputValue();
  comprueba('el enlace lleva el token del formulario', enlace.endsWith(`/inscripcion/${TOKEN}`), enlace);
  comprueba('y es una dirección absoluta', /^https?:\/\//.test(enlace));

  /* Y que esa dirección es exactamente la ruta pública: si no coincidiera,
     el club repartiría enlaces que no abren. */
  comprueba('la ruta es la pública', new URL(enlace).pathname === `/inscripcion/${TOKEN}`,
    new URL(enlace).pathname);

  comprueba('cuenta lo que está sin revisar', /1 sin revisar/.test(texto),
    (texto.match(/\d+ sin revisar/) ?? ['no lo dice'])[0]);
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · LO QUE ESPERA, PRIMERO
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  una inscripción sin revisar');
  const ctx = await navegador.newContext(movil);
  const page = await abre(ctx);

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('avisa de que hay una sin revisar', /una inscripción sin revisar/i.test(texto));
  /* Antes que la lista de formularios: es lo que hay que atender. */
  const posAviso = texto.search(/una inscripción sin revisar/i);
  const posLista = texto.search(/Formularios/);
  comprueba('y va por delante de los formularios', posAviso >= 0 && posAviso < posLista,
    `aviso en ${posAviso}, lista en ${posLista}`);
  comprueba('con el nombre del jugador', texto.includes('Marc Soler Pons'));

  /* Al abrirla se ve la ficha entera y el documento que subió. */
  await page.getByText('Marc Soler Pons').first().click();
  await page.waitForTimeout(600);
  const ficha = await page.evaluate(() => document.body.innerText);
  comprueba('la ficha enseña el justificante', ficha.includes('INS-K5GCDFM4'));
  comprueba('enseña a quien la rellenó', ficha.includes('Anna Soler Riera'));
  comprueba('enseña el documento subido', /dni\.jpg/i.test(ficha));
  /* LA FECHA SE BUSCA EN SU BLOQUE, NO EN TODA LA PÁGINA. Con un `\d+/\d+/\d+`
     suelto, lo primero que encontraba era la fecha de nacimiento del jugador
     —20/5/2014— y la prueba suspendía una pantalla que estaba bien. Además la
     hora del consentimiento no va con barras: se escribe en formato medio
     («2 nov 2026, 11:00»), que es el que se lee de un vistazo. */
  const autorizaciones = await page
    .locator('div:has(> p:text-is("Autorizaciones aceptadas")) dl').first().innerText()
    .catch(() => '');
  comprueba('guarda la hora en que se aceptó la autorización',
    /nov.*2026/i.test(autorizaciones) && /\d{1,2}:\d{2}/.test(autorizaciones),
    JSON.stringify(autorizaciones.replace(/\n/g, ' ').slice(0, 70)));
  /* Lo que NO se rellenó se dice, en vez de dejar un hueco en blanco. */
  comprueba('dice qué se quedó sin rellenar', /sin rellenar/i.test(ficha));
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · UN BORRADOR SE DISTINGUE
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  un formulario en borrador');
  const ctx = await navegador.newContext(movil);
  const page = await abre(ctx, {
    formularios: [{ ...FORM, status: 'borrador', published_at: null, enrollments: [] }],
    inscripciones: [],
  });

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('lo marca como borrador', /borrador/i.test(texto));
  comprueba('AVISA de que el enlace todavía no abre', /todavía no abre/i.test(texto),
    (texto.match(/Todav[^.]*\./) ?? ['no lo avisa'])[0]);
  comprueba('ofrece publicarlo', await page.getByRole('button', { name: /^publicar$/i }).count() > 0);
  comprueba('y NO ofrece cerrarlo', await page.getByRole('button', { name: /^cerrar$/i }).count() === 0);
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · SIN LA MIGRACIÓN, LO DICE
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  la base sin la migración aplicada');
  const ctx = await navegador.newContext(movil);
  const page = await abre(ctx, { roto: true });

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('explica que faltan tablas', /faltan tablas|migracion|migración/i.test(texto),
    (texto.match(/[^.\n]*tablas[^.]*\./i) ?? ['no lo explica'])[0]);
  comprueba('y NO enseña la jerga de PostgREST',
    !/schema cache|does not exist|42P01/i.test(texto));
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · QUIEN NO ADMINISTRA, NO ENTRA
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  una cuenta que no administra el club');
  const ctx = await navegador.newContext(movil);
  const page = await abre(ctx, {}, {
    club: { role: 'coach', clubs: { id: CLUB, name: 'CE Exemple', short_name: 'CE', city: 'Palma', season: '2026/27', crest_url: null } },
  });

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('no enseña ninguna inscripción', !texto.includes('Marc Soler Pons'));
  comprueba('no enseña ningún enlace', await page.locator('input[data-enlace]').count() === 0);
  comprueba('y explica por qué', /administra/i.test(texto),
    (texto.match(/[^.\n]*administra[^.]*\./i) ?? ['no lo explica'])[0]);
  await ctx.close();
}

await navegador.close();

console.log('');
if (fallos > 0) {
  console.log(`  ✗ ${fallos} ${fallos === 1 ? 'cosa' : 'cosas'} mal en la pantalla del club.\n`);
  process.exit(1);
}
console.log('  La pantalla del club aguanta: el enlace es el bueno y nadie ve lo que no debe.\n');
