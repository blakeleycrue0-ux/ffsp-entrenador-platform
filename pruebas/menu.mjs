/**
 * La navegación: cuatro secciones, y nada escondido.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ SUSTITUYE Y POR QUÉ CAMBIA ESTA PRUEBA, OTRA VEZ. Primero hubo un dique
 * fijo abajo con cuatro atajos y una hoja «Más» con otras siete secciones.
 * Luego, un cajón con las once en el mismo orden que el escritorio. Ahora no
 * hay once: hay CUATRO secciones, cada una con sus pantallas dentro en
 * pestañas, y las cuatro están siempre a la vista. El cajón ya no existe.
 *
 * Reducir una navegación es fácil de hacer mal: basta con esconder cosas y
 * decir que la aplicación es más simple. Por eso esta prueba no comprueba que
 * haya cuatro botones —eso se ve—; comprueba LAS DOS COSAS QUE PUEDEN SALIR
 * MAL al quitar un menú:
 *
 *   1. QUE NO SE HAYA PERDIDO NADA. Las trece pantallas con nombre tienen que
 *      seguir alcanzándose a dedo desde la aplicación, sin escribir la
 *      dirección a mano. Si una sección deja de tener camino, esto falla.
 *   2. QUE SIEMPRE SE SEPA DÓNDE SE ESTÁ. También dentro de una ficha o de un
 *      formulario: abrir una jugadora es seguir estando en Equipo. Con las
 *      once, en ocho de ellas no se encendía nada abajo.
 *
 * Y lo de siempre: que la pastilla flote, quepa en el hueco que declara
 * `--nav-h` y lleve a donde dice.
 *
 *   npm run build && npm run preview
 *   node pruebas/menu.mjs
 */
import { chromium } from 'playwright';
import { mock, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

/* Las cuatro secciones y las pantallas de cada una, copiadas a mano de
   `components/layout/navigation.ts`. Se escriben aquí A PROPÓSITO: si alguien
   quita una pantalla de la navegación, esta prueba tiene que fallar en vez de
   seguirle la corriente leyendo el mismo archivo. */
const SECCIONES = [
  { label: 'Inicio', to: '/app', paginas: [] },
  {
    label: 'Calendario',
    to: '/app/calendario',
    paginas: [['Agenda', '/app/calendario'], ['Entrenos', '/app/entrenamientos'], ['Partidos', '/app/partidos']],
  },
  {
    label: 'Equipo',
    to: '/app/plantilla',
    paginas: [['Plantilla', '/app/plantilla'], ['Disponibilidad', '/app/disponibilidad'], ['Datos', '/app/analiticas'], ['Equipos', '/app/equipo-tecnico']],
  },
  {
    label: 'Ejercicios',
    to: '/app/ejercicios',
    /* Una sola pantalla desde que se fue la pizarra: sin pestañas. */
    paginas: [],
  },
];

/* La cuenta no es una sección: vive detrás del avatar. */
const CUENTA = [['Mi perfil', '/app/perfil'], ['Ajustes y ayuda', '/app/ajustes'], ['Plan del club', '/app/ajustes/plan']];

/* Dónde tiene que encenderse la navegación estando DENTRO de algo. */
const DENTRO = [
  ['/app/plantilla/p0', 'Equipo'],
  ['/app/entrenamientos/s1', 'Calendario'],
  ['/app/partidos/m1', 'Calendario'],
  ['/app/ejercicios/d1', 'Ejercicios'],
  ['/app/entrenamientos/s1/asistencia', 'Calendario'],
];

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

async function abre(ancho, ruta = '/app') {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: ancho < 500 ? 844 : 900 },
    deviceScaleFactor: 2, isMobile: ancho < 500, hasTouch: ancho < 900,
  });
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  return { page, ctx };
}

/* ═══════════════════ 1. La pastilla del móvil ═════════════════════════════ */
{
  console.log('\n  la pastilla del móvil\n');
  const { page, ctx } = await abre(320);
  const pastilla = page.locator('nav[aria-label="Navegación principal"]');

  comprueba('está', await pastilla.isVisible());

  const enlaces = pastilla.locator('a');
  const etiquetas = await enlaces.allInnerTexts();
  comprueba(
    'con las cuatro secciones, y sólo ésas',
    etiquetas.map((t) => t.trim()).join(' · ') === SECCIONES.map((s) => s.label).join(' · '),
    etiquetas.map((t) => t.trim()).join(' · '),
  );
  comprueba('y ya no hay ningún «Menú»', !/Menú/i.test(etiquetas.join(' ')));

  /* Que flote: separada del suelo y de los lados, en la pantalla más
     estrecha, que es donde se salía. */
  const caja = await pastilla.boundingBox();
  const alto = page.viewportSize().height;
  comprueba('flota sobre el suelo', alto - (caja.y + caja.height) >= 8,
    `${Math.round(alto - (caja.y + caja.height))}px por debajo`);
  comprueba('y no toca los lados a 320 px', caja.x >= 8 && caja.x + caja.width <= 320 - 8,
    `${Math.round(caja.x)}…${Math.round(caja.x + caja.width)}`);

  /* Y que quepa en el hueco que la aplicación reserva: el número lo lee de la
     variable, no de un literal escrito aquí. */
  const reservado = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')));
  comprueba('cabe en el hueco que reserva --nav-h', caja.height <= reservado + 1,
    `mide ${Math.round(caja.height)} y reserva ${reservado}`);

  await ctx.close();
}

/* ═══════════════ 2. Todas las pantallas siguen alcanzándose ═══════════════ */
{
  console.log('\n  nada se ha perdido por el camino\n');
  const { page, ctx } = await abre(390);

  for (const s of SECCIONES) {
    /* Se toca la sección en la pastilla. */
    await page.locator('nav[aria-label="Navegación principal"]').getByRole('link', { name: s.label, exact: true }).click();
    await page.waitForTimeout(700);
    comprueba(`${s.label}: se llega tocando`, page.url().endsWith(s.to), page.url().replace(BASE, ''));

    /* Y desde ahí, sus pestañas llevan a sus pantallas. */
    for (const [etiqueta, destino] of s.paginas) {
      const pestaña = page.locator(`nav[aria-label="${s.label}"]`).getByRole('link', { name: etiqueta, exact: true });
      if ((await pestaña.count()) === 0) {
        comprueba(`${s.label} › ${etiqueta}: hay pestaña`, false, 'no está');
        continue;
      }
      await pestaña.click();
      await page.waitForTimeout(650);
      comprueba(`${s.label} › ${etiqueta}`, page.url().endsWith(destino), page.url().replace(BASE, ''));
      /* Al cambiar de pestaña, la sección de abajo sigue siendo la misma. */
      const marcada = await page.locator('nav[aria-label="Navegación principal"] [aria-current="page"]').innerText();
      comprueba(`  …y sigue marcando ${s.label}`, marcada.trim() === s.label, marcada.trim());
    }
  }

  await ctx.close();
}

/* ═══════════════════ 3. La cuenta, detrás del avatar ══════════════════════ */
{
  console.log('\n  la cuenta\n');
  const { page, ctx } = await abre(390);

  await page.getByRole('button', { name: 'Mi cuenta' }).click();
  await page.waitForTimeout(400);
  for (const [etiqueta, destino] of CUENTA) {
    const enlace = page.getByRole('link', { name: etiqueta, exact: true });
    comprueba(`${etiqueta} está`, (await enlace.count()) > 0);
    if ((await enlace.count()) > 0) {
      comprueba(`  …y lleva a ${destino}`, (await enlace.first().getAttribute('href')) === destino,
        await enlace.first().getAttribute('href'));
    }
  }
  comprueba('y se puede cerrar sesión', (await page.getByRole('button', { name: /cerrar sesión/i }).count()) > 0);

  await ctx.close();
}

/* ═════════ 4. Dentro de una ficha se sigue sabiendo dónde se está ═════════ */
{
  console.log('\n  dentro de una ficha\n');
  for (const [ruta, seccion] of DENTRO) {
    const { page, ctx } = await abre(390, ruta);
    const marcada = page.locator('nav[aria-label="Navegación principal"] [aria-current="page"]');
    const texto = (await marcada.count()) > 0 ? (await marcada.innerText()).trim() : '—';
    comprueba(`${ruta} es ${seccion}`, texto === seccion, texto);
    /* Y ahí NO se pintan pestañas: se está haciendo una cosa. */
    const pestañas = await page.locator(`nav[aria-label="${seccion}"]`).count();
    comprueba('  …sin pestañas de sección', pestañas === 0);
    await ctx.close();
  }
}

/* ═══════════════════ 5. El escritorio, el mismo menú ══════════════════════ */
{
  console.log('\n  la barra lateral del escritorio\n');
  const { page, ctx } = await abre(1280);

  const lateral = page.locator('nav[aria-label="Secciones"]');
  comprueba('está la barra', await lateral.isVisible());
  const etiquetas = (await lateral.locator('a').allInnerTexts()).map((t) => t.trim());
  comprueba(
    'con las mismas cuatro que el móvil',
    etiquetas.join(' · ') === SECCIONES.map((s) => s.label).join(' · '),
    etiquetas.join(' · '),
  );
  comprueba('y la pastilla no sale en el escritorio',
    !(await page.locator('nav[aria-label="Navegación principal"]').isVisible()));

  /* Plegarla sigue funcionando: es lo que le devuelve el ancho a la pizarra. */
  await page.getByRole('button', { name: 'Plegar el menú' }).click();
  await page.waitForTimeout(500);
  comprueba('se pliega', !(await lateral.isVisible()));
  await page.getByRole('button', { name: 'Mostrar el menú' }).click();
  await page.waitForTimeout(500);
  comprueba('y vuelve', await lateral.isVisible());

  await ctx.close();
}

await navegador.close();
console.log(
  fallos === 0
    ? '\n  Cuatro sitios, todo alcanzable, y siempre se sabe en cuál estás.\n'
    : `\n  ${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
