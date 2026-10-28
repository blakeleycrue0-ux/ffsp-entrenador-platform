/**
 * QUE EL PRODUCTO DIGA LO QUE ES, NI MÁS NI MENOS.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tres maneras distintas de mentir sin querer, y las tres habían pasado:
 *
 *   1. DECIR QUE ERES OTRA COSA. La portada abría con «Todo tu fútbol» y
 *      «Para cuerpos técnicos de fútbol base», y la descripción que enseña
 *      Google decía «un club de fútbol». Mientras tanto, el alta ofrecía diez
 *      deportes y la plantilla ya enseñaba los puestos de cada uno. Un club
 *      de baloncesto leía que esto no era para él antes de ver nada.
 *
 *   2. OFRECER LO QUE NO FUNCIONA. El asistente está escrito entero y sin
 *      `ANTHROPIC_API_KEY` no puede contestar. Ponerlo en el menú sin más
 *      sería una entrada que siempre acaba en «todavía no está configurado».
 *      Y no ponerlo nunca sería que el día que se ponga la clave no se entere
 *      nadie. Se pregunta al servidor.
 *
 *   3. DAR POR MUERTO LO QUE SÓLO SE HA MOVIDO. La pizarra se retiró del
 *      producto, pero sus direcciones siguen en marcadores y en enlaces de
 *      hace meses. Un 404 dice «no existe nada»; lo cierto es «eso ahora se
 *      hace en otro sitio».
 *
 * LO QUE ESTA PRUEBA NO PUEDE COMPROBAR, y conviene decirlo en vez de dejarlo
 * creer: el 301 de `/pizarra` en la web pública lo sirve Netlify leyendo
 * `netlify.toml`, y `vite preview` no lee ese archivo. Aquí se comprueba la
 * redirección de dentro de la aplicación, que es la que hace el navegador.
 * La de fuera hay que verla en producción.
 *
 *   npm run build && npm run preview
 *   node pruebas/honesto.mjs
 */
import { chromium } from 'playwright';
import { mock, USER, j } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

/* Las palabras que dicen «esto es de un deporte concreto». No se buscan en
   cualquier sitio: se buscan donde se promete algo —el titular, la entradilla
   y la descripción para buscadores—, no en un dato del club, que puede
   llamarse «Campo Municipal» con toda la razón. */
const DE_UN_SOLO_DEPORTE = ['fútbol', 'futbol', 'balón', 'portería', 'gol '];

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/* ══════════════════════════════════════════════════════════════════════════
   1 · La portada no se presenta como una herramienta de fútbol
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  la portada, sin nombrar un deporte');
  const ctx = await navegador.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  await mock(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const arriba = await page.evaluate(() => {
    const h = document.querySelector('h1');
    const sello = document.querySelector('.sello');
    const entradilla = h?.parentElement?.parentElement?.innerText ?? '';
    return { h1: h?.innerText ?? '', sello: sello?.textContent ?? '', bloque: entradilla };
  });

  comprueba('hay titular', arriba.h1.length > 0, arriba.h1.replace(/\n/g, ' '));
  for (const palabra of DE_UN_SOLO_DEPORTE) {
    comprueba(
      `el titular no dice «${palabra.trim()}»`,
      !arriba.h1.toLowerCase().includes(palabra),
      arriba.h1.replace(/\n/g, ' '),
    );
  }
  comprueba('el sello tampoco',
    !DE_UN_SOLO_DEPORTE.some((p) => arriba.sello.toLowerCase().includes(p)), arriba.sello);

  /* Y la descripción que enseña Google debajo del título, que es la única
     frase que lee alguien antes de decidir si entra. */
  const meta = await page.evaluate(() =>
    document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '');
  comprueba('hay descripción para buscadores', meta.length > 20, meta.slice(0, 70));
  comprueba('y no nombra un deporte',
    !DE_UN_SOLO_DEPORTE.some((p) => meta.toLowerCase().includes(p)), meta.slice(0, 80));

  /* El JSON-LD es otra copia de lo mismo y se quedó atrás la vez pasada. */
  const ld = await page.evaluate(() =>
    document.querySelector('script[type="application/ld+json"]')?.textContent ?? '');
  comprueba('el JSON-LD tampoco',
    ld.length === 0 || !DE_UN_SOLO_DEPORTE.some((p) => ld.toLowerCase().includes(p)),
    ld ? 'presente y neutral' : 'no hay');

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · El asistente sólo se ofrece si el servidor puede contestar
   ══════════════════════════════════════════════════════════════════════════ */
for (const configurado of [false, true]) {
  console.log(`\n  el asistente, con la clave ${configurado ? 'puesta' : 'sin poner'}`);
  const ctx = await navegador.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  await mock(page);
  /* `vite preview` no sirve las funciones de Netlify: sin esta ruta
     devolvería el index.html, que no es JSON, y el cliente se quedaría
     —con razón— en «no está configurado» en los dos casos. */
  await page.route('**/.netlify/functions/estado-ia', (r) => r.fulfill(j({ listo: configurado })));
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  /* El menú vive detrás del avatar. */
  await page.locator('header button').filter({ hasText: /^$/ }).last().click().catch(() => {});
  await page.waitForTimeout(300);
  let texto = await page.evaluate(() => document.body.innerText);
  if (!/Mi perfil/.test(texto)) {
    /* Si el primer clic no ha abierto el menú, se busca el avatar por su
       etiqueta. Mejor esto que dar por hecho que no está la entrada. */
    await page.getByRole('button', { name: /cuenta|perfil|men/i }).first().click().catch(() => {});
    await page.waitForTimeout(300);
    texto = await page.evaluate(() => document.body.innerText);
  }

  comprueba('el menú de la cuenta se ha abierto', /Mi perfil/.test(texto),
    /Mi perfil/.test(texto) ? 'sí' : 'no se encuentra «Mi perfil»');
  comprueba(
    configurado ? 'aparece «Entrenador IA»' : 'NO aparece «Entrenador IA»',
    /Entrenador IA/.test(texto) === configurado,
    /Entrenador IA/.test(texto) ? 'aparece' : 'no aparece',
  );

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Lo que se retiró lleva a donde se hace ahora, no a un 404
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  las direcciones de la pizarra, que ya no existe');
  const ctx = await navegador.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);

  for (const vieja of ['/app/pizarra', '/app/pizarra/algo', '/app/jugadas']) {
    await page.goto(BASE + vieja, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const donde = new URL(page.url()).pathname;
    comprueba(`${vieja} lleva a algún sitio`, donde === '/app/ejercicios', donde);
  }

  await ctx.close();
}

await navegador.close();

console.log('');
if (fallos > 0) {
  console.log(`  ✗ ${fallos} ${fallos === 1 ? 'cosa' : 'cosas'} que el producto dice y no son.\n`);
  process.exit(1);
}
console.log('  Dice lo que es: ningún deporte de más, ninguna función de menos.\n');
