/**
 * EL CORREO: QUE NO SALGA SIN PERMISO, QUE NO SALGA DOS VECES, Y QUE NO
 * PROMETA LO QUE EL PROGRAMA NO HACE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tres cosas que, si fallan, no se ven hasta que ya es tarde — y las tres de
 * la clase que cuesta dinero o credibilidad:
 *
 * 1 · UN CORREO COMERCIAL A QUIEN NO DIO PERMISO es una infracción de la
 *     LSSI, y además es la vía más rápida a que el dominio se gane mala fama
 *     y dejen de llegar también los correos de confirmar el alta.
 *
 * 2 · EL MISMO CORREO DOS VECES. La bienvenida se dispara desde dos sitios
 *     —el navegador al terminar el alta y la ronda diaria—, así que la
 *     pregunta no es si van a coincidir alguna vez, sino qué pasa cuando
 *     coincidan.
 *
 * 3 · LA GUÍA PROMETIENDO FUNCIONES QUE NO EXISTEN. El catálogo de
 *     `entitlements.ts` marca con `lista: false` lo que está pensado pero no
 *     construido. Si una de ésas acaba escrita en la guía, se le está
 *     vendiendo humo por correo a cada persona que se da de alta.
 *
 * El pie de los correos comerciales también se comprueba, porque es lo que
 * la ley pide en cada mensaje y es justo lo que se olvida.
 *
 *   node pruebas/correo.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'correo-'));
const puente = join(dir, 'puente.ts');
writeFileSync(puente, `
export * from '${process.cwd()}/netlify/functions/_plantillas.mts';
export { destinatarios, unaVez } from '${process.cwd()}/netlify/functions/_correo.mts';
export { CAPACIDADES } from '${process.cwd()}/src/services/entitlements';
`);
const salida = join(dir, 'puente.mjs');
/* `entitlements.ts` arrastra el cliente de Supabase, que lee `import.meta.env`
   —cosa de Vite que en Node no existe—. Se define vacío: aquí no se habla con
   ninguna base de datos, sólo se lee la tabla de capacidades. */
execFileSync('npx', ['esbuild', puente, '--bundle', '--format=esm',
  '--define:import.meta.env={}',
  `--outfile=${salida}`, '--log-level=error'], { stdio: 'inherit' });
const {
  bienvenida, teEchamosDeMenos, novedades, destinatarios, unaVez, CAPACIDADES,
} = await import(salida);

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const TOKEN = 'abc-123';

/* ══════════════════════════════════════════════════════════════════════════
   1 · A QUIÉN SE LE MANDA
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\n  sin permiso no sale un correo comercial\n');

const gente = [
  { id: 'si', marketing_consent: true },
  { id: 'no', marketing_consent: false },
  { id: 'viejo' },                        // perfil de antes de que existiera la columna
  { id: 'nulo', marketing_consent: null },
];

{
  const comerciales = destinatarios(gente, 'comercial').map((p) => p.id);
  comprueba('sólo recibe quien dijo que sí', comerciales.join() === 'si', comerciales.join(' · ') || 'nadie');
  comprueba(
    'un perfil de antes de la columna NO recibe',
    !comerciales.includes('viejo'),
    'a nadie se le preguntó, así que nadie dijo que sí',
  );
  comprueba('y un nulo tampoco', !comerciales.includes('nulo'));

  const servicio = destinatarios(gente, 'servicio').map((p) => p.id);
  comprueba(
    'la guía del alta va a todos: es servicio, no publicidad',
    servicio.length === gente.length,
    `${servicio.length} de ${gente.length}`,
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · QUE NO SALGA DOS VECES
   ══════════════════════════════════════════════════════════════════════════

   Se imita la tabla con su clave primaria: lo que importa no es que el
   código se acuerde de mirar, sino que el segundo intento choque. */
console.log('\n  el mismo correo no sale dos veces\n');

const baseFalsa = () => {
  const filas = new Set();
  return {
    enviados: filas,
    from: (tabla) => ({
      insert: async ({ profile_id: id, tipo }) => {
        const clave = `${id}/${tipo}`;
        if (filas.has(clave)) return { error: { code: '23505' } };
        filas.add(clave);
        return { error: null };
      },
      delete: () => ({
        eq: (_c, a) => ({ eq: (_c2, b) => { filas.delete(`${a}/${b}`); return { error: null }; } }),
      }),
      _tabla: tabla,
    }),
  };
};

{
  const db = baseFalsa();
  let veces = 0;
  const mandar = async () => { veces += 1; };

  const a = await unaVez(db, 'p1', 'bienvenida', mandar);
  const b = await unaVez(db, 'p1', 'bienvenida', mandar);
  comprueba('el primero manda', a === 'enviado');
  comprueba('el segundo NO manda', b === 'ya-estaba');
  comprueba('y el correo salió una sola vez', veces === 1, `${veces} envío(s)`);

  /* Dos personas distintas sí reciben cada una el suyo. */
  await unaVez(db, 'p2', 'bienvenida', mandar);
  comprueba('otra persona sí recibe la suya', veces === 2, `${veces} envíos`);
}

{
  /* Si el envío revienta, el renglón se borra: un correo que no salió no
     está enviado, y el siguiente intento tiene que poder volver a probarlo. */
  const db = baseFalsa();
  let intentos = 0;
  const falla = async () => { intentos += 1; throw new Error('Brevo dice que no'); };

  await unaVez(db, 'p1', 'inactividad', falla).catch(() => undefined);
  comprueba('tras un fallo no queda apuntado como enviado', db.enviados.size === 0);
  await unaVez(db, 'p1', 'inactividad', falla).catch(() => undefined);
  comprueba('así que se vuelve a intentar', intentos === 2, `${intentos} intentos`);
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · EL PIE QUE LA LEY PIDE
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\n  cada correo comercial lleva lo que tiene que llevar\n');

const comerciales = [
  ['el aviso por inactividad', teEchamosDeMenos('Víctor Garcia', TOKEN, 21, 'Te faltan las jugadoras.')],
  ['las novedades', novedades('Víctor Garcia', TOKEN, 'Hay pizarra nueva', ['Una cosa.', 'Otra cosa.'])],
];

for (const [nombre, carta] of comerciales) {
  const texto = `${carta.html}\n${carta.texto}`;
  comprueba(`${nombre}: lleva enlace de baja`, texto.includes(`baja-correo?t=${TOKEN}`));
  comprueba(`${nombre}: dice quién lo manda`, texto.includes('Leon Bryn Blakeley') && texto.includes('X2453564Q'));
  comprueba(`${nombre}: dice por qué lo recibes`, /Recibes este correo porque/.test(carta.html));
  comprueba(`${nombre}: va también en texto plano`, carta.texto.length > 120);
}

{
  /* La bienvenida NO lleva baja, y es correcto: no es una lista, es una sola
     carta de servicio. Pero sí tiene que decir quién la manda. */
  const b = bienvenida('Víctor Garcia', 'https://playoff360.site/Playoff360-guia.pdf');
  comprueba('la bienvenida no ofrece baja, porque no es una lista', !b.html.includes('baja-correo'));
  comprueba('pero dice quién la manda', b.html.includes('Leon Bryn Blakeley'));
  comprueba('y enlaza la guía', b.html.includes('Playoff360-guia.pdf'));
  comprueba('saluda por el nombre de pila', b.html.includes('Hola, Víctor'));
}

{
  /* Sin nombre no se inventa uno ni se usa el correo como si lo fuera. */
  const b = bienvenida(null, 'https://x/g.pdf');
  comprueba('sin nombre, saluda sin nombre', b.html.includes('Hola:') && !b.html.includes('Hola,'));
}

{
  /* El texto que llega de fuera se escapa: un título con un `<script>` dentro
     no puede acabar siendo etiqueta en el correo de nadie. */
  const n = novedades('Ana', TOKEN, '<script>malo()</script>', ['<b>ojo</b>']);
  comprueba('lo que viene de fuera se escapa', !n.html.includes('<script>') && n.html.includes('&lt;script&gt;'));
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · LA GUÍA NO PROMETE HUMO
   ══════════════════════════════════════════════════════════════════════════ */

console.log('\n  la guía sólo cuenta lo que existe\n');

const guia = readFileSync('presentacion/guia.html', 'utf8');
/* Sólo el cuerpo: los comentarios del principio hablan del documento, no son
   lo que lee quien lo recibe. */
const visible = guia.replace(/<!--[\s\S]*?-->/g, '').toLowerCase();

{
  const sinConstruir = Object.values(CAPACIDADES).filter((c) => !c.lista);
  const coladas = sinConstruir.filter((c) => visible.includes(c.nombre.toLowerCase()));
  comprueba(
    'no se anuncia nada que esté marcado como no construido',
    coladas.length === 0,
    coladas.length ? coladas.map((c) => c.nombre).join(' · ') : `${sinConstruir.length} comprobadas`,
  );

  /* Y al revés: lo de Gratis, que es lo que recibe quien se da de alta, tiene
     que estar contado. Una guía que se calla la mitad no es una guía. */
  const deGratis = Object.values(CAPACIDADES).filter((c) => c.lista && c.desde === 'free');
  const faltan = deGratis.filter((c) => !visible.includes(c.nombre.toLowerCase()));
  comprueba(
    'y está contado todo lo que trae el plan Gratis',
    faltan.length === 0,
    faltan.length ? `faltan: ${faltan.map((c) => c.nombre).join(' · ')}` : `${deGratis.length} de ${deGratis.length}`,
  );
}

{
  comprueba('dice cómo darse de baja', visible.includes('dejo de recibir correos'));
  comprueba('dice dónde están los datos', visible.includes('irlanda'));
  comprueba('y a quién escribir', visible.includes('playoff360.info@gmail.com'));
}

console.log(
  fallos === 0
    ? '\n  Nadie recibe lo que no pidió, nada sale dos veces y la guía no vende humo.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
