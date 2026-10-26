/**
 * Menú "+ Crear" — el atajo más importante del producto.
 * Cada opción lleva directamente al flujo, sin pantallas intermedias.
 *
 * Y ESO INCLUYE QUE NINGUNA LLEVE A DONDE NO SE PUEDE CREAR. Había una,
 * «Evento», que traía al calendario; y el calendario tenía un botón «Nuevo
 * evento» que sólo enseñaba un aviso diciendo que el evento se añade desde
 * «Crear». Era un círculo cerrado: dos pantallas mandándose la una a la otra y
 * ningún sitio donde escribir nada. En su lugar va lo que de verdad hacía
 * falta —meter muchos entrenamientos de una vez—, que abre la hoja de importar
 * del calendario con el parámetro de la dirección.
 */

import { useNavigate } from 'react-router-dom';
import { CalendarRange, ClipboardList, Dumbbell, Swords, Users } from 'lucide-react';
import { Modal } from '@/components/ui';

const OPTIONS = [
  { icon: ClipboardList, label: 'Entrenamiento', hint: 'Monta la sesión con tus ejercicios', to: '/app/entrenamientos/nuevo' },
  { icon: CalendarRange, label: 'Varios entrenamientos', hint: 'Marca los días que entrenáis y entran todos', to: '/app/calendario?varios=1' },
  { icon: Swords, label: 'Partido', hint: 'Rival, competición, campo y horario', to: '/app/partidos/nuevo' },
  { icon: Users, label: 'Jugador', hint: 'Añádela a la plantilla de tu equipo', to: '/app/plantilla/nueva' },
  { icon: Dumbbell, label: 'Ejercicio', hint: 'Añádelo a la biblioteca del club', to: '/app/ejercicios/nuevo' },
];

export function CreateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <Modal open={open} onClose={onClose} title="¿Qué quieres crear?" description="Elige y te llevamos directamente al flujo.">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              <Icon size={16} className="mt-0.5 shrink-0 text-ink-500" />
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
