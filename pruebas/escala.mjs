/**
 * NINGÚN COLOR FIJO DENTRO DE LA PLATAFORMA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La plataforma tiene dos temas y los componentes NO llevan variantes
 * `dark:`. Funciona porque todos piden su color a la escala —`ink-0` es «lo
 * que menos contrasta con el fondo», `ink-900` «lo que más»— y la escala se
 * da la vuelta sola según el ajuste del teléfono.
 *
 * Un `text-white` o un `bg-white/10` rompe el trato: no se da la vuelta. En
 * claro no se nota, porque ahí blanco y `ink-0` son el mismo color, así que
 * el fallo se cuela en la revisión y aparece de noche, en el móvil de quien
 * lo use.
 *
 * ESTO YA PASÓ, Y DE LAS DOS MANERAS:
 *
 *   · `bg-white/10` como carril de la barra de equipos. Blanco al 10 % sobre
 *     un panel casi blanco es nada: el carril no existía EN CLARO, que es
 *     justo el tema donde nadie iba a mirarlo dos veces.
 *   · `bg-ink-900 text-white` en la pestaña activa. En oscuro `ink-900` es
 *     casi blanco: letra blanca sobre fondo blanco.
 *
 * Cada uno se arregló cuando alguien lo vio en una captura. Esta prueba los
 * ve antes, sin captura y sin navegador, leyendo el código.
 *
 * ── LO QUE SÍ PUEDE LLEVAR COLOR FIJO ──────────────────────────────────────
 *
 * Tres cosas, y están todas en la lista de abajo con su motivo:
 *
 *   1. LA PÁGINA PÚBLICA y las pantallas de antes de entrar. Son azul marino
 *      a propósito, en los dos temas, y tienen su propia paleta.
 *   2. LOS VELOS de los diálogos. Un velo oscurece lo que hay detrás; ése es
 *      su trabajo en claro y en oscuro. `bg-black/68` es correcto.
 *   3. EL LOGOTIPO cuando se le pide el tono claro a mano, que es lo que se
 *      hace al ponerlo sobre el azul.
 *
 * Todo lo demás es un fallo. Si hace falta añadir una excepción, va con su
 * motivo escrito: una lista de excepciones sin motivos se convierte en la
 * lista de todos los archivos.
 *
 *   node pruebas/escala.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const FUENTE = join(RAIZ, 'src');

/* Los colores que no se dan la vuelta. `white` y `black` con cualquier
   opacidad (`bg-white/10`, `border-white/25`, `text-white/55`) y los
   hexadecimales escritos a mano en una clase de Tailwind. */
const FIJOS = [
  /\b(?:bg|text|border|ring|divide|from|via|to|decoration|outline|shadow|placeholder|fill|stroke)-(?:white|black)(?:\/(?:\[[^\]]+\]|\d+))?\b/g,
  /\b(?:bg|text|border|ring|divide|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g,
];

/**
 * La marca para eximir UNA línea, escrita en la línea misma:
 *
 *     className="bg-black/68"   // escala-ok: velo del diálogo
 *
 * o en la línea de justo encima, que es donde cabe el motivo cuando la línea
 * marcada ya es larga.
 *
 * Va aquí y no en una lista de números de línea porque los números se
 * desplazan en cuanto alguien añade un comentario encima, y una lista
 * desfasada exime la línea equivocada sin avisar. La marca viaja con el
 * código que exime, y el motivo se lee donde hace falta.
 *
 * EL MOTIVO ES OBLIGATORIO: `escala-ok` a secas no vale.
 */
const MARCA = /escala-ok:\s*\S/;

/**
 * Los archivos exentos ENTEROS, con motivo. Son los que no pertenecen al
 * sistema de dos temas: la página pública y lo que se pinta sobre su azul.
 */
const PERMITIDO = {
  /* ── 1. LA PÁGINA PÚBLICA Y LA PUERTA DE ENTRADA ────────────────────────
     Azul marino en los dos temas, con paleta propia (`marca`, `abismo`,
     `cielo`, `lima`). No usan ni una clase de la escala: es otro diseño, no
     una versión oscura de éste. */
  'features/landing/Landing.tsx': { todo: true, por: 'la página pública es azul a propósito' },
  'features/landing/maquetas.tsx': { todo: true, por: 'dibujos de la página pública' },
  'components/ui/Cielo.tsx': { todo: true, por: 'las pantallas de antes de entrar, sobre el cielo azul' },
  'features/auth/Login.tsx': { todo: true, por: 'acceso, sobre el cielo azul' },
  'features/onboarding/Onboarding.tsx': { todo: true, por: 'alta, sobre el cielo azul' },
  'features/onboarding/PasoPlan.tsx': { todo: true, por: 'alta, sobre el cielo azul' },
  'features/billing/Comparativa.tsx': { todo: true, por: 'la tabla de planes de la página pública' },

  /* ── 2. EL LOGOTIPO EN TONO CLARO ───────────────────────────────────────
     `tone` se pide a mano, y se pide «claro» justo donde el fondo es el azul
     de la portada. El tercer tono, `tinta`, es el de la presentación
     impresa, que no tiene tema oscuro porque es papel. */
  'components/ui/Brand.tsx': { todo: true, por: 'tonos que se piden a mano para el azul y para el papel' },

  /* Los velos de los diálogos y la rama de portada de `Medicion` van con la
     marca `escala-ok` en su línea, no aquí: son líneas sueltas dentro de
     archivos que por lo demás sí tienen que seguir la escala. */
};

const archivos = [];
(function recorre(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) recorre(p);
    else if (/\.tsx?$/.test(e)) archivos.push(p);
  }
})(FUENTE);

let fallos = 0;
let revisados = 0;
let exentos = 0;

for (const abs of archivos.sort()) {
  const rel = relative(FUENTE, abs);
  const regla = PERMITIDO[rel];
  if (regla?.todo) { exentos++; continue; }

  const lineas = readFileSync(abs, 'utf8').split('\n');
  revisados++;

  lineas.forEach((texto, i) => {
    const n = i + 1;
    if (MARCA.test(texto) || (i > 0 && MARCA.test(lineas[i - 1]))) return;

    for (const patron of FIJOS) {
      for (const m of texto.matchAll(patron)) {
        fallos++;
        console.log(`  ✗ src/${rel}:${n}  ${m[0]}`);
        console.log(`      ${texto.trim().slice(0, 100)}`);
      }
    }
  });
}

console.log('');
console.log(`  ${revisados} archivos revisados, ${exentos} exentos con motivo.`);

if (fallos > 0) {
  console.log('');
  console.log(`  ✗ ${fallos} color${fallos === 1 ? '' : 'es'} fijo${fallos === 1 ? '' : 's'} donde debería ir la escala.`);
  console.log('');
  console.log('    En vez de                 pon');
  console.log('    ──────────────────────    ──────────────────────');
  console.log('    text-white sobre ink-900   text-ink-0');
  console.log('    bg-white/10 (una veladura) bg-ink-900/10');
  console.log('    bg-white (una superficie)  bg-raised  o  bg-panel');
  console.log('');
  console.log('    Si de verdad tiene que ir fijo —un velo, el azul de la');
  console.log('    portada—, márcalo en su línea:   // escala-ok: el motivo');
  process.exit(1);
}

console.log('  ✓ Ni un color fijo fuera de su sitio.');
