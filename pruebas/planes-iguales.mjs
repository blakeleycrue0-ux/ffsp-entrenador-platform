/**
 * LO QUE DICE LA PORTADA SOBRE LOS PLANES, Y LO QUE DICE LA APLICACIÓN.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SON LA MISMA OFERTA VISTA DESDE FUERA Y DESDE DENTRO. Quien compara los
 * precios antes de registrarse y quien los compara en Ajustes son la misma
 * persona con un cuarto de hora de diferencia, y si las dos pantallas no
 * cuentan lo mismo, la segunda —la de dentro, la de pagar— es la que pierde.
 *
 * PASÓ, Y ASÍ ES COMO SE VIO. En la portada había tres columnas con precio,
 * para quién es cada plan y las nueve herramientas del gratuito. Dentro, en la
 * pantalla donde se pulsa «Cambiar de plan», había tres renglones:
 *
 *     Gratis    Un equipo
 *     Pro       Un equipo
 *     Max       Hasta 5 equipos
 *
 * Ni precios, ni funciones, ni una pista de por qué pagar. Y encima el único
 * dato que daba decía que el plan de 5,99 € no servía para nada: Pro daba un
 * equipo, igual que el gratuito. Lo del límite se arregló en la base de datos
 * —migración 0016, Pro son dos—; lo de la pantalla se arregló poniendo la
 * misma comparativa dentro.
 *
 * QUÉ COMPRUEBA ESTO. Que las dos pantallas, SERVIDAS CON LOS MISMOS DATOS,
 * dicen lo mismo:
 *
 *  1 · los tres importes mensuales y los tres anuales;
 *  2 · el mismo límite de equipos por plan, escrito igual;
 *  3 · la misma frase de «para quién es» en cada plan;
 *  4 · las mismas herramientas, una por una;
 *  5 · y que ninguna de las dos anuncia nada sin construir.
 *
 * Los datos que se sirven NO son los de producción, a propósito: con los de
 * verdad, una pantalla que tuviera los textos escritos a mano pasaría igual.
 * Con unos inventados, sólo pasa si los está leyendo.
 *
 * Y una comprobación que no es de pantallas sino de la oferta: que ningún
 * plan de pago dé lo mismo que el gratuito. Es la regla que se incumplió.
 *
 *   npm run build && npm run preview
 *   node pruebas/planes-iguales.mjs
 */
import { chromium } from 'playwright';
import { mock, SUPA, j } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const limpia = (s) => s.replace(/[\s  ]+/g, ' ').trim();

const euros = (centimos) =>
  limpia(new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: centimos % 100 === 0 ? 0 : 2,
  }).format(centimos / 100));

/* CIFRAS QUE NO SON LAS DE PRODUCCIÓN. Si alguna de las dos pantallas tuviera
   los precios escritos en el componente, con estos datos no cuadraría. Y los
   cuatro precios de Stripe van puestos: hace falta que se pueda contratar
   para que las dos pantallas distingan de verdad un plan de otro. */
const PLANES = [
  { tier: 'free', name: 'Gratis', max_teams: 1, currency: 'eur', trial_days: 0,  price_monthly: 0,    price_yearly: 0,     stripe_price_monthly: null,           stripe_price_yearly: null },
  { tier: 'pro',  name: 'Pro',    max_teams: 3, currency: 'eur', trial_days: 11, price_monthly: 823,  price_yearly: 8100,  stripe_price_monthly: 'price_pro_m',  stripe_price_yearly: 'price_pro_y' },
  { tier: 'max',  name: 'Max',    max_teams: 8, currency: 'eur', trial_days: 11, price_monthly: 1744, price_yearly: 17100, stripe_price_monthly: 'price_max_m',  stripe_price_yearly: 'price_max_y' },
];

/** Las frases de «para quién es cada plan». Tienen que estar en los dos sitios. */
const PARA_QUIEN = {
  free: 'Para empezar con un equipo y ver si esto te sirve.',
  pro: 'Para el entrenador que lleva su equipo y quiere la pizarra entera.',
  max: 'Para el club con varios equipos y varias personas en el cuerpo técnico.',
};

/** Lo que trae el plan de abajo. Sale del catálogo, no de aquí: ver más abajo. */
const DEL_GRATUITO = [
  'Plantilla',
  'Asistencia',
  'Disponibilidad y lesiones',
  'Entrenamientos',
  'Biblioteca de ejercicios',
  'Partidos y convocatorias',
  'Calendario',
  'Pizarra táctica',
  'Analíticas',
];
/** Lo que añade Pro. */
const DE_PRO = ['Trayectorias a mano alzada', 'Exportar jugadas en vídeo'];
/** Lo que añade Max. */
const DE_MAX = ['Acceso para varios entrenadores'];

/** Nada de esto está construido, así que no puede salir en ninguna de las dos. */
const SIN_CONSTRUIR = [
  'Evaluaciones de jugadoras (1–10)',
  'Estadísticas avanzadas',
  'Comparativas de rendimiento',
  'Informes exportables en PDF',
  'Historial completo de rendimiento',
  'Panel del club',
  'Analíticas entre equipos',
  'Roles y permisos',
  'Soporte prioritario',
];

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/* ── LA PORTADA ──────────────────────────────────────────────────────────── */
async function portada() {
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await mock(page, { planes: PLANES, caja: true });
  /* Sin sesión: la tabla `plans` se lee como anónimo. */
  await page.route(`${SUPA}/rest/v1/plans**`, (r) => r.fulfill(j(PLANES)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('precios')?.scrollIntoView());
  await page.waitForTimeout(900);
  const texto = await page.evaluate(() => document.getElementById('precios').innerText);
  await ctx.close();
  return limpia(texto);
}

/* ── LA APLICACIÓN ───────────────────────────────────────────────────────── */
async function aplicacion() {
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await mock(page, { planes: PLANES, caja: true });
  await page.goto(`${BASE}/app/ajustes/plan`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  /* Se abre también el selector de «Cambiar de plan», que es donde se elige:
     las dos partes de la pantalla cuentan para la comparación. */
  const boton = page.getByRole('button', { name: /^Cambiar de plan$/ });
  if (await boton.count()) {
    await boton.first().click();
    await page.waitForTimeout(600);
  }
  const texto = await page.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText);
  await ctx.close();
  return limpia(texto);
}

const fuera = await portada();
const dentro = await aplicacion();

/* ══════════════════════════════════════════════════════════════════════════
   1 · Los importes
   ══════════════════════════════════════════════════════════════════════════ */
console.log('\n  los mismos importes fuera y dentro\n');
for (const p of PLANES.filter((x) => x.price_monthly > 0)) {
  const m = euros(p.price_monthly);
  const a = euros(p.price_yearly);
  comprueba(`${p.name}: ${m} al mes, en la portada`, fuera.includes(m));
  comprueba(`${p.name}: ${m} al mes, en la aplicación`, dentro.includes(m));
  comprueba(`${p.name}: ${a} al año, en la portada`, fuera.includes(a));
  comprueba(`${p.name}: ${a} al año, en la aplicación`, dentro.includes(a));
  const ahorro = euros(p.price_monthly * 12 - p.price_yearly);
  comprueba(`${p.name}: el ahorro (${ahorro}) cuadra en los dos`,
    fuera.includes(ahorro) && dentro.includes(ahorro));
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · Los equipos
   ══════════════════════════════════════════════════════════════════════════ */
console.log('\n  los mismos equipos fuera y dentro\n');
for (const p of PLANES) {
  const frase = p.max_teams === 1 ? 'Un equipo' : `Hasta ${p.max_teams} equipos`;
  comprueba(`${p.name}: «${frase}» en la portada`, fuera.includes(frase));
  comprueba(`${p.name}: «${frase}» en la aplicación`, dentro.includes(frase));
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Para quién es cada plan
   ══════════════════════════════════════════════════════════════════════════ */
console.log('\n  la misma frase de para quién es\n');
for (const [tier, frase] of Object.entries(PARA_QUIEN)) {
  comprueba(`${tier}: en la portada`, fuera.includes(frase), frase.slice(0, 40) + '…');
  comprueba(`${tier}: en la aplicación`, dentro.includes(frase));
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · Las herramientas, una por una
   ══════════════════════════════════════════════════════════════════════════
   ESTA ES LA PARTE QUE FALTABA ENTERA. La pantalla de dentro no nombraba ni
   una sola. */
console.log('\n  las mismas herramientas\n');
for (const nombre of [...DEL_GRATUITO, ...DE_PRO, ...DE_MAX]) {
  comprueba(`«${nombre}» en la portada`, fuera.includes(nombre));
  comprueba(`«${nombre}» en la aplicación`, dentro.includes(nombre));
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · Y no se anuncia lo que no existe
   ══════════════════════════════════════════════════════════════════════════ */
console.log('\n  nada sin construir\n');
for (const nombre of SIN_CONSTRUIR) {
  comprueba(`no aparece «${nombre}»`, !fuera.includes(nombre) && !dentro.includes(nombre));
}

/* ══════════════════════════════════════════════════════════════════════════
   6 · Ningún plan de pago da lo mismo que el gratuito
   ══════════════════════════════════════════════════════════════════════════
   NO ES UNA COMPROBACIÓN DE PANTALLA: es la regla de la oferta, y es la que se
   incumplió. Mira los planes de verdad, los de `mock.mjs`, que son copia de lo
   que hay en la base. */
console.log('\n  la oferta tiene sentido\n');
{
  const { PLANES: REALES } = await import('./mock.mjs');
  const gratis = REALES.find((p) => p.tier === 'free');
  for (const p of REALES.filter((x) => x.price_monthly > 0)) {
    comprueba(
      `${p.name} da más equipos que Gratis`,
      p.max_teams === null || p.max_teams > gratis.max_teams,
      `${p.max_teams} contra ${gratis.max_teams}`,
    );
  }
}

await navegador.close();
console.log(fallos === 0
  ? '\n  La portada y la aplicación cuentan lo mismo, y pagar da más que no pagar.\n'
  : `\n  ${fallos} fallo(s).\n`);
process.exit(fallos === 0 ? 0 : 1);
