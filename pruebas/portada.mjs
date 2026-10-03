/**
 * La portada, medida.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ ESTO ES UNA PRUEBA Y NO UNA MIRADA. La portada se ha rehecho tres
 * veces, y cada vez el fallo ha sido el mismo: algo que a 1440 quedaba bien, a
 * 390 quedaba a dos dedos del borde, o un botón que se pedía de 6 px de radio
 * y salía de 12 porque este proyecto redefine la escala de Tailwind. Eso no se
 * ve mirando capturas: se ve midiendo el DOM.
 *
 * Aquí se comprueban las proporciones —dónde cae cada pieza respecto al alto
 * de la ventana— y los tamaños concretos, en los cinco tamaños que importan.
 *
 *   npm run build && npm run preview
 *   node pruebas/portada.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const SALIDA = 'salida/portada';
mkdirSync(SALIDA, { recursive: true });

const TAMANOS = [
  ['390×844', 390, 844, 2],
  ['430×932', 430, 932, 2],
  ['768×1024', 768, 1024, 2],
  ['1440×900', 1440, 900, 1.5],
  ['1920×1080', 1920, 1080, 1],
];

let fallos = 0;
const nota = [];
function comprueba(nombre, bien, detalle) {
  if (!bien) { fallos++; nota.push(`    ✗ ${nombre}: ${detalle}`); }
}
const entre = (v, a, b) => v >= a && v <= b;

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

for (const [etiqueta, w, h, escala] of TAMANOS) {
  const ctx = await navegador.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: escala,
    isMobile: w < 500,
    hasTouch: w < 500,
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_CERT|favicon|Failed to load resource/.test(t)) errores.push(t);
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);

  const m = await page.evaluate(() => {
    const vh = window.innerHeight;
    const caja = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { arriba: r.top, abajo: r.bottom, alto: r.height, ancho: r.width, izq: r.left, der: r.right };
    };
    const estilo = (sel, props) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const c = getComputedStyle(el);
      return Object.fromEntries(props.map((k) => [k, c[k]]));
    };
    const portada = document.querySelector('main > section');
    const sello = portada.querySelector('span');
    const h1 = portada.querySelector('h1');
    const parrafo = portada.querySelector('p');
    const botones = [...portada.querySelectorAll('a[href="/entrar"], button')];
    const marca = (el) => { const r = el.getBoundingClientRect(); return { arriba: r.top, abajo: r.bottom, alto: r.height, ancho: r.width, izq: r.left, der: r.right }; };

    /* ¿CUÁNTAS LÍNEAS? Contar rectángulos de cliente parece lo correcto y
       aquí miente: la palabra en cursiva va a otro cuerpo, así que su
       rectángulo empieza a otra altura que el texto que la rodea y se cuenta
       como una línea de más. Con eso, un titular de dos líneas salía de tres.
       El alto entre la altura de línea no se deja engañar. */
    const lineas = (el) => {
      const c = getComputedStyle(el);
      return Math.round(el.getBoundingClientRect().height / parseFloat(c.lineHeight));
    };

    return {
      vh,
      portadaAlto: portada.getBoundingClientRect().height,
      sello: { ...marca(sello), ...estilo('main > section span', ['fontSize', 'borderRadius', 'paddingLeft']) },
      h1: { ...marca(h1), lineas: lineas(h1), ...estilo('main > section h1', ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'textAlign']) },
      parrafo: { ...marca(parrafo), lineas: lineas(parrafo), texto: parrafo.textContent.trim() },
      botones: botones.map((b) => ({ ...marca(b), texto: b.textContent.trim(), ...getComputedStyle(b) && { radio: getComputedStyle(b).borderRadius, tipo: getComputedStyle(b).fontSize } })),
      cabeceraCta: caja('header a[href="/entrar"]:last-of-type'),
      lienzo: caja('main > section canvas'),
      desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  const pc = (y) => +((y / m.vh) * 100).toFixed(1);
  const bot = m.botones;

  console.log(`\n  ${etiqueta}`);
  console.log(`    tela ${pc(m.lienzo.arriba)}→${pc(m.lienzo.abajo)} %   sello ${pc(m.sello.arriba)} %   titular ${pc(m.h1.arriba)}→${pc(m.h1.abajo)} %   texto ${pc(m.parrafo.arriba)} %   botones ${pc(bot[0].arriba)}→${pc(bot[0].abajo)} %`);
  console.log(`    titular ${m.h1.fontSize} / peso ${m.h1.fontWeight} / ${m.h1.letterSpacing} / ${m.h1.lineas} líneas · texto ${m.parrafo.lineas} renglones / ${m.h1.textAlign}`);
  console.log(`    sello ${Math.round(m.sello.alto)} px · ${m.sello.fontSize} · r${m.sello.borderRadius}    botones ${Math.round(bot[0].alto)} px · ${bot[0].tipo} · r${bot[0].radio}    cta cabecera ${Math.round(m.cabeceraCta.alto)} px`);

  /* ── La portada es un solo fotograma ─────────────────────────────────── */
  comprueba('un solo fotograma', Math.abs(m.portadaAlto - m.vh) < 2, `${Math.round(m.portadaAlto)} ≠ ${m.vh}`);
  comprueba('sin desborde horizontal', m.desborde <= 0, `${m.desborde} px`);
  comprueba('sin errores de consola', errores.length === 0, errores.join(' | '));

  /* ── LA TELA CRUZA POR DETRÁS DEL TEXTO ──────────────────────────────
     Ésta es la que importa y la que fallaba: si el lienzo se corta por
     encima del titular, vuelven a ser dos cosas pegadas en vez de una. */
  comprueba('la tela llega al pie', m.lienzo.abajo >= m.vh - 1, `acaba en ${pc(m.lienzo.abajo)} %`);
  comprueba('la tela pasa por detrás del titular', m.lienzo.abajo > m.h1.abajo, 'se corta antes');

  /* ── Las proporciones ────────────────────────────────────────────────── */
  comprueba('el sello cae en el tercio bajo', entre(pc(m.sello.arriba), 52, 62), `${pc(m.sello.arriba)} %`);
  comprueba('el titular arranca por debajo de la mitad', entre(pc(m.h1.arriba), 57, 68), `${pc(m.h1.arriba)} %`);
  comprueba('los botones acaban con aire', entre(pc(bot[0].abajo), 83, 89), `${pc(bot[0].abajo)} %`);

  /* ── La tipografía pedida ────────────────────────────────────────────── */
  const cuerpo = parseFloat(m.h1.fontSize);
  comprueba('tamaño del titular', w < 500 ? entre(cuerpo, 34, 38) : entre(cuerpo, 42, 56), `${cuerpo} px`);
  comprueba('peso del titular', m.h1.fontWeight === '500', m.h1.fontWeight);
  comprueba('interletraje del titular', Math.abs(parseFloat(m.h1.letterSpacing) / cuerpo + 0.045) < 0.002, m.h1.letterSpacing);
  comprueba('altura de línea del titular', entre(parseFloat(m.h1.lineHeight) / cuerpo, 1.06, 1.11), m.h1.lineHeight);
  comprueba('titular en dos líneas', m.h1.lineas === 2, `${m.h1.lineas}`);
  comprueba('titular centrado', m.h1.textAlign === 'center', m.h1.textAlign);

  comprueba('alto del sello', entre(m.sello.alto, 28, 30), `${m.sello.alto}`);
  comprueba('cuerpo del sello', entre(parseFloat(m.sello.fontSize), 11, 12), m.sello.fontSize);
  comprueba('radio del sello', m.sello.borderRadius === '5px', m.sello.borderRadius);

  comprueba('dos botones', bot.length === 2, `${bot.length}`);
  for (const b of bot) {
    comprueba(`alto de «${b.texto}»`, entre(b.alto, 42, 44), `${b.alto}`);
    comprueba(`radio de «${b.texto}»`, b.radio === '6px', b.radio);
    comprueba(`cuerpo de «${b.texto}»`, entre(parseFloat(b.tipo), 13.5, 14), b.tipo);
  }
  comprueba('botones en una fila', Math.abs(bot[0].arriba - bot[1].arriba) < 1, 'apilados');
  comprueba('alto de la llamada de cabecera', entre(m.cabeceraCta.alto, 39, 41), `${m.cabeceraCta.alto}`);

  /* ── El texto, tal cual se pidió ─────────────────────────────────────── */
  comprueba('sin espacio antes de la puntuación', !/\s+[,.;:!?]/.test(m.parrafo.texto), m.parrafo.texto);
  comprueba('párrafo en 2 o 3 renglones', entre(m.parrafo.lineas, 2, 3), `${m.parrafo.lineas}`);

  await page.screenshot({ path: `${SALIDA}/${w}.png`, animations: 'disabled' });
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   El movimiento, medido en píxeles por segundo
   ══════════════════════════════════════════════════════════════════════════
   LO QUE NO SIRVE: comparar dos fotogramas píxel a píxel. Se intentó y daba
   cuarenta y dos niveles de diferencia; bajar la velocidad cuatro veces lo
   dejó en cuarenta y uno. La explicación es que la tela son puntos, y en
   cuanto los puntos se corren medio píxel, el moteado ya no tiene nada que ver
   con el de antes: la medida está saturada y no distingue una tela que respira
   de una que ondea. (Que la pintada es determinista está comprobado aparte:
   con las velocidades a cero, la diferencia es exactamente cero.)

   LO QUE SÍ SIRVE: cuánto SE DESPLAZA la forma. Se reduce la imagen a bloques
   —ahí el moteado se promedia y queda el bulto—, se busca el corrimiento
   vertical que mejor hace coincidir dos instantes separados diez segundos, y
   eso se pasa a píxeles de pantalla por segundo. Es una cifra que se puede
   defender: si apartas la vista cinco segundos, la tela se habrá movido esto.
*/
{
  console.log('\n  movimiento');
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const toma = () => page.evaluate(() => {
    const c = document.querySelector('main > section canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    /* En columnas de 8 px de ancho, el brillo medio de cada franja de 4 px de
       alto. El moteado se promedia; el bulto se queda. */
    const bw = Math.ceil(c.width / 8), bh = Math.ceil(c.height / 4);
    const g = new Float64Array(bw * bh), n = new Float64Array(bw * bh);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const b = ((y / 4) | 0) * bw + ((x / 8) | 0);
        g[b] += d[(y * c.width + x) * 4]; n[b]++;
      }
    }
    for (let b = 0; b < g.length; b++) g[b] /= n[b];
    return { g: [...g], bw, bh, escala: c.clientHeight / c.height };
  });

  const a = await toma();
  await page.waitForTimeout(10000);
  const b = await toma();

  /* El corrimiento vertical que mejor empareja las dos, en franjas. */
  let mejor = 0, mejorErr = Infinity;
  for (let d = -14; d <= 14; d++) {
    let suma = 0, cuenta = 0;
    for (let y = 16; y < a.bh - 16; y++) {
      for (let x = 0; x < a.bw; x++) {
        suma += Math.abs(a.g[y * a.bw + x] - b.g[(y + d) * a.bw + x]); cuenta++;
      }
    }
    const err = suma / cuenta;
    if (err < mejorErr) { mejorErr = err; mejor = d; }
  }
  /* Franjas de 4 px de lienzo, y el lienzo va estirado hasta la pantalla. */
  const pxPorSegundo = Math.abs(mejor) * 4 * a.escala / 10;
  console.log(`    la forma se desplaza ${pxPorSegundo.toFixed(2)} px de pantalla por segundo`);
  console.log(`    (${(pxPorSegundo * 5).toFixed(1)} px si apartas la vista cinco segundos)`);

  comprueba('la tela se mueve', pxPorSegundo > 0.05, `${pxPorSegundo.toFixed(2)} px/s — parece congelada`);
  comprueba('pero apenas se nota', pxPorSegundo < 2.2, `${pxPorSegundo.toFixed(2)} px/s — ondea`);
  await ctx.close();
}

/* Con «menos movimiento»: un instante de la tela, no un recuadro negro. */
{
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true, reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const toma = () => page.evaluate(() => {
    const c = document.querySelector('main > section canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let suma = 0, n = 0;
    for (let k = 0; k < d.length; k += 4) { suma += d[k]; n++; }
    return suma / n;
  });
  const antes = await toma();
  await page.waitForTimeout(3000);
  const despues = await toma();
  console.log(`    con «menos movimiento»: brillo medio ${antes.toFixed(1)} → ${despues.toFixed(1)}`);
  comprueba('con «menos movimiento» se ve la tela', antes > 3, `brillo medio ${antes.toFixed(1)} — está en negro`);
  comprueba('con «menos movimiento» se queda quieta', Math.abs(antes - despues) < 0.02, `${antes.toFixed(3)} → ${despues.toFixed(3)}`);
  await page.screenshot({ path: `${SALIDA}/sin-movimiento.png` });
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   La puntuación de toda la portada
   ══════════════════════════════════════════════════════════════════════════
   En castellano la coma y el punto van PEGADOS a la palabra de delante. Se
   revisa el texto tal y como queda en la página, no el código fuente: un
   espacio de más puede entrar por una plantilla, por un `{' '}` mal puesto o
   por juntar dos trozos de texto. */
{
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const malos = await page.evaluate(() => {
    const fuera = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
    const andador = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const encontrados = [];
    for (let n = andador.nextNode(); n; n = andador.nextNode()) {
      if (fuera.has(n.parentElement?.tagName)) continue;
      const t = n.textContent;
      /* Un espacio justo antes de coma, punto, punto y coma o dos puntos.
         Los signos de cierre ! y ? van aparte: en «¿Y esto?» no hay espacio
         delante tampoco. */
      if (/[^\s][ \u00a0]+[,.;:!?]/.test(t)) encontrados.push(t.trim().slice(0, 90));
    }
    return encontrados;
  });
  console.log(`\n  puntuación de la portada: ${malos.length === 0 ? 'sin espacios antes de coma o punto' : malos.length + ' casos'}`);
  comprueba('puntuación de toda la portada', malos.length === 0, malos.join(' / '));
  await ctx.close();
}

await navegador.close();
if (nota.length) console.log('\n' + nota.join('\n'));
console.log(fallos === 0 ? '\n  La portada cuadra en los cinco tamaños.' : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
