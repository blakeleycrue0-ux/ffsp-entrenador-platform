/**
 * EL AZUL DE LA MARCA: QUE ESTÉ, Y QUE ESTÉ SÓLO DONDE DEBE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ESTA PRUEBA DECÍA LO CONTRARIO. Se llamaba `sin-azul.mjs` y prohibía el
 * azul dentro de la plataforma: la herramienta era blanco y negro entera
 * mientras la portada era azul de arriba abajo, y parecían dos productos.
 * Dicho por quien la usa: «no hay color».
 *
 * Lo llamativo es que el propio `tailwind.config.js` llevaba meses diciendo
 * la versión buena —«dentro de la aplicación el azul es SEÑAL, no decorado:
 * marca la sección abierta, la acción principal y el foco del teclado»— y
 * esta prueba imponía justo lo opuesto. Había una intención escrita y un
 * guardián que la impedía.
 *
 * Así que ahora comprueba las dos mitades del mismo trato:
 *
 *   1. QUE EL AZUL ESTÉ. En Inicio tiene que haber azul: la tarjeta de la
 *      hora, la acción principal y el destino abierto de la navegación. Una
 *      «limpieza de color» que lo borre vuelve a dejar la aplicación en gris
 *      y aquí salta.
 *   2. QUE NO SE DESPARRAME. Cada azul que aparezca tiene que estar DENTRO
 *      de uno de los sitios donde significa algo. Un azul en el borde de
 *      una tarjeta cualquiera, en un icono suelto o en el texto de una
 *      lista no es señal: es decoración, y entonces el azul deja de querer
 *      decir «esto es lo que hay que pulsar».
 *   3. QUE LA PORTADA SIGA SIENDO AZUL, que es de donde sale el color.
 *
 * Y EL ACCESO TAMBIÉN. `/entrar` se pinta sobre el cielo de la portada, con
 * sus mismas clases, porque es el último paso de la página pública y no el
 * primero de la herramienta: se llega desde un anuncio, se contesta y se
 * entra. Un corte a gris en mitad de ese camino se lee como haber
 * aterrizado en otro sitio.
 *
 *   npm run build && npm run preview
 *   node pruebas/marca.mjs
 */
import { chromium } from 'playwright';
import { mock, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

const RUTAS = [
  '/app', '/app/calendario', '/app/entrenamientos', '/app/entrenamientos/nuevo',
  '/app/entrenamientos/s1', '/app/entrenamientos/s1/editar',
  '/app/entrenamientos/s1/asistencia',
  '/app/plantilla', '/app/plantilla/nueva', '/app/disponibilidad',
  '/app/partidos', '/app/partidos/nuevo', '/app/partidos/m1',
  '/app/ejercicios', '/app/ejercicios/nuevo', '/app/analiticas',
  '/app/equipo-tecnico', '/app/equipo-tecnico/club',
  '/app/ajustes', '/app/ajustes/plan', '/app/perfil',
];

/* ── `/entrar` CAMBIÓ DE BANDO, Y ESTO ES LO QUE HAY QUE SABER ────────────
   Aquí ponía que el acceso «también tiene que estar en blanco y negro»,
   porque cuando se escribió esta prueba lo estaba. Ya no: el acceso y el
   alta se pintan sobre el cielo azul de la portada, con sus mismas clases
   —`.cielo`, `.btn-claro`, `.t-l`—, porque son el último paso de la página
   pública y no el primero de la herramienta. Se llega desde un anuncio, se
   contesta y se entra; un corte a gris en mitad de ese camino se lee como
   haber aterrizado en otro sitio.

   Así que `/entrar` pasa al otro lado de la prueba: en vez de exigirle que
   NO tenga azul, se le exige que lo TENGA, igual que a la portada. Que una
   limpieza de color no se la lleve por delante sin que nadie se entere. */
const AZULES_A_PROPOSITO = ['/', '/entrar'];

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

/**
 * Los azules que se ven, y si están donde deben.
 * ---------------------------------------------------------------------------
 * «Donde deben» son los sitios en los que el color SIGNIFICA algo, y están
 * escritos aquí en forma de selector:
 *
 *   `.metal-claro`          la acción principal de cada pantalla.
 *   `[aria-current="page"]` lo abierto: el destino de la barra de abajo y la
 *                           pestaña de la sección.
 *   `.heroe`                la tarjeta del dato principal de Inicio.
 *
 * Se mira con `closest`, así que lo de dentro de esos sitios también vale:
 * la letra blanca y el icono que van encima del azul son parte de la pieza.
 */
const MIRAR_AZUL = `(() => {
  const PERMITIDO = '.metal-claro, [aria-current="page"], .heroe';
  const azul = (c) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(c || '');
    if (!m) return null;
    const [r, g, b, a = '1'] = m[1].split(',').map((x) => parseFloat(x));
    if (parseFloat(a) < 0.12) return null;          // no se ve
    if (b - Math.max(r, g) > 10) return c;           // tira a azul
    return null;
  };
  const fuera = new Map();
  let dentro = 0;
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) < 0.12) continue;
    for (const [prop, valor] of [
      ['fondo', s.backgroundColor],
      ['texto', s.color],
      ['borde', s.borderTopColor],
      ['borde', s.borderBottomColor],
      ['trazo', s.stroke],
      ['relleno', s.fill],
      ['sombra', s.boxShadow],
    ]) {
      const trozos = prop === 'sombra' ? (valor || '').match(/rgba?\\([^)]+\\)/g) ?? [] : [valor];
      for (const t of trozos) {
        const color = azul(t);
        if (!color) continue;
        if (el.closest(PERMITIDO)) { dentro++; continue; }
        const quien = el.tagName.toLowerCase()
          + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
        const clave = prop + '|' + color + '|' + quien;
        if (!fuera.has(clave)) fuera.set(clave, { prop, color, quien });
      }
    }
  }
  return { dentro, fuera: [...fuera.values()].slice(0, 6) };
})()`;

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

/* LAS DOS, MÓVIL Y ESCRITORIO. A 390 px el menú lateral no existe —es la
   pastilla de abajo la que manda— y la cabecera va sin fondo; a 1280 px
   aparecen la barra lateral, su sección activa y la cabecera con línea. Medir
   sólo el teléfono deja la mitad de la plataforma sin mirar, y es la mitad
   donde vive el menú. */
const TAMANOS = [
  { nombre: 'móvil 390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { nombre: 'escritorio 1280', viewport: { width: 1280, height: 900 } },
];

/** Recorre unas direcciones y canta el azul que se haya salido de su sitio. */
async function recorre(page, rutas) {
  let azulVistoEnTotal = 0;
  for (const ruta of rutas) {
    try {
      await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
    } catch {
      comprueba(ruta, false, 'no carga');
      continue;
    }
    await page.waitForTimeout(700);
    /* CON LA DIRECCIÓN QUE HAY, NO CON LA QUE SE PIDIÓ. Si la pantalla
       manda a otra parte, lo que se ha medido es la otra: decirlo evita dar
       por buena una pantalla que no se ha mirado. */
    const donde = new URL(page.url()).pathname;
    const { dentro, fuera } = await page.evaluate(MIRAR_AZUL);
    azulVistoEnTotal += dentro;
    comprueba(
      ruta + (donde === ruta ? '' : ` → ${donde}`),
      fuera.length === 0,
      fuera.length === 0
        ? (dentro > 0 ? `${dentro} en su sitio` : 'sin azul')
        : fuera.map((a) => `${a.prop} ${a.color} en ${a.quien}`).join(' · '),
    );
  }
  return azulVistoEnTotal;
}

for (const { nombre, ...opciones } of TAMANOS) {
  console.log(`\n  el azul, sólo donde significa algo · ${nombre}\n`);

  const ctx = await navegador.newContext(opciones);
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  const total = await recorre(page, RUTAS);

  /* Y QUE EXISTA. Lo de arriba sólo dice que no se ha desparramado, y una
     aplicación en gris entero pasaría ese examen con nota. Esto es la otra
     mitad: en algún sitio tiene que haber azul, porque si no volvemos a
     tener una herramienta sin cara. */
  comprueba('hay azul de marca en la plataforma', total > 0,
    total > 0 ? `${total} elementos` : 'NI UNO: la aplicación ha vuelto al gris');

  await ctx.close();
}

/* ── Y lo contrario: lo que es azul SIGUE siéndolo ────────────────────────
   SIN SESIÓN, los dos. `/entrar` con la sesión puesta manda a `/app`, así
   que medirlo desde el contexto de arriba habría sido medir Inicio por
   segunda vez y cantar un verde que no es de esa pantalla. */
console.log('\n  y lo que es azul sigue siendo azul\n');
{
  const limpio = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await limpio.newPage();
  for (const ruta of AZULES_A_PROPOSITO) {
    await p2.goto(BASE + ruta, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(900);
    /* Aquí no hay «sitios permitidos» que valgan: la portada es azul
       entera, así que cuenta todo lo que vea, dentro y fuera. */
    const { dentro, fuera } = await p2.evaluate(MIRAR_AZUL);
    const cuantos = dentro + fuera.length;
    comprueba(
      ruta === '/' ? 'la página pública conserva su azul' : 'el acceso conserva el azul de la portada',
      cuantos > 0,
      cuantos > 0 ? `${cuantos} sitios` : 'NO QUEDA NINGUNO',
    );
  }
  await limpio.close();
}

await navegador.close();
console.log(
  fallos === 0
    ? '\n  El azul está, y sólo donde quiere decir algo.\n'
    : `\n  ${fallos} ${fallos === 1 ? 'problema' : 'problemas'} con el azul.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
