/**
 * La portada, medida.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ ESTO ES UNA PRUEBA Y NO UNA MIRADA. La portada se ha rehecho varias
 * veces y los fallos siempre han sido los mismos: algo que a 1440 queda bien
 * y a 390 se sale, un botón que parte el texto en dos líneas, una tarjeta
 * flotante que en el iPad se va fuera de la pantalla. Nada de eso se ve en
 * una captura de escritorio; se ve midiendo el DOM a todos los anchos.
 *
 * La versión anterior de este fichero medía otra portada —una sola pantalla
 * en blanco y negro con un lienzo de partículas— que ya no existe. Lo que se
 * conserva de aquella es lo que sigue siendo verdad de cualquier portada:
 * que no desborde, que el titular quepa en dos líneas, que los botones sean
 * botones y que la puntuación castellana esté bien.
 *
 *   npm run build && npm run preview
 *   node pruebas/portada.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://localhost:4173';
const SALIDA = 'salida/portada';
mkdirSync(SALIDA, { recursive: true });

/* Los nueve anchos del encargo: móvil pequeño, móvil, móvil grande, tablet,
   iPad, portátil, y los tres escritorios. El portátil de 1024 está porque es
   justo donde el contenedor deja de tener margen y dos veces se ha colado por
   ahí un desborde de doce píxeles. */
const TAMANOS = [
  ['320×720', 320, 720, 3],
  ['390×844', 390, 844, 3],
  ['430×932', 430, 932, 3],
  ['768×1024', 768, 1024, 2],
  ['834×1112', 834, 1112, 2],
  ['1024×768', 1024, 768, 2],
  ['1280×800', 1280, 800, 2],
  ['1440×900', 1440, 900, 2],
  ['1920×1080', 1920, 1080, 1],
];

/* Las secciones que la navegación promete. Si un enlace apunta a un ancla que
   no existe, el clic no hace nada y parece que la página está rota. */
const ANCLAS = ['plataforma', 'funciones', 'clubes', 'precios'];

let fallos = 0;
const nota = [];
function comprueba(nombre, bien, detalle) {
  if (!bien) { fallos++; nota.push(`    ✗ ${nombre}: ${detalle}`); }
}
const entre = (v, a, b) => v >= a && v <= b;

/* En el contenedor no hay salida a Internet: ni las tipografías de Google ni
   Supabase responden. Eso no es un fallo de la portada —se dibuja igual— y no
   debe tapar los errores de verdad. */
const RUIDO = /ERR_CERT|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|favicon|Failed to load resource/;

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

for (const [etiqueta, w, h, escala] of TAMANOS) {
  const ctx = await navegador.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: escala,
    isMobile: w < 500,
    hasTouch: w < 900,
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error' && !RUIDO.test(m.text())) errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const m = await page.evaluate((anclas) => {
    const caja = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { arriba: r.top, abajo: r.bottom, alto: r.height, ancho: r.width, izq: r.left, der: r.right };
    };
    const portada = document.querySelector('main > section');
    const h1 = portada.querySelector('h1');
    const cab = document.querySelector('header');

    /* ¿Cuántas líneas? El alto entre la altura de línea: contar rectángulos
       de cliente miente cuando dentro hay un tramo con otro cuerpo.
       Sólo vale para un bloque de texto: en un botón con relleno y alto
       fijo el alto no dice nada de los renglones. */
    const lineas = (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));

    /* Los renglones DE VERDAD que ocupa el texto de un elemento: un rango
       sobre su contenido devuelve un rectángulo por trozo pintado.
       No vale contar rectángulos ni bordes superiores distintos: el icono
       que va al lado del texto es otro rectángulo, centrado a su manera, y
       con eso un botón de una línea salía de dos. Se agrupan por BANDAS: dos
       rectángulos cuyos centros estén a menos de media altura de línea son
       el mismo renglón. */
    const renglones = (el) => {
      const alto = parseFloat(getComputedStyle(el).lineHeight) || 16;
      const centros = [];
      const rango = document.createRange();
      rango.selectNodeContents(el);
      for (const r of rango.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        centros.push(r.top + r.height / 2);
      }
      centros.sort((a, b) => a - b);
      let n = 0, ultimo = -Infinity;
      for (const c of centros) {
        if (c - ultimo > alto * 0.6) { n++; ultimo = c; }
      }
      return n || 1;
    };

    /* Los dos botones grandes de la portada, en su fila. */
    const botones = [...portada.querySelectorAll('a')].filter((a) => {
      const c = a.className.toString();
      return c.includes('boton-marca') || c.includes('boton-vidrio');
    });

    /* El botón de la cabecera: el que no debe partirse nunca en dos renglones. */
    const ctaCab = [...cab.querySelectorAll('a')].find((a) => a.textContent.trim().startsWith('Empezar'));

    return {
      vh: window.innerHeight,
      desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h1: {
        ...caja(h1), lineas: lineas(h1), texto: h1.textContent.trim(),
        cuerpo: parseFloat(getComputedStyle(h1).fontSize),
      },
      botones: botones.map((b) => ({ ...caja(b), texto: b.textContent.trim() })),
      ctaCab: ctaCab ? { ...caja(ctaCab), renglones: renglones(ctaCab), texto: ctaCab.textContent.trim() } : null,
      /* Las maquetas que acompañan al titular. En el móvil sólo debe quedar
         la pizarra: tres tarjetas superpuestas en 390 px no se leen. */
      maquetasPortada: [...portada.querySelectorAll('.maqueta')]
        .filter((el) => el.getBoundingClientRect().width > 0).length,
      /* El aviso de que los datos son de ejemplo tiene que estar donde están
         los datos de ejemplo, no en la letra pequeña del pie. */
      avisoEjemplo: /equipo de ejemplo/i.test(portada.textContent),
      anclas: anclas.map((id) => [id, !!document.getElementById(id)]),
      /* Cada enlace de la cabecera que apunta a un ancla debe encontrarla. */
      enlacesRotos: [...cab.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute('href').slice(1))
        .filter((id) => id && !document.getElementById(id)),
    };
  }, ANCLAS);

  const bot = m.botones;
  console.log(`\n  ${etiqueta}`);
  console.log(`    titular ${m.h1.cuerpo} px · ${m.h1.lineas} líneas    botones ${bot.length}    maquetas ${m.maquetasPortada}    desborde ${m.desborde} px`);

  comprueba('sin desborde horizontal', m.desborde <= 0, `${m.desborde} px`);
  comprueba('sin errores de consola', errores.length === 0, errores.slice(0, 2).join(' | '));

  /* ── El titular ──────────────────────────────────────────────────────────
     Está escrito en dos («Tu equipo. Tus decisiones.» / «Todo bajo
     control.») y así tiene que salir en cuanto hay sitio. En el móvil la
     primera frase no cabe de una y se parte: eso es correcto, lo que no
     puede pasar es que se desmigaje. A 390 px con cuerpo 52 salían cuatro
     renglones, el titular dejaba de leerse de un vistazo y empujaba los
     botones fuera de la primera pantalla; con 32 son tres. El tope es
     cuatro, y a 320 px —donde ni «Tu equipo. Tus decisiones.» cabe en dos
     trozos— se llega justo. */
  if (w >= 768) {
    comprueba('titular en dos líneas', m.h1.lineas === 2, `${m.h1.lineas} líneas con cuerpo ${m.h1.cuerpo}`);
  } else {
    comprueba('el titular no se desmigaja', entre(m.h1.lineas, 2, 4), `${m.h1.lineas} líneas con cuerpo ${m.h1.cuerpo}`);
  }
  comprueba('el titular cabe de lado a lado', m.h1.izq >= -0.5 && m.h1.der <= w + 0.5, `${Math.round(m.h1.izq)}..${Math.round(m.h1.der)} en ${w}`);
  comprueba('tamaño del titular', w < 640 ? entre(m.h1.cuerpo, 28, 36) : entre(m.h1.cuerpo, 44, 70), `${m.h1.cuerpo} px`);

  /* ── Los dos botones de la portada ───────────────────────────────────── */
  comprueba('dos botones en la portada', bot.length === 2, `${bot.length}`);
  if (bot.length === 2) {
    /* En el móvil se apilan a propósito: uno al lado del otro a 390 px
       saldrían dos botones de 150 px con el texto partido. A partir de 640
       hay sitio de sobra y tienen que ir en fila. */
    if (w >= 640) {
      comprueba('los botones van en una fila', Math.abs(bot[0].arriba - bot[1].arriba) < 1, 'apilados');
      comprueba('los botones no se comen el ancho', bot[1].der - bot[0].izq < w * 0.92,
        `${Math.round(bot[1].der - bot[0].izq)} de ${w} px`);
    }
    /* Un botón son controles, no barras: si crece de alto es que el texto
       se ha partido dentro. */
    for (const b of bot) comprueba(`«${b.texto}» en un renglón`, b.alto <= 56, `${Math.round(b.alto)} px de alto`);
  }

  /* El botón de la cabecera partía «Empezar gratis» en dos a 390 px y se
     convertía en un bloque de dos pisos que tapaba media cabecera. */
  comprueba('hay llamada en la cabecera', !!m.ctaCab, 'no se encuentra');
  if (m.ctaCab) {
    comprueba('la llamada de cabecera no parte el texto', m.ctaCab.renglones === 1, `${m.ctaCab.renglones} renglones`);
    comprueba('la llamada de cabecera cabe', m.ctaCab.der <= w + 0.5, `acaba en ${Math.round(m.ctaCab.der)} de ${w}`);
  }

  /* ── El móvil no es el escritorio encogido ────────────────────────────── */
  if (w < 768) {
    comprueba('en el móvil sólo la pizarra', m.maquetasPortada === 1, `${m.maquetasPortada} maquetas superpuestas`);
  } else {
    comprueba('a partir de tablet hay composición', m.maquetasPortada >= 3, `${m.maquetasPortada} maquetas`);
  }

  /* ── Lo que se promete y lo que hay ───────────────────────────────────── */
  for (const [id, hay] of m.anclas) comprueba(`existe la sección «${id}»`, hay, 'no está en la página');
  comprueba('ningún enlace de la cabecera apunta al vacío', m.enlacesRotos.length === 0, m.enlacesRotos.join(', '));
  comprueba('se dice que los datos son de ejemplo', m.avisoEjemplo, 'no aparece el aviso');

  await page.screenshot({ path: `${SALIDA}/${w}.png`, animations: 'disabled' });
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   NADA INVENTADO
   ══════════════════════════════════════════════════════════════════════════
   La regla del encargo es explícita: ni clientes, ni valoraciones, ni número
   de usuarios, ni premios, ni precios que no existan. Es fácil que se cuele
   al reescribir una sección —un «+500 equipos» queda muy bien en una
   portada— y es lo único de aquí que sería mentira. Se busca en el texto
   tal y como queda en la página.
*/
{
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const hallado = await page.evaluate(() => {
    const t = document.body.innerText;
    const sospechas = [
      [/\+?\s?\d[\d.,]*\s*(clubes|equipos|entrenadores|usuarios)\s+(ya\s+)?(confían|usan|nos)/i, 'recuento de clientes'],
      [/\d[\d.,]*\s*(opiniones|valoraciones|reseñas)/i, 'valoraciones'],
      [/[0-5][.,]\d\s*(\/\s*5|estrellas)/i, 'puntuación de estrellas'],
      [/lorem ipsum/i, 'relleno sin terminar'],
      [/premio|galardón|award/i, 'premio'],
    ];
    return sospechas.filter(([re]) => re.test(t)).map(([, q]) => q);
  });
  console.log(`\n  nada inventado: ${hallado.length === 0 ? 'ni clientes, ni valoraciones, ni premios' : hallado.join(', ')}`);
  comprueba('sin cifras de clientes ni valoraciones inventadas', hallado.length === 0, hallado.join(', '));
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
      if (/[^\s][  ]+[,.;:!?]/.test(n.textContent)) encontrados.push(n.textContent.trim().slice(0, 90));
    }
    return encontrados;
  });
  console.log(`  puntuación: ${malos.length === 0 ? 'sin espacios antes de coma o punto' : malos.length + ' casos'}`);
  comprueba('puntuación de toda la portada', malos.length === 0, malos.join(' / '));
  await ctx.close();
}

await navegador.close();
if (nota.length) console.log('\n' + nota.join('\n'));
console.log(fallos === 0 ? `\n  La portada cuadra en los ${TAMANOS.length} tamaños.` : `\n  ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
