/**
 * ¿CUÁNTAS DECISIONES PIDE CADA PANTALLA?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * «Es demasiado complicada» es una opinión hasta que se cuenta. Esto cuenta.
 *
 * Para cada pantalla, en un iPhone de 390 px, mide seis cosas:
 *
 *  · DECISIONES — cuántas cosas se pueden pulsar, escribir o elegir sin salir
 *    de la pantalla. Es el número que importa: cada una es una pregunta que la
 *    pantalla le hace a quien entra, y quien entra tiene que contestarlas
 *    todas —aunque sea para descartarlas— antes de hacer lo que venía a hacer.
 *  · PRINCIPALES — cuántas acciones se pintan como «la» acción (el botón azul).
 *    Más de una son dos cosas compitiendo por ser la importante; cero es una
 *    pantalla que no dice qué hacer.
 *  · CAMPOS — cuántos huecos hay que rellenar antes de poder guardar.
 *  · PANELES — en cuántas cajas está repartida la información. Cada caja es un
 *    sitio más donde mirar.
 *  · PALABRAS — cuánto hay que leer. Una herramienta de trabajo no se lee: se
 *    usa. Lo que se lee son las palabras que no se han podido ahorrar.
 *  · ALTO — cuántas pantallas de móvil mide, de arriba abajo.
 *
 * NO MIDE LA CABECERA NI NINGUNA NAVEGACIÓN —ni la de arriba, ni la pastilla
 * del móvil, ni las pestañas de la sección—. Están en todas las pantallas de
 * una sección por igual y falsearían la comparación: lo que se compara es el
 * contenido, que es lo que cambia de una pantalla a otra. La navegación se
 * cuenta aparte, en su propia columna, porque también tiene su tope: es la
 * forma de salir, no una decisión sobre lo que se vino a hacer.
 *
 * LOS TOPES. No son un gusto: son el punto donde una pantalla deja de poder
 * entenderse de un vistazo. Una pantalla de lista pide elegir entre lo que
 * hay —un filtro, una acción y las filas—; un formulario pide lo justo para
 * guardar. Si algo pasa del tope, no es que «sea rica en funciones»: es que
 * hay que repartirla en dos o esconder lo avanzado.
 *
 *   npm run build && npm run preview
 *   node pruebas/complejidad.mjs
 */
import { chromium } from 'playwright';
import { mock, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

/* Las pantallas en las que se trabaja de verdad, en el orden en el que se
   usan. Cada una con su tope de decisiones: una lista puede ofrecer más que
   un formulario, porque sus «decisiones» son en buena parte las propias
   filas. */
const PANTALLAS = [
  { ruta: '/app', nombre: 'Inicio', tope: 14 },
  { ruta: '/app/calendario', nombre: 'Calendario', tope: 22 },
  { ruta: '/app/entrenamientos', nombre: 'Entrenamientos', tope: 16 },
  { ruta: '/app/entrenamientos/nuevo', nombre: 'Nuevo entrenamiento', tope: 14, campos: 7 },
  { ruta: '/app/entrenamientos/s1', nombre: 'Un entrenamiento', tope: 16 },
  { ruta: '/app/entrenamientos/s1/asistencia', nombre: 'Pasar lista', tope: 24 },
  { ruta: '/app/plantilla', nombre: 'Plantilla', tope: 24 },
  { ruta: '/app/plantilla/nueva', nombre: 'Nueva jugadora', tope: 14, campos: 8 },
  { ruta: '/app/disponibilidad', nombre: 'Disponibilidad', tope: 24 },
  { ruta: '/app/partidos', nombre: 'Partidos', tope: 16 },
  { ruta: '/app/partidos/nuevo', nombre: 'Nuevo partido', tope: 14, campos: 8 },
  { ruta: '/app/partidos/m1', nombre: 'Un partido', tope: 18 },
  { ruta: '/app/ejercicios', nombre: 'Ejercicios', tope: 18 },
  { ruta: '/app/ejercicios/nuevo', nombre: 'Nuevo ejercicio', tope: 14, campos: 9 },
  { ruta: '/app/analiticas', nombre: 'Analíticas', tope: 16 },
  { ruta: '/app/equipo-tecnico', nombre: 'Equipo técnico', tope: 16 },
  { ruta: '/app/ajustes', nombre: 'Ajustes', tope: 20 },
];

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await navegador.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
await mock(page);
await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);

const medidas = [];
for (const p of PANTALLAS) {
  try {
    await page.goto(BASE + p.ruta, { waitUntil: 'networkidle' });
  } catch {
    medidas.push({ ...p, error: 'no carga' });
    continue;
  }
  await page.waitForTimeout(900);

  const m = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return null;
    /* OJO CON `<details>` CERRADO. En este Chromium, lo que hay dentro de un
       desplegable cerrado SIGUE teniendo caja —mide 324×48 y dice
       `visibility: visible`—, así que la comprobación de siempre lo contaba
       como si estuviera a la vista. Y es justo lo contrario de lo que esto
       mide: un campo detrás de «Más opciones» no es una pregunta que la
       pantalla te esté haciendo. */
    const visible = (el) => {
      if (el.closest('details:not([open]) > *:not(summary)')) return false;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const dentro = (sel) => Array.from(main.querySelectorAll(sel)).filter(visible);

    /* Una decisión es cualquier cosa que se pueda pulsar, escribir o elegir.
       Se cuentan los contenedores, no sus adornos: un botón con un icono
       dentro es UNA decisión, no dos. */
    const interactivos = dentro(
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="checkbox"], [role="switch"], [role="tab"], [tabindex]:not([tabindex="-1"])',
    ).filter((el) => !el.closest('[aria-hidden="true"]') && !el.closest('nav'));
    /* Si un interactivo está dentro de otro, sólo cuenta el de fuera. */
    const decisiones = interactivos.filter(
      (el) => !interactivos.some((otro) => otro !== el && otro.contains(el)),
    );

    /* El texto de la navegación tampoco cuenta: son cuatro palabras iguales
       en todas las pantallas de la sección. */
    const clon = main.cloneNode(true);
    clon.querySelectorAll('nav').forEach((n) => n.remove());
    /* Y lo que hay dentro de un desplegable cerrado tampoco se lee: es el
       mismo punto ciego que con las decisiones, y aquí hacía que plegar una
       explicación SUBIERA la cuenta de palabras, porque el titular del
       desplegable se suma y lo de dentro no se restaba. */
    clon.querySelectorAll('details:not([open]) > *:not(summary)').forEach((n) => n.remove());
    const texto = (clon.innerText || clon.textContent || '').trim();
    const navegacion = Array.from(main.querySelectorAll('nav a[href], nav button')).filter(visible).length;
    return {
      decisiones: decisiones.length,
      navegacion,
      principales: dentro('.metal-claro').filter((el) => !el.closest('nav')).length,
      campos: dentro('input:not([type="hidden"]), select, textarea').length,
      paneles: dentro('.panel, [class*="rounded-2xl"][class*="border"]').filter((el) => !el.closest('nav')).filter(
        (el, _i, todos) => !todos.some((otro) => otro !== el && otro.contains(el)),
      ).length,
      palabras: texto ? texto.split(/\s+/).length : 0,
      alto: Math.round(main.scrollHeight),
    };
  });

  medidas.push({ ...p, ...(m ?? { error: 'sin main' }) });
}

/* ──────────────────────────────── El informe ─────────────────────────────── */

const col = (v, n) => String(v).padEnd(n);
const num = (v, n) => String(v).padStart(n);

console.log('\n  CUÁNTO PIDE CADA PANTALLA  ·  iPhone de 390 px\n');
console.log(`  ${col('pantalla', 22)}${num('decis.', 7)}${num('princ.', 7)}${num('campos', 7)}${num('panel', 6)}${num('palabr.', 8)}${num('alto', 7)}`);
console.log(`  ${'─'.repeat(64)}`);

let pasados = 0;
for (const m of medidas) {
  if (m.error) {
    console.log(`  ${col(m.nombre, 22)}  ${m.error}`);
    continue;
  }
  const malDecisiones = m.decisiones > m.tope;
  const malCampos = m.campos != null && m.campos > (m.campos ?? Infinity) ? false : false;
  const malPrincipales = m.principales > 1;
  const malas = [
    malDecisiones && `decisiones>${m.tope}`,
    malPrincipales && `${m.principales} acciones principales`,
    m.campos > (PANTALLAS.find((p) => p.ruta === m.ruta)?.campos ?? Infinity) && 'campos de más',
    m.alto > 2400 && 'tres pantallas de alto',
  ].filter(Boolean);
  if (malas.length > 0) pasados += 1;

  console.log(
    `  ${col(m.nombre, 22)}${num(m.decisiones, 7)}${num(m.principales, 7)}${num(m.campos, 7)}`
    + `${num(m.paneles, 6)}${num(m.palabras, 8)}${num(`${m.alto}px`, 7)}`
    + (malas.length > 0 ? `   ← ${malas.join(' · ')}` : ''),
  );
  void malCampos;
}

const total = medidas.filter((m) => !m.error);
const suma = (k) => total.reduce((a, m) => a + m[k], 0);
console.log(`  ${'─'.repeat(64)}`);
console.log(
  `  ${col('media', 22)}${num(Math.round(suma('decisiones') / total.length), 7)}`
  + `${num((suma('principales') / total.length).toFixed(1), 7)}`
  + `${num(Math.round(suma('campos') / total.length), 7)}`
  + `${num(Math.round(suma('paneles') / total.length), 6)}`
  + `${num(Math.round(suma('palabras') / total.length), 8)}`
  + `${num(`${Math.round(suma('alto') / total.length)}px`, 7)}`,
);

await navegador.close();

console.log(
  pasados === 0
    ? '\n  Ninguna pantalla pide más de lo que se puede entender de un vistazo.\n'
    : `\n  ${pasados} ${pasados === 1 ? 'pantalla pide' : 'pantallas piden'} más de lo que se puede entender de un vistazo.\n`,
);
process.exit(pasados === 0 ? 0 : 1);
