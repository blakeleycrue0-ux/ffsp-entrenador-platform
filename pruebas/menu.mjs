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

  /* ── Nada pegado al borde de abajo ──────────────────────────────────── */
  const abajo = await page.evaluate(() => {
    const H = document.documentElement.clientHeight;
    const pegados = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      /* Un contenedor que no recibe el dedo no tapa nada: el de los avisos
         está siempre ahí y vacío. Lo que se busca es algo que ocupe sitio
         de verdad. */
      if (cs.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.width === 0) continue;
      /* Lo que ocupa la franja inferior de la ventana. */
      if (r.bottom > H - 4 && r.top > H * 0.6) {
        pegados.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 30)}`);
      }
    }
    return pegados;
  });
  comprueba('no queda nada fijo abajo', abajo.length === 0, abajo.join(' · '));

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
