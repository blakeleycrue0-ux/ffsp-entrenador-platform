/**
 * Menú "+ Crear" — el atajo más importante del producto.
 * Cada opción lleva directamente al flujo, sin pantallas intermedias.
 */

import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Dumbbell, MessageSquarePlus, Sparkles, Swords, UserSquare2, Users } from 'lucide-react';
import { Modal } from '@/components/ui';

const OPTIONS = [
  { icon: UserSquare2, label: 'Entrenamiento', hint: 'Crea la sesión desde cero o con el constructor', to: '/app/planificaciones/nuevo' },
  { icon: Sparkles, label: 'Entrenamiento con IA', hint: 'Describe el objetivo y te la genera', to: '/app/planificaciones/nuevo?ia=1', highlight: true },
  { icon: Swords, label: 'Partido', hint: 'Rival, competición, campo y horario', to: '/app/partidos/nuevo' },
  { icon: Users, label: 'Jugadora', hint: 'Añádela a la plantilla de tu equipo', to: '/app/jugadoras/nueva' },
  { icon: MessageSquarePlus, label: 'Mensaje', hint: 'Equipo, individual o desde plantilla', to: '/app/mensajes/nuevo' },
  { icon: Dumbbell, label: 'Ejercicio', hint: 'Añádelo a la biblioteca del club', to: '/app/ejercicios/nuevo' },
  { icon: CalendarPlus, label: 'Evento', hint: 'Reunión, charla o cualquier cita', to: '/app/calendario' },
];

export function CreateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <Modal open={open} onClose={onClose} title="¿Qué quieres crear?" subtitle="Elige y te llevamos directamente al flujo.">
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.label}
              onClick={() => {
                navigate(o.to);
                onClose();
              }}
              className="group flex items-start gap-3 rounded-xl border border-ink-200 p-3.5 text-left transition-all duration-150 hover:-translate-y-px hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-card"
            >
              <span
                className={
                  'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ' +
                  (o.highlight
                    ? 'bg-brand-700 text-white'
                    : 'bg-brand-50 text-brand-700 group-hover:bg-brand-100')
                }
              >
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-medium text-ink-900">{o.label}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-500">{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
