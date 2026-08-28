/**
 * Servicio de IA — FFSP Assistant.
 * ---------------------------------------------------------------------------
 * ARQUITECTURA (la misma con modelo real o con el motor local):
 *
 *    UI del asistente  →  ai.ask()  →  buildContext(datos del club)
 *                                   →  provider (local | API real)
 *                                   →  AssistantMessage { texto, tarjeta, acciones }
 *
 * Hoy `provider` es el motor local determinista de este fichero: no inventa
 * datos, consulta el estado real del club (asistencias, lesiones, posiciones)
 * y compone la respuesta. Para enchufar un modelo real sólo hay que
 * implementar `remoteProvider` respetando la misma firma y el mismo contrato
 * de contexto — la interfaz no cambia.
 *
 * REGLA DE SEGURIDAD: el asistente nunca envía comunicación externa por su
 * cuenta. Todo lo que salga del club se devuelve como borrador con acciones
 * explícitas de revisión y envío.
 */

import type {
  AssistantIntent, AssistantMessage, ClubData, Drill, DrillTag, Player,
  SessionBlock, TrainingSession,
} from '@/types';
import { longDate, pct, relativeDay, toISODate, today, uid } from '@/lib/utils';

export interface AIContext {
  data: ClubData;
  teamId: string;
  staffName: string;
}

export interface SessionBrief {
  teamId: string;
  objective: string;
  duration: number;
  players: number;
  level: 'Iniciación' | 'Desarrollo' | 'Rendimiento';
  material: string[];
  date?: string;
  start?: string;
}

/* ───────────────────────── Diccionario objetivo → etiquetas ──────────────── */

const OBJECTIVE_TAGS: { match: RegExp; tags: DrillTag[]; label: string }[] = [
  { match: /presi[oó]n|pressing|tras p[eé]rdida|contrapresi/i, tags: ['Presión', 'Transición'], label: 'presión tras pérdida' },
  { match: /posesi[oó]n|circulaci[oó]n|salida de bal[oó]n|construcci/i, tags: ['Posesión', 'Táctica'], label: 'posesión y salida de balón' },
  { match: /finaliza|gol|remate|defini/i, tags: ['Finalización', 'Ataque'], label: 'finalización' },
  { match: /defen|repliegue|bascula|l[ií]nea de cuatro/i, tags: ['Defensa', 'Táctica'], label: 'organización defensiva' },
  { match: /transici[oó]n|contraataque|contragolpe/i, tags: ['Transición', 'Ataque'], label: 'transiciones' },
  { match: /t[eé]cnic|conducci[oó]n|control|pase/i, tags: ['Técnica'], label: 'técnica individual' },
  { match: /f[ií]sic|resistencia|fuerza|velocidad/i, tags: ['Preparación física'], label: 'preparación física' },
  { match: /ataque|ancho|amplitud|desmarque/i, tags: ['Ataque', 'Posesión'], label: 'fase ofensiva' },
];

const tagsForObjective = (objective: string): { tags: DrillTag[]; label: string } => {
  const hit = OBJECTIVE_TAGS.find((o) => o.match.test(objective));
  return hit ? { tags: hit.tags, label: hit.label } : { tags: ['Táctica', 'Posesión'], label: objective.toLowerCase() };
};

/* ─────────────────────── Generador de sesiones (motor local) ─────────────── */

/**
 * Construye una sesión completa a partir del brief. No es aleatorio: elige de
 * la biblioteca los ejercicios cuyas etiquetas encajan con el objetivo y
 * reparte la duración con la estructura clásica calentamiento → parte
 * principal → juego → vuelta a la calma.
 */
export function generateSession(brief: SessionBrief, drills: Drill[]): TrainingSession {
  const { tags, label } = tagsForObjective(brief.objective);

  const pick = (predicate: (d: Drill) => boolean, exclude: Set<string>): Drill | undefined =>
    drills.find((d) => !exclude.has(d.id) && predicate(d));

  const used = new Set<string>();
  // El calentamiento debe ser un ejercicio *de* calentamiento, no uno que
  // simplemente lo admita: se prioriza el que lo lleva como etiqueta principal.
  const warmup =
    pick((d) => d.tags[0] === 'Calentamiento', used) ?? pick((d) => d.tags.includes('Calentamiento'), used);
  if (warmup) used.add(warmup.id);
  const activation = pick((d) => d.tags.includes('Posesión') && d.duration <= 15, used);
  if (activation) used.add(activation.id);
  const main = pick((d) => tags.some((t) => d.tags.includes(t)), used);
  if (main) used.add(main.id);
  const secondary = pick((d) => tags.some((t) => d.tags.includes(t)), used)
    ?? pick((d) => d.tags.includes('Táctica'), used);
  if (secondary) used.add(secondary.id);
  const game = pick((d) => d.tags.includes('Posesión') || d.tags.includes('Ataque'), used);
  if (game) used.add(game.id);
  const finish = pick((d) => d.tags.includes('Finalización'), used);
  if (finish) used.add(finish.id);
  const cooldown = drills.find((d) => /vuelta a la calma/i.test(d.name));

  // Reparto proporcional del tiempo: la parte principal siempre manda.
  const total = brief.duration;
  const share = (p: number) => Math.max(5, Math.round((total * p) / 5) * 5);
  const plan: { drill?: Drill; title: string; minutes: number; series?: string; notes?: string }[] = [
    { drill: warmup, title: warmup?.name ?? 'Calentamiento y activación', minutes: share(0.11) },
    { drill: activation, title: activation?.name ?? 'Rondo de activación', minutes: share(0.14), series: "3 x 4′ / 60″ desc." },
    { drill: main, title: main?.name ?? `Ejercicio principal — ${label}`, minutes: share(0.23), series: "4 x 4′ / 90″ desc.", notes: `Foco: ${label}.` },
    { drill: secondary, title: secondary?.name ?? 'Situación de juego aplicada', minutes: share(0.18), series: "3 x 5′ / 90″ desc." },
    { drill: game, title: game?.name ?? 'Juego reducido', minutes: share(0.20), series: "3 x 6′ / 2′ desc." },
    { drill: finish ?? cooldown, title: (finish ?? cooldown)?.name ?? 'Vuelta a la calma', minutes: share(0.09) },
  ];
  if (cooldown && plan[plan.length - 1].drill?.id !== cooldown.id) {
    plan.push({ drill: cooldown, title: cooldown.name, minutes: 8 });
  }

  // Ajuste fino para cuadrar con la duración pedida. El bloque principal
  // (índice 2) queda intacto: es el que da sentido a la sesión y debe seguir
  // siendo el más largo. Se reparte el desajuste por el resto.
  let diff = total - plan.reduce((a, b) => a + b.minutes, 0);
  const adjustable = [4, 3, 1, 5, 6].filter((i) => i < plan.length);
  for (let pass = 0; pass < 6 && diff !== 0; pass++) {
    for (const i of adjustable) {
      if (diff === 0) break;
      const step = diff > 0 ? Math.min(5, diff) : Math.max(-5, diff);
      if (plan[i].minutes + step >= 5 && plan[i].minutes + step <= plan[2].minutes) {
        plan[i].minutes += step;
        diff -= step;
      }
    }
  }
  if (diff !== 0) plan[2].minutes = Math.max(5, plan[2].minutes + diff);

  const blocks: SessionBlock[] = plan.map((p, idx) => ({
    id: uid('blk'),
    drillId: p.drill?.id,
    title: p.title,
    duration: p.minutes,
    tags: p.drill?.tags ?? (idx === 0 ? ['Calentamiento'] : tags),
    series: p.series,
    notes: p.notes,
  }));

  // El material llega de varios ejercicios: se deduplica ignorando mayúsculas,
  // acentos y plurales para no listar «Portería» y «Porterías» por separado.
  const materialKey = (m: string) =>
    m.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/s$/, '');
  const material: string[] = [];
  const seenMaterial = new Set<string>();
  [...brief.material, ...plan.flatMap((p) => p.drill?.material ?? [])].forEach((m) => {
    const key = materialKey(m);
    if (!key || seenMaterial.has(key)) return;
    seenMaterial.add(key);
    material.push(m);
  });

  return {
    id: uid('ses'),
    teamId: brief.teamId,
    title: `${label.charAt(0).toUpperCase() + label.slice(1)} — ${brief.duration}′`,
    date: brief.date ?? toISODate(today()),
    start: brief.start ?? '19:00',
    duration: blocks.reduce((a, b) => a + b.duration, 0),
    venue: 'Campo Municipal',
    objective:
      brief.objective.length > 45
        ? brief.objective
        : `Mejorar ${label} en situaciones de juego real.`,
    expectedPlayers: brief.players,
    material,
    notes: `Sesión propuesta por FFSP Assistant · nivel ${brief.level.toLowerCase()}. Revísala y ajústala antes de guardarla.`,
    blocks,
    status: 'borrador',
    generatedByAI: true,
  };
}

/* ─────────────────────── Consultas sobre datos reales ────────────────────── */

function attendanceReport(ctx: AIContext, lastN = 5) {
  const { data, teamId } = ctx;
  const records = data.attendance
    .filter((a) => a.teamId === teamId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, lastN);
  const squad = data.players.filter((p) => p.teamId === teamId);

  const rows = squad
    .map((p) => {
      const marks = records.map((r) => r.marks[p.id]?.mark ?? 'pendiente');
      const present = marks.filter((m) => m === 'presente').length;
      const missed = marks.filter((m) => m === 'ausente').length;
      return { player: p.shortName, missed, pct: pct(present, records.length || 1) };
    })
    .sort((a, b) => b.missed - a.missed || a.pct - b.pct);

  return { rows, sessions: records.length };
}

function callupDraft(ctx: AIContext) {
  const { data, teamId } = ctx;
  const match = data.matches
    .filter((m) => m.teamId === teamId && m.status === 'programado')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const squad = data.players.filter((p) => p.teamId === teamId);
  const report = attendanceReport(ctx, 5);

  const excluded = squad
    .filter((p) => p.availability.status !== 'disponible' && p.availability.status !== 'duda')
    .map((p) => ({ playerId: p.id, reason: `${labelStatus(p.availability.status)} — ${p.availability.note ?? 'sin detalle'}` }));

  const excludedIds = new Set(excluded.map((e) => e.playerId));
  const orderByLine: Player['position'][] = [
    'Portero', 'Lateral derecho', 'Central', 'Lateral izquierdo', 'Pivote',
    'Interior', 'Mediapunta', 'Extremo derecho', 'Extremo izquierdo', 'Delantero',
  ];

  // Se cubre cada línea antes de completar plazas: criterio de convocatoria real.
  const available = squad.filter((p) => !excludedIds.has(p.id));
  const byPosition = new Map<string, Player[]>();
  available.forEach((p) => {
    byPosition.set(p.position, [...(byPosition.get(p.position) ?? []), p]);
  });

  const scoreOf = (p: Player) => report.rows.find((r) => r.player === p.shortName)?.pct ?? 100;
  const suggested: string[] = [];
  const quota: Record<string, number> = {
    Portero: 2, 'Lateral derecho': 2, Central: 3, 'Lateral izquierdo': 2, Pivote: 2,
    Interior: 2, Mediapunta: 1, 'Extremo derecho': 1, 'Extremo izquierdo': 1, Delantero: 2,
  };
  orderByLine.forEach((pos) => {
    const group = (byPosition.get(pos) ?? []).sort((a, b) => scoreOf(b) - scoreOf(a));
    suggested.push(...group.slice(0, quota[pos] ?? 1).map((p) => p.id));
  });
  const rest = available.filter((p) => !suggested.includes(p.id)).sort((a, b) => scoreOf(b) - scoreOf(a));
  while (suggested.length < 16 && rest.length) suggested.push(rest.shift()!.id);

  return { match, suggested: suggested.slice(0, 16), excluded };
}

const labelStatus = (s: Player['availability']['status']) =>
  ({ disponible: 'Disponible', lesionado: 'Lesionado', enfermo: 'Enfermo', ausente: 'Ausente', sancionado: 'Sancionado', duda: 'Duda' }[s]);

/* ────────────────────────── Detección de intención ───────────────────────── */

export function detectIntent(input: string): AssistantIntent {
  const t = input.toLowerCase();
  if (/convocat/.test(t)) return 'convocatoria';
  if (/whatsapp|mensaje|escribe|avisa|comunica|padres|familias/.test(t)) return 'mensaje';
  if (/falta|asisten|ausen|quien viene|quién viene|no ha venido/.test(t)) return 'consulta-asistencia';
  if (/evolucion|evolución|progres|rendimiento|c[oó]mo est[aá]/.test(t)) return 'evolucion';
  if (/resum|semana|qu[eé] tengo/.test(t)) return 'resumen';
  if (/entrena|sesi[oó]n|prep[aá]rame|planific|ejercici/.test(t)) return 'plan-sesion';
  return 'general';
}

/* ────────────────────────────── Motor principal ──────────────────────────── */

const now = () => new Date().toISOString();

function localProvider(input: string, ctx: AIContext): AssistantMessage {
  const intent = detectIntent(input);
  const team = ctx.data.teams.find((t) => t.id === ctx.teamId);
  const teamName = team?.name ?? 'tu equipo';

  switch (intent) {
    case 'plan-sesion': {
      const mins = Number(input.match(/(\d{2,3})\s*(?:min|minutos|′|')/i)?.[1] ?? 90);
      const objective =
        input.match(/(?:centrado en|sobre|para trabajar|de)\s+([^.,;]{4,60})/i)?.[1]?.trim() ?? 'presión tras pérdida';
      const session = generateSession(
        {
          teamId: ctx.teamId,
          objective,
          duration: Math.min(Math.max(mins, 45), 120),
          players: Number(input.match(/(\d{1,2})\s*jugador/i)?.[1] ?? ctx.data.players.filter((p) => p.teamId === ctx.teamId).length),
          level: 'Desarrollo',
          material: ['Balones', 'Conos', 'Petos'],
        },
        ctx.data.drills,
      );
      return {
        id: uid('m'), role: 'assistant', intent, at: now(),
        text:
          `He preparado una sesión de ${session.duration} minutos para ${teamName} centrada en ${objective}. ` +
          `Son ${session.blocks.length} bloques con progresión de carga y ${session.material.length} elementos de material. ` +
          'Revísala antes de guardarla: puedes cambiar cualquier bloque en el constructor.',
        card: { type: 'session', session },
        actions: [
          { id: uid('a'), label: 'Guardar entrenamiento', kind: 'guardar-sesion', payload: session },
          { id: uid('a'), label: 'Editar en el constructor', kind: 'editar', payload: session },
          { id: uid('a'), label: 'Regenerar', kind: 'regenerar' },
          { id: uid('a'), label: 'Compartir con otro entrenador', kind: 'compartir' },
        ],
      };
    }

    case 'consulta-asistencia': {
      const n = Number(input.match(/[uú]ltimos?\s+(\d+)/i)?.[1] ?? 5);
      const { rows, sessions } = attendanceReport(ctx, n);
      const problem = rows.filter((r) => r.missed > 0).slice(0, 6);
      return {
        id: uid('m'), role: 'assistant', intent, at: now(),
        text: problem.length
          ? `En los últimos ${sessions} entrenamientos del ${teamName}, ${problem.length} jugadores han faltado alguna vez. ` +
            `${problem[0].player} es quien más ausencias acumula (${problem[0].missed}). Estos son los datos registrados:`
          : `En los últimos ${sessions} entrenamientos del ${teamName} no hay ausencias sin justificar. Asistencia impecable.`,
        card: { type: 'attendance', rows: (problem.length ? problem : rows.slice(0, 6)) },
        actions: [
          { id: uid('a'), label: 'Abrir asistencia', kind: 'abrir', payload: '/app/asistencia' },
          { id: uid('a'), label: 'Escribir a los que faltan', kind: 'editar' },
        ],
      };
    }

    case 'convocatoria': {
      const { match, suggested, excluded } = callupDraft(ctx);
      if (!match) {
        return {
          id: uid('m'), role: 'assistant', intent, at: now(),
          text: `No hay ningún partido programado para el ${teamName}. Crea primero el partido y te preparo la convocatoria.`,
          actions: [{ id: uid('a'), label: 'Crear partido', kind: 'abrir', payload: '/app/partidos' }],
        };
      }
      return {
        id: uid('m'), role: 'assistant', intent, at: now(),
        text:
          `Borrador de convocatoria para ${match.home ? `Santa Ponsa CF vs ${match.opponent}` : `${match.opponent} vs Santa Ponsa CF`} ` +
          `(${longDate(match.date)}, ${match.start}). He propuesto ${suggested.length} jugadores cubriendo todas las líneas y ` +
          `he dejado fuera a ${excluded.length} por disponibilidad. Nada se envía hasta que lo confirmes.`,
        card: { type: 'callup', matchId: match.id, suggested, excluded },
        actions: [
          { id: uid('a'), label: 'Abrir convocatoria', kind: 'abrir', payload: `/app/partidos/${match.id}` },
          { id: uid('a'), label: 'Revisar y enviar', kind: 'enviar-whatsapp', payload: match.id },
        ],
      };
    }

    case 'mensaje': {
      const nextMatch = ctx.data.matches
        .filter((m) => m.teamId === ctx.teamId && m.status === 'programado')
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      const draft = nextMatch
        ? [
            `Hola familias del ${teamName} 👋`,
            '',
            `Os recordamos el próximo partido:`,
            `⚽ ${nextMatch.home ? `Santa Ponsa CF vs ${nextMatch.opponent}` : `${nextMatch.opponent} vs Santa Ponsa CF`}`,
            `📅 ${longDate(nextMatch.date)}`,
            `🕐 ${nextMatch.start}`,
            `📍 ${nextMatch.venue}`,
            '',
            'La citación es 1 hora antes en los vestuarios. Recordad traer la equipación completa y botella individual.',
            '',
            'Gracias y buen fin de semana ⚽',
          ].join('\n')
        : `Hola familias del ${teamName} 👋\n\nOs escribimos para recordaros los horarios de esta semana.\n\nGracias.`;
      return {
        id: uid('m'), role: 'assistant', intent, at: now(),
        text: 'Este mensaje está listo para enviar. Revísalo antes: nada sale de la plataforma sin tu confirmación.',
        card: { type: 'message', draft, teamId: ctx.teamId, kind: 'info-partido' },
        actions: [
          { id: uid('a'), label: 'Editar mensaje', kind: 'editar', payload: draft },
          { id: uid('a'), label: 'Enviar por WhatsApp', kind: 'enviar-whatsapp', payload: draft },
        ],
      };
    }

    case 'evolucion':
    case 'resumen': {
      const squad = ctx.data.players.filter((p) => p.teamId === ctx.teamId);
      const { rows, sessions } = attendanceReport(ctx, 5);
      const avg = Math.round(rows.reduce((a, r) => a + r.pct, 0) / (rows.length || 1));
      const injured = squad.filter((p) => p.availability.status === 'lesionado');
      const nextSession = ctx.data.sessions
        .filter((s) => s.teamId === ctx.teamId && s.date >= toISODate(today()))
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      const nextMatch = ctx.data.matches
        .filter((m) => m.teamId === ctx.teamId && m.status === 'programado')
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      const callup = nextMatch ? ctx.data.callups.find((c) => c.matchId === nextMatch.id) : undefined;
      const pending = callup?.entries.filter((e) => e.selected && e.response === 'pendiente').length ?? 0;

      const bullets = [
        `Asistencia media del ${teamName}: ${avg} % en los últimos ${sessions} entrenamientos.`,
        nextSession
          ? `Próximo entrenamiento: ${relativeDay(nextSession.date).toLowerCase()} a las ${nextSession.start} — ${nextSession.title}.`
          : 'No hay entrenamientos planificados esta semana.',
        nextMatch
          ? `Próximo partido: ${nextMatch.opponent}, ${relativeDay(nextMatch.date).toLowerCase()} a las ${nextMatch.start}.`
          : 'No hay partido programado.',
        pending ? `Quedan ${pending} confirmaciones pendientes en la convocatoria.` : 'La convocatoria está completa.',
        injured.length
          ? `${injured.length} jugador(es) en la enfermería: ${injured.map((p) => p.shortName).join(', ')}.`
          : 'Plantilla sin lesionados.',
        `Los tres jugadores con mejor asistencia: ${[...rows].sort((a, b) => b.pct - a.pct).slice(0, 3).map((r) => r.player).join(', ')}.`,
      ];
      return {
        id: uid('m'), role: 'assistant', intent, at: now(),
        text: `Este es el estado del ${teamName} ahora mismo:`,
        card: { type: 'summary', bullets },
        actions: [
          { id: uid('a'), label: 'Ver estadísticas', kind: 'abrir', payload: '/app/estadisticas' },
          { id: uid('a'), label: 'Enviar resumen al cuerpo técnico', kind: 'compartir' },
        ],
      };
    }

    default:
      return {
        id: uid('m'), role: 'assistant', intent: 'general', at: now(),
        text:
          'Puedo ayudarte con la gestión diaria del equipo. Pídeme, por ejemplo:\n\n' +
          '• «Prepárame un entrenamiento de 90 minutos centrado en presión tras pérdida»\n' +
          '• «¿Quién ha faltado a los últimos 5 entrenamientos?»\n' +
          '• «Prepara la convocatoria del sábado»\n' +
          '• «Escribe un WhatsApp para las familias»\n' +
          '• «Resume la semana de mi equipo»',
      };
  }
}

export const ai = {
  /** Proveedor activo. Cambiar a `remote` cuando exista API configurada. */
  provider: 'local' as 'local' | 'remote',

  isConnected: () => false,

  async ask(input: string, ctx: AIContext): Promise<AssistantMessage> {
    // La latencia simulada mantiene honesta la UX de "pensando…".
    await new Promise((r) => setTimeout(r, 850 + Math.random() * 500));
    return localProvider(input, ctx);
  },

  generateSession,
};
