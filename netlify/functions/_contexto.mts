/**
 * LO QUE EL ENTRENADOR IA LLEGA A SABER, Y LO QUE NO SALE DE AQUÍ.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este archivo es la aduana. Todo lo que el modelo ve del club pasa por esta
 * función, y lo que no se escriba aquí NO SE ENVÍA. Es a propósito que sea un
 * sitio solo y pequeño: una lista de lo permitido se audita de un vistazo; una
 * de lo prohibido se queda corta en cuanto alguien añade una columna.
 *
 * ── POR QUÉ IMPORTA MÁS QUE DE COSTUMBRE ───────────────────────────────────
 *
 * Las jugadores son MENORES. En `players` hay teléfono, correo, tutores,
 * fecha de nacimiento y notas libres; en `attendance` cada falta puede llevar
 * un motivo escrito a mano, que es donde la gente escribe «tiene el tobillo
 * fatal». Nada de eso sale de la base de datos. Lo que se manda es:
 *
 *   · el NOMBRE DE PILA y el dorsal —no el apellido—,
 *   · números: cuántas sesiones, cuántas asistencias, qué porcentaje,
 *   · fechas de lo que viene, y contra quién.
 *
 * Con eso se contesta «¿quién está faltando?» y «¿qué toca el jueves?», que
 * es para lo que sirve. Para lo demás no hace falta, y lo que no hace falta
 * no se manda a un tercero.
 *
 * ── LAS AUSENCIAS SE CUENTAN, NO SE EXPLICAN ───────────────────────────────
 *
 * `lesionada` es una marca de asistencia, así que se cuenta: saber que
 * alguien lleva cuatro sesiones sin entrenar es información de entrenador. Lo
 * que no viaja es el MOTIVO —ni el de la falta, ni `availability_note`, ni
 * `notes`—, porque ahí es donde vive lo que es información médica. Un modelo
 * que no tiene el dato no puede opinar sobre él.
 */

import { admin } from './_comun.mts';

/** Nombre de pila. Ni apellidos, ni nombre completo. */
const deSoloPila = (nombre: string | null, corto: string | null): string => {
  const base = (corto || nombre || '').trim();
  return base.split(/\s+/)[0] || 'Sin nombre';
};

/** Una fecha en castellano, que es como la va a decir el entrenador. */
const enCastellano = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
};

export interface Contexto {
  texto: string;
  /** Para poder decir en la pantalla qué ha mirado, sin tener que fiarse. */
  resumen: { jugadores: number; sesiones: number; partidos: number };
}

/**
 * Lo que se sabe de un equipo, en texto plano y corto.
 *
 * Va en prosa y no en JSON a propósito: el modelo lo lee igual de bien y, si
 * algún día alguien quiere ver exactamente qué se mandó, esto se lee sin
 * herramientas. Lo que no se puede leer no se puede revisar.
 */
export async function contextoDelEquipo(teamId: string): Promise<Contexto> {
  const db = admin();
  const hoy = new Date().toISOString().slice(0, 10);

  const [equipo, jugadores, sesiones, asistencias, partidos] = await Promise.all([
    db.from('teams').select('name, category, season, competition, modality').eq('id', teamId).maybeSingle(),
    db.from('players').select('id, name, short_name, number, position, availability_status')
      .eq('team_id', teamId).is('archived_at', null),
    db.from('sessions').select('id, title, date, start_time, objective, status')
      .eq('team_id', teamId).order('date', { ascending: true }),
    db.from('attendance').select('session_id, date, marks').eq('team_id', teamId),
    db.from('matches').select('opponent, competition, date, start_time, home, status, result_own, result_rival')
      .eq('team_id', teamId).order('date', { ascending: true }),
  ]);

  const eq = equipo.data;
  const plantilla = jugadores.data ?? [];
  const ses = sesiones.data ?? [];
  const asis = asistencias.data ?? [];
  const par = partidos.data ?? [];

  const lineas: string[] = [];

  lineas.push(
    `EQUIPO: ${eq?.name ?? 'sin nombre'}`
    + `${eq?.category ? ` · categoría ${eq.category}` : ''}`
    + `${eq?.season ? ` · temporada ${eq.season}` : ''}`
    + `${eq?.competition ? ` · ${eq.competition}` : ''}`,
  );
  lineas.push(`Hoy es ${enCastellano(hoy)}.`);
  lineas.push('');

  /* ── PLANTILLA: nombre de pila, dorsal, puesto y su asistencia ──────────
     El porcentaje se calcula aquí, sobre las sesiones en las que se pasó
     lista de verdad. Una jugador que entró en enero no arrastra las faltas
     de septiembre, porque sólo cuentan las listas donde aparece. */
  const pasadas = asis.filter((a) => a.date <= hoy);
  lineas.push(`PLANTILLA (${plantilla.length} jugadores). Asistencia sobre ${pasadas.length} sesiones con lista pasada:`);

  if (plantilla.length === 0) {
    lineas.push('  (todavía no hay ninguna jugador dada de alta)');
  }

  for (const p of plantilla) {
    const suyas = pasadas.filter((a) => (a.marks as Record<string, unknown>)?.[p.id] !== undefined);
    const marca = (a: typeof pasadas[number]) =>
      ((a.marks as Record<string, { mark?: string }>)?.[p.id]?.mark ?? '') as string;

    const presente = suyas.filter((a) => marca(a) === 'presente' || marca(a) === 'tarde').length;
    const lesionada = suyas.filter((a) => marca(a) === 'lesionada').length;

    /* SIN LISTAS NO HAY PORCENTAJE, y no se escribe un cero. Un 0 % se lee
       como «no viene nunca» cuando lo que pasa es que nadie pasó lista. */
    const pct = suyas.length > 0 ? Math.round((presente / suyas.length) * 100) : null;

    lineas.push(
      `  · ${deSoloPila(p.name, p.short_name)}`
      + `${p.number != null ? ` (dorsal ${p.number})` : ''}`
      + `${p.position ? ` · ${p.position}` : ''}`
      + ` · ${pct === null ? 'sin listas todavía' : `asistencia ${pct}% (${presente} de ${suyas.length})`}`
      + `${lesionada > 0 ? ` · ${lesionada} marcada como lesionada` : ''}`
      + `${p.availability_status && p.availability_status !== 'disponible' ? ` · figura como ${p.availability_status}` : ''}`,
    );
  }
  lineas.push('');

  /* ── LO QUE VIENE ──────────────────────────────────────────────────────── */
  const proximas = ses.filter((s) => s.date >= hoy).slice(0, 8);
  lineas.push(`PRÓXIMOS ENTRENAMIENTOS (${proximas.length} de ${ses.length} en total):`);
  if (proximas.length === 0) lineas.push('  (no hay ninguno puesto a partir de hoy)');
  for (const s of proximas) {
    lineas.push(
      `  · ${enCastellano(s.date)}${s.start_time ? ` a las ${String(s.start_time).slice(0, 5)}` : ''}`
      + `${s.title ? ` — ${s.title}` : ''}${s.objective ? ` · objetivo: ${s.objective}` : ''}`,
    );
  }
  lineas.push('');

  const prox = par.filter((m) => m.date >= hoy).slice(0, 5);
  const jugados = par.filter((m) => m.date < hoy && m.result_own != null).slice(-5);
  lineas.push(`PRÓXIMOS PARTIDOS (${prox.length} de ${par.length} en total):`);
  if (prox.length === 0) lineas.push('  (no hay ninguno puesto a partir de hoy)');
  for (const m of prox) {
    lineas.push(
      `  · ${enCastellano(m.date)}${m.start_time ? ` a las ${String(m.start_time).slice(0, 5)}` : ''}`
      + ` contra ${m.opponent ?? 'rival sin poner'} (${m.home ? 'en casa' : 'fuera'})`
      + `${m.competition ? ` · ${m.competition}` : ''}`,
    );
  }
  if (jugados.length > 0) {
    lineas.push('');
    lineas.push('ÚLTIMOS RESULTADOS:');
    for (const m of jugados) {
      lineas.push(`  · ${enCastellano(m.date)} contra ${m.opponent ?? '—'}: ${m.result_own}-${m.result_rival}`);
    }
  }

  return {
    texto: lineas.join('\n'),
    resumen: { jugadores: plantilla.length, sesiones: ses.length, partidos: par.length },
  };
}
