/**
 * ¿QUÉ TENGO PENDIENTE? La segunda de las tres preguntas de Inicio.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ESTA PREGUNTA NO TENÍA RESPUESTA. Lo pendiente estaba repartido en cuatro
 * cifras que hay que saber interpretar —«No disponibles · revisar»,
 * «Convocatoria · sin crear»—, en una sección de tareas al final de la página,
 * y en ningún sitio: las listas sin pasar, que son lo único que de verdad se
 * pierde para siempre si no se hacen, no aparecían en ninguna parte.
 *
 * Son frases, no cifras. «Falta pasar lista del martes» se entiende sin
 * aprender nada, y cada una lleva al sitio donde se hace.
 *
 * UNA SOLA LISTA, y por eso las tareas apuntadas a mano vienen aquí dentro con
 * su casilla: tener una lista de pendientes derivados y otra de tareas, cada
 * una con su titular, es volver a repartir la respuesta en dos sitios.
 *
 * Y LO MISMO EN EL MÓVIL Y EN EL ESCRITORIO. Las dos composiciones de Inicio
 * son distintas a propósito, pero ésta es la misma pieza: si cada una hiciera
 * su lista, una diría que faltan dos cosas y la otra tres.
 */

import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Checkbox, SectionHeader } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { humanError } from '@/services/supabase';
import { cn } from '@/lib/utils';
import type { DatosDeInicio } from './datos';

/**
 * La cabecera es la misma en todas partes. Aquí había una variante «sobre
 * foto», en blanco, para cuando Inicio tenía una imagen de fondo oscura;
 * esa imagen ya no existe, así que esa rama pintaba blanco sobre gris claro.
 */
export function Pendientes({
  d, className,
}: { d: DatosDeInicio; className?: string }) {
  const toast = useToast();

  /* UNA LÍNEA, NO UNA TARJETA VACÍA. No tener nada pendiente es una buena
     noticia, y una buena noticia ocupa una línea. Antes, con todo hecho, esta
     zona eran dos carteles de «Sin tareas pendientes» y «Todavía no hay
     movimiento» con su explicación de dos renglones cada uno. */
  if (d.pendientes.length === 0) {
    return (
      <p className={cn('px-1 text-base', 'text-ink-500', className)}>
        Nada pendiente. Todo al día.
      </p>
    );
  }

  const texto = 'text-ink-800';

  return (
    <section className={className}>
      <SectionHeader
        title="Pendiente"
        hint={d.pendientes.length > 1 ? `${d.pendientes.length} cosas` : undefined}
      />
      <ul className={cn('mt-2 divide-y', 'divide-line-sutil')}>
        {d.pendientes.map((p) => (
          <li key={p.clave}>
            {p.tarea ? (
              /* Una tarea se cierra aquí mismo: es un toque, no otra pantalla. */
              <div className="flex min-h-[52px] items-center gap-3 py-2">
                <Checkbox
                  checked={false}
                  onChange={() =>
                    d.actions
                      .toggleTask(p.tarea!)
                      .catch((e) => toast.error('No he podido guardar la tarea', humanError(e)))
                  }
                  className="-ml-1.5 shrink-0"
                />
                <span className={cn('min-w-0 flex-1 text-base leading-snug', texto)}>{p.texto}</span>
                {p.urgente && <span className="shrink-0 text-sm text-warn">Vencida</span>}
              </div>
            ) : (
              <Link
                to={p.a}
                className={cn(
                  'flex min-h-[52px] items-center gap-3 py-2 transition-colors',
                  'active:bg-raised lg:hover:bg-raised',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    p.urgente ? 'bg-warn' : 'bg-ink-400',
                  )}
                />
                <span className={cn('min-w-0 flex-1 text-base leading-snug', texto)}>{p.texto}</span>
                <ChevronRight
                  size={16}
                  className={cn('shrink-0', 'text-ink-400')}
                  aria-hidden
                />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
