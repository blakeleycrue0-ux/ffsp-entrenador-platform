/**
 * CUOTAS: QUE LAS CUENTAS CUADREN Y QUE NO PROMETA LO QUE NO HACE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esta pantalla enseña importes y la palabra «Pagado». Las dos cosas que
 * pueden salir mal son graves de distinta manera:
 *
 *   1. QUE LAS CIFRAS NO CUADREN. Un resumen que dice «cobrado 70 €» cuando
 *      hay dos recibos de 35 pagados y uno pendiente es una contabilidad
 *      equivocada, y alguien va a reclamar un dinero que ya tenía.
 *   2. QUE PAREZCA UNA PASARELA DE PAGO. Playoff360 no cobra nada: lo apunta
 *      una persona. Si la pantalla no lo dice donde se ven los importes,
 *      quien la mire creerá que el dinero ha pasado por algún sitio.
 *
 * Y una tercera, de permisos: las cuotas son datos económicos de familias
 * con hijos menores. Quien no administra el club no los ve. Aquí se
 * comprueba que la pantalla lo diga —la política de la base es quien lo
 * impone de verdad, y eso no se puede comprobar desde un navegador con el
 * servidor simulado, así que se dice y no se finge que se ha probado—.
 *
 *   npm run build && npm run preview
 *   node pruebas/cuotas.mjs
 */
import { chromium } from 'playwright';
import { mock, USER, CLUB, PLAYERS, TEAMS } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const hoy = new Date();
const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
const ayer = new Date(hoy.getTime() - 86400000).toISOString().slice(0, 10);

const CUOTA = {
  id: 'c1', club_id: CLUB, team_id: null, name: 'Cuota mensual 2026/27',
  amount_cents: 3500, period: 'mensual', due_day: 5, season: null,
  active: true, notes: null, created_at: '2026-09-01T00:00:00Z',
};

/* Cuatro recibos a propósito, uno de cada caso: pagado, pendiente al día,
   pendiente y vencido, y exento. Con todos iguales no se vería si el
   resumen distingue. */
const RECIBOS = [
  { id: 'r1', club_id: CLUB, fee_plan_id: 'c1', player_id: PLAYERS[0].id, concept: 'Cuota mensual 2026/27',
    amount_cents: 3500, period_label: periodo, due_date: `${periodo}-05`,
    status: 'pagado', paid_at: '2026-10-03T10:00:00Z', method: 'efectivo', note: '', created_at: '2026-10-01T00:00:00Z' },
  { id: 'r2', club_id: CLUB, fee_plan_id: 'c1', player_id: PLAYERS[1].id, concept: 'Cuota mensual 2026/27',
    amount_cents: 3500, period_label: periodo, due_date: null,
    status: 'pendiente', paid_at: null, method: null, note: '', created_at: '2026-10-01T00:00:01Z' },
  { id: 'r3', club_id: CLUB, fee_plan_id: 'c1', player_id: PLAYERS[2].id, concept: 'Cuota mensual 2026/27',
    amount_cents: 3500, period_label: periodo, due_date: ayer,
    status: 'pendiente', paid_at: null, method: null, note: '', created_at: '2026-10-01T00:00:02Z' },
  { id: 'r4', club_id: CLUB, fee_plan_id: 'c1', player_id: PLAYERS[3].id, concept: 'Cuota mensual 2026/27',
    amount_cents: 3500, period_label: periodo, due_date: `${periodo}-05`,
    status: 'exento', paid_at: null, method: null, note: 'Beca', created_at: '2026-10-01T00:00:03Z' },
];

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/** Abre Cuotas con el rol que se le diga. */
async function abrir({ rol = 'admin', cuotas = [], recibos = [] } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  await mock(page, {
    cuotas,
    recibos,
    club: {
      role: rol,
      clubs: {
        id: CLUB, name: 'Club de ejemplo', short_name: 'CE', city: 'Palma',
        season: '2026/27', crest_url: null, sport: 'futbol',
      },
    },
  });
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app/cuotas`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return { ctx, page, texto: await page.evaluate(() => document.body.innerText) };
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · Las cuentas cuadran
   ══════════════════════════════════════════════════════════════════════════
   Cuatro recibos de 35 €: uno pagado, dos pendientes —uno de ellos vencido—
   y uno exento. Entonces: cobrado 35, pendiente 70, con retraso 35. El
   exento NO suma en ninguna de las tres: una beca no es dinero cobrado ni
   dinero que se deba, y meterla en cualquiera de los dos sacos descuadra. */
{
  console.log('\n  las cuentas del mes');
  const { ctx, page, texto } = await abrir({ cuotas: [CUOTA], recibos: RECIBOS });

  /* LEÍDAS DE LA BALDOSA, no buscando por el texto entero. Regexear
     «Cobrado seguido de 35» a cuarenta caracteres parece que funciona y no:
     a esa distancia ya empieza la baldosa de al lado, así que la
     comprobación daba por buena cualquier cifra de cualquiera de las tres.
     Aquí se coge la etiqueta y se lee SU cifra, la de su misma caja. */
  const baldosas = await page.evaluate(() =>
    [...document.querySelectorAll('div')]
      .map((d) => [...d.children].filter((c) => c.tagName === 'P'))
      .filter((ps) => ps.length >= 2 && /^(cobrado|pendiente|retraso)$/i.test(ps[0].textContent.trim()))
      .map((ps) => ({
        etiqueta: ps[0].textContent.trim().toLowerCase(),
        cifra: ps[1].textContent.trim(),
        pie: ps[2]?.textContent.trim() ?? '',
      })));

  /* El euro va detrás de un espacio DURO —así lo escribe `Intl` en
     español—, no de uno normal. Comparar con un espacio corriente daba
     rojo con la cifra correcta en pantalla. */
  const limpia = (s) => (s ?? '').replace(/\u00a0/g, ' ').trim();
  const de = (n) => baldosas.find((b) => b.etiqueta === n);
  comprueba('hay tres cifras de resumen', baldosas.length === 3,
    baldosas.map((b) => `${b.etiqueta}=${b.cifra}`).join(' · ') || 'ninguna');

  comprueba('cobrado: sólo el recibo pagado',
    limpia(de('cobrado')?.cifra) === '35,00 €', limpia(de('cobrado')?.cifra) || 'no está');
  comprueba('pendiente: los dos que faltan',
    limpia(de('pendiente')?.cifra) === '70,00 €', limpia(de('pendiente')?.cifra) || 'no está');
  comprueba('con retraso: sólo el vencido',
    limpia(de('retraso')?.cifra) === '35,00 €', limpia(de('retraso')?.cifra) || 'no está');

  /* EL EXENTO NO ESTÁ EN NINGUNA DE LAS TRES. Cuatro recibos de 35 son 140;
     cobrado más pendiente tienen que dar 105, no 140. Una beca no es dinero
     cobrado ni dinero que se deba. */
  const suma = (s) => Number((s ?? '0').replace(/[^\d,]/g, '').replace(',', '.'));
  comprueba('el exento no se cuela en ninguna cifra',
    suma(de('cobrado')?.cifra) + suma(de('pendiente')?.cifra) === 105,
    `${suma(de('cobrado')?.cifra)} + ${suma(de('pendiente')?.cifra)} de 140 emitidos`);

  comprueba('y se marca como exento en su fila', /Exento/.test(texto));
  comprueba('el vencido se marca', /Vencido/.test(texto));

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · No se hace pasar por una pasarela de pago
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  dice lo que es');
  const { ctx, texto } = await abrir({ cuotas: [CUOTA], recibos: RECIBOS });

  comprueba('avisa de que no cobra ni mueve dinero',
    /no cobra ni mueve dinero/i.test(texto));
  comprueba('y de que «pagado» lo marca una persona',
    /alguien lo ha marcado/i.test(texto));

  /* Y que el aviso esté JUNTO a los importes, no al final de la pantalla:
     una advertencia a trescientos píxeles de lo que advierte no la lee
     nadie. Se mide la distancia de verdad. */
  const { page } = await abrir({ cuotas: [CUOTA], recibos: RECIBOS });
  const dist = await page.evaluate(() => {
    const todos = [...document.querySelectorAll('p')];
    const aviso = todos.find((e) => /no cobra ni mueve dinero/i.test(e.textContent ?? ''));
    const cifra = todos.find((e) => /^Cobrado$/i.test((e.textContent ?? '').trim()));
    if (!aviso || !cifra) return null;
    return Math.round(aviso.getBoundingClientRect().top - cifra.getBoundingClientRect().bottom);
  });
  comprueba('el aviso está pegado a las cifras',
    dist !== null && dist >= 0 && dist < 140, dist === null ? 'no se encuentra' : `${dist} px`);

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Sin cuotas no se enseña una tabla de ceros
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  un club que todavía no cobra nada');
  const { ctx, texto } = await abrir({ cuotas: [], recibos: [] });

  comprueba('explica qué es una cuota', /Todav[ií]a no hay ninguna cuota/i.test(texto));
  comprueba('y ofrece crearla', /Crear una cuota/i.test(texto));
  comprueba('sin inventarse un cero', !/0,00\s*€/.test(texto), extracto(texto, '0,00'));

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · Con cuota pero sin recibos de este mes
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  hay cuota pero el mes está sin emitir');
  const { ctx, texto } = await abrir({ cuotas: [CUOTA], recibos: [] });

  comprueba('lo dice', /Sin recibos de/i.test(texto));
  comprueba('y ofrece emitirlos con su importe', /Emitir[\s\S]{0,60}35,00/.test(texto),
    extracto(texto, 'Emitir'));

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · Quien no administra el club no ve el dinero
   ══════════════════════════════════════════════════════════════════════════
   OJO CON LO QUE ESTO PRUEBA Y LO QUE NO. Comprueba la PANTALLA, con el
   servidor simulado. Quien de verdad impide leer la tabla es la política de
   `fee_charges`, que pide `is_club_admin`, y eso no se puede ejercitar desde
   aquí porque el simulacro contesta lo que se le diga. Las dos capas existen
   a propósito; ésta sólo mira la de arriba. */
{
  console.log('\n  alguien que no administra el club');
  const { ctx, texto } = await abrir({ rol: 'coach', cuotas: [CUOTA], recibos: RECIBOS });

  comprueba('se le explica de quién es esta pantalla',
    /la dirección del club/i.test(texto));
  comprueba('y no se le enseña ningún importe', !/35,00|70,00/.test(texto),
    extracto(texto, ',00'));
  comprueba('ni el nombre de nadie con un recibo',
    !texto.includes(PLAYERS[0].name.split(' ')[0]) || !/Marcar|Pagado/.test(texto));

  await ctx.close();
}

await navegador.close();

/* También sin distinguir mayúsculas, o el detalle dice «no aparece» en
   verde y la prueba deja de ser creíble. */
function extracto(t, palabra) {
  const i = t.toLowerCase().indexOf(palabra.toLowerCase());
  return i < 0 ? 'no aparece' : t.slice(i, i + 46).replace(/\n/g, ' · ');
}

console.log('');
if (fallos > 0) {
  console.log(`  ✗ ${fallos} ${fallos === 1 ? 'cosa' : 'cosas'} mal en las cuotas.\n`);
  process.exit(1);
}
console.log('  Las cuentas cuadran, el exento no se cuela y la pantalla dice lo que es.\n');
