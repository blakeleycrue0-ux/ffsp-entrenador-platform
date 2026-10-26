/**
 * NI UNA GOTA DE AZUL DENTRO DE LA PLATAFORMA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El encargo lo dice así: «No lo des por terminado si sigue predominando el
 * azul marino». Eso no se comprueba mirando capturas una por una —el azul se
 * esconde en el borde de un campo enfocado, en el punto de un gráfico, en el
 * aro del foco del teclado, en un desplegable que sólo sale al tocarlo—, y
 * cada pantalla nueva puede volver a meterlo sin que nadie se entere.
 *
 * Así que se cuenta. Esta prueba recorre las pantallas de la plataforma y
 * mira el color CALCULADO de cada elemento: su fondo, su texto, su borde y,
 * en los dibujos, su trazo y su relleno. Un color es azul cuando su
 * componente azul se separa de las otras dos —`b − max(r, g) > 10`— y se ve
 * de verdad, es decir, no es transparente.
 *
 * LA PORTADA NO ENTRA, Y ES EL OTRO MOTIVO DE QUE ESTO EXISTA. La página
 * pública es azul a propósito y tiene que seguir siéndolo. Esta prueba
 * comprueba las dos mitades del trato: que dentro no quede azul, y que fuera
 * NO SE HAYA IDO. Si alguien «limpia» el azul tocando un color compartido, la
 * portada se queda en gris y aquí se ve.
 *
 * Y SE MIRA A DOS TAMAÑOS. El menú lateral, su sección activa y la cabecera
 * con línea sólo existen a partir de 1024 px: medir únicamente el teléfono
 * dejaría sin mirar justo la parte donde vive la navegación del escritorio.
 *
 *   npm run build && npm run preview
 *   node pruebas/sin-azul.mjs
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

/* LA PIZARRA NO ENTRA, Y NO ES UN OLVIDO. Sus fichas son de colores a
   propósito —la jugadora, la rival, la portera, el comodín, el cono, la
   zona—: el color ES el dato, igual que el azul de la portada es la marca.
   Dejarlas todas en gris no simplificaría nada; quitaría la única manera de
   distinguir una pieza de otra sobre un campo verde. El marco de la pizarra
   —su barra de herramientas, sus botones— sí se repintó, y eso se ve en el
   resto de las pruebas de la pizarra. */

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

/** Lo que se ejecuta dentro de la página: devuelve los colores azules que ve. */
const BUSCAR_AZUL = `(() => {
  const azul = (c) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(c || '');
    if (!m) return null;
    const [r, g, b, a = '1'] = m[1].split(',').map((x) => parseFloat(x));
    if (parseFloat(a) < 0.12) return null;          // no se ve
    if (b - Math.max(r, g) > 10) return c;           // tira a azul
    return null;
  };
  const visto = new Map();
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
      /* En la sombra puede haber varios colores; se miran todos. */
      const trozos = prop === 'sombra' ? (valor || '').match(/rgba?\\([^)]+\\)/g) ?? [] : [valor];
      for (const t of trozos) {
        const malo = azul(t);
        if (!malo) continue;
        const quien = el.tagName.toLowerCase()
          + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
        const clave = prop + '|' + malo + '|' + quien;
        if (!visto.has(clave)) visto.set(clave, { prop, color: malo, quien });
      }
    }
  }
  return [...visto.values()].slice(0, 8);
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

/** Mira una lista de direcciones y canta las que tengan azul. */
async function recorre(page, rutas) {
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
    const azules = await page.evaluate(BUSCAR_AZUL);
    comprueba(
      ruta + (donde === ruta ? '' : ` → ${donde}`),
      azules.length === 0,
      azules.map((a) => `${a.prop} ${a.color} en ${a.quien}`).join(' · '),
    );
  }
}

for (const { nombre, ...opciones } of TAMANOS) {
  console.log(`\n  dentro de la plataforma, ni una gota de azul · ${nombre}\n`);

  const ctx = await navegador.newContext(opciones);
  const page = await ctx.newPage();
  await mock(page);
  await page.addInitScript(([u]) => sessionStorage.setItem('p360.desbloqueado', u), [USER]);
  await recorre(page, RUTAS);
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
    const azules = await p2.evaluate(BUSCAR_AZUL);
    comprueba(
      ruta === '/' ? 'la página pública conserva su azul' : 'el acceso conserva el azul de la portada',
      azules.length > 0,
      azules.length > 0 ? `${azules.length} sitios, p. ej. ${azules[0].color}` : 'NO QUEDA NINGUNO',
    );
  }
  await limpio.close();
}

await navegador.close();
console.log(
  fallos === 0
    ? '\n  Negro, blanco y grises dentro. Azul fuera, donde tiene que estar.\n'
    : `\n  ${fallos} ${fallos === 1 ? 'pantalla' : 'pantallas'} con azul.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
