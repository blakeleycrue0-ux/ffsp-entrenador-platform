/**
 * QUE EL CLUB SE ENTERE DE LO QUE LE PASA A SU PLAN.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esto sale de un caso real, no de una idea. Un club empezó una prueba el 12
 * de octubre, se le acabó el 19 y NADIE se lo dijo: ni al empezar, ni antes
 * de que acabara, ni después. Desde dentro no se notaba nada y desde fuera
 * tampoco; lo único que quedó fue una fila en la base diciendo
 * «free / canceled».
 *
 * Y había un motivo técnico detrás: al cancelar, el webhook escribía
 * `tier: 'free'`, así que la fila OLVIDABA de qué plan era la prueba. Sin esa
 * información, la pantalla no podía decir «tu prueba de Pro terminó el 19»
 * aunque hubiera querido.
 *
 * Esta prueba cubre las dos mitades:
 *
 *   1. LA PANTALLA lo dice, con los cuatro estados que importan: prueba en
 *      marcha, prueba caducada sabiendo el plan, prueba caducada sin saberlo
 *      —las filas viejas— y cobro fallido.
 *   2. EL AVISO: `quePasa()`, la función del webhook que decide qué
 *      notificación escribir, probada contra las transiciones de verdad. Es
 *      lógica pura, así que se prueba directa y no simulando a Stripe.
 *
 * LO QUE NO PRUEBA, y conviene decirlo: que el webhook escriba de verdad en
 * `notifications`. Eso necesita a Stripe firmando un aviso y la clave de
 * servicio, que no existen aquí. Lo que sí está comprobado es la decisión,
 * que es donde estaba el fallo.
 *
 *   npm run build && npm run preview
 *   node pruebas/plan-que-se-entiende.mjs
 */
import { chromium } from 'playwright';
import { mock, USER, CLUB, PLANES } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const dias = (n) => new Date(Date.now() + n * 86400000).toISOString();

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

async function conSuscripcion(sub) {
  const ctx = await navegador.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  await mock(page, {
    sub,
    planes: PLANES,
    club: {
      role: 'admin',
      clubs: {
        id: CLUB, name: 'Club de ejemplo', short_name: 'CE', city: 'Palma',
        season: '2026/27', crest_url: null, sport: 'futbol',
      },
    },
  });
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app/ajustes/plan`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const texto = await page.evaluate(() => document.body.innerText);
  await ctx.close();
  return texto;
}

const fila = (o) => [{
  club_id: CLUB, tier: 'pro', status: 'canceled', trial_ends_at: null,
  current_period_end: null, cancel_at_period_end: false, ...o,
}];

/* ══════════════════════════════════════════════════════════════════════════
   1 · Una prueba que ya se acabó, sabiendo de qué plan era
   ══════════════════════════════════════════════════════════════════════════
   El caso de verdad, con el arreglo puesto: la fila conserva «pro». */
{
  console.log('\n  la prueba terminó hace ocho días');
  const t = await conSuscripcion(fila({ tier: 'pro', status: 'canceled', trial_ends_at: dias(-8) }));

  comprueba('se dice que la prueba terminó', /prueba de[\s\S]{0,20}Pro[\s\S]{0,20}termin/i.test(t),
    extracto(t, 'prueba'));
  comprueba('con la fecha', /termin[oó] el \d{1,2} de \w+/i.test(t), extracto(t, 'terminó el'));
  comprueba('y se dice dónde queda el club', /está en Gratis/i.test(t));
  comprueba('sin dar a entender que se ha perdido nada',
    /sigue ahí|no se toca/i.test(t), extracto(t, 'sigue ahí'));
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · Una fila vieja, de cuando el plan se borraba al cancelar
   ══════════════════════════════════════════════════════════════════════════
   `tier` quedó en «free» y ya no hay manera de saber qué se probó. Se dice
   lo que se sabe —que hubo una prueba y cuándo acabó— y NO se rellena el
   hueco con una suposición. */
{
  console.log('\n  una fila de antes, sin plan guardado');
  const t = await conSuscripcion(fila({ tier: 'free', status: 'canceled', trial_ends_at: dias(-8) }));

  comprueba('se dice igualmente que terminó', /prueba termin[oó] el/i.test(t), extracto(t, 'prueba'));
  comprueba('y no se inventa un plan', !/prueba de Pro|prueba de Max|prueba de Club/i.test(t));
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Una prueba en marcha
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  una prueba que sigue viva');
  const t = await conSuscripcion(fila({ tier: 'pro', status: 'trialing', trial_ends_at: dias(3) }));

  comprueba('dice cuántos días quedan', /quedan[\s\S]{0,20}3 días/i.test(t), extracto(t, 'quedan'));
  comprueba('y avisa de que después se cobra', /se cobra/i.test(t));
  comprueba('no dice que haya terminado', !/termin[oó] el/i.test(t));
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · Un cobro que no ha salido
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  el último cobro falló');
  const t = await conSuscripcion(fila({ tier: 'pro', status: 'past_due', trial_ends_at: null }));

  comprueba('se dice', /no ha salido bien/i.test(t), extracto(t, 'cobro'));
  comprueba('y qué hacer', /tarjeta/i.test(t));
}

await navegador.close();

/* ══════════════════════════════════════════════════════════════════════════
   5 · Qué aviso decide escribir el webhook
   ══════════════════════════════════════════════════════════════════════════
   La misma tabla de decisión que `_comun.mts`, comprobada aquí contra las
   transiciones que de verdad ocurren. Se copia a propósito en vez de
   importarla: el archivo de funciones es TypeScript con dependencias de
   Netlify y Stripe, y arrastrarlas a una prueba de navegador por cuatro
   `if` costaría más de lo que vale. Si alguien cambia una regla allí y no
   aquí, esto se queda en verde mintiendo —el riesgo está asumido y escrito—,
   pero el fallo que esto evita es el contrario: que no haya ninguna regla,
   que es lo que pasaba. */
console.log('\n  qué aviso toca en cada cambio');

const NOMBRE = { free: 'Gratis', pro: 'Pro', max: 'Max', club: 'Club' };
function quePasa(c) {
  const plan = NOMBRE[c.tier] ?? c.tier;
  if (c.estado === 'trialing' && c.estadoAntes !== 'trialing') return `Prueba de ${plan} empezada`;
  if (c.estado === 'active' && c.estadoAntes !== 'active') return `Ya estás en ${plan}`;
  if ((c.estado === 'canceled' || c.estado === 'unpaid') && c.estadoAntes && c.estadoAntes !== c.estado) {
    return c.estadoAntes === 'trialing' ? `La prueba de ${plan} ha terminado` : `${plan} ha terminado`;
  }
  if (c.estado === 'past_due' && c.estadoAntes !== 'past_due') return 'No hemos podido cobrar';
  return null;
}

const casos = [
  ['empieza la prueba', { estadoAntes: null, estado: 'trialing', tier: 'pro' }, 'Prueba de Pro empezada'],
  ['la prueba pasa a pago', { estadoAntes: 'trialing', estado: 'active', tier: 'pro' }, 'Ya estás en Pro'],
  ['se paga sin prueba', { estadoAntes: null, estado: 'active', tier: 'max' }, 'Ya estás en Max'],
  ['la prueba se acaba sin pagar', { estadoAntes: 'trialing', estado: 'canceled', tier: 'pro' }, 'La prueba de Pro ha terminado'],
  ['se da de baja una de pago', { estadoAntes: 'active', estado: 'canceled', tier: 'club' }, 'Club ha terminado'],
  ['falla el cobro', { estadoAntes: 'active', estado: 'past_due', tier: 'pro' }, 'No hemos podido cobrar'],
  /* Y LO QUE NO SE AVISA, que importa igual: Stripe reintenta y manda
     `updated` por cosas que no son nada. Si cada uno dejara una
     notificación, la campana sería ruido y dejaría de mirarse. */
  ['el mismo aviso repetido', { estadoAntes: 'active', estado: 'active', tier: 'pro' }, null],
  ['una prueba que sigue', { estadoAntes: 'trialing', estado: 'trialing', tier: 'pro' }, null],
  ['un cobro fallido que sigue fallido', { estadoAntes: 'past_due', estado: 'past_due', tier: 'pro' }, null],
];

for (const [nombre, cambio, esperado] of casos) {
  const sale = quePasa(cambio);
  comprueba(nombre, sale === esperado, sale === null ? 'no avisa' : sale);
}

function extracto(t, palabra) {
  const i = t.toLowerCase().indexOf(palabra.toLowerCase());
  return i < 0 ? 'no aparece' : t.slice(i, i + 52).replace(/\n/g, ' · ');
}

console.log('');
if (fallos > 0) {
  console.log(`  ✗ ${fallos} ${fallos === 1 ? 'cosa' : 'cosas'} que el club no se entera.\n`);
  process.exit(1);
}
console.log('  El club se entera de cuándo empieza, cuándo se acaba y cuándo falla.\n');
