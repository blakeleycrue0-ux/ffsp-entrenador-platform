/**
 * EL ALTA ENTERA, DESDE CERO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Una cuenta recién creada, sin club, sin equipo y sin nada. Esto recorre el
 * alta como la recorre una persona —pantalla a pantalla, escribiendo en los
 * campos y pulsando los botones— y comprueba LO QUE LLEGA AL SERVIDOR en cada
 * paso. No lo que dice la pantalla: lo que se escribe.
 *
 * POR QUÉ ESTO NO EXISTÍA Y TENÍA QUE EXISTIR. El alta es la única pantalla
 * por la que pasa TODO EL MUNDO, exactamente una vez, y es la única que no se
 * puede repetir para comprobar si salió bien. Si se pierde algo ahí, se pierde
 * para siempre y nadie se entera: quien se da de alta no sabe lo que tenía que
 * haberse guardado.
 *
 * Y se perdía. El paso del horario decía, con todas las letras, «los horarios
 * que pongas aquí aparecen solos en el calendario, semana tras semana», y
 * debajo ponía «Ya están en el calendario». No era verdad. El horario se
 * guardaba en la ficha del equipo y ahí se quedaba; el calendario, que pinta
 * sesiones de verdad, aparecía vacío. La aplicación prometía dos veces algo
 * que no hacía, y la prueba que lo habría visto es ésta.
 *
 * LO QUE SE COMPRUEBA, EN ORDEN:
 *
 *   1. Sin club, la aplicación lleva al alta y no a Inicio.
 *   2. El nombre y el cargo se escriben en el perfil.
 *   3. El club se crea con su nombre.
 *   4. El equipo se crea con su categoría Y con el horario dentro.
 *   5. EL HORARIO SE CONVIERTE EN ENTRENAMIENTOS DE VERDAD, con su día, su
 *      hora y su duración, y repartidos semana tras semana.
 *   6. Ninguna fila sale con el identificador en nulo —el fallo que tumbó el
 *      alta en bloque en producción—, mirando las filas como las ve PostgREST.
 *
 *   npm run build && npm run preview
 *   node pruebas/alta.mjs
 */
import { chromium } from 'playwright';
import { filasEnviadas, j, mock, PLANES, REF, SUPA, USER, USUARIO } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

/* Lo que escribe el alta, recogido por tabla. */
const escrito = { profiles: [], clubs: [], club_members: [], teams: [], sessions: [] };

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();

/* ── Una cuenta sin NADA ────────────────────────────────────────────────────
   `club: null` es lo que hace que `RequireClub` enseñe el alta en vez de la
   aplicación. Y los equipos, jugadoras y demás van vacíos: es una cuenta
   recién creada, no un club con datos. */
await mock(page, {
  club: null, equipos: [], players: [], sessions: [], matches: [], attendance: [],
  planes: PLANES,
});

/* Las escrituras se recogen ANTES de contestar, y se contesta con una fila
   plausible: el alta encadena pasos y necesita el identificador de lo que
   acaba de crear para el paso siguiente. */
await page.route(`${SUPA}/rest/v1/**`, async (route) => {
  const req = route.request();
  const p = new URL(req.url()).pathname.replace('/rest/v1/', '');

  if (req.method() === 'POST' || req.method() === 'PATCH') {
    /* LAS LLAMADAS A FUNCIONES DE LA BASE CONTESTAN LO SUYO. El club no se
       crea con un `insert`: se crea con `create_club`, que devuelve un objeto
       con `ok` dentro. Sin esto, el alta se queda plantada en ese paso y la
       prueba parecería decir que el equipo no se crea, cuando en realidad
       nunca se llegó hasta él. */
    if (p === 'rpc/create_club') {
      const env = JSON.parse(req.postData() ?? '{}');
      escrito.clubs.push({ name: env.club_name });
      return route.fulfill(j({ ok: true, id: 'club-nuevo', name: env.club_name, short_name: env.club_short_name }));
    }
    if (p.startsWith('rpc/')) return route.fulfill(j({ ok: true }));

    const filas = filasEnviadas(req);
    if (escrito[p]) escrito[p].push(...filas);

    const devuelto = filas.map((f, i) => ({
      ...f,
      id: p === 'teams' ? 'equipo-nuevo' : (f.id ?? `${p}-${i}`),
      club_id: f.club_id ?? 'club-nuevo',
    }));
    return route.fulfill(j(req.headers()['prefer']?.includes('single') ? devuelto[0] : devuelto));
  }

  /* Las lecturas siguen diciendo que esta cuenta no tiene nada. */
  if (p === 'profiles') return route.fulfill(j(
    new URL(req.url()).searchParams.has('id')
      ? { id: USER, full_name: '', role: null, email: USUARIO.email, licence: null, phone: null }
      : [],
  ));
  if (p === 'club_members') return route.fulfill(j(null));
  if (p === 'plans') return route.fulfill(j(PLANES));
  return route.fulfill(j([]));
});

await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);

console.log('\n  el alta, de cero\n');

await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

/* ── 1 · Sin club, al alta ─────────────────────────────────────────────── */
const hayAlta = await page.getByText('Vamos a montar tu club').count();
comprueba('sin club, la aplicación lleva al alta', hayAlta > 0);
if (hayAlta === 0) {
  console.log('\n  El alta no sale: no se puede seguir.\n');
  await navegador.close();
  process.exit(1);
}

const pulsa = async (texto, espera = 700) => {
  await page.getByRole('button', { name: texto, exact: false }).first().click();
  await page.waitForTimeout(espera);
};

/** El texto de `main`, para decir en qué paso se ha quedado si algo falla. */
const dondeEstoy = async () => (await page.locator('main').innerText()).replace(/\n+/g, ' · ').slice(0, 90);

/* ── 2 · Empezar, saltarse el código ───────────────────────────────────── */
await pulsa('Empezar');
/* EL CÓDIGO DE ACCESO YA NO ESTÁ EN EL ALTA. Era un teclado numérico entero
   dentro de una tarjeta: en un iPhone el cero y el «Ahora no» quedaban
   cortados por abajo, y además pedía inventarse un PIN a alguien que todavía
   no ha visto el producto. Se pone desde Ajustes. */

/* ── 3 · Nombre y cargo ────────────────────────────────────────────────── */
comprueba('pregunta el nombre', (await page.getByText('¿Cómo te llamas?').count()) > 0);
await page.getByLabel('Nombre y apellidos').fill('Marta Vives');
await pulsa('Continuar');
await page.waitForTimeout(500);

/* El cargo son botones, uno por cargo: hay que elegir antes de seguir. */
comprueba('pregunta el cargo', (await page.getByText('¿Qué haces en el club?').count()) > 0,
  await dondeEstoy());
await pulsa('Coordinador', 300);
await pulsa('Continuar', 1000);

/* ── 4 · El club ───────────────────────────────────────────────────────── */
const hayClub = await page.getByLabel('Nombre del club').count();
comprueba('pregunta el club', hayClub > 0, await dondeEstoy());
if (hayClub > 0) {
  await page.getByRole('textbox').first().fill('CE Prueba');
  await pulsa('Crear el club', 1800);
}

comprueba('el nombre y el cargo se escriben en el perfil',
  escrito.profiles.some((f) => String(f.full_name ?? '').includes('Marta')),
  JSON.stringify(escrito.profiles.map((f) => f.full_name)));
comprueba('el club se crea con su nombre',
  escrito.clubs.some((f) => f.name === 'CE Prueba'),
  JSON.stringify(escrito.clubs.map((f) => f.name)));

/* ── 4 · El deporte ────────────────────────────────────────────────────────
   Paso nuevo: sale entre el club y el equipo, lee la tabla `sports` y decide
   cómo se llaman las cosas a partir de aquí. Se deja en fútbol, que es el
   valor por defecto, y se sigue. */
const hayDeporte = (await page.getByText('¿A qué jugáis?').count()) > 0;
comprueba('pregunta el deporte', hayDeporte, await dondeEstoy());
if (hayDeporte) await pulsa('Continuar', 600);

/* ── 5 · El equipo y su horario ────────────────────────────────────────── */
const hayEquipo = await page.getByText('equipo', { exact: false }).count() > 0
  && (await page.locator('main').innerText()).includes('PASO 5');
comprueba('pregunta el equipo', hayEquipo, await dondeEstoy());

if (hayEquipo) {
  const cajas = page.getByRole('textbox');
  await cajas.first().fill('Cadete A');
  if (await cajas.count() > 1) await cajas.nth(1).fill('Cadete');
  await pulsa('Continuar', 900);

  comprueba('pregunta cuándo entrenáis', (await page.getByText('¿Cuándo entrenáis?').count()) > 0);

  /* Un horario: se añade la fila y se rellenan día, inicio y fin. */
  await pulsa('Añadir un día');
  await page.waitForTimeout(400);

  const horas = page.locator('input[type="time"]');
  const cuantas = await horas.count();
  comprueba('la fila del horario tiene hora de inicio y de fin', cuantas >= 2, `${cuantas} campos de hora`);
  if (cuantas >= 2) {
    await horas.nth(0).fill('18:30');
    await horas.nth(1).fill('20:00');
  }
  /* El día: el primer desplegable de la fila. */
  const dias = page.locator('select');
  if (await dias.count() > 0) await dias.first().selectOption({ index: 2 }).catch(() => {});

  await page.waitForTimeout(300);
  /* El último paso del equipo no dice «Continuar»: dice lo que hace. */
  await pulsa('Crear el equipo', 2200);
}

/* ── 6 · Lo que se ha escrito de verdad ────────────────────────────────── */
console.log('\n  lo que llega al servidor\n');

const equipo = escrito.teams[0];
comprueba('el equipo se crea', Boolean(equipo), JSON.stringify(escrito.teams.map((t) => t.name)));
if (equipo) {
  comprueba('con su nombre', equipo.name === 'Cadete A', String(equipo.name));
  const slots = equipo.training_slots ?? [];
  comprueba('y con el horario dentro de la ficha', Array.isArray(slots) && slots.length > 0,
    JSON.stringify(slots));
}

/* LA COMPROBACIÓN QUE FALTABA. El alta promete que el horario llena el
   calendario; el calendario pinta sesiones. Si no se escribe ninguna sesión,
   la promesa es falsa por mucho que el horario esté guardado en el equipo. */
comprueba(
  'EL HORARIO SE CONVIERTE EN ENTRENAMIENTOS DE VERDAD',
  escrito.sessions.length > 0,
  `${escrito.sessions.length} entrenamientos escritos`,
);

if (escrito.sessions.length > 0) {
  const s = escrito.sessions;
  comprueba('todos a la hora del horario',
    s.every((x) => x.start_time === '18:30'),
    [...new Set(s.map((x) => x.start_time))].join(', '));
  comprueba('con la duración del horario (90 minutos)',
    s.every((x) => x.duration === 90),
    [...new Set(s.map((x) => x.duration))].join(', '));
  comprueba('todos el mismo día de la semana',
    new Set(s.map((x) => new Date(`${x.date}T12:00:00`).getDay())).size === 1,
    [...new Set(s.map((x) => new Date(`${x.date}T12:00:00`).getDay()))].join(', '));
  comprueba('repartidos semana tras semana, no todos el mismo día',
    new Set(s.map((x) => x.date)).size === s.length,
    `${new Set(s.map((x) => x.date)).size} fechas distintas de ${s.length}`);
  comprueba('y son unas cuantas: tres meses dan más de ocho',
    s.length >= 8, `${s.length}`);
}

/* EL FALLO DE PRODUCCIÓN, VIGILADO AQUÍ TAMBIÉN. Al escribir varias filas de
   golpe, una clave con valor `undefined` viaja igual en `?columns=` y PostgREST
   le pone NULL. Con `id` eso tumba el alta entera. */
const conIdNulo = Object.entries(escrito).flatMap(([tabla, filas]) =>
  filas.filter((f) => 'id' in f && f.id === null).map(() => tabla));
comprueba('ninguna fila sale con el identificador en nulo', conIdNulo.length === 0,
  conIdNulo.join(', '));

await ctx.close();
await navegador.close();

console.log(
  fallos === 0
    ? '\n  El alta guarda todo lo que pregunta, y el horario llena el calendario.\n'
    : `\n  ${fallos} fallo(s) en el alta.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
