/**
 * LA GUÍA SE PIDE AL ENTRAR, Y NO UNA VEZ POR RECARGA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Son dos reglas que tiran en direcciones contrarias, y por eso se miden
 * juntas: si sólo se comprobara una, arreglar la otra la rompería sin que
 * nadie se enterara.
 *
 * 1 · QUE SE PIDA AL ENTRAR. Antes iba colgada de que `asegurar_perfil`
 *     devolviera `true`, que pasa una sola vez en la vida de la cuenta. Quien
 *     ya tenía cuenta cuando se montó el correo se quedaba esperando a la
 *     ronda del día siguiente, y quien se diera de alta con el envío caído,
 *     igual.
 *
 * 2 · QUE NO SE PIDA EN CADA RECARGA. Quien de verdad impide que un correo
 *     salga dos veces es `emails_enviados` en el servidor, con su clave
 *     primaria; esto es sólo para no hacer una llamada inútil cada vez que
 *     alguien pulsa F5. La marca vive en `sessionStorage` y no en
 *     `localStorage` a propósito: si se guardara para siempre y el envío
 *     hubiera fallado aquel día, no se volvería a intentar nunca desde ese
 *     ordenador. Al cerrar la pestaña se olvida y vuelve a probar.
 *
 * No se comprueba que llegue ningún correo: eso es cosa del servidor y de
 * Brevo. Aquí se mide SÓLO quién llama y cuántas veces, interceptando la
 * petición. Hace falta el servidor de vista previa en marcha.
 *
 *   npm run preview &
 *   node pruebas/guia-al-entrar.mjs
 */
import { chromium } from 'playwright';
import { mock, USER } from './mock.mjs';

const BASE = 'http://localhost:4173';
const RUTA = '**/.netlify/functions/correo-bienvenida';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 860 } });

let llamadas = 0;
/** Intercepta la petición y la cuenta. Nunca sale de aquí. */
const cuenta = async (page, respuesta) => {
  await page.route(RUTA, (route) => {
    llamadas += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ resultado: respuesta }),
    });
  });
};

const page = await ctx.newPage();
await mock(page);
await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
await cuenta(page, 'enviado');

console.log('\n  al entrar\n');

await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
comprueba('entrar pide la guía', llamadas === 1, `${llamadas} llamada(s)`);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
comprueba('recargar NO la vuelve a pedir', llamadas === 1, `${llamadas} llamada(s) en total`);

/* Navegar por la aplicación tampoco: la carga se repite al cambiar de
   pantalla y cada una sería una petición de más. */
await page.goto(`${BASE}/app/equipo`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
comprueba('ni moverse por la aplicación', llamadas === 1, `${llamadas} llamada(s) en total`);

console.log('\n  pero no se rinde para siempre\n');

/* Pestaña nueva: `sessionStorage` empieza vacío, así que vuelve a intentarlo.
   Es lo que hace que un envío que falló un día pueda salir al siguiente. */
const otra = await ctx.newPage();
await mock(otra);
await cuenta(otra, 'ya-estaba');
await otra.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
await otra.waitForTimeout(1200);
comprueba(
  'una pestaña nueva vuelve a intentarlo',
  llamadas === 2,
  `${llamadas} llamadas; el servidor contesta «ya-estaba» y no manda nada`,
);

await navegador.close();

console.log(
  fallos === 0
    ? '\n  Se pide al entrar, una vez por pestaña, y se reintenta al día siguiente.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
