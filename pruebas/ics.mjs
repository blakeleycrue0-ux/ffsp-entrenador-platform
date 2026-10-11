/**
 * Leer un calendario de verdad.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esta prueba no abre el navegador: comprueba las dos piezas que convierten
 * «lo que la entrenadora ya tiene» en entrenamientos de la plataforma.
 *
 *  · `src/lib/ics.ts` — leer el archivo que exporta cualquier calendario.
 *  · `src/lib/horario.ts` — repartir el horario fijo del equipo entre dos
 *    fechas.
 *
 * SE PRUEBA CON LO QUE ESCRIBEN LOS CALENDARIOS DE VERDAD, no con un ejemplo
 * cómodo: líneas partidas a 75 caracteres, las tres formas de escribir la
 * fecha, repeticiones con días de la semana y con tope, y fechas quitadas de
 * la serie. Si algo de eso se lee mal, lo que se importa no es lo que pone el
 * archivo —y eso es peor que no importar nada—.
 *
 * El TypeScript se compila al vuelo con esbuild, que ya viene con Vite.
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Compila un módulo de `src/lib` y lo carga. Sin escribir en disco. */
async function cargar(relativo) {
  const r = await build({
    entryPoints: [path.join(raiz, relativo)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    target: 'node18',
  });
  const codigo = r.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`);
}

let fallos = 0;
const ok = (cond, texto, extra = '') => {
  if (cond) {
    console.log(`    ✓ ${texto}`);
  } else {
    fallos += 1;
    console.log(`    ✗ ${texto}${extra ? `  → ${extra}` : ''}`);
  }
};

const { leerIcs } = await cargar('src/lib/ics.ts');
const { citasDelHorario, minutosEntreHoras } = await cargar('src/lib/horario.ts');

console.log('\n  El archivo de calendario\n');

/* ── 1. Lo básico, con la línea partida como la parte Google ───────────────── */
{
  const archivo = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:uno@ejemplo',
    'DTSTART;TZID=Europe/Madrid:20261013T180000',
    'DTEND;TZID=Europe/Madrid:20261013T193000',
    'SUMMARY:Entrenamiento del primer equipo con un título muy largo que no cab',
    ' e en una sola línea del archivo',
    'LOCATION:Campo Municipal\\, pista 2',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const { eventos } = leerIcs(archivo);
  ok(eventos.length === 1, 'una cita es una cita', `salieron ${eventos.length}`);
  const e = eventos[0];
  ok(e.fecha === '2026-10-13', 'la fecha, tal cual', e.fecha);
  ok(e.inicio === '18:00', 'la hora, tal cual', e.inicio);
  ok(e.minutos === 90, 'la duración sale de DTSTART y DTEND', String(e.minutos));
  ok(
    e.titulo === 'Entrenamiento del primer equipo con un título muy largo que no cabe en una sola línea del archivo',
    'el título partido se vuelve a juntar',
    e.titulo,
  );
  ok(e.lugar === 'Campo Municipal, pista 2', 'la coma escapada se desescapa', e.lugar);
}

/* ── 2. Día entero y duración en ISO ──────────────────────────────────────── */
{
  const archivo = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:dia@ejemplo',
    'DTSTART;VALUE=DATE:20261101',
    'SUMMARY:Jornada de puertas abiertas',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:dur@ejemplo',
    'DTSTART:20261102T170000Z',
    'DURATION:PT1H15M',
    'SUMMARY:Sesión de vídeo',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const { eventos } = leerIcs(archivo);
  const dia = eventos.find((x) => x.titulo === 'Jornada de puertas abiertas');
  const dur = eventos.find((x) => x.titulo === 'Sesión de vídeo');
  ok(dia?.todoElDia === true && dia?.inicio === '', 'un día entero no trae hora');
  ok(dia?.minutos === null, 'y tampoco duración', String(dia?.minutos));
  ok(dur?.minutos === 75, 'PT1H15M son 75 minutos', String(dur?.minutos));
}

/* ── 3. La repetición: martes y jueves hasta una fecha ────────────────────── */
{
  const archivo = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:serie@ejemplo',
    'DTSTART;TZID=Europe/Madrid:20261013T180000',
    'DTEND;TZID=Europe/Madrid:20261013T193000',
    'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261112T000000Z',
    'EXDATE;TZID=Europe/Madrid:20261029T180000',
    'SUMMARY:Entrenamiento',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const { eventos } = leerIcs(archivo);
  const fechas = eventos.map((e) => e.fecha);
  /* Del 13 de octubre al 12 de noviembre, martes y jueves: 13, 15, 20, 22, 27,
     29, 3, 5, 10, 12 — menos el 29, que está quitado. Son nueve. */
  ok(fechas.length === 9, 'martes y jueves de un mes son nueve, con una quitada', fechas.join(' '));
  ok(fechas[0] === '2026-10-13', 'empieza el día del DTSTART', fechas[0]);
  ok(fechas.at(-1) === '2026-11-12', 'y acaba en el UNTIL', String(fechas.at(-1)));
  ok(!fechas.includes('2026-10-29'), 'la fecha de EXDATE no entra');
  ok(eventos.every((e) => e.minutos === 90), 'todas heredan la duración de la primera');
  ok(new Set(eventos.map((e) => e.uid)).size === 9, 'cada repetición tiene su propio identificador');
}

/* ── 4. COUNT, intervalo y una repetición que no sabemos expandir ─────────── */
{
  const conCuenta = leerIcs([
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:c@e',
    'DTSTART:20261005T170000',
    'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=4',
    'SUMMARY:Cada dos semanas',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n'));
  const f = conCuenta.eventos.map((e) => e.fecha);
  ok(f.length === 4, 'COUNT=4 son cuatro', f.join(' '));
  ok(f.join(' ') === '2026-10-05 2026-10-19 2026-11-02 2026-11-16', 'cada dos semanas, el mismo día', f.join(' '));

  const mensual = leerIcs([
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:m@e',
    'DTSTART:20261005T170000',
    'RRULE:FREQ=MONTHLY;COUNT=5',
    'SUMMARY:Reunión mensual',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n'));
  ok(mensual.eventos.length === 1, 'una mensual entra sólo una vez', String(mensual.eventos.length));
  ok(
    mensual.avisos.some((a) => a.includes('MONTHLY')),
    'y se dice en voz alta que no se ha expandido',
    mensual.avisos.join(' | '),
  );
}

/* ── 5. Lo que no es un calendario ────────────────────────────────────────── */
{
  const { eventos, avisos } = leerIcs('Esto es un correo, no un calendario.');
  ok(eventos.length === 0 && avisos.length === 1, 'un archivo que no lo es se rechaza sin romperse');
}

/* ── 6. Un RRULE sin final no genera infinitos ────────────────────────────── */
{
  const { eventos } = leerIcs([
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:inf@e',
    'DTSTART:20260101T180000',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Todos los días',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n'));
  ok(eventos.length > 0 && eventos.length <= 400, 'una serie sin final se corta', String(eventos.length));
}

console.log('\n  El horario del equipo\n');

/* ── 7. Martes y jueves, tres semanas ─────────────────────────────────────── */
{
  const slots = [
    { weekday: 2, start: '18:00', end: '19:30', venue: 'Municipal' },
    { weekday: 4, start: '18:30', end: '20:00', venue: 'Municipal' },
  ];
  const citas = citasDelHorario(slots, '2026-10-12', '2026-11-01');
  ok(citas.length === 6, 'tres semanas de martes y jueves son seis', String(citas.length));
  ok(citas[0].fecha === '2026-10-13' && citas[0].inicio === '18:00', 'el primero es el martes 13', JSON.stringify(citas[0]));
  ok(citas[1].fecha === '2026-10-15' && citas[1].minutos === 90, 'el jueves dura noventa', JSON.stringify(citas[1]));
  ok(citas.every((c) => c.lugar === 'Municipal'), 'el campo del horario viaja con la cita');
}

/* ── 8. Sin hora de fin, la duración la pone quien llama ──────────────────── */
{
  const citas = citasDelHorario([{ weekday: 1, start: '19:00', end: '', venue: '' }], '2026-10-12', '2026-10-12', 75);
  ok(citas.length === 1 && citas[0].minutos === 75, 'sin fin, la duración elegida', JSON.stringify(citas));
}

/* ── 9. Lo que no da ninguna cita ─────────────────────────────────────────── */
{
  ok(citasDelHorario([], '2026-10-01', '2026-12-01').length === 0, 'sin horario no hay citas');
  ok(citasDelHorario([{ weekday: 3, start: '', end: '', venue: '' }], '2026-10-01', '2026-12-01').length === 0,
    'un horario sin hora no vale');
  ok(citasDelHorario([{ weekday: 3, start: '18:00', end: '19:00', venue: '' }], '2026-12-01', '2026-10-01').length === 0,
    'las fechas al revés no dan nada');
  ok(minutosEntreHoras('19:00', '18:00') === null, 'un fin antes del inicio no es una duración');
}

/* ── 10. Un rango absurdo no se dispara ───────────────────────────────────── */
{
  const citas = citasDelHorario(
    [{ weekday: 1, start: '18:00', end: '19:30', venue: '' }, { weekday: 3, start: '18:00', end: '19:30', venue: '' }],
    '2020-01-01',
    '2030-01-01',
  );
  ok(citas.length <= 400, 'diez años de horario se cortan en el tope', String(citas.length));
}

console.log(
  fallos === 0
    ? '\n  Lo que se importa es lo que pone el archivo.\n'
    : `\n  ${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}.\n`,
);
process.exit(fallos === 0 ? 0 : 1);
