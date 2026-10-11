/**
 * La guía de primeros pasos.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LO QUE DE VERDAD HAY QUE VIGILAR AQUÍ no es que salga la tarjeta: es que
 * las marcas NO MIENTAN. Una guía de bienvenida se estropea siempre de la
 * misma manera —guardando en algún sitio «este paso ya está» y no volviendo a
 * mirar—, y entonces dice que has pasado lista cuando has borrado la lista.
 *
 * Por eso casi todas las comprobaciones de abajo son la misma jugada: se
 * sirve una base distinta y se mira que la marca cambie sola. Sin pulsar
 * nada, sin recargar nada guardado.
 *
 * Lo demás es lo que pidió quien la encargó: que se tache lo hecho, que
 * desaparezca al terminar y que se pueda apagar.
 *
 *   npm run build && npm run preview
 *   node pruebas/primeros-pasos.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { mock, USER, TEAMS, PLAYERS, SESSIONS, MATCHES, ATTENDANCE, CLUB_ROW } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';
mkdirSync('salida/primeros-pasos', { recursive: true });

const PASOS = [
  'Crea tu equipo',
  'Mete a tus jugadoras',
  'Pon el horario de entrenamiento',
  'Prepara tu primer entrenamiento',
  'Pasa tu primera lista',
  'Apunta el primer partido',
];

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/** Abre Inicio con la base que se le dé. Devuelve la página y lo leído. */
async function inicio(opciones = {}, ancho = 1280) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: 900 }, deviceScaleFactor: 1,
    isMobile: ancho < 500, hasTouch: ancho < 900,
  });
  const page = await ctx.newPage();
  const escrituras = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && r.url().includes('/rest/v1/profiles')) {
      escrituras.push(r.postData() ?? '');
    }
  });
  await mock(page, opciones);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { ctx, page, escrituras };
}

/**
 * Qué pasos salen y cuáles están tachados.
 *
 * LA GUÍA YA NO ES UNA TARJETA CON LA LISTA DENTRO: es una tira con el aro
 * de progreso, y la lista vive en una hoja que se abre al tocarla. Así que
 * esto abre la hoja, lee, y la cierra. Lo que se comprueba es lo mismo de
 * siempre —qué pasos hay y cuáles están tachados—; lo que ha cambiado es
 * dónde hay que mirar.
 */
async function leeGuia(page) {
  /* `:visible` NO SOBRA. Inicio tiene dos composiciones en el marcado —la
     del móvil y la del escritorio—, y una de las dos está siempre oculta por
     CSS. Sin filtrar, el localizador cogía la tira del móvil estando en
     1.280 px y se quedaba esperando a que apareciera algo que nunca iba a
     aparecer. */
  const tira = page.locator('button:has-text("Pon tu equipo en marcha"):visible').first();
  if (await tira.count() === 0) return null;

  const progreso = await page.evaluate(() => {
    const b = [...document.querySelectorAll('[role="progressbar"]')].find((el) => el.offsetParent !== null);
    return b ? { lleva: Number(b.getAttribute('aria-valuenow')), total: Number(b.getAttribute('aria-valuemax')) } : null;
  });

  await tira.click();
  await page.waitForTimeout(450);
  const pasos = await page.evaluate(() => {
    const hoja = document.querySelector('[role="dialog"]');
    if (!hoja) return [];
    return [...hoja.querySelectorAll('li')].map((li) => {
      const t = li.querySelector('span > span');
      const enlace = li.querySelector('a');
      return {
        titulo: t?.textContent?.trim() ?? '',
        tachado: t ? getComputedStyle(t).textDecorationLine.includes('line-through') : false,
        accion: enlace?.textContent?.trim() ?? null,
        a: enlace?.getAttribute('href') ?? null,
      };
    });
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);

  return { lleva: progreso?.lleva, total: progreso?.total, pasos };
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · Un club recién creado: todo por hacer
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  club vacío');
  const { ctx, page } = await inicio({ equipos: [], players: [] });
  const g = await leeGuia(page);

  comprueba('la guía sale', g !== null);
  if (g) {
    comprueba('están los seis pasos', g.pasos.map((p) => p.titulo).join(' | ') === PASOS.join(' | '),
      g.pasos.map((p) => p.titulo).join(' | '));
    comprueba('ninguno tachado', g.pasos.every((p) => !p.tachado));
    comprueba('el aro está a cero', g.lleva === 0 && g.total === 6, `${g.lleva}/${g.total}`);
    comprueba('el primero lleva a crear equipo',
      g.pasos[0].a === '/app/equipo-tecnico/nuevo-equipo', String(g.pasos[0].a));
    /* Sin equipo todavía no existe la ficha donde se pone el horario: ese
       paso se queda escrito pero sin botón, en vez de llevar a ningún sitio. */
    comprueba('el horario todavía no tiene a dónde llevar', g.pasos[2].a === null, String(g.pasos[2].a));
  }
  await page.screenshot({ path: 'salida/primeros-pasos/vacio.png', animations: 'disabled' });
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · LAS MARCAS SALEN DE LA BASE, NO DE UNA CASILLA GUARDADA
   ══════════════════════════════════════════════════════════════════════════
   Se sirve el club entero menos UNA cosa cada vez, y se mira que se destache
   exactamente ese paso y ninguno más. Es la prueba de que la guía está
   mirando el dato y no un recuerdo. */
{
  console.log('\n  cada marca mira su dato');
  const casos = [
    ['sin jugadoras', { players: [] }, 'Mete a tus jugadoras'],
    ['sin sesiones', { sessions: [] }, 'Prepara tu primer entrenamiento'],
    ['sin listas', { attendance: [] }, 'Pasa tu primera lista'],
    ['sin partidos', { matches: [] }, 'Apunta el primer partido'],
  ];
  /* El club completo lleva horario puesto: así el único paso pendiente en
     cada caso es el que se quita. */
  const COMPLETO = {
    equipos: TEAMS.map((t) => ({ ...t, training_slots: [{ weekday: 2, start: '18:30', duration: 90 }] })),
    players: PLAYERS, sessions: SESSIONS, matches: MATCHES, attendance: ATTENDANCE,
  };

  for (const [nombre, quita, esperado] of casos) {
    const { ctx, page } = await inicio({ ...COMPLETO, ...quita });
    const g = await leeGuia(page);
    const sinTachar = (g?.pasos ?? []).filter((p) => !p.tachado).map((p) => p.titulo);
    comprueba(`${nombre}: se destacha «${esperado}» y sólo ése`,
      sinTachar.length === 1 && sinTachar[0] === esperado, sinTachar.join(', ') || 'ninguno');
    await ctx.close();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Cuando está todo hecho, desaparece sola
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  todo hecho');
  const { ctx, page } = await inicio({
    equipos: TEAMS.map((t) => ({ ...t, training_slots: [{ weekday: 2, start: '18:30', duration: 90 }] })),
  });
  comprueba('la guía ya no sale', (await leeGuia(page)) === null);
  comprueba('y el saludo es lo primero',
    (await page.locator('main h1').first().textContent())?.includes('Hola'));
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · Se puede apagar, y se apaga EN LA BASE
   ══════════════════════════════════════════════════════════════════════════
   Lo importante no es que la tarjeta se vaya de la pantalla: es que la
   decisión salga del navegador. Si se guardara sólo aquí, quien la apaga en
   el móvil se la volvería a encontrar en el ordenador. */
{
  console.log('\n  apagarla');
  const { ctx, page, escrituras } = await inicio({ equipos: [], players: [] });
  /* Apagarla está dentro de la hoja, al pie: es una decisión que se toma
     después de ver lo que hay, no un aspa en la esquina que se pulsa sin
     querer al bajar con el dedo. */
  await page.locator('button:has-text("Pon tu equipo en marcha"):visible').first().click();
  await page.waitForTimeout(450);
  comprueba('hay manera de apagarla',
    await page.getByRole('button', { name: 'No volver a enseñar esto' }).count() === 1);
  await page.getByRole('button', { name: 'No volver a enseñar esto' }).click();
  await page.waitForTimeout(900);

  comprueba('se escribe en el perfil', escrituras.length === 1, `${escrituras.length} escrituras`);
  comprueba('y lo que se escribe es la fecha de apagado',
    /setup_hidden_at/.test(escrituras[0] ?? '') && !/null/.test(escrituras[0] ?? ''),
    escrituras[0]);
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · Quien no administra el club no ve pasos que no puede dar
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  sin ser administración del club');
  const { ctx, page } = await inicio({
    equipos: [], players: [],
    club: { ...CLUB_ROW, role: 'miembro' },
  });
  const g = await leeGuia(page);
  comprueba('no se le ofrece crear un equipo',
    g === null || !g.pasos.some((p) => p.titulo === 'Crea tu equipo'),
    g ? g.pasos.map((p) => p.titulo).join(', ') : 'sin guía');
  await ctx.close();
}

await navegador.close();
console.log(fallos === 0
  ? '\n  Las marcas salen de la base, se tachan solas y la guía se puede apagar.'
  : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
