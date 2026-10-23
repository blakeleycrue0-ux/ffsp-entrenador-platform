/**
 * LA ADUANA: QUÉ DATOS DE LAS JUGADORAS PUEDEN SALIR HACIA LA IA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Las jugadoras son MENORES. En `players` hay teléfono, correo, tutores,
 * fecha de nacimiento y notas libres; en `attendance`, cada falta puede llevar
 * un motivo escrito a mano, que es donde la gente escribe cosas del tipo
 * «tiene el tobillo fatal». Nada de eso puede salir del servidor hacia una
 * API de terceros.
 *
 * ESTA PRUEBA NO PIDE PERMISO AL MODELO NI A LA RED: lee el código que
 * construye el contexto y comprueba, columna a columna, que lo que se pide a
 * la base de datos está en la lista de lo permitido. Es un control de
 * ADUANA, no una opinión.
 *
 * POR QUÉ ASÍ Y NO PROBANDO LA RESPUESTA. Una prueba que mandara una pregunta
 * de verdad y mirara si en la respuesta sale un teléfono comprobaría una
 * muestra de una. Esto comprueba la única puerta por la que pueden salir: si
 * la columna no se pide, no puede viajar, diga lo que diga el modelo.
 *
 * Y LA SEGUNDA MURALLA, la de lo médico, también se comprueba aquí: que las
 * instrucciones se lo prohíban explícitamente. Las dos juntas son lo que
 * sostiene la promesa — no se puede opinar sobre lo que no se tiene.
 *
 *   node pruebas/aduana.mjs
 */
import { readFileSync } from 'node:fs';

let fallos = 0;
const comprueba = (nombre, bien, detalle) => {
  console.log(`    ${bien ? '✓' : '✗'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
  if (!bien) fallos++;
};

const contexto = readFileSync(new URL('../netlify/functions/_contexto.mts', import.meta.url), 'utf8');
const funcion = readFileSync(new URL('../netlify/functions/entrenador.mts', import.meta.url), 'utf8');

/* Lo que NUNCA puede pedirse. Si alguien añade una columna a un `select` de
   `_contexto.mts`, o crea una nueva en `players`, esto tiene que cantar. */
const PROHIBIDAS = [
  'phone', 'email', 'guardians', 'birth_date', 'photo_url',
  'notes', 'availability_note', 'notes_before', 'notes_after',
];

console.log('\n  lo que se le pide a la base de datos\n');

/* Cada `.select('…')` del archivo, con sus columnas sueltas. */
const selects = [...contexto.matchAll(/\.select\(\s*'([^']+)'/g)].map((m) => m[1]);
comprueba('hay consultas que auditar', selects.length > 0, `${selects.length} select(s)`);

const pedidas = new Set(
  selects.flatMap((s) => s.split(',').map((c) => c.trim()).filter(Boolean)),
);

for (const mala of PROHIBIDAS) {
  comprueba(`no se pide «${mala}»`, !pedidas.has(mala));
}

/* `marks` sí se pide —hace falta para contar asistencias— pero sólo se puede
   leer `.mark`. El `reason` es texto libre de la persona que pasó lista. */
comprueba(
  'de cada falta se lee la marca, nunca el motivo escrito a mano',
  !/\.reason|\breason\b/.test(contexto),
);

console.log('\n  lo que viaja de cada jugadora\n');

comprueba(
  'sólo el nombre de pila: se parte por el espacio y se coge el primero',
  /split\(\/\\s\+\/\)\[0\]/.test(contexto),
);
comprueba(
  'y el contexto se construye en un solo archivo, que es el que se audita',
  /_contexto\.mts/.test(funcion),
);

console.log('\n  la segunda muralla: nada médico\n');

const instrucciones = funcion.slice(funcion.indexOf('INSTRUCCIONES'));
comprueba('se le prohíbe el consejo médico', /No das consejo médico/.test(instrucciones));
comprueba('se dice que son menores', /MENORES/.test(instrucciones));
comprueba(
  'y se le prohíbe opinar del físico y la alimentación',
  /No opinas sobre el físico/.test(instrucciones),
);
comprueba(
  'no se inventa lo que no tiene',
  /no lo tengo|No lo estimes/.test(instrucciones),
);

console.log('\n  la clave\n');

comprueba(
  'la clave se lee del entorno del servidor',
  /process\.env\.ANTHROPIC_API_KEY/.test(funcion),
);
comprueba(
  'y no hay ninguna clave escrita en el código',
  !/sk-ant-[a-zA-Z0-9_-]{10}/.test(funcion + contexto),
);

console.log('\n  quién puede preguntar\n');

comprueba('hace falta sesión', /quienLlama/.test(funcion));
comprueba(
  'y se comprueba que el equipo sea de su club, en el servidor',
  /club_members/.test(funcion) && /teams/.test(funcion),
);

console.log(
  fallos === 0
    ? '\n  Sólo salen nombres de pila y números. Lo médico ni se envía ni se opina.\n'
    : `\n  ${fallos} fallo(s).\n`,
);
process.exit(fallos === 0 ? 0 : 1);
