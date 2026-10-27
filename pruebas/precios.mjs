/**
 * Los precios de la portada.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ PROTEGE. Un precio en una página pública es la clase de dato que más
 * daño hace cuando está mal, y hay tres maneras distintas de que esté mal:
 *
 *  1. QUE ESTÉ ESCRITO A MANO. Si «5,99 €» vive en el HTML, el día que cambie
 *     la tarifa la portada seguirá diciendo lo de antes y nadie se enterará.
 *     Aquí se sirve a la página una tabla de planes CON OTRAS CIFRAS y se
 *     exige que las enseñe: si estuviera escrito en el componente, esta parte
 *     falla.
 *
 *  2. QUE EL AHORRO ANUAL NO CUADRE. Doce mensualidades menos lo que cuesta
 *     el año. Es una resta, y por eso no se compara con un número escrito en
 *     la prueba: se calcula a partir de los mismos datos que recibe la página.
 *
 *  3. QUE SE OFREZCA PAGAR CUANDO NO SE PUEDE. Poder contratar necesita DOS
 *     cosas, y hacen falta las dos: que el plan tenga precio en Stripe
 *     —columna `stripe_price_monthly`, distinta de `price_monthly`— y que el
 *     servidor tenga con qué cobrar, que es lo que contesta
 *     `/.netlify/functions/estado-pago`. Hoy hay precios creados y las
 *     variables de entorno no están puestas, así que la página tiene que
 *     decirlo arriba y no enseñar ningún botón de pago. Se comprueban las
 *     TRES combinaciones —sin precio, con precio y sin servidor, y con las
 *     dos— porque una prueba que sólo mira el estado de hoy no protege de
 *     nada el día que cambie.
 *
 * Y UNA CUARTA, QUE NO ES DE PRECIOS SINO DE DECENCIA: que no se anuncie como
 * incluida ninguna función que todavía no existe.
 *
 *   npm run build && npm run preview
 *   node pruebas/precios.mjs
 */
import { chromium } from 'playwright';
import { mock, SUPA, j } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

/* El espacio que mete `Intl` antes del € es fino y no rompible; para comparar
   da igual cuál sea. */
const limpia = (s) => s.replace(/[\s  ]+/g, ' ').trim();

const euros = (centimos) =>
  limpia(new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: centimos % 100 === 0 ? 0 : 2,
  }).format(centimos / 100));

/**
 * Las capacidades que el catálogo marca como NO construidas. Ninguna puede
 * salir en una tarjeta de plan. Si alguna se termina, se quita de aquí a la
 * vez que se pone a `lista: true` en `services/entitlements.ts`.
 */
const SIN_CONSTRUIR = [
  'Evaluaciones de jugadoras (1–10)',
  'Estadísticas avanzadas',
  'Comparativas de rendimiento',
  'Informes exportables en PDF',
  'Historial completo de rendimiento',
  'Panel del club',
  'Analíticas entre equipos',
  'Roles y permisos',
  /* Y esto no es ni una capacidad: no hay sistema de soporte en el código. */
  'Soporte prioritario',
];

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/**
 * Abre la portada con los planes que se le den y devuelve la sección leída.
 * `caja` es lo que contesta el servidor de pago: sin ella no se puede
 * contratar aunque los planes tengan precio de Stripe.
 */
async function conPlanes(planes, caja = false) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await mock(page, { planes, caja });
  /* La portada no tiene sesión: la tabla `plans` se lee como anónimo. */
  await page.route(`${SUPA}/rest/v1/plans**`, (r) => r.fulfill(j(planes)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('precios')?.scrollIntoView());
  await page.waitForTimeout(900);

  const leido = await page.evaluate(() => {
    const sec = document.getElementById('precios');
    const tarjetas = [...sec.querySelectorAll('article')].map((a) => ({
      texto: a.innerText,
      /* Un botón o un enlace sobre el que se pueda pulsar para pagar. */
      acciones: [...a.querySelectorAll('a, button')].map((b) => b.textContent.trim()),
    }));
    return { texto: sec.innerText, tarjetas };
  });
  await ctx.close();
  return leido;
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · Las cifras salen de la tabla, no del componente
   ══════════════════════════════════════════════════════════════════════════
   A propósito NO se usan los precios reales: si la página enseñara los suyos
   escritos a mano, con estos pasaría igualmente y la prueba no valdría. */
{
  console.log('\n  las cifras vienen de los datos');
  const INVENTADOS = [
    { tier: 'free', name: 'Gratis', max_teams: 1, currency: 'eur', trial_days: 0, price_monthly: 0, price_yearly: 0, stripe_price_monthly: null, stripe_price_yearly: null },
    { tier: 'pro', name: 'Pro', max_teams: 2, currency: 'eur', trial_days: 7, price_monthly: 750, price_yearly: 7200, stripe_price_monthly: null, stripe_price_yearly: null },
    { tier: 'max', name: 'Max', max_teams: 9, currency: 'eur', trial_days: 14, price_monthly: 2000, price_yearly: 20000, stripe_price_monthly: null, stripe_price_yearly: null },
  ];
  const { texto } = await conPlanes(INVENTADOS);
  const t = limpia(texto);

  for (const p of INVENTADOS.filter((x) => x.price_monthly > 0)) {
    comprueba(`${p.name}: el importe mensual`, t.includes(euros(p.price_monthly)), euros(p.price_monthly));
    comprueba(`${p.name}: el importe anual`, t.includes(euros(p.price_yearly)), euros(p.price_yearly));
    const ahorro = p.price_monthly * 12 - p.price_yearly;
    comprueba(`${p.name}: el ahorro cuadra`, t.includes(euros(ahorro)),
      `${p.price_monthly}×12 − ${p.price_yearly} = ${euros(ahorro)}`);
  }
  comprueba('Pro: los equipos que permite', t.includes('Hasta 2 equipos'), 'max_teams 2');
  comprueba('Max: los equipos que permite', t.includes('Hasta 9 equipos'), 'max_teams 9');
  /* Y que no se cuele ninguna de las cifras de verdad escrita a mano. Son
     las de producción después de la 0021; ninguna de ellas puede salir de
     los datos inventados de arriba —7,50, 72,00, 20,00 y 200,00—, así que si
     aparece una es que está escrita en el componente. */
  const DE_PRODUCCION = ['9,00 €', '29,00 €', '59,00 €', '90,00 €', '290,00 €', '590,00 €'];
  const coladas = DE_PRODUCCION.filter((c) => t.includes(c));
  comprueba('no hay precios escritos en el componente',
    coladas.length === 0,
    coladas.length ? `aparecen ${coladas.join(', ')}` : 'ninguna cifra real');
}

/* ══════════════════════════════════════════════════════════════════════════
   1b · Un plan con mensual y SIN anual
   ══════════════════════════════════════════════════════════════════════════
   Existió de verdad: el Club nació así en la 0019 y estuvo meses sin precio
   anual, porque nadie lo había decidido. Mientras duró, el caso lo cubría por
   casualidad el simulacro compartido; en cuanto el Club tuvo su anual en la
   0021, esa cobertura habría desaparecido sin que nadie se diera cuenta.
   Vive aquí porque es una forma legítima de los datos, no una anécdota de un
   plan concreto: la tabla deja el anual vacío y la página tiene que
   apañárselas sin inventarse uno. */
{
  console.log('\n  un plan con mensual y sin anual');
  const { texto } = await conPlanes([
    { tier: 'free', name: 'Gratis', max_teams: 1, currency: 'eur', trial_days: 0, price_monthly: 0, price_yearly: 0, stripe_price_monthly: null, stripe_price_yearly: null },
    { tier: 'pro', name: 'Pro', max_teams: 2, currency: 'eur', trial_days: 7, price_monthly: 750, price_yearly: null, stripe_price_monthly: null, stripe_price_yearly: null },
  ]);
  const t = limpia(texto);

  comprueba('el mensual se enseña igual', t.includes(euros(750)), euros(750));
  /* Lo que NO puede pasar: que se calcule un anual a partir del mensual, o
     que salga un «0,00 €», o un «NaN», o un hueco con el signo del euro
     suelto. Un precio que nadie ha decidido no se deduce. */
  comprueba('no se inventa un anual', !/al a[ñn]o/i.test(t), 'aparece una línea anual');
  comprueba('ni un ahorro deducido', !/ahorra/i.test(t), 'aparece un ahorro');
  comprueba('ni un cero ni un NaN', !t.includes('0,00 €') && !/NaN/.test(t));
}

/* ══════════════════════════════════════════════════════════════════════════
   1c · Cada tarjeta nombra el plan de JUSTO debajo
   ══════════════════════════════════════════════════════════════════════════
   «Todo lo de X, y» es una promesa de herencia: dice que lo de abajo viene
   incluido. Si nombra el plan equivocado, la promesa es falsa en una
   dirección concreta y cara —la tarjeta de Club decía «Todo lo de Pro», que
   se lee como que Max, el de en medio, NO entra—.

   Se comprueba con CUATRO planes a propósito. Con tres, un «el anterior es
   Pro salvo para Pro» pasa igual que la versión correcta: el fallo sólo
   aparece a partir de la cuarta columna, que es justo cuando apareció. */
{
  console.log('\n  cada tarjeta nombra el plan de debajo');
  const CUATRO = [
    { tier: 'free', name: 'Gratis', max_teams: 1, currency: 'eur', trial_days: 0, price_monthly: 0, price_yearly: 0, stripe_price_monthly: null, stripe_price_yearly: null },
    { tier: 'pro', name: 'Pro', max_teams: 2, currency: 'eur', trial_days: 7, price_monthly: 750, price_yearly: 7500, stripe_price_monthly: null, stripe_price_yearly: null },
    { tier: 'max', name: 'Max', max_teams: 5, currency: 'eur', trial_days: 7, price_monthly: 1500, price_yearly: 15000, stripe_price_monthly: null, stripe_price_yearly: null },
    { tier: 'club', name: 'Club', max_teams: 12, currency: 'eur', trial_days: 7, price_monthly: 3000, price_yearly: 30000, stripe_price_monthly: null, stripe_price_yearly: null },
  ];
  const { tarjetas } = await conPlanes(CUATRO);

  /* Por posición, que es como lo ve quien lee: la de más a la derecha tiene
     que nombrar a su vecina, no a una de más abajo. */
  const esperado = { Pro: 'Gratis', Max: 'Pro', Club: 'Max' };
  for (const [plan, debajo] of Object.entries(esperado)) {
    /* SIN DISTINGUIR MAYÚSCULAS: el rótulo lleva `text-transform: uppercase`,
       así que `innerText` devuelve «TODO LO DE MAX, Y». Comparar tal cual
       daba rojo con la página bien, que es la peor clase de prueba. */
    const t = tarjetas.map((c) => limpia(c.texto)).find((x) => x.toLowerCase().startsWith(plan.toLowerCase()));
    const dice = t?.match(/todo lo de [^,\n]+/i)?.[0];
    comprueba(`${plan} hereda de ${debajo}`,
      dice?.toLowerCase() === `todo lo de ${debajo.toLowerCase()}`,
      dice ?? (t ? 'no dice de quién hereda' : 'no hay tarjeta'));
  }
  const gratis = tarjetas.map((c) => limpia(c.texto)).find((x) => x.toLowerCase().startsWith('gratis'));
  comprueba('y Gratis no hereda de nadie',
    Boolean(gratis) && !/todo lo de/i.test(gratis), 'dice heredar de alguien');

  /* Y las cuatro columnas dicen para quién son. La del Club no lo decía: la
     portada tenía su propia copia de la tabla y se quedó sin esa fila. */
  for (const plan of ['Gratis', 'Pro', 'Max', 'Club']) {
    /* Sobre el texto SIN aplanar: `limpia` junta los saltos de línea, así
       que buscar la frase por líneas allí no encuentra nunca nada y el
       detalle salía «no lo dice» hasta en verde. */
    const bruto = tarjetas.map((c) => c.texto).find((x) => x.trim().toLowerCase().startsWith(plan.toLowerCase()));
    const frase = bruto?.split('\n').map((l) => l.trim()).find((l) => /^Para /.test(l));
    comprueba(`${plan} dice para quién es`, Boolean(frase), frase ?? 'no lo dice');
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · Con precio y sin pasarela: se dice, y no se ofrece pagar
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  hay precio pero no se puede pagar');
  const { texto, tarjetas } = await conPlanes([
    { tier: 'free', name: 'Gratis', max_teams: 1, currency: 'eur', trial_days: 0, price_monthly: 0, price_yearly: 0, stripe_price_monthly: null, stripe_price_yearly: null },
    { tier: 'pro', name: 'Pro', max_teams: 1, currency: 'eur', trial_days: 7, price_monthly: 599, price_yearly: 5999, stripe_price_monthly: null, stripe_price_yearly: null },
    { tier: 'max', name: 'Max', max_teams: 5, currency: 'eur', trial_days: 7, price_monthly: 1299, price_yearly: 12999, stripe_price_monthly: null, stripe_price_yearly: null },
  ]);
  const t = limpia(texto);

  comprueba('se avisa de que todavía no se puede pagar', /todav[ií]a no se puede pagar/i.test(t));
  comprueba('y de que no hay ninguna función cerrada', /no hay ninguna funci[oó]n cerrada/i.test(t));

  /* Lo único pulsable debe ser el «Empezar gratis» del plan gratuito. */
  const pulsables = tarjetas.flatMap((c) => c.acciones);
  comprueba('sólo hay una acción, y es la de empezar gratis',
    pulsables.length === 1 && /empezar gratis/i.test(pulsables[0]), JSON.stringify(pulsables));
  comprueba('no se ofrece contratar ni pagar',
    !pulsables.some((a) => /contratar|pagar|suscri|comprar|elegir plan/i.test(a)), JSON.stringify(pulsables));

  /* Sin pasarela no hay nada que probar, así que no se habla de prueba. */
  comprueba('no se anuncian días de prueba que nadie puede empezar',
    !/d[ií]as de prueba/i.test(t));

  console.log('\n  no se anuncia lo que no existe');
  for (const nombre of SIN_CONSTRUIR) {
    comprueba(`no aparece «${nombre}»`, !t.includes(nombre));
  }
}

/* Los planes como están en la base DESPUÉS de la 0014: con sus cuatro precios
   de Stripe puestos. Lo único que cambia entre los dos bloques siguientes es
   si el servidor tiene con qué cobrar. */
const CON_PRECIOS_DE_STRIPE = [
  { tier: 'free', name: 'Gratis', max_teams: 1, currency: 'eur', trial_days: 0, price_monthly: 0, price_yearly: 0, stripe_price_monthly: null, stripe_price_yearly: null },
  { tier: 'pro', name: 'Pro', max_teams: 1, currency: 'eur', trial_days: 7, price_monthly: 599, price_yearly: 5999, stripe_price_monthly: 'price_pro_m', stripe_price_yearly: 'price_pro_y' },
  { tier: 'max', name: 'Max', max_teams: 5, currency: 'eur', trial_days: 7, price_monthly: 1299, price_yearly: 12999, stripe_price_monthly: 'price_max_m', stripe_price_yearly: 'price_max_y' },
];

/* ══════════════════════════════════════════════════════════════════════════
   3 · Precios en Stripe, pero el servidor no puede cobrar
   ══════════════════════════════════════════════════════════════════════════
   ESTE ES EL ESTADO DE HOY, y es el que más fácil se cuenta mal. Los cuatro
   precios existen y están guardados en `plans`, así que mirar sólo esa columna
   daría «se puede pagar». Pero cobrar necesita cuatro variables de entorno en
   Netlify que todavía no están puestas, y sin ellas cada intento de pagar
   muere con «Falta la variable de entorno STRIPE_SECRET_KEY». Mientras el
   servidor diga que no está listo, la portada tiene que seguir diciendo la
   verdad. */
{
  console.log('\n  hay precios en Stripe pero el servidor no puede cobrar');
  const { texto, tarjetas } = await conPlanes(CON_PRECIOS_DE_STRIPE, false);
  const t = limpia(texto);

  comprueba('se sigue avisando de que todavía no se puede pagar',
    /todav[ií]a no se puede pagar/i.test(t));
  comprueba('no se ofrece contratar',
    !tarjetas.flatMap((c) => c.acciones).some((a) => /contratar|pagar|suscri|comprar/i.test(a)));
  comprueba('no se anuncian días de prueba que nadie puede empezar',
    !/d[ií]as de prueba/i.test(t));
  /* Y los importes se siguen enseñando: son ciertos, sólo que todavía no se
     cobran. Ocultarlos sería la otra forma de no contar lo que hay. */
  comprueba('los importes se siguen enseñando',
    t.includes(euros(599)) && t.includes(euros(1299)));
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · El día que se abra la caja de verdad
   ══════════════════════════════════════════════════════════════════════════
   Los mismos planes y el servidor diciendo que sí. Si el aviso se quedara
   pegado, estaríamos diciendo que no se puede pagar cuando sí. */
{
  console.log('\n  con la pasarela abierta');
  const { texto } = await conPlanes(CON_PRECIOS_DE_STRIPE, true);
  const t = limpia(texto);

  comprueba('el aviso desaparece', !/todav[ií]a no se puede pagar/i.test(t));
  comprueba('y entonces sí se dicen los días de prueba', /7 d[ií]as de prueba/i.test(t));
  comprueba('los importes siguen siendo los de la tabla',
    t.includes(euros(599)) && t.includes(euros(1299)));
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · Si la consulta falla, no se inventa un precio
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  sin datos');
  const { texto } = await conPlanes([]);
  const t = limpia(texto);
  comprueba('se dice que no se ha podido cargar', /no hemos podido cargar el precio/i.test(t));
  comprueba('y no aparece ningún importe', !/\d+[.,]\d{2}\s*€/.test(t), t.slice(0, 120));
}

await navegador.close();
console.log(fallos === 0
  ? '\n  Los precios son los de la base, y no se ofrece pagar lo que no se puede.'
  : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
