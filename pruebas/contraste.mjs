/**
 * QUE TODO SE LEA, CON EL TELÉFONO EN CLARO Y CON EL TELÉFONO EN OSCURO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `escala.mjs` lee el código y caza el color fijo escrito a mano. Esta lee la
 * PANTALLA y caza el resultado: un texto que, sumados todos los fondos que
 * tiene debajo, no se distingue de ellos. Pilla lo que la otra no puede —una
 * veladura sobre otra veladura, una variable mal puesta, dos componentes que
 * por separado estaban bien.
 *
 * ── CÓMO SE SACA EL FONDO DE VERDAD ────────────────────────────────────────
 *
 * El fondo de un texto casi nunca es el `background-color` de su elemento:
 * suele ser `transparent` y el color lo pone algún antepasado, a veces tres
 * niveles más arriba y a veces en dos capas semitransparentes que se suman.
 * Así que se sube por los padres componiendo cada fondo sobre el siguiente
 * hasta llegar a uno opaco. Esto es lo que la primera versión de esta prueba
 * hacía mal: se quedaba con el primer color que encontraba y escupía
 * contrastes de 1,0:1 que no existían en ninguna pantalla.
 *
 * SI NO SE LLEGA A UN FONDO OPACO —una foto, un degradado, un `backdrop-
 * filter`— no se inventa un número: ese elemento se salta y se cuenta aparte.
 * Un dato inventado en una prueba es peor que no tener la prueba.
 *
 * ── EL LISTÓN ──────────────────────────────────────────────────────────────
 *
 * El de la WCAG en AA: 4,5:1, y 3:1 para el texto grande (24 px, o 18,66 px
 * en negrita). No es una cifra de adorno: es la que separa «se lee con el
 * móvil al sol» de «se lee en casa».
 *
 * Lo que está apagado a propósito —un botón inactivo— se salta, porque un
 * control desactivado está exento en la norma y porque bajarle el contraste
 * es justamente cómo se dice que está desactivado.
 *
 *   npm run build && npm run preview
 *   node pruebas/contraste.mjs
 */
import { chromium } from 'playwright';
import { mock, USER } from './mock.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173';

const RUTAS = [
  '/app', '/app/calendario', '/app/entrenamientos', '/app/entrenamientos/s1',
  '/app/entrenamientos/s1/asistencia', '/app/plantilla', '/app/plantilla/p0',
  '/app/partidos', '/app/partidos/m1', '/app/ajustes', '/app/ajustes/plan',
  '/app/perfil', '/app/equipo-tecnico',
];

/** Luminancia relativa, tal cual la define la WCAG. */
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const razon = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

let fallos = 0;

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });

for (const tema of ['light', 'dark']) {
  console.log('');
  console.log(`  ── tema ${tema} ──────────────────────────────────────────────`);

  const ctx = await navegador.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    colorScheme: tema,
  });
  await mock(ctx);
  await ctx.addInitScript((u) => {
    localStorage.setItem('sb-snywuosknlaewkynrtdc-auth-token', JSON.stringify({
      access_token: 'x', refresh_token: 'x', expires_at: 9e9, token_type: 'bearer',
      user: { id: u, email: 'e@e.test', app_metadata: {}, user_metadata: {}, aud: 'authenticated' },
    }));
  }, USER);

  const pagina = await ctx.newPage();

  for (const ruta of RUTAS) {
    await pagina.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' });
    await pagina.waitForTimeout(350);

    const malos = await pagina.evaluate(() => {
      const aRGB = (s) => {
        const m = s.match(/[\d.]+/g);
        if (!m) return null;
        return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
      };

      /* Compone `arriba` (con alfa) sobre `abajo` (opaco). */
      const sobre = (arriba, abajo) => [
        arriba.r * arriba.a + abajo[0] * (1 - arriba.a),
        arriba.g * arriba.a + abajo[1] * (1 - arriba.a),
        arriba.b * arriba.a + abajo[2] * (1 - arriba.a),
      ];

      /**
       * El fondo real: se suben las capas semitransparentes hasta una opaca.
       * Devuelve null cuando por el camino hay una imagen, un degradado o un
       * desenfoque, porque entonces el color plano no describe lo que se ve.
       */
      const fondoDe = (el) => {
        const capas = [];
        for (let n = el; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.backgroundImage !== 'none') return null;
          if (cs.backdropFilter && cs.backdropFilter !== 'none') return null;
          const c = aRGB(cs.backgroundColor);
          if (!c || c.a === 0) continue;
          /* La opacidad del elemento multiplica la de su fondo. */
          const op = parseFloat(cs.opacity);
          const efectiva = c.a * (Number.isFinite(op) ? op : 1);
          if (efectiva >= 0.999) return capas.reduceRight(
            (acc, cap) => sobre(cap, acc), [c.r, c.g, c.b],
          );
          capas.push({ ...c, a: efectiva });
        }
        return null;
      };

      const fuera = [];
      let sinFondo = 0;

      for (const el of document.querySelectorAll('body *')) {
        /* Sólo elementos con texto PROPIO: si no, un contenedor hereda la
           queja de su hijo y el mismo fallo sale diez veces. */
        const propio = [...el.childNodes]
          .filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
        if (!propio) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (parseFloat(cs.opacity) < 0.1) continue;

        const caja = el.getBoundingClientRect();
        if (caja.width < 2 || caja.height < 2) continue;

        /* Lo desactivado a propósito queda fuera: la norma lo exime y el
           contraste bajo ES el aviso de que no se puede pulsar. */
        if (el.closest('[disabled],[aria-disabled="true"]')) continue;

        const texto = aRGB(cs.color);
        if (!texto || texto.a < 0.1) continue;

        const fondo = fondoDe(el);
        if (!fondo) { sinFondo++; continue; }

        const delante = sobre(texto, fondo);

        const px = parseFloat(cs.fontSize);
        const peso = parseInt(cs.fontWeight, 10) || 400;
        const grande = px >= 24 || (px >= 18.66 && peso >= 700);
        const listón = grande ? 3 : 4.5;

        const L = (c) => {
          const v = c.map((x) => {
            const s = x / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
        };
        const [a, b] = [L(delante), L(fondo)].sort((p, q) => q - p);
        const r = (a + 0.05) / (b + 0.05);

        if (r < listón) {
          fuera.push({
            texto: propio.slice(0, 42),
            r: Math.round(r * 10) / 10,
            listón,
            clase: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 70),
          });
        }
      }
      return { fuera, sinFondo };
    });

    const n = malos.fuera.length;
    console.log(`    ${n === 0 ? '✓' : '✗'} ${ruta}${malos.sinFondo ? `  (${malos.sinFondo} sobre foto o cristal, no se miden)` : ''}`);
    for (const m of malos.fuera) {
      fallos++;
      console.log(`        «${m.texto}»  ${m.r}:1  (hace falta ${m.listón}:1)`);
      console.log(`         ${m.clase}`);
    }
  }

  await ctx.close();
}

await navegador.close();

console.log('');
if (fallos > 0) {
  console.log(`  ✗ ${fallos} texto${fallos === 1 ? '' : 's'} que no se lee${fallos === 1 ? '' : 'n'}.`);
  process.exit(1);
}
console.log('  ✓ Todo por encima del listón de la WCAG, en los dos temas.');
