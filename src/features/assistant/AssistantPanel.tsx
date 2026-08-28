/**
 * FFSP Assistant — el asistente personal del entrenador.
 * ---------------------------------------------------------------------------
 * No es un chat genérico: cada respuesta llega con una tarjeta accionable
 * (sesión, tabla de asistencia, convocatoria, borrador de mensaje) y con
 * acciones que operan sobre los datos reales del club.
 *
 * Regla inviolable: la comunicación externa nunca se envía sola. El asistente
 * prepara el borrador; el envío es siempre una decisión explícita del
 * entrenador desde la vista previa.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp, CalendarCheck2, ClipboardList, Info, MessageSquare, Send, Sparkles, Users,
} from 'lucide-react';
import type { AssistantAction, AssistantMessage } from '@/types';
import { ai } from '@/services/ai';
import { useClub } from '@/store/store';
import { currentStaff, teamById } from '@/store/selectors';
import { useToast } from '@/components/ui/Toast';
import { Badge, Button } from '@/components/ui';
import { Crest } from '@/components/ui/Brand';
import { cn, minutesToLabel, uid } from '@/lib/utils';

const SUGGESTIONS = [
  { icon: ClipboardList, text: 'Prepárame el entrenamiento de hoy' },
  { icon: Users, text: '¿Quién falta habitualmente?' },
  { icon: CalendarCheck2, text: 'Prepara la convocatoria del sábado' },
  { icon: MessageSquare, text: 'Escribe un WhatsApp para los padres' },
  { icon: Sparkles, text: 'Resume la semana de mi equipo' },
];

export function AssistantPanel({ variant = 'drawer' }: { variant?: 'drawer' | 'page' }) {
  const { data, session, teamId, dispatch, log } = useClub();
  const toast = useToast();
  const navigate = useNavigate();
  const staff = currentStaff(data, session?.staffId);
  const team = teamById(data, teamId);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const ask = async (text: string) => {
    if (!text.trim() || busy) return;
    setLastPrompt(text);
    setMessages((m) => [...m, { id: uid('m'), role: 'user', text, at: new Date().toISOString() }]);
    setInput('');
    setBusy(true);
    const reply = await ai.ask(text, { data, teamId, staffName: staff?.name ?? '' });
    setMessages((m) => [...m, reply]);
    setBusy(false);
  };

  const runAction = (action: AssistantAction, msg: AssistantMessage) => {
    switch (action.kind) {
      case 'guardar-sesion': {
        if (msg.card?.type !== 'session') return;
        const s = { ...msg.card.session, status: 'planificado' as const };
        dispatch({ type: 'session/upsert', session: s });
        log({ kind: 'sesion', text: `Has guardado «${s.title}» generado por el asistente.`, link: `/app/planificaciones/${s.id}` });
        toast.success('Entrenamiento guardado correctamente', 'Ya aparece en tus planificaciones.', {
          label: 'Abrir entrenamiento',
          onClick: () => navigate(`/app/planificaciones/${s.id}`),
        });
        break;
      }
      case 'editar': {
        if (msg.card?.type === 'session') {
          dispatch({ type: 'session/upsert', session: msg.card.session });
          navigate(`/app/planificaciones/${msg.card.session.id}/editar`);
        } else if (msg.card?.type === 'message') {
          navigate('/app/mensajes/nuevo', { state: { draft: msg.card.draft, teamId: msg.card.teamId } });
        } else {
          navigate('/app/mensajes/nuevo');
        }
        break;
      }
      case 'enviar-whatsapp': {
        if (msg.card?.type === 'message') {
          navigate('/app/mensajes/nuevo', { state: { draft: msg.card.draft, teamId: msg.card.teamId, preview: true } });
        } else if (msg.card?.type === 'callup') {
          navigate(`/app/partidos/${msg.card.matchId}`);
        } else {
          navigate('/app/mensajes');
        }
        break;
      }
      case 'abrir':
        navigate(String(action.payload ?? '/app'));
        break;
      case 'regenerar':
        ask(lastPrompt);
        break;
      case 'compartir':
        toast.info(
          'Preparado para compartir',
          'Se abrirá el mensaje con el cuerpo técnico cuando WhatsApp esté conectado.',
        );
        break;
    }
  };

  const isPage = variant === 'page';

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', isPage && 'h-[calc(100vh-190px)]')}>
      {/* Conversación */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-6 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50">
              <Crest size={38} />
            </div>
            <h3 className="text-[19px] font-semibold text-ink-900">¿Qué necesitas preparar hoy?</h3>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-500">
              Conozco a tu {team?.name ?? 'equipo'}: asistencias, lesiones, posiciones y calendario. Pídeme lo que
              harías a mano y te lo dejo listo para revisar.
            </p>

            <div className="mt-6 space-y-2 text-left">
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.text}
                    onClick={() => ask(s.text)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-left transition-all hover:-translate-y-px hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-card"
                  >
                    <Icon size={17} className="shrink-0 text-brand-500" />
                    <span className="flex-1 text-[13.5px] text-ink-700 group-hover:text-brand-800">{s.text}</span>
                    <ArrowUp size={14} className="rotate-45 text-ink-300 transition-colors group-hover:text-brand-500" />
                  </button>
                );
              })}
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-400">
              <Info size={13} />
              Motor de demostración local · sin modelo externo conectado
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onAction={(a) => runAction(a, m)} />
            ))}
            {busy && <Thinking />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Entrada */}
      <div className="border-t border-ink-200/80 bg-white px-4 py-3 sm:px-5">
        <div className="mx-auto max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-2 transition-colors focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              rows={1}
              placeholder="Escribe lo que necesitas…"
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2.5 text-[14px] leading-snug text-ink-900 outline-none placeholder:text-ink-400"
            />
            <Button type="submit" size="sm" disabled={!input.trim() || busy} icon={<Send size={15} />} className="mb-0.5">
              <span className="sr-only sm:not-sr-only">Enviar</span>
            </Button>
          </form>
          <p className="mt-2 px-1 text-[11.5px] text-ink-400">
            Ejemplo: «Prepárame un entrenamiento de 90 min de presión tras pérdida». El asistente nunca envía nada por
            su cuenta: siempre verás una vista previa antes.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── Burbujas ────────────────────────────────── */

function Thinking() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50">
        <Sparkles size={15} className="text-brand-600" />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-ink-100 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400"
            style={{ animationDelay: `${i * 140}ms`, animationDuration: '1s' }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, onAction }: { message: AssistantMessage; onAction: (a: AssistantAction) => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-[14px] leading-relaxed text-white">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50">
        <Sparkles size={15} className="text-brand-600" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="whitespace-pre-line rounded-2xl rounded-tl-md bg-ink-50 px-4 py-3 text-[14px] leading-relaxed text-ink-800">
          {message.text}
        </div>

        {message.card && <AssistantCard card={message.card} />}

        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((a, i) => (
              <Button
                key={a.id}
                size="sm"
                variant={i === 0 ? 'primary' : 'outline'}
                onClick={() => onAction(a)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────── Tarjetas enriquecidas ─────────────────────────── */

function AssistantCard({ card }: { card: NonNullable<AssistantMessage['card']> }) {
  if (card.type === 'session') {
    const s = card.session;
    return (
      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-brand-50/40 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink-900">{s.title}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-500">{s.objective}</p>
          </div>
          <Badge tone="brand" size="sm">{minutesToLabel(s.duration)}</Badge>
        </div>
        <ol className="divide-y divide-ink-100">
          {s.blocks.map((b, i) => (
            <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-100 text-[11px] font-semibold text-ink-500 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-ink-800">{b.title}</span>
                {b.series && <span className="block text-[11.5px] text-ink-400">{b.series}</span>}
              </span>
              <span className="shrink-0 text-[12.5px] font-medium text-ink-500 tabular-nums">{b.duration}′</span>
            </li>
          ))}
        </ol>
        <div className="border-t border-ink-100 bg-ink-50/50 px-4 py-2.5">
          <p className="text-[11.5px] text-ink-500">
            <span className="font-medium text-ink-600">Material:</span> {s.material.join(' · ')}
          </p>
        </div>
      </div>
    );
  }

  if (card.type === 'attendance') {
    return (
      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/60 text-[11.5px] uppercase tracking-wide text-ink-400">
              <th className="px-4 py-2 text-left font-medium">Jugador</th>
              <th className="px-3 py-2 text-right font-medium">Faltas</th>
              <th className="px-4 py-2 text-right font-medium">Asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {card.rows.map((r) => (
              <tr key={r.player}>
                <td className="px-4 py-2.5 text-ink-800">{r.player}</td>
                <td className="px-3 py-2.5 text-right font-medium text-ink-700 tabular-nums">{r.missed}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={cn('font-medium tabular-nums', r.pct >= 80 ? 'text-[#1F6B44]' : r.pct >= 60 ? 'text-[#9A6412]' : 'text-danger')}>
                    {r.pct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (card.type === 'callup') {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Badge tone="success" size="sm">{card.suggested.length} propuestos</Badge>
          <Badge tone="danger" size="sm">{card.excluded.length} no disponibles</Badge>
        </div>
        {card.excluded.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {card.excluded.map((e) => (
              <li key={e.playerId} className="text-[12.5px] text-ink-500">
                • {e.reason}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-ink-400">
          Criterio: cubrir todas las líneas y priorizar la asistencia reciente. Puedes cambiarlo todo antes de enviar.
        </p>
      </div>
    );
  }

  if (card.type === 'message') {
    return (
      <div className="rounded-xl border border-ink-200 bg-[#ECE5DD] p-3">
        <div className="relative rounded-lg rounded-tl-sm bg-white px-3.5 py-3 shadow-sm">
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-800">{card.draft}</p>
          <p className="mt-2 text-right text-[10.5px] text-ink-400">Vista previa · no enviado</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2 rounded-xl border border-ink-200 bg-white p-4">
      {card.bullets.map((b, i) => (
        <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-700">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          {b}
        </li>
      ))}
    </ul>
  );
}
