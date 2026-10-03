/**
 * Que un fragmento que no llega no tumbe la aplicación entera.
 * ---------------------------------------------------------------------------
 * Cada pantalla se descarga por separado. Si uno de esos archivos no llega
 * —porque se publicó una versión nueva mientras la pestaña estaba abierta, o
 * porque la red falló un segundo— pasaba lo siguiente, medido:
 *
 *   ocho fragmentos servidos mal → las trece secciones caídas → «Volver a
 *   intentarlo» sin efecto, porque `React.lazy` GUARDA la promesa rechazada y
 *   vuelve a devolver el mismo rechazo cada vez que se monta el componente.
 *
 * Aquí se comprueban los dos casos que ocurren de verdad:
 *
 *   A. Los archivos viejos ya no están pero los nuevos sí (se publicó otra
 *      versión): tiene que arreglarse sola, recargando una vez y sin cartel.
 *   B. El archivo sigue sin estar (no hay red): no puede quedarse recargando
 *      en bucle; una recarga, un mensaje honesto y un botón que sirva.
 *
 * Necesita la aplicación compilada y servida (`npm run build && npm run
 * preview`), como el resto de las comprobaciones de esta carpeta.
 */
import { chromium } from 'playwright';
import { mock, SUPA, USER, j } from './mock.mjs';

const BASE = 'http://localhost:4173';
const CARTEL_GENERICO = 'Esta pantalla no se ha podido dibujar';
const CARTEL_DESCARGA = 'Esta pantalla no ha llegado a descargarse';

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const fallos = [];
const comprueba = (bien, que) => {
  console.log(`   ${bien ? 'ok' : '✗ '} ${que}`);
  if (!bien) fallos.push(que);
};

async function abre() {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.route(`${SUPA}/rest/v1/rpc/**`, (r) => r.fulfill(j([])));
  return { ctx, page };
}

/**
 * Sirve los fragmentos de pantalla como HTML con un 200 —exactamente lo que
 * hacía el comodín del hosting— mientras `mientras()` diga que sí.
 */
async function rompe(page, mientras) {
  let rotos = 0;
  await page.route('**/assets/*.js', async (route) => {
    const u = route.request().url();
    if (/index-|vendor|react/i.test(u) || !mientras()) return route.continue();
    rotos += 1;
    return route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><title>Playoff360</title></head><body></body></html>',
    });
  });
  return () => rotos;
}

/* Las recargas se cuentan por peticiones del documento: `framenavigated` salta
   dos veces por carga en Chromium y da un número que no es. */
function cuentaCargas(page) {
  let n = 0;
  page.on('request', (r) => {
    if (r.resourceType() === 'document' && r.isNavigationRequest()) n += 1;
  });
  return () => n - 1; // la primera no es una recarga
}

const texto = (page) => page.evaluate(() => document.body.innerText);

/* ────────── A · se publicó otra versión: tiene que arreglarse sola ────────── */
{
  console.log('A · versión nueva publicada con la pestaña abierta');
  const { ctx, page } = await abre();
  let primeraVez = true;
  const recargas = cuentaCargas(page);
  page.on('request', (r) => {
    if (r.resourceType() === 'document' && r.isNavigationRequest() && recargas() >= 1) primeraVez = false;
  });
  const rotos = await rompe(page, () => primeraVez);

  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const t = await texto(page);

  comprueba(rotos() > 0, `los fragmentos se sirvieron mal (${rotos()})`);
  comprueba(recargas() === 1, `recarga una sola vez (${recargas()})`);
  comprueba(!t.includes(CARTEL_GENERICO) && !t.includes(CARTEL_DESCARGA), 'no sale ningún cartel de error');
  comprueba(/Hoy|Pr[óo]xim|Resumen|Entrenamiento/i.test(t), 'la sección se ve');
  await ctx.close();
}

/* ─────────── B · el archivo sigue sin estar: mensaje honesto ─────────── */
{
  console.log('\nB · el fragmento sigue sin llegar');
  const { ctx, page } = await abre();
  const recargas = cuentaCargas(page);
  await rompe(page, () => true);

  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const t = await texto(page);

  comprueba(recargas() === 1, `recarga una vez y para, no entra en bucle (${recargas()})`);
  comprueba(t.includes(CARTEL_DESCARGA), 'dice lo que ha pasado de verdad');
  comprueba(
    await page.getByRole('button', { name: 'Volver a intentarlo' }).count() === 0,
    'no ofrece «Volver a intentarlo», que con un fragmento perdido no puede funcionar',
  );

  const boton = page.getByRole('button', { name: 'Recargar la aplicación' });
  comprueba(await boton.count() > 0, 'ofrece «Recargar la aplicación»');
  const antes = recargas();
  if (await boton.count()) {
    await boton.click();
    await page.waitForTimeout(1500);
  }
  comprueba(recargas() > antes, 'y ese botón recarga de verdad');
  await ctx.close();
}

await navegador.close();
console.log(fallos.length ? `\n${fallos.length} comprobaciones fallan.` : '\nUn fragmento perdido ya no tumba la aplicación.');
process.exit(fallos.length ? 1 : 0);
