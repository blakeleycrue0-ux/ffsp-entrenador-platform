/**
 * El menú, en el móvil y en el escritorio.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ SUSTITUYE Y QUÉ HAY QUE VIGILAR AHORA. En el móvil había un dique fijo
 * abajo con cuatro atajos y una hoja «Más» con las otras siete secciones.
 * Ahora es un cajón que se abre desde la cabecera con la MISMA lista que el
 * escritorio. Eso cambia tres cosas que una prueba tiene que sostener:
 *
 *  1. QUE ESTÉN LAS ONCE. Con el dique, siete secciones vivían escondidas en
 *     otra lista; era fácil añadir una sección nueva y que no apareciera en
 *     el móvil. Aquí se comprueba contra la misma lista que usa el código.
 *  2. QUE SE PUEDA CERRAR. Era literalmente la queja: un menú que no se
 *     cierra ocupa sitio siempre. Se prueban las cuatro salidas: la X, tocar
 *     fuera, Escape y navegar a una sección.
 *  3. QUE NO QUEDE NADA FIJO ABAJO. El dique se comía cien píxeles de alto en
 *     todas las pantallas; si vuelve a aparecer algo pegado al borde
 *     inferior sin querer, esto lo dice.
 *
 * Y en el escritorio, lo contrario: que NO haya hamburguesa y sí barra
 * lateral, porque son dos marcos del mismo menú y no deben salir los dos.
 *
 *   npm run build && npm run preview
 *   node pruebas/menu.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { mock, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';
mkdirSync('salida/menu', { recursive: true });

/* Las once secciones, copiadas de `components/layout/navigation.ts`. Se
   escriben aquí a mano A PROPÓSITO: si alguien quita una del menú, esta
   prueba tiene que fallar en vez de seguir a su lado. */
const SECCIONES = [
  'Inicio', 'Calendario',
  'Plantilla', 'Disponibilidad y lesiones',
  'Entrenamientos', 'Biblioteca de ejercicios', 'Pizarra táctica', 'Partidos',
  'Analíticas', 'Equipo técnico', 'Ajustes y ayuda',
];

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

async function abre(ancho, alto, ruta = '/app/plantilla') {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto }, deviceScaleFactor: 2,
    isMobile: ancho < 500, hasTouch: ancho < 900,
  });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  return { ctx, page };
}

const cajon = (page) => page.locator('[role="dialog"][aria-label="Menú"]');

/* ══════════════════════════════════════════════════════════════════════════
   1 · El móvil
   ══════════════════════════════════════════════════════════════════════════ */
{
  const { ctx, page } = await abre(390, 844);
  console.log('\n  el cajón del móvil');

  comprueba('hay hamburguesa', await page.getByRole('button', { name: 'Abrir el menú' }).count() === 1);
  comprueba('y empieza cerrado', await cajon(page).count() === 0);

  await page.getByRole('button', { name: 'Abrir el menú' }).click();
  await page.waitForTimeout(500);
  comprueba('se abre', await cajon(page).isVisible());

  /* Las once, visibles de verdad: no basta con que estén en el árbol. */
  const faltan = [];
  for (const s of SECCIONES) {
    const enlace = cajon(page).getByRole('link', { name: s, exact: true });
    if (await enlace.count() === 0 || !(await enlace.first().isVisible())) faltan.push(s);
  }
  comprueba('están las once secciones', faltan.length === 0, faltan.join(', '));

  /* La sección abierta se distingue. */
  const marcada = await page.evaluate(() => {
    const a = document.querySelector('[role="dialog"] a[aria-current="page"]');
    return a ? a.textContent.trim() : null;
  });
  comprueba('la sección abierta está marcada', marcada === 'Plantilla', String(marcada));

  await page.screenshot({ path: 'salida/menu/cajon.png', animations: 'disabled' });

  /* ── Las cuatro maneras de cerrarlo ─────────────────────────────────── */
  await page.getByRole('button', { name: 'Cerrar el menú' }).click();
  await page.waitForTimeout(400);
  comprueba('cierra con la X', await cajon(page).count() === 0);

  await page.getByRole('button', { name: 'Abrir el menú' }).click();
  await page.waitForTimeout(450);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  comprueba('cierra con Escape', await cajon(page).count() === 0);

  await page.getByRole('button', { name: 'Abrir el menú' }).click();
  await page.waitForTimeout(450);
  /* Tocar fuera: la esquina de abajo a la derecha, lejos del cajón. */
  await page.mouse.click(370, 800);
  await page.waitForTimeout(400);
  comprueba('cierra al tocar fuera', await cajon(page).count() === 0);

  await page.getByRole('button', { name: 'Abrir el menú' }).click();
  await page.waitForTimeout(450);
  await cajon(page).getByRole('link', { name: 'Partidos', exact: true }).click();
  await page.waitForTimeout(900);
  comprueba('cierra al ir a una sección', await cajon(page).count() === 0);
  comprueba('y ha navegado', page.url().includes('/app/partidos'), page.url());

  /* ── La pastilla de abajo: FLOTA, no es un suelo ─────────────────────────
     Aquí se comprobaba que no quedara NADA fijo abajo, porque lo que había
     antes era un dique de borde a borde con cuatro atajos y una hoja «Más»
     que escondía siete secciones. Ahora hay otra cosa: una pastilla con tres
     destinos, aire a los lados y la lista completa de once todavía en el
     cajón. Que no haya nada abajo dejó de ser la regla; la regla es que lo
     que haya abajo FLOTE y no tape nada.

     Lo de «no tapa nada» lo mide `solapes.mjs`, que desplaza cada pantalla
     hasta el final y comprueba que ningún botón se queda debajo. Aquí se
     comprueba lo otro: que es una pastilla y no un suelo. */
  const pastilla = await page.evaluate(() => {
    const H = document.documentElement.clientHeight;
    const W = document.documentElement.clientWidth;
    const nav = document.querySelector('nav[aria-label="Navegación principal"]');
    if (!nav) return null;
    const r = nav.getBoundingClientRect();
    /* El hueco reservado se lee de la variable, no se escribe aquí: si
       mañana la pastilla cambia de alto, lo que tiene que cuadrar es que las
       dos cosas sigan diciendo lo mismo. */
    const reservado = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
    return {
      destinos: [...nav.querySelectorAll('a')].map((a) => (a.textContent || '').trim()),
      /* Aire a los lados y por abajo: si midiera el ancho entero o llegara al
         borde inferior, sería un dique con las esquinas redondeadas. */
      margenIzq: Math.round(r.left),
      margenDer: Math.round(W - r.right),
      margenAbajo: Math.round(H - r.bottom),
      alto: Math.round(r.height),
      reservado,
    };
  });

  comprueba('hay una pastilla de navegación', pastilla !== null);
  if (pastilla) {
    comprueba('con tres destinos', pastilla.destinos.length === 3, pastilla.destinos.join(' · '));
    comprueba('flota: no toca los lados',
      pastilla.margenIzq >= 8 && pastilla.margenDer >= 8,
      `izq ${pastilla.margenIzq} · der ${pastilla.margenDer}`);
    comprueba('flota: no toca el suelo', pastilla.margenAbajo >= 8, `${pastilla.margenAbajo}px`);
    comprueba('y cabe en el hueco reservado que dice `--nav-h`',
      pastilla.alto <= pastilla.reservado,
      `${pastilla.alto}px de ${pastilla.reservado}`);

    /* Y LLEVA A DONDE DICE. Una navegación que no marca dónde estás obliga a
       leer el título de la página para saberlo. */
    await page.getByRole('link', { name: 'Calendario' }).last().click();
    await page.waitForTimeout(600);
    comprueba('lleva al Calendario', page.url().endsWith('/app/calendario'), page.url());
    const marcado = await page.evaluate(() => {
      const a = document.querySelector('nav[aria-label="Navegación principal"] [aria-current="page"]');
      return a ? (a.textContent || '').trim() : null;
    });
    comprueba('y marca dónde estás', marcado === 'Calendario', String(marcado));

    /* Al desplazarse se queda: es el sentido de que flote. */
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const sigue = await page.evaluate(() => {
      const n = document.querySelector('nav[aria-label="Navegación principal"]');
      const r = n.getBoundingClientRect();
      return r.bottom <= document.documentElement.clientHeight + 1 && r.top > 0;
    });
    comprueba('y sigue ahí al llegar al final', sigue);
  }

  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · El escritorio
   ══════════════════════════════════════════════════════════════════════════ */
{
  const { ctx, page } = await abre(1440, 900);
  console.log('\n  la barra lateral del escritorio');

  comprueba('no hay hamburguesa',
    await page.getByRole('button', { name: 'Abrir el menú' }).isVisible().catch(() => false) === false);

  /* Ni pastilla flotante: aquí la navegación es la barra lateral, y las dos
     a la vez serían dos sitios distintos para ir al mismo sitio. */
  comprueba('ni pastilla flotante',
    await page.locator('nav[aria-label="Navegación principal"]').count() > 0
      ? !(await page.locator('nav[aria-label="Navegación principal"]').first().isVisible())
      : true);

  const faltan = [];
  for (const s of SECCIONES) {
    const enlace = page.locator('aside').getByRole('link', { name: s, exact: true });
    if (await enlace.count() === 0 || !(await enlace.first().isVisible())) faltan.push(s);
  }
  comprueba('están las once en la barra', faltan.length === 0, faltan.join(', '));

  /* Y se puede plegar, que es lo que da el ancho a la pizarra. */
  await page.getByRole('button', { name: 'Plegar el menú' }).click();
  await page.waitForTimeout(500);
  comprueba('la barra se pliega', await page.locator('aside').count() === 0);
  comprueba('y hay botón para traerla', await page.getByRole('button', { name: 'Mostrar el menú' }).count() === 1);

  await page.screenshot({ path: 'salida/menu/escritorio-plegado.png', animations: 'disabled' });
  await ctx.close();
}

await navegador.close();
console.log(fallos === 0
  ? '\n  Un solo menú, dos marcos, y en el móvil se cierra.'
  : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
