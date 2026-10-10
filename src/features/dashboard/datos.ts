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
import type { Match, TrainingSession } from '@/types';

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

  return {
    data,
    loading,
    loadError,
    actions,
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
