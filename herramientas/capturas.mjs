/**
 * Capturas del producto para la página pública.
 * ---------------------------------------------------------------------------
 * Son pantallas REALES de la aplicación, rellenadas con un club de ejemplo
 * llamado así, «Club Deportivo Ejemplo», para que nadie lo confunda con un
 * cliente. No hay ni un pixel dibujado a mano.
 *
 * Este archivo no forma parte de la aplicación: genera los archivos de
 * public/producto y se ejecuta a mano cuando la interfaz cambia.
 *
 *   npm run build && npm run preview     (en otra terminal, puerto 4173)
 *   node herramientas/capturas.mjs       (desde la raíz del repositorio)
 *
 * Los datos de abajo son de mentira a propósito y sólo viven aquí: nunca
 * llegan a la aplicación, que siempre lee de Supabase.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'public/producto';
const REF = 'sqhavilwnypxxoqmrpkf';
const USER = '11111111-1111-1111-1111-111111111111';
const TEAM = '22222222-2222-2222-2222-222222222222';
const CLUB = '33333333-3333-3333-3333-333333333333';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256' })}.${b64({ sub: USER, exp: Math.floor(Date.now() / 1000) + 86400 })}.x`;

const hoy = new Date();
const iso = (d) => new Date(hoy.getTime() + d * 86400000).toISOString().slice(0, 10);

const nombres = [
  'Marta Ribas', 'Clara Vidal', 'Aina Coll', 'Nuria Serra', 'Lucía Pons', 'Irene Mas',
  'Paula Bonet', 'Sara Ferrer', 'Neus Amengual', 'Julia Roca', 'Carla Sastre', 'Elena Moll',
  'Rocío Bauzá', 'Laia Cerdá', 'Ona Pujol', 'Berta Nadal',
];
const posiciones = ['Portera', 'Central', 'Lateral derecha', 'Pivote', 'Interior', 'Extremo izquierda', 'Delantera'];

const TABLES = {
  profiles: [{ id: USER, full_name: 'Ana Torres', email: 'ana@ejemplo.com', role: 'entrenadora' }],
  club_members: [{
    role: 'admin',
    clubs: { id: CLUB, name: 'Club Deportivo Ejemplo', short_name: 'CD Ejemplo', season: '2025/26', crest_url: null },
  }],
  teams: [{
    id: TEAM, name: 'Femenino A', category: 'Senior', season: '2025/26', competition: 'Liga Autonómica',
    venue: 'Campo Municipal', training_slots: [{ weekday: 2, start: '19:00', end: '20:30', venue: 'Campo 1' }],
    club_id: CLUB, created_by: USER,
  }],
  team_staff: [{ team_id: TEAM, profile_id: USER, role: 'entrenadora' }],
  players: nombres.map((name, i) => ({
    id: `p${i}`, team_id: TEAM, name, short_name: name.split(' ')[0], number: i + 1,
    position: posiciones[i % posiciones.length], foot: 'Diestra', guardians: [],
    availability_status: i === 3 ? 'lesionada' : i === 7 ? 'duda' : 'disponible',
    stats: { matches: 7 - (i % 3), minutes: 420 - i * 11, goals: i % 4, assists: i % 3, yellow: i % 2, red: 0 },
    joined_at: iso(-140), created_at: hoy.toISOString(),
  })),
  sessions: [
    { id: 's1', team_id: TEAM, title: 'Salida de balón y presión tras pérdida', date: iso(0), start_time: '19:00',
      duration: 90, venue: 'Campo 1', objective: 'Progresar desde atrás con superioridad', expected_players: 16,
      material: ['Conos', 'Petos', 'Balones'], blocks: [], status: 'planificado' },
    { id: 's2', team_id: TEAM, title: 'Finalización y últimos metros', date: iso(2), start_time: '19:00',
      duration: 85, venue: 'Campo 1', objective: 'Centro y remate', expected_players: 16,
      material: ['Porterías'], blocks: [], status: 'planificado' },
    { id: 's3', team_id: TEAM, title: 'Repliegue y coberturas', date: iso(-3), start_time: '19:00',
      duration: 90, venue: 'Campo 1', objective: 'Defensa del espacio', expected_players: 16,
      material: [], blocks: [], status: 'completado' },
  ],
  matches: [{
    id: 'm1', team_id: TEAM, opponent: 'CE Rival', competition: 'Liga Autonómica', date: iso(4),
    start_time: '11:00', venue: 'Campo Municipal', home: true, matchday: 7, status: 'programado',
  }],
  attendance: [
    { id: 'a1', session_id: 's3', team_id: TEAM, date: iso(-3),
      marks: Object.fromEntries(nombres.map((_, i) => [`p${i}`, { mark: i === 3 ? 'lesionada' : i === 9 ? 'ausente' : i === 5 ? 'tarde' : 'presente' }])),
      saved_at: hoy.toISOString() },
    { id: 'a2', session_id: 's4', team_id: TEAM, date: iso(-10),
      marks: Object.fromEntries(nombres.map((_, i) => [`p${i}`, { mark: i === 3 ? 'lesionada' : i === 11 ? 'ausente' : 'presente' }])),
      saved_at: hoy.toISOString() },
  ],
  drills: [
    { id: 'd1', name: 'Rondo 5v2 en cuadrado', objective: 'Circulación rápida', tags: ['Posesión', 'Técnica'],
      age_range: 'Senior', players_range: '7', duration: 12, material: ['Conos', 'Balones'],
      description: 'Dos jugadoras presionan dentro del cuadrado.', progressions: [], tactic: [], created_by: USER },
    { id: 'd2', name: 'Salida 3+1 contra 3', objective: 'Progresar desde portera', tags: ['Ataque', 'Táctica'],
      age_range: 'Senior', players_range: '10', duration: 20, material: ['Porterías', 'Petos'],
      description: 'Se inicia siempre con la portera.', progressions: [], tactic: [], created_by: USER },
  ],
  callups: [], drill_favorites: [], tasks: [], notifications: [], activity: [], plays: [], injuries: [],
};

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--ignore-certificate-errors'],
});

async function capturar(nombre, ruta, vp, preparar) {
  const ctx = await browser.newContext({ ...vp, ignoreHTTPSErrors: true });
  await ctx.route(`**/${REF}.supabase.co/**`, (route) => {
    const url = new URL(route.request().url());
    const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (url.pathname.startsWith('/auth/v1/')) return json({ id: USER });
    if (url.pathname.startsWith('/rest/v1/rpc/')) return json({});
    const table = url.pathname.replace('/rest/v1/', '').split('?')[0];
    const rows = TABLES[table] ?? [];
    const single = (route.request().headers().accept || '').includes('vnd.pgrst.object');
    return json(single ? rows[0] ?? null : rows);
  });
  const page = await ctx.newPage();
  await page.addInitScript(([t, u]) => localStorage.setItem('sb-sqhavilwnypxxoqmrpkf-auth-token',
    JSON.stringify({ access_token: t, refresh_token: 'x', expires_at: Math.floor(Date.now() / 1000) + 86400, user: { id: u } })), [jwt, USER]);
  await page.goto('http://localhost:4173' + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (preparar) await preparar(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${nombre}.png` });
  console.log('✔', nombre, `(${vp.viewport.width}×${vp.viewport.height})`);
  await ctx.close();
}

const escritorio = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const movil = { viewport: { width: 390, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

await capturar('pizarra', '/app/pizarra', escritorio, async (page) => {
  const boton = page.getByRole('button', { name: 'Colocar mi equipo' });
  if (await boton.count()) {
    await boton.click();
    await page.waitForTimeout(400);
  }
  // Un movimiento, para que se vean las trayectorias
  const barra = page.locator('[role="slider"]');
  const bb = await barra.boundingBox();
  if (bb) {
    await page.mouse.click(bb.x + bb.width * 0.55, bb.y + bb.height / 2);
    await page.waitForTimeout(200);
    for (const [dorsal, dx, dy] of [['9', 190, -70], ['11', 150, 40], ['8', 120, -20]]) {
      const j = page.locator('svg g[transform]').filter({ hasText: new RegExp(`^${dorsal}$`) }).first();
      const jb = await j.boundingBox();
      if (!jb) continue;
      await page.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2);
      await page.mouse.down();
      await page.mouse.move(jb.x + dx, jb.y + dy, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(150);
    }
  }
  await page.waitForTimeout(300);
});

await capturar('inicio', '/app', escritorio);
await capturar('analiticas', '/app/analiticas', escritorio);
await capturar('plantilla-movil', '/app/plantilla', movil);
await capturar('entrenamientos-movil', '/app/entrenamientos', movil);

await browser.close();
console.log('\nCapturas en', OUT);
