/**
 * El entrenador IA, en pantalla.
 * ---------------------------------------------------------------------------
 * Una conversación sobre ESTE equipo. Quien contesta es el servidor, que es
 * el único que conoce la clave y el único que decide qué datos del club mirar.
 *
 * DOS COSAS QUE SE DICEN SIN QUE NADIE PREGUNTE, porque callarlas sería
 * venderlo mejor de lo que es:
 *
 *  · QUÉ HA MIRADO. Debajo de cada respuesta va lo que tenía delante —tantas
 *    jugadores, tantas sesiones, tantos partidos—. Una respuesta sobre un
 *    equipo con cero listas pasadas vale menos que una sobre cuarenta, y
 *    quien lee tiene derecho a saber cuál de las dos está leyendo.
 *
 *  · QUÉ NO SABE. En la cabecera: nombres de pila y números, nada médico y
 *    nada de contacto. No es letra pequeña, es lo primero que se lee.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Sparkles } from 'lucide-react';
import {
  Button, EmptyState, PageHeader, Panel, Select, Textarea,
} from '@/components/ui';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import { pregunta, type Turno } from '@/services/entrenador';
import { useAnchura } from '@/components/layout/AppShell';
import { cn } from '@/lib/utils';

/* Para empezar. No son «funciones», son preguntas que de verdad se hacen y que
   se contestan con lo que el servidor manda: asistencia, calendario, sesión. */
const PARA_EMPEZAR = [
  '¿Quién está faltando más a los entrenamientos?',
  '¿Qué tengo esta semana?',
  'Móntame un calentamiento de 15 minutos',
  '¿Con cuántas jugadores cuento para el próximo partido?',
];

export default function EntrenadorPage() {
  useAnchura('tabla');
  const { data, teamId, setTeamId } = useClub();
  const equipos = visibleTeams(data);

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [miro, setMiro] = useState<{ jugadores: number; sesiones: number; partidos: number } | null>(null);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const abajo = useRef<HTMLDivElement>(null);

  useEffect(() => { abajo.current?.scrollIntoView({ behavior: 'smooth' }); }, [turnos, pensando]);

  /* Cambiar de equipo empieza de cero: la conversación anterior hablaba de
     otra plantilla, y seguir tirando de ella daría respuestas sobre el equipo
     equivocado sin que se note. */
  useEffect(() => { setTurnos([]); setMiro(null); setFallo(null); }, [teamId]);

  const enviar = async (dicho: string) => {
    const limpio = dicho.trim();
    if (!limpio || pensando || !teamId) return;

    const conmigo: Turno[] = [...turnos, { role: 'user', content: limpio }];
    setTurnos(conmigo);
    setTexto('');
    setFallo(null);
    setPensando(true);
    try {
      const r = await pregunta(teamId, conmigo);
      setTurnos([...conmigo, { role: 'assistant', content: r.texto }]);
      setMiro(r.miro);
    } catch (e) {
      /* El turno de quien preguntó se queda puesto: borrarlo le haría
         escribirlo otra vez, y lo que falló no fue su pregunta. */
      setFallo(e instanceof Error ? e.message : 'No ha podido contestar.');
    } finally {
      setPensando(false);
    }
  };

  if (equipos.length === 0) {
    return (
      <>
        <PageHeader title="Entrenador" />
        <EmptyState
          title="Primero un equipo"
          description="El asistente habla de un equipo concreto: su plantilla, sus entrenamientos y sus partidos. Sin equipo no hay nada de lo que hablar."
          action={<Link to="/app/equipo-tecnico"><Button>Crear un equipo</Button></Link>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Entrenador"
        description="Pregúntale sobre tu equipo. Mira tu plantilla, tus entrenamientos y tus partidos."
        actions={
          equipos.length > 1 ? (
            <Select value={teamId ?? ''} onChange={(e) => setTeamId(e.target.value)} aria-label="Equipo">
              {equipos.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          ) : undefined
        }
      />

      {/* LO QUE NO SABE, ANTES DE LA PRIMERA PREGUNTA. */}
      <p className="mb-4 text-sm leading-relaxed text-ink-500">
        Ve los <strong className="font-semibold text-ink-700">nombres de pila</strong>, los dorsales y los
        números de asistencia. No ve teléfonos, ni tutores, ni fechas de nacimiento, ni nada médico — y no
        da consejo médico: eso lo ve un profesional sanitario.
      </p>

      <Panel className="flex min-h-[55vh] flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-1">
          {turnos.length === 0 && !pensando && (
            <div className="py-6">
              <div className="mb-4 flex items-center gap-2 text-ink-600">
                <Sparkles size={16} aria-hidden />
                <p className="text-md font-semibold text-ink-900">¿Por dónde empezamos?</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PARA_EMPEZAR.map((p) => (
                  <button
                    key={p}
                    onClick={() => void enviar(p)}
                    className="rounded-2xl border border-line px-3 py-2 text-left text-sm text-ink-700 transition-colors hover:border-ink-300 hover:text-ink-900"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turnos.map((t, i) => (
            <div
              key={i}
              className={cn('flex', t.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-md leading-relaxed',
                  t.role === 'user'
                    ? 'bg-ink-900 text-ink-0'
                    : 'bg-panel text-ink-800',
                )}
              >
                {t.content}
              </div>
            </div>
          ))}

          {pensando && (
            <p className="text-sm text-ink-500" role="status">Mirando tu equipo…</p>
          )}
          {fallo && (
            <p className="text-sm leading-relaxed text-ink-700" role="alert">{fallo}</p>
          )}

          {/* QUÉ MIRÓ. Una respuesta sobre un equipo sin listas vale menos que
              una sobre cuarenta, y eso tiene que verse. */}
          {miro && !pensando && (
            <p className="pt-1 text-xs text-ink-400">
              Ha mirado {miro.jugadores} jugador{miro.jugadores === 1 ? '' : 's'},{' '}
              {miro.sesiones} entrenamiento{miro.sesiones === 1 ? '' : 's'} y{' '}
              {miro.partidos} partido{miro.partidos === 1 ? '' : 's'} de este equipo.
            </p>
          )}
          <div ref={abajo} />
        </div>

        <form
          className="mt-3 flex items-end gap-2 border-t border-line pt-3"
          onSubmit={(e) => { e.preventDefault(); void enviar(texto); }}
        >
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              /* Intro envía, Mayús+Intro hace párrafo: es lo que ya hace todo
                 el mundo sin pensarlo en cualquier chat. */
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(texto); }
            }}
            rows={2}
            placeholder="Pregúntale algo sobre tu equipo…"
            aria-label="Tu pregunta"
            className="min-h-0 flex-1 resize-none"
          />
          <Button type="submit" loading={pensando} disabled={!texto.trim()} icon={<ArrowUp size={16} />}>
            Enviar
          </Button>
        </form>
      </Panel>
    </>
  );
}
