/**
 * Leer un archivo de calendario (.ics).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PARA QUÉ. Un club manda el calendario de la temporada en un archivo, o la
 * entrenadora ya lo tiene en el calendario del móvil y lo exporta. Hasta
 * ahora la plataforma sólo sabía ESCRIBIR ese archivo; meter treinta
 * entrenamientos había que hacerlo de uno en uno, a mano.
 *
 * ESTO NO ES UNA BIBLIOTECA DE iCALENDAR, y no pretende serlo. Lee lo que
 * traen los archivos que exportan Google Calendar, Apple Calendar y Outlook
 * para un calendario de entrenamientos, que es siempre lo mismo: cuándo
 * empieza, cuánto dura, cómo se llama, dónde es y cada cuánto se repite.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LO QUE SÍ ENTIENDE, Y POR QUÉ CADA COSA
 *
 *  · LÍNEAS PARTIDAS. El formato parte las líneas largas a 75 caracteres y
 *    continúa con un espacio al principio de la siguiente. Sin volver a
 *    unirlas, un título largo llega cortado por la mitad.
 *  · LAS TRES FORMAS DE LA FECHA. `20261011T183000Z` (en UTC),
 *    `TZID=Europe/Madrid:20261011T183000` (con zona) y `VALUE=DATE:20261011`
 *    (día entero). Las dos primeras dan hora; la tercera no, y eso importa.
 *  · LA REPETICIÓN (`RRULE`). Es la diferencia entre importar un
 *    entrenamiento e importar los treinta de la temporada, que es justo lo
 *    que se viene a hacer. Se expanden las semanales y las diarias, con su
 *    intervalo, sus días de la semana y su final —por cuenta o por fecha—.
 *  · LAS EXCEPCIONES (`EXDATE`). Las semanas que se quitaron de la serie
 *    —Navidad, un puente— no se importan como entrenamientos.
 *
 * LO QUE NO: zonas horarias de verdad. Una hora con `TZID` se toma como hora
 * de reloj, tal cual viene. Para un club que entrena en su propia ciudad es
 * exactamente lo que quiere decir; convertirla de verdad exigiría la tabla de
 * husos horarios entera y cambiaría la hora a quien importa su propio
 * calendario, que es el caso normal. Las que vienen en UTC —con `Z`— sí se
 * pasan a la hora del aparato, porque ahí el archivo dice explícitamente que
 * no son hora local.
 */

export interface EventoIcs {
  /** El identificador del archivo, para no importar dos veces lo mismo. */
  uid: string;
  titulo: string;
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** `HH:MM`. Vacío si el evento es de día entero. */
  inicio: string;
  /** Minutos. `null` si el archivo no dice cuánto dura. */
  minutos: number | null;
  lugar: string;
  descripcion: string;
  /** Sin hora: el archivo lo da como día completo. */
  todoElDia: boolean;
  /** Si sale de expandir una repetición, y la vez que hace. */
  repetido: boolean;
}

export interface LecturaIcs {
  eventos: EventoIcs[];
  /** Lo que no se ha podido leer, dicho en voz alta en vez de callado. */
  avisos: string[];
}

/** Tope de seguridad: un `RRULE` sin final no puede generar infinitos. */
const TOPE_POR_SERIE = 200;
const TOPE_TOTAL = 1000;

/* ──────────────────────────────── El formato ─────────────────────────────── */

/** Vuelve a juntar las líneas que el formato parte con un espacio delante. */
function desdoblar(texto: string): string[] {
  const crudas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const salida: string[] = [];
  for (const linea of crudas) {
    if ((linea.startsWith(' ') || linea.startsWith('\t')) && salida.length > 0) {
      salida[salida.length - 1] += linea.slice(1);
    } else {
      salida.push(linea);
    }
  }
  return salida;
}

/** `DTSTART;TZID=Europe/Madrid:2026…` → nombre, parámetros y valor. */
function partir(linea: string): { nombre: string; params: Record<string, string>; valor: string } | null {
  const dosPuntos = linea.indexOf(':');
  if (dosPuntos < 0) return null;
  const izquierda = linea.slice(0, dosPuntos);
  const valor = linea.slice(dosPuntos + 1);
  const trozos = izquierda.split(';');
  const nombre = trozos[0].toUpperCase();
  const params: Record<string, string> = {};
  for (const p of trozos.slice(1)) {
    const i = p.indexOf('=');
    if (i > 0) params[p.slice(0, i).toUpperCase()] = p.slice(i + 1).replace(/^"|"$/g, '');
  }
  return { nombre, params, valor };
}

/** Deshace los escapes del formato: `\,` `\;` `\n` `\\`. */
const texto = (v: string) =>
  v.replace(/\\n/gi, '\n').replace(/\\([\\;,])/g, '$1').trim();

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** `20261011` → `2026-10-11`. */
const aFecha = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

interface Momento {
  fecha: string;
  hora: string;
  todoElDia: boolean;
}

/**
 * Lee un `DTSTART` o un `DTEND`.
 *
 * Con `Z` la hora viene en UTC y se pasa a la del aparato: el archivo está
 * diciendo que NO es hora local. Sin `Z` se toma tal cual, que es lo que
 * quiere decir un calendario escrito en la ciudad del club.
 */
function momento(valor: string, params: Record<string, string>): Momento | null {
  const v = valor.trim();
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    if (!/^\d{8}$/.test(v)) return null;
    return { fecha: aFecha(v), hora: '', todoElDia: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [, a, me, d, h, mi, , z] = m;
  if (z) {
    const utc = new Date(Date.UTC(Number(a), Number(me) - 1, Number(d), Number(h), Number(mi)));
    return {
      fecha: `${utc.getFullYear()}-${dosCifras(utc.getMonth() + 1)}-${dosCifras(utc.getDate())}`,
      hora: `${dosCifras(utc.getHours())}:${dosCifras(utc.getMinutes())}`,
      todoElDia: false,
    };
  }
  return { fecha: `${a}-${me}-${d}`, hora: `${h}:${mi}`, todoElDia: false };
}

/** Diferencia en minutos entre dos momentos del mismo huso. */
function minutosEntre(a: Momento, b: Momento): number | null {
  if (a.todoElDia || b.todoElDia) return null;
  const ms = Date.parse(`${b.fecha}T${b.hora}:00`) - Date.parse(`${a.fecha}T${a.hora}:00`);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.round(ms / 60000);
}

/** `PT1H30M`, `PT90M`, `P1D` → minutos. */
function duracionIso(v: string): number | null {
  const m = v.trim().toUpperCase().match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [, sem, dias, hor, min] = m;
  const total =
    (Number(sem ?? 0) * 7 * 24 * 60) + (Number(dias ?? 0) * 24 * 60)
    + (Number(hor ?? 0) * 60) + Number(min ?? 0);
  return total > 0 ? total : null;
}

/* ─────────────────────────────── Repeticiones ────────────────────────────── */

const DIAS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Suma días a `YYYY-MM-DD` sin pasar por husos horarios. */
function masDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
}

const diaSemana = (fecha: string) => new Date(`${fecha}T12:00:00`).getDay();

/**
 * Expande una repetición en la lista de fechas que toca.
 *
 * Sólo semanal y diaria: son las dos que usa un calendario de
 * entrenamientos. Una mensual o anual se deja pasar con su primera fecha y se
 * avisa, que es mejor que importar algo distinto de lo que pone el archivo.
 */
function fechasDeLaSerie(
  rrule: string,
  primera: string,
  avisos: string[],
  titulo: string,
): string[] {
  const reglas: Record<string, string> = {};
  for (const p of rrule.split(';')) {
    const i = p.indexOf('=');
    if (i > 0) reglas[p.slice(0, i).toUpperCase()] = p.slice(i + 1).toUpperCase();
  }
  const freq = reglas.FREQ;
  if (freq !== 'WEEKLY' && freq !== 'DAILY') {
    avisos.push(`«${titulo}» se repite de una forma que no sé expandir (${freq ?? 'sin FREQ'}): entra sólo la primera.`);
    return [primera];
  }

  const intervalo = Math.max(1, Number(reglas.INTERVAL ?? 1));
  const cuenta = reglas.COUNT ? Number(reglas.COUNT) : null;
  const hasta = reglas.UNTIL ? aFecha(reglas.UNTIL.slice(0, 8)) : null;
  const byday = reglas.BYDAY
    ? reglas.BYDAY.split(',').map((d) => DIAS.indexOf(d.replace(/^[+-]?\d/, '').trim())).filter((i) => i >= 0)
    : [];

  /* Sin final ni cuenta, un año por delante: es lo que dura una temporada y
     evita generar fechas hasta el infinito. */
  const limite = hasta ?? masDias(primera, 366);
  const fechas: string[] = [];

  if (freq === 'DAILY') {
    for (let f = primera; f <= limite && fechas.length < TOPE_POR_SERIE; f = masDias(f, intervalo)) {
      fechas.push(f);
      if (cuenta && fechas.length >= cuenta) break;
    }
    return fechas;
  }

  /* Semanal: los días marcados de cada semana que toque. Sin `BYDAY`, el
     mismo día de la semana que la primera fecha. */
  const dias = byday.length > 0 ? byday : [diaSemana(primera)];
  /* El lunes —o el domingo, da igual mientras sea estable— de la semana en
     la que cae la primera fecha, para contar los intervalos desde ahí. */
  const inicioSemana = masDias(primera, -diaSemana(primera));
  for (let s = 0; fechas.length < TOPE_POR_SERIE; s += 1) {
    const base = masDias(inicioSemana, s * intervalo * 7);
    if (base > limite) break;
    for (const d of [...dias].sort((a, b) => a - b)) {
      const f = masDias(base, d);
      if (f < primera || f > limite) continue;
      fechas.push(f);
      if (cuenta && fechas.length >= cuenta) return fechas;
    }
    /* Guardia por si el intervalo fuera absurdo. */
    if (s > TOPE_POR_SERIE) break;
  }
  return fechas;
}

/* ──────────────────────────────── La lectura ─────────────────────────────── */

export function leerIcs(contenido: string): LecturaIcs {
  const avisos: string[] = [];
  const eventos: EventoIcs[] = [];

  if (!/BEGIN:VCALENDAR/i.test(contenido)) {
    return { eventos: [], avisos: ['Esto no parece un archivo de calendario (.ics).'] };
  }

  const lineas = desdoblar(contenido);
  let dentro = false;
  let bruto: Record<string, { params: Record<string, string>; valor: string }> = {};
  let exdates: string[] = [];

  const cerrar = () => {
    const dt = bruto.DTSTART;
    if (!dt) {
      avisos.push('Un evento del archivo no dice cuándo empieza: se queda fuera.');
      return;
    }
    const ini = momento(dt.valor, dt.params);
    if (!ini) {
      avisos.push('Un evento tiene una fecha que no he sabido leer: se queda fuera.');
      return;
    }

    const titulo = texto(bruto.SUMMARY?.valor ?? '') || 'Sin título';
    const lugar = texto(bruto.LOCATION?.valor ?? '');
    const descripcion = texto(bruto.DESCRIPTION?.valor ?? '');
    const uid = (bruto.UID?.valor ?? '').trim();

    let minutos: number | null = null;
    if (bruto.DTEND) {
      const fin = momento(bruto.DTEND.valor, bruto.DTEND.params);
      if (fin) minutos = minutosEntre(ini, fin);
    } else if (bruto.DURATION) {
      minutos = duracionIso(bruto.DURATION.valor);
    }

    const fechas = bruto.RRULE
      ? fechasDeLaSerie(bruto.RRULE.valor, ini.fecha, avisos, titulo)
      : [ini.fecha];

    const fuera = new Set(exdates);
    let saltadas = 0;
    for (const fecha of fechas) {
      if (fuera.has(fecha)) { saltadas += 1; continue; }
      if (eventos.length >= TOPE_TOTAL) break;
      eventos.push({
        uid: fechas.length > 1 ? `${uid}#${fecha}` : uid,
        titulo,
        fecha,
        inicio: ini.hora,
        minutos,
        lugar,
        descripcion,
        todoElDia: ini.todoElDia,
        repetido: fechas.length > 1,
      });
    }
    if (saltadas > 0) {
      avisos.push(`«${titulo}»: ${saltadas} ${saltadas === 1 ? 'fecha estaba quitada' : 'fechas estaban quitadas'} de la serie y no entran.`);
    }
  };

  for (const linea of lineas) {
    const l = linea.trim();
    if (/^BEGIN:VEVENT$/i.test(l)) { dentro = true; bruto = {}; exdates = []; continue; }
    if (/^END:VEVENT$/i.test(l)) { if (dentro) cerrar(); dentro = false; continue; }
    if (!dentro) continue;

    const p = partir(l);
    if (!p) continue;
    if (p.nombre === 'EXDATE') {
      for (const v of p.valor.split(',')) {
        const m = momento(v, p.params);
        if (m) exdates.push(m.fecha);
      }
      continue;
    }
    /* La primera gana: algunos archivos repiten propiedades por zona. */
    if (!bruto[p.nombre]) bruto[p.nombre] = { params: p.params, valor: p.valor };
  }

  if (eventos.length >= TOPE_TOTAL) {
    avisos.push(`El archivo trae más de ${TOPE_TOTAL} citas. Se han leído las primeras ${TOPE_TOTAL}.`);
  }

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio.localeCompare(b.inicio));
  return { eventos, avisos };
}
