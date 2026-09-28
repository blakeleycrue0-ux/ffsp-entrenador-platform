/**
 * Las mismas comprobaciones, pero con contenido que no es de catálogo:
 * nombres de una letra, nombres larguísimos, treinta jugadoras y ninguna.
 * Los diseños se rompen con los extremos, no con «Cadete A».
 */
import { chromium } from 'playwright';
import { mock, SUPA, j, PLAYERS, TEAMS, CLUB, USER } from './mock.mjs';

const LARGO = 'Club Deportivo Femenino Ciudad de San Fernando de Henares «B»';
const NOMBRAZO = 'María de los Ángeles Fernández-Villaverde Etxebarría';

const CASOS = {
  'nombres-de-una-letra': {
    equipos: [{ ...TEAMS[0], name: 'B' }],
    players: PLAYERS.slice(0, 3).map((p, i) => ({ ...p, name: 'A', short_name: 'A', position: 'Portera', number: i + 1 })),
  },
  'nombres-larguisimos': {
    equipos: [{ ...TEAMS[0], name: LARGO, category: 'Primera División Femenina Autonómica' }],
    players: PLAYERS.slice(0, 6).map((p) => ({
      ...p, name: NOMBRAZO, short_name: NOMBRAZO, position: 'Lateral izquierda de proyección ofensiva',
    })),
  },
  'treinta-jugadoras': {
    equipos: TEAMS,
    players: Array.from({ length: 30 }, (_, i) => ({
      ...PLAYERS[i % PLAYERS.length], id: `p${i}`, number: i + 1, name: `${PLAYERS[i % PLAYERS.length].name} ${i}`,
    })),
  },
  'sin-jugadoras': { equipos: TEAMS, players: [] },
  'sin-equipos': { equipos: [], players: [] },
};

const RUTAS = ['/app', '/app/plantilla', '/app/entrenamientos', '/app/entrenamientos/s1/asistencia', '/app/analiticas', '/app/equipo-tecnico'];

const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
let fallos = 0;

for (const [nombre, opciones] of Object.entries(CASOS)) {
  for (const ancho of [320, 390]) {
    const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(String(e).slice(0, 100)));
    await mock(page, opciones);
    await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
    await page.route(`${SUPA}/rest/v1/rpc/**`, (r) => r.fulfill(j([])));

    const malos = [];
    for (const ruta of RUTAS) {
      errores.length = 0;
      try {
        await page.goto(`http://localhost:4173${ruta}`, { waitUntil: 'networkidle' });
      } catch { continue; }
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const doc = document.documentElement;
        const m = [];
        if (doc.scrollWidth - doc.clientWidth > 1) m.push(`desborde ${doc.scrollWidth - doc.clientWidth}px`);
        const vacio = (document.querySelector('main')?.innerText ?? '').trim().length < 10;
        if (vacio) m.push('pantalla vacía');
        // Texto que se sale de su caja.
        const fuera = [];
        document.querySelectorAll('main *').forEach((el) => {
          if (el.children.length) return;
          const t = (el.textContent || '').trim();
          if (!t) return;
          if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible') fuera.push(t.slice(0, 22));
        });
        if (fuera.length) m.push(`se sale: ${[...new Set(fuera)].slice(0, 2).join(' / ')}`);
        return m;
      });
      const todos = [...r, ...errores];
      if (todos.length) malos.push(`${ruta} → ${todos.join(' · ')}`);
    }
    if (malos.length) {
      fallos += malos.length;
      console.log(`✗ ${nombre} @${ancho}`);
      malos.forEach((m) => console.log(`    ${m}`));
    } else {
      console.log(`ok ${nombre} @${ancho}`);
    }
    await ctx.close();
  }
}
console.log(fallos ? `\n${fallos} problemas con contenido real.` : '\nEl diseño aguanta el contenido real.');
await b.close();
