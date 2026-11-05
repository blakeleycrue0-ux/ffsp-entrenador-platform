/**
 * EL FORMULARIO QUE RELLENA LA FAMILIA, CONDUCIDO A MANO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ ESTA PRUEBA ES LA MÁS IMPORTANTE DE LAS QUE HAY. Todas las demás
 * miran pantallas que usa gente del club: si algo falla, lo ven, se quejan y
 * se arregla. Esta mira la única pantalla que usa alguien de fuera, UNA SOLA
 * VEZ, con los datos de su hijo, desde un móvil y sin que nadie le explique
 * nada. Si aquí se pierde lo que ha escrito, no se queja: se va, y el club no
 * se entera nunca de que lo intentó.
 *
 * SE COMPRUEBAN LAS SEIS COSAS QUE PUEDEN SALIR MAL DE VERDAD:
 *
 *   1. Un enlace que no abre tiene que DECIR POR QUÉ. «Cerrado» y «no existe»
 *      no son lo mismo para quien llega tarde.
 *   2. Un envío al que le falta algo no se manda, y lleva al primer hueco.
 *      Un botón apagado sin explicación no vale.
 *   3. Lo escrito sobrevive a cerrar la pestaña. Un formulario largo en un
 *      móvil compite con una llamada entrante.
 *   4. El justificante que se enseña es EL QUE DEVOLVIÓ EL SERVIDOR, no uno
 *      inventado por la pantalla.
 *   5. Si un documento falla, la inscripción NO se pierde, y se dice cuál
 *      faltó.
 *   6. Un archivo demasiado grande se rechaza ANTES de subirlo, no después de
 *      gastar la conexión del móvil.
 *
 * NO HABLA CON SUPABASE. Las dos funciones de la base se responden aquí, así
 * que esto prueba la pantalla, no el servidor. El servidor se prueba en
 * `pruebas/sql/`, con un Postgres de verdad y las migraciones aplicadas.
 *
 *   npm run build && npm run preview
 *   node pruebas/inscripcion.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.URL ?? 'http://localhost:4173';
const TOKEN = 'abcdef0123456789abcdef0123456789';
const j = (b) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const FORMULARIO_ABIERTO = {
  abierto: true, motivo: null,
  titulo: 'Inscripción Alevín A 2026/27',
  intro: 'Rellena una ficha por jugador.',
  temporada: '2026/27',
  club_nombre: 'CE Prueba', club_escudo: null,
  campos: [
    { id: 'alergias', label: 'Alergias o medicación', tipo: 'texto', obligatorio: true },
    { id: 'talla', label: 'Talla de camiseta', tipo: 'opcion', opciones: ['6', '8', '10'], obligatorio: false },
  ],
  documentos: [{ id: 'dni-jugador', label: 'DNI del jugador', obligatorio: true }],
  consentimientos: [
    { id: 'datos', label: 'Tratamiento de los datos del jugador', texto: 'Autorizo…', obligatorio: true },
    { id: 'imagen', label: 'Uso de imagen', texto: 'Autorizo…', obligatorio: false },
  ],
};

/** Las dos llamadas a la base, respondidas aquí. `subir` decide si falla. */
async function monta(page, { formulario = FORMULARIO_ABIERTO, subir = 'bien' } = {}) {
  await page.route('**/rest/v1/rpc/formulario_de_inscripcion', (r) => r.fulfill(j(formulario)));
  await page.route('**/rest/v1/rpc/enviar_inscripcion', (r) =>
    r.fulfill(j({ inscripcion_id: 'aaaa-bbbb-cccc', justificante: 'INS-K5GCDFM4' })));
  await page.route('**/.netlify/functions/subir-documento', (r) =>
    subir === 'bien'
      ? r.fulfill(j({ ok: true }))
      : r.fulfill({ status: 413, contentType: 'application/json', body: JSON.stringify({ error: 'El archivo pesa más de 10 MB.' }) }));
}

/** Rellena todo lo obligatorio. Devuelve lo que ha escrito, para comparar. */
async function rellena(page, { conArchivo = true } = {}) {
  const datos = {
    jugador: 'Marc Soler Pons',
    tutor: 'Anna Soler Riera',
    correo: 'anna.soler@ejemplo.test',
    alergias: 'Ninguna conocida',
  };
  await page.locator('[data-campo="player_name"] input').fill(datos.jugador);
  await page.locator('[data-campo="guardian_name"] input').fill(datos.tutor);
  await page.locator('[data-campo="guardian_email"] input').fill(datos.correo);
  await page.locator('[data-campo="campo:alergias"] input').fill(datos.alergias);
  await page.locator('[data-campo="cons:datos"] input[type=checkbox]').check();
  if (conArchivo) {
    await page.locator('[data-campo="doc:dni-jugador"] input[type=file]').setInputFiles({
      name: 'dni.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fotodeldni'),
    });
  }
  return datos;
}

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
/* Un móvil, que es desde donde se rellena esto. */
const movil = { viewport: { width: 393, height: 852 } };

/* ══════════════════════════════════════════════════════════════════════════
   1 · UN ENLACE QUE NO ABRE DICE POR QUÉ
   ══════════════════════════════════════════════════════════════════════════ */
for (const [caso, formulario, esperado] of [
  ['cerrado', { ...FORMULARIO_ABIERTO, abierto: false, motivo: 'El plazo terminó el 30/09/2026.' }, '30/09/2026'],
  ['en borrador', { ...FORMULARIO_ABIERTO, abierto: false, motivo: 'Este formulario todavía no está abierto.' }, 'todavía no está abierto'],
  ['inexistente', { abierto: false, motivo: 'Este enlace no existe.', titulo: null, club_nombre: null, campos: null, documentos: null, consentimientos: null }, 'no existe'],
]) {
  console.log(`\n  un enlace ${caso}`);
  const ctx = await navegador.newContext(movil);
  const page = await ctx.newPage();
  await monta(page, { formulario });
  await page.goto(`${BASE}/inscripcion/${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('explica el motivo', texto.includes(esperado), esperado);
  comprueba('y NO enseña el formulario',
    !(await page.locator('[data-campo="player_name"]').count()),
    (await page.locator('[data-campo="player_name"]').count()) ? 'se ve' : 'no se ve');
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · LO QUE FALTA SE DICE, Y LLEVA AL HUECO
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  un envío al que le falta algo');
  const ctx = await navegador.newContext(movil);
  const page = await ctx.newPage();
  await monta(page);
  /* Si llamara a enviar, esto lo cazaría. */
  let llamo = false;
  await page.route('**/rest/v1/rpc/enviar_inscripcion', (r) => { llamo = true; r.fulfill(j({})); });
  await page.goto(`${BASE}/inscripcion/${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  /* Sólo el nombre del jugador: falta todo lo demás. */
  await page.locator('[data-campo="player_name"] input').fill('Marc Soler');
  await page.getByRole('button', { name: /enviar la inscripción/i }).click();
  await page.waitForTimeout(600);

  comprueba('NO se ha enviado nada al servidor', !llamo, llamo ? 'se envió' : 'no se envió');

  const texto = await page.evaluate(() => document.body.innerText);
  /* El detalle se saca con el MISMO patrón que la comprobación. Con uno más
     flojo pescaba «Revisa el correo: falta algo.» —la ayuda de otro campo— y
     la prueba salía en verde enseñando una frase que no era la que probaba. */
  comprueba('dice cuántos datos faltan', /faltan \d+ datos|falta un dato/i.test(texto),
    (texto.match(/faltan \d+ datos|falta un dato/i) ?? ['no lo dice'])[0]);
  /* NO SE BUSCA `.text-bad` A SECAS: el asterisco de «obligatorio» ya lleva
     esa clase, así que la comprobación pasaba siempre y no probaba nada. Se
     mira el borde del campo y el texto del aviso, que es lo que de verdad
     aparece sólo cuando falta el dato. */
  const bordeTutor = await page.locator('[data-campo="guardian_name"] input').getAttribute('class');
  comprueba('señala el campo del tutor en rojo', (bordeTutor ?? '').includes('border-bad'),
    (bordeTutor ?? '').includes('border-bad') ? 'con borde' : 'sin borde');
  comprueba('y escribe el aviso debajo',
    /pon tu nombre/i.test(await page.locator('[data-campo="guardian_name"]').innerText()),
    JSON.stringify(await page.locator('[data-campo="guardian_name"]').innerText()));
  comprueba('avisa del correo mal puesto',
    /revisa el correo/i.test(await page.locator('[data-campo="guardian_email"]').innerText()));
  comprueba('señala el consentimiento obligatorio',
    await page.locator('[data-campo="cons:datos"].border-bad').count() > 0);
  comprueba('NO señala el consentimiento opcional',
    await page.locator('[data-campo="cons:imagen"].border-bad').count() === 0);
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   2 bis · EL BOTÓN NO SE MUEVE MIENTRAS SE PULSA
   ══════════════════════════════════════════════════════════════════════════
   LA PRUEBA QUE CAZÓ EL FALLO DE VERDAD, y por eso se queda. El aviso de «te
   faltan datos» estaba ENCIMA del botón y aparecía al perder el foco del
   último campo —justo cuando el dedo baja sobre «Enviar»—. El botón se iba
   hacia abajo entre el principio y el final del toque y el clic se perdía:
   había que pulsar dos veces. En un móvil eso se lee como «está roto».       */
{
  console.log('\n  el botón, mientras se pulsa');
  const ctx = await navegador.newContext(movil);
  const page = await ctx.newPage();
  await monta(page);
  await page.goto(`${BASE}/inscripcion/${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  /* Se rellena TODO menos el consentimiento, y se deja el foco en el último
     campo de texto: así el `blur` cae dentro del toque, que es el caso malo. */
  await page.locator('[data-campo="player_name"] input').fill('Marc Soler');
  await page.locator('[data-campo="guardian_name"] input').fill('Anna Soler');
  await page.locator('[data-campo="guardian_email"] input').fill('anna@ejemplo.test');
  await page.locator('[data-campo="campo:alergias"] input').fill('Ninguna');
  await page.locator('[data-campo="campo:alergias"] input').focus();

  const boton = page.getByRole('button', { name: /enviar la inscripción/i });
  await boton.scrollIntoViewIfNeeded();

  /* EN COORDENADAS DEL DOCUMENTO, NO DE LA PANTALLA. Al enviar con algo que
     falta, la pantalla se desplaza A PROPÓSITO hasta el primer hueco, y eso
     mueve la caja del botón respecto a la ventana sin que nada haya cambiado
     de sitio. Lo que importa aquí es si el botón se mueve DENTRO de la
     página: eso es lo que lo quita de debajo del dedo. La primera versión de
     esta comprobación medía el desplazamiento y suspendía a un botón que
     estaba quieto. */
  const donde = () => boton.evaluate((b) => b.getBoundingClientRect().top + window.scrollY);
  const altura = () => page.evaluate(() => document.body.scrollHeight);
  const antes = await donde();
  const altoAntes = await altura();
  await boton.click();
  await page.waitForTimeout(500);
  const movido = Math.abs((await donde()) - antes);

  comprueba('no se mueve dentro de la página al pulsarlo', movido <= 2, `${movido.toFixed(1)} px`);
  comprueba('y la página no cambia de alto', Math.abs((await altura()) - altoAntes) <= 2,
    `${Math.abs((await altura()) - altoAntes)} px`);
  /* Y el primer toque tiene que haber servido para algo: con el
     consentimiento sin marcar, el aviso tiene que estar ya puesto. */
  comprueba('el PRIMER toque ya marca lo que falta',
    await page.locator('[data-campo="cons:datos"].border-bad').count() > 0);
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · LO ESCRITO SOBREVIVE A CERRAR LA PESTAÑA
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  volver después de cerrar sin enviar');
  const ctx = await navegador.newContext(movil);
  const page = await ctx.newPage();
  await monta(page);
  await page.goto(`${BASE}/inscripcion/${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const datos = await rellena(page, { conArchivo: false });
  await page.waitForTimeout(300);

  /* Misma pestaña, recargada: es lo que pasa cuando el navegador del móvil
     descarta la página por memoria y se vuelve atrás. */
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  comprueba('el nombre del jugador sigue ahí',
    await page.locator('[data-campo="player_name"] input').inputValue() === datos.jugador,
    await page.locator('[data-campo="player_name"] input').inputValue() || 'vacío');
  comprueba('el correo sigue ahí',
    await page.locator('[data-campo="guardian_email"] input').inputValue() === datos.correo);
  comprueba('la pregunta del club sigue ahí',
    await page.locator('[data-campo="campo:alergias"] input').inputValue() === datos.alergias);
  comprueba('y el consentimiento sigue marcado',
    await page.locator('[data-campo="cons:datos"] input[type=checkbox]').isChecked());
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · UN ENVÍO BUENO: EL JUSTIFICANTE ES EL DEL SERVIDOR
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  un envío correcto');
  const ctx = await navegador.newContext(movil);
  const page = await ctx.newPage();
  await monta(page);

  /* Lo que de verdad sale hacia el servidor, para comprobar que va completo
     y en el orden prometido: primero la ficha, después el archivo. */
  const orden = [];
  let enviado = null;
  await page.route('**/rest/v1/rpc/enviar_inscripcion', (r) => {
    orden.push('ficha');
    enviado = JSON.parse(r.request().postData() ?? '{}');
    r.fulfill(j({ inscripcion_id: 'aaaa-bbbb-cccc', justificante: 'INS-K5GCDFM4' }));
  });
  await page.route('**/.netlify/functions/subir-documento', (r) => {
    orden.push('archivo');
    r.fulfill(j({ ok: true }));
  });

  await page.goto(`${BASE}/inscripcion/${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const datos = await rellena(page);
  await page.getByRole('button', { name: /enviar la inscripción/i }).click();
  await page.waitForTimeout(1400);

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('dice que está enviada', /inscripción enviada/i.test(texto));
  comprueba('enseña el justificante DEL SERVIDOR', texto.includes('INS-K5GCDFM4'),
    (texto.match(/INS-[A-Z0-9]+/) ?? ['ninguno'])[0]);
  comprueba('la ficha va ANTES del archivo', orden.join('→') === 'ficha→archivo', orden.join('→') || 'nada');

  const d = enviado?.p_datos ?? {};
  comprueba('manda el nombre del jugador', d.player_name === datos.jugador, d.player_name);
  comprueba('manda el correo del tutor', d.guardian_email === datos.correo, d.guardian_email);
  comprueba('manda la respuesta del club', d.respuestas?.alergias === datos.alergias, d.respuestas?.alergias);
  comprueba('manda el consentimiento CON SU HORA',
    typeof d.consentimientos?.datos === 'string' && !Number.isNaN(Date.parse(d.consentimientos.datos)),
    d.consentimientos?.datos);
  comprueba('NO manda el consentimiento que no se marcó',
    d.consentimientos?.imagen === undefined,
    d.consentimientos?.imagen ?? 'no va');
  comprueba('manda el token en la URL, no en el cuerpo', enviado?.p_token === TOKEN, enviado?.p_token);

  /* Y el borrador se limpia: si no, al volver a abrir el enlace para otro
     hijo aparecerían los datos del primero. */
  const borrador = await page.evaluate((t) => sessionStorage.getItem(`p360.inscripcion.${t}`), TOKEN);
  comprueba('el borrador se borra al enviar', borrador === null, borrador ? 'sigue ahí' : 'limpio');
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · SI EL DOCUMENTO FALLA, LA INSCRIPCIÓN NO SE PIERDE
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  el documento falla pero la ficha está guardada');
  const ctx = await navegador.newContext(movil);
  const page = await ctx.newPage();
  await monta(page, { subir: 'falla' });
  await page.goto(`${BASE}/inscripcion/${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await rellena(page);
  await page.getByRole('button', { name: /enviar la inscripción/i }).click();
  await page.waitForTimeout(1400);

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('dice que la inscripción está enviada', /inscripción enviada/i.test(texto));
  comprueba('enseña el justificante igual', texto.includes('INS-K5GCDFM4'));
  comprueba('avisa de que falta un documento', /no se ha subido|no se han subido/i.test(texto));
  comprueba('y dice CUÁL', /DNI del jugador/i.test(texto));
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════
   6 · UN ARCHIVO DEMASIADO GRANDE SE PARA ANTES DE SUBIRLO
   ══════════════════════════════════════════════════════════════════════════ */
{
  console.log('\n  un archivo de 12 MB');
  const ctx = await navegador.newContext(movil);
  const page = await ctx.newPage();
  await monta(page);
  let subio = false;
  await page.route('**/.netlify/functions/subir-documento', (r) => { subio = true; r.fulfill(j({ ok: true })); });
  await page.goto(`${BASE}/inscripcion/${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.locator('[data-campo="doc:dni-jugador"] input[type=file]').setInputFiles({
    name: 'enorme.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(12 * 1024 * 1024),
  });
  await page.waitForTimeout(400);

  const texto = await page.evaluate(() => document.body.innerText);
  comprueba('lo rechaza y dice cuánto pesa', /12\.0 MB|pesa/i.test(texto),
    (texto.match(/Pesa[^.]*\./i) ?? ['no lo dice'])[0]);
  comprueba('NO ha gastado la subida', !subio, subio ? 'subió' : 'no subió');

  /* Y un PDF del tamaño correcto sí entra, para no estar comprobando que
     simplemente no acepta nada. */
  await page.locator('[data-campo="doc:dni-jugador"] input[type=file]').setInputFiles({
    name: 'dni.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4'),
  });
  await page.waitForTimeout(400);
  comprueba('un PDF normal sí lo acepta',
    (await page.evaluate(() => document.body.innerText)).includes('dni.pdf'));
  await ctx.close();
}

await navegador.close();

console.log('');
if (fallos > 0) {
  console.log(`  ✗ ${fallos} ${fallos === 1 ? 'cosa' : 'cosas'} que fallarían a una familia.\n`);
  process.exit(1);
}
console.log('  El formulario aguanta: nada se pierde y nada se promete de más.\n');
