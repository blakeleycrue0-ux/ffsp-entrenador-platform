/**
 * El aviso de cookies y la medición de visitas.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esto no comprueba que un banner se vea bonito. Comprueba cuatro promesas que
 * la página hace por escrito en la política de privacidad, y cada una de ellas
 * se rompe con un descuido de dos líneas:
 *
 *  1. QUE NO SE CARGUE NADA DE GOOGLE ANTES DEL SÍ. Es la promesa entera: el
 *     fragmento que publica Google carga el script y escribe su cookie en
 *     cuanto se abre la página. Aquí se cuentan las peticiones a los dominios
 *     de Google y tienen que ser CERO mientras no se haya aceptado.
 *
 *  2. QUE DECIR NO SEA IGUAL DE FÁCIL QUE DECIR SÍ. Se miden los dos botones:
 *     si alguno se queda más pequeño o se convierte en un enlace gris, el
 *     consentimiento ya no es libre y esta prueba falla. No es una opinión de
 *     diseño, es la diferencia entre pedir permiso y arrancarlo.
 *
 *  3. QUE NO SE MIDA NADA DENTRO DE LA APLICACIÓN. Las direcciones de dentro
 *     llevan identificadores de fichas de jugadoras —menores de edad— y el
 *     título de la pestaña lleva nombres propios. Se entra en `/app` CON el
 *     permiso dado y no debe salir una sola petición a Google.
 *
 *  4. QUE LA DIRECCIÓN QUE SE ENVÍA VAYA RECORTADA. Supabase devuelve de un
 *     correo de recuperación a `/entrar#access_token=...`, que es una sesión
 *     abierta en texto plano. Se abre la página con una consulta y un
 *     fragmento inventados y se mira QUÉ se puso en `dataLayer`: ni el
 *     fragmento ni la consulta pueden aparecer.
 *
 *   npm run build && npm run preview
 *   node pruebas/cookies.mjs
 */
import { chromium } from 'playwright';
import { mock, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/** Los dominios por los que pasa la medición. Ninguno sin permiso. */
const ES_DE_GOOGLE = (u) =>
  /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(u);

/**
 * Abre una ruta y devuelve la página junto con la lista de peticiones a
 * Google, que se va llenando sola.
 *
 * EL SCRIPT SE CORTA A PROPÓSITO. Se apunta la petición y se aborta: así la
 * prueba no depende de que haya salida a internet y `window.gtag` se queda
 * siendo el relé que escribe en `dataLayer`, que es justo lo que hace falta
 * leer para la cuarta promesa.
 */
async function abre(ruta, opciones = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const aGoogle = [];
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (ES_DE_GOOGLE(u)) { aGoogle.push(u); return route.abort(); }
    return route.fallback();
  });
  await mock(page, opciones);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return { ctx, page, aGoogle };
}

const aviso = (page) => page.locator('[aria-label="Aviso de cookies"]');

/* ══════════════════════════════════════════════════════════════════════════
   1 · Sin responder: el aviso está y Google no
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  la primera visita, sin responder');
  const { ctx, page, aGoogle } = await abre('/', { medicion: null });

  comprueba('sale el aviso', await aviso(page).isVisible());
  comprueba('no se ha pedido NADA a Google', aGoogle.length === 0, aGoogle.join(' '));
  comprueba('no hay cookie de medición',
    !(await ctx.cookies()).some((c) => /^_ga/.test(c.name)),
    (await ctx.cookies()).map((c) => c.name).join(' '));

  /* Los dos botones, medidos. */
  const botones = await page.evaluate(() => {
    const z = document.querySelector('[aria-label="Aviso de cookies"]');
    return [...z.querySelectorAll('button')].map((b) => {
      const r = b.getBoundingClientRect();
      return { texto: b.textContent.trim(), ancho: Math.round(r.width), alto: Math.round(r.height) };
    });
  });
  comprueba('hay dos botones', botones.length === 2, JSON.stringify(botones));
  const [a, b] = botones;
  comprueba('miden lo mismo de alto', a && b && a.alto === b.alto, JSON.stringify(botones));
  /* Mismo ancho salvo lo que diferencie el texto; lo que no vale es que uno
     sea la mitad del otro. */
  comprueba('ninguno es claramente más pequeño',
    a && b && Math.min(a.ancho, b.ancho) / Math.max(a.ancho, b.ancho) > 0.62,
    JSON.stringify(botones));
  comprueba('y se puede rechazar con un solo toque',
    botones.some((x) => /solo lo necesario|rechaz/i.test(x.texto)), JSON.stringify(botones));

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · Decir no: se va, no vuelve y Google no se enteró
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  cuando se dice no');
  const { ctx, page, aGoogle } = await abre('/', { medicion: null });
  await page.getByRole('button', { name: /solo lo necesario/i }).click();
  await page.waitForTimeout(600);

  comprueba('el aviso se va', !(await aviso(page).isVisible()));
  comprueba('sigue sin pedirse nada a Google', aGoogle.length === 0, aGoogle.join(' '));

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  comprueba('y no vuelve a preguntar al recargar', !(await aviso(page).isVisible()));
  comprueba('ni carga nada después de recargar', aGoogle.length === 0, aGoogle.join(' '));

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · Decir sí: entonces sí, y con la dirección recortada
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  cuando se dice sí');
  /* Con basura en la dirección: lo que llega por correo de Supabase lleva el
     token en el fragmento, y los enlaces compartidos llevan `utm_`. */
  const { ctx, page, aGoogle } = await abre('/?utm_source=cartel&secreto=1#access_token=NO_DEBE_SALIR', { medicion: null });
  await page.getByRole('button', { name: /^aceptar$/i }).click();
  await page.waitForTimeout(900);

  comprueba('el aviso se va', !(await aviso(page).isVisible()));
  comprueba('ahora sí se pide el script a Google', aGoogle.length > 0);
  comprueba('y es el identificador que toca',
    aGoogle.some((u) => u.includes('G-41JCMJGND0')), aGoogle.join(' '));

  /* Qué se ha metido en `dataLayer`. Es, literalmente, lo que se le mandaría
     a Google: se lee la cola en vez de adivinarlo por las peticiones. */
  const cola = await page.evaluate(() => (window.dataLayer ?? []).map((a) => [...a]));
  const crudo = JSON.stringify(cola);
  const visitas = cola.filter((e) => e[0] === 'event' && e[1] === 'page_view');
  const configs = cola.filter((e) => e[0] === 'config');

  comprueba('se ha registrado una visita', visitas.length > 0, crudo.slice(0, 220));
  comprueba('sin el fragmento de la dirección', !/NO_DEBE_SALIR|access_token/.test(crudo));
  comprueba('sin la consulta de la dirección', !/utm_source|secreto/.test(crudo));
  comprueba('la dirección enviada es sólo la ruta',
    visitas.every((v) => !/[?#]/.test(String(v[2]?.page_location ?? ''))),
    JSON.stringify(visitas.map((v) => v[2]?.page_location)));
  comprueba('sin señales de publicidad',
    configs.length > 0 && configs.every((c) =>
      c[2]?.allow_google_signals === false && c[2]?.allow_ad_personalization_signals === false),
    JSON.stringify(configs));
  comprueba('la visita automática va apagada: la manda la aplicación recortada',
    configs.every((c) => c[2]?.send_page_view === false), JSON.stringify(configs));

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · Dentro de la aplicación, nunca
   ══════════════════════════════════════════════════════════════════════════
   Con el permiso YA dado, que es el caso peligroso: si la medición fuera
   global, aquí saldrían peticiones con `/app/plantilla/<id de una jugadora>`
   dentro. */
{
  console.log('\n  dentro de la aplicación, con el permiso dado');
  for (const ruta of ['/app', '/app/plantilla']) {
    const { ctx, page, aGoogle } = await abre(ruta, { medicion: 'si' });
    comprueba(`${ruta}: no se pide nada a Google`, aGoogle.length === 0, aGoogle.join(' '));
    comprueba(`${ruta}: y no sale el aviso de cookies`, !(await aviso(page).isVisible()));
    const enviado = await page.evaluate(() => JSON.stringify(window.dataLayer ?? []));
    comprueba(`${ruta}: no se registra ninguna visita`, !/page_view/.test(enviado), enviado.slice(0, 160));
    await ctx.close();
  }
}

await navegador.close();
console.log(fallos === 0
  ? '\n  No se mide a nadie sin permiso, y dentro de la aplicación no se mide a nadie.'
  : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
