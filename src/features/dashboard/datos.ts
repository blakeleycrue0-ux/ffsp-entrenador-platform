/**
 * Lo que Inicio sabe, en un solo sitio.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Inicio tiene dos composiciones —la del móvil y la del escritorio— y son
 * distintas a propósito: un teléfono que se mira de pie antes de un
 * entrenamiento no pide lo mismo que un portátil abierto en una mesa. Lo que
 * NO puede ser distinto es lo que cuentan. Si cada una hiciera sus cuentas,
 * tarde o temprano una diría 90 % y la otra 89, y entonces no hay forma de
 * saber cuál miente.
 *
 * Aquí se derivan una vez y las dos pintan lo mismo.
 */

import { useMemo } from 'react';
import { useClub } from '@/store/store';
import {
  callupOfMatch, clubShortName, currentStaff, isClubAdmin, nextMatch, nextSession,
  nombreReal, squadOf, summarizeRecord, teamOverview, visibleTeams,
} from '@/store/selectors';
import { relativeDay, toISODate, today } from '@/lib/utils';
import type { CoachTask, Match, TrainingSession } from '@/types';

/**
 * Una cosa que está sin hacer.
 *
 * TODAS SALEN DE UN DATO, nunca de una suposición: una sesión pasada sin
 * ninguna lista guardada, un partido sin convocatoria, una jugadora con el
 * parte abierto. Si no hay dato, no hay pendiente —y entonces Inicio dice que
 * no hay nada pendiente, que también es una respuesta—.
 */
export interface Pendiente {
  clave: string;
  /** Una línea, en palabras de entrenador. */
  texto: string;
  a: string;
  /** Ya tenía que estar hecho. */
  urgente?: boolean;
  /**
   * Si este pendiente es una tarea apuntada a mano, la tarea.
   *
   * Va aquí para que la lista pueda ofrecer tacharla en el sitio —una tarea se
   * cierra con un toque, no abriendo otra pantalla— sin que haya DOS listas de
   * pendientes, una de cosas derivadas y otra de tareas, cada una con su
   * titular.
   */
  tarea?: CoachTask;
}

export function useInicio() {
  const { data, loading, loadError, teamId, setTeamId, actions } = useClub();

  const teams = useMemo(() => visibleTeams(data), [data]);
  const equipo = teams.find((t) => t.id === teamId) ?? teams[0];
  const ambito = equipo ? [equipo.id] : teams.map((t) => t.id);

  const resumen = useMemo(() => (equipo ? teamOverview(data, equipo) : null), [data, equipo]);

  const sesion = nextSession(data, ambito);
  const partido = nextMatch(data, ambito);
  const callup = callupOfMatch(data, partido?.id);
  const plantilla = equipo ? squadOf(data, equipo.id) : [];

  const ultimaLista = useMemo(
    () =>
      data.attendance
        .filter((a) => a.teamId === equipo?.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0],
    [data.attendance, equipo],
  );
  const marcas = useMemo(
    () => summarizeRecord(ultimaLista, plantilla.length),
    [ultimaLista, plantilla.length],
  );

  const convocadas = callup?.entries.filter((e) => e.selected) ?? [];
  const confirmadas = convocadas.filter((e) => e.response === 'confirmada').length;

  /**
   * QUÉ TOCA ANTES. Se compara fecha y hora como texto porque las dos están
   * en formato ISO y «2026-10-11 09:00» ordena igual leyéndose que
   * convirtiéndolo a fecha, sin pasar por la zona horaria del navegador.
   */
  const cuando = (x: { date: string; start: string }) => `${x.date} ${x.start}`;
  const primeroEsSesion = !!sesion && (!partido || cuando(sesion) <= cuando(partido));
  const siguiente: { tipo: 'sesion'; dato: TrainingSession } | { tipo: 'partido'; dato: Match } | null =
    primeroEsSesion && sesion
      ? { tipo: 'sesion', dato: sesion }
      : partido
        ? { tipo: 'partido', dato: partido }
        : null;

  /**
   * LO QUE ESTÁ SIN HACER, que es la segunda pregunta de Inicio.
   *
   * Antes esta pregunta no tenía respuesta en ningún sitio: lo pendiente estaba
   * repartido en cuatro cifras —«No disponibles · revisar», «Convocatoria · sin
   * crear»— que hay que saber interpretar, y las listas sin pasar no aparecían
   * en ninguna parte. Aquí se juntan en una lista de frases, cada una con su
   * sitio al que ir.
   *
   * El orden es el del apremio, no el de la base de datos: primero lo que ya
   * tenía que estar hecho.
   */
  const pendientes = useMemo<Pendiente[]>(() => {
    if (!equipo) return [];
    const hoy = toISODate(today());
    const lista: Pendiente[] = [];

    /* 1. LISTAS SIN PASAR. Una sesión que ya ocurrió y de la que no hay ni una
          marca guardada. Es el dato que alimenta todo lo demás, así que
          perderlo es perder la temporada. Las tres más recientes: con más, la
          lista se convierte en otra pantalla. */
    data.sessions
      .filter((s) => s.teamId === equipo.id && s.date < hoy)
      .filter((s) => !data.attendance.some((a) => a.sessionId === s.id))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .forEach((s) => lista.push({
        clave: `lista-${s.id}`,
        texto: `Falta pasar lista del ${relativeDay(s.date).toLowerCase()}`,
        a: `/app/entrenamientos/${s.id}/asistencia`,
        urgente: true,
      }));

    /* 2. LA CONVOCATORIA DEL PRÓXIMO PARTIDO. Sin crear, o creada y esperando
          respuestas de las familias. */
    if (partido) {
      if (!callup) {
        lista.push({
          clave: 'convocatoria',
          texto: `El partido ${relativeDay(partido.date).toLowerCase()} no tiene convocatoria`,
          a: `/app/partidos/${partido.id}`,
        });
      } else {
        const sinContestar = convocadas.filter((e) => e.response === 'pendiente').length;
        if (sinContestar > 0) {
          lista.push({
            clave: 'respuestas',
            texto: sinContestar === 1
              ? 'Falta 1 respuesta de la convocatoria'
              : `Faltan ${sinContestar} respuestas de la convocatoria`,
            a: `/app/partidos/${partido.id}`,
          });
        }
      }
    }

    /* 3. EL PRÓXIMO ENTRENAMIENTO, SIN MONTAR. Ahora se apuntan vacíos a
          propósito —el hueco primero, los ejercicios el día antes—, así que
          esto es el recordatorio de la segunda mitad del trabajo. Sólo si es
          dentro de una semana: avisar en octubre del de marzo no es ayudar. */
    if (sesion && sesion.blocks.length === 0 && sesion.date <= toISODate(new Date(Date.now() + 7 * 864e5))) {
      lista.push({
        clave: `montar-${sesion.id}`,
        texto: `El entrenamiento ${relativeDay(sesion.date).toLowerCase()} está sin montar`,
        a: `/app/entrenamientos/${sesion.id}`,
      });
    }

    /* 4. QUIÉN NO ESTÁ. Un número suelto no dice qué hacer; la frase sí. */
    const fuera = resumen?.unavailable ?? 0;
    if (fuera > 0) {
      lista.push({
        clave: 'disponibilidad',
        texto: fuera === 1 ? '1 jugadora no está disponible' : `${fuera} jugadoras no están disponibles`,
        a: '/app/disponibilidad',
      });
    }

    /* 5. Y las tareas que se haya apuntado ella misma. */
    data.tasks.filter((t) => !t.done).slice(0, 4).forEach((t) => lista.push({
      clave: `tarea-${t.id}`,
      texto: t.title,
      a: t.link ?? '/app',
      urgente: !!t.dueDate && t.dueDate < hoy,
      tarea: t,
    }));

    return lista;
  }, [data.sessions, data.attendance, data.tasks, equipo, partido, callup, convocadas, sesion, resumen]);

  return {
    data,
    loading,
    loadError,
    actions,
    pendientes,
    setTeamId,
    teams,
    equipo,
    resumen,
    sesion,
    partido,
    siguiente,
    callup,
    convocadas,
    confirmadas,
    plantilla,
    ultimaLista,
    marcas,
    tareasAbiertas: data.tasks.filter((t) => !t.done),
    admin: isClubAdmin(data),
    nombreClub: clubShortName(data),
    /* Saludar con «Hola, marta.vives@gmail.com» es peor que no saludar con
       nombre. Qué cuenta como nombre de verdad lo decide `nombreReal`. */
    nombre: nombreReal(currentStaff(data))?.split(' ')[0] ?? '',
  };
}

export type DatosDeInicio = ReturnType<typeof useInicio>;
