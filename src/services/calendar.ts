/**
 * Servicio de calendario.
 * ---------------------------------------------------------------------------
 * Construye la agenda unificada de la entrenadora (entrenamientos + partidos +
 * convocatorias) y exporta a iCalendar. La sincronización bidireccional con
 * Google Calendar / Apple Calendar se conectará sobre `subscribeUrl()`.
 */

import type { CalendarEvent, ClubData } from '@/types';
import { addMinutes } from '@/lib/utils';

export function buildEvents(data: ClubData, teamIds: string[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const teamName = (id: string) => data.teams.find((t) => t.id === id)?.name ?? '';

  data.sessions
    .filter((s) => teamIds.includes(s.teamId))
    .forEach((s) =>
      events.push({
        id: `ev_s_${s.id}`, kind: 'entrenamiento', title: s.title, subtitle: teamName(s.teamId),
        teamId: s.teamId, date: s.date, start: s.start, end: addMinutes(s.start, s.duration),
        venue: s.venue, refId: s.id,
      }),
    );

  data.matches
    .filter((m) => teamIds.includes(m.teamId))
    .forEach((m) =>
      events.push({
        id: `ev_m_${m.id}`, kind: 'partido',
        title: m.home ? `Santa Ponsa CF vs ${m.opponent}` : `${m.opponent} vs Santa Ponsa CF`,
        subtitle: `${teamName(m.teamId)} · ${m.competition}`, teamId: m.teamId, date: m.date,
        start: m.start, end: addMinutes(m.start, 110), venue: m.venue, refId: m.id,
      }),
    );

  data.callups
    .filter((c) => teamIds.includes(c.teamId) && c.status === 'borrador')
    .forEach((c) => {
      const match = data.matches.find((m) => m.id === c.matchId);
      if (!match) return;
      events.push({
        id: `ev_c_${c.id}`, kind: 'convocatoria', title: `Cerrar convocatoria — ${match.opponent}`,
        subtitle: teamName(c.teamId), teamId: c.teamId, date: match.date, start: '09:00',
        refId: c.id,
      });
    });

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

/* ────────────────────────────── Exportación .ics ─────────────────────────── */

const icsDate = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

export function toICS(events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FFSP//Santa Ponsa CF//ES',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:FFSP — Santa Ponsa CF',
  ];
  events.forEach((e) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@ffsp.santaponsacf`,
      `DTSTART:${icsDate(e.date, e.start)}`,
      `DTEND:${icsDate(e.date, e.end ?? addMinutes(e.start, 90))}`,
      `SUMMARY:${e.title}`,
      `DESCRIPTION:${e.subtitle ?? ''}`,
      `LOCATION:${e.venue ?? ''}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(events: CalendarEvent[], filename = 'ffsp-vle.ics'): void {
  const blob = new Blob([toICS(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Punto de extensión: URL de suscripción cuando exista backend. */
export const subscribeUrl = () => null;
