/**
 * Menú "+ Crear" — el atajo más importante del producto.
 * Cada opción lleva directamente al flujo, sin pantallas intermedias.
 */

import { useNavigate } from 'react-router-dom';
import { CalendarPlus, ClipboardList, Dumbbell, LayoutGrid, Swords, Users } from 'lucide-react';
import { Modal } from '@/components/ui';

const OPTIONS = [
  { icon: ClipboardList, label: 'Entrenamiento', hint: 'Monta la sesión con tus ejercicios', to: '/app/entrenamientos/nuevo' },
  { icon: Swords, label: 'Partido', hint: 'Rival, competición, campo y horario', to: '/app/partidos/nuevo' },
  { icon: Users, label: 'Jugadora', hint: 'Añádela a la plantilla de tu equipo', to: '/app/plantilla/nueva' },
  { icon: LayoutGrid, label: 'Jugada', hint: 'Dibújala y anímala en la pizarra', to: '/app/pizarra' },
  { icon: Dumbbell, label: 'Ejercicio', hint: 'Añádelo a la biblioteca del club', to: '/app/ejercicios/nuevo' },
  { icon: CalendarPlus, label: 'Evento', hint: 'Reunión, charla o cualquier cita', to: '/app/calendario' },
];

export function CreateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <Modal open={open} onClose={onClose} title="¿Qué quieres crear?" description="Elige y te llevamos directamente al flujo.">
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
              className="flex items-start gap-2.5 rounded-md border border-line p-3 text-left transition-colors hover:border-ink-400"
            >
              <Icon size={16} className="mt-0.5 shrink-0 text-ink-400" />
              <span className="min-w-0">
                <span className="block text-base font-medium text-ink-900">{o.label}</span>
                <span className="mt-0.5 block text-sm leading-snug text-muted">{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
