/**
 * Dónde se decide si hay que pedir el código.
 * ---------------------------------------------------------------------------
 * SI LA COMPROBACIÓN FALLA, SE ABRE. Puede fallar por no haber red, por estar
 * el proyecto en pausa o por faltar la migración 0009. En cualquiera de esos
 * casos, cerrar sería dejar a la usuaria fuera de SUS datos por un fallo
 * nuestro, y el candado no protege nada que el servidor no proteja ya: los
 * permisos son de RLS y siguen puestos. Así que ante la duda, se pasa.
 *
 * El desbloqueo dura lo que la pestaña. Cerrarla y volver vuelve a pedirlo,
 * que es lo que se espera de un candado.
 */

import { useCallback, useEffect, useState } from 'react';
import { useClub } from '@/store/store';
import { Marca } from '@/components/ui/Brand';
import { estaDesbloqueado, marcarDesbloqueado, passcode } from '@/services/passcode';
import { PantallaBloqueo } from './PantallaBloqueo';

type Estado = 'comprobando' | 'abierto' | 'cerrado';

export function RequireCodigo({ children }: { children: React.ReactNode }) {
  const { userId } = useClub();
  const [estado, setEstado] = useState<Estado>('comprobando');

  useEffect(() => {
    if (!userId) {
      setEstado('comprobando');
      return;
    }
    if (estaDesbloqueado(userId)) {
      setEstado('abierto');
      return;
    }

    let vivo = true;
    passcode
      .estado()
      .then((e) => {
        if (!vivo) return;
        if (e.tiene) {
          setEstado('cerrado');
        } else {
          marcarDesbloqueado(userId);
          setEstado('abierto');
        }
      })
      .catch(() => {
        if (vivo) setEstado('abierto');
      });

    return () => { vivo = false; };
  }, [userId]);

  const abrir = useCallback(() => setEstado('abierto'), []);

  if (!userId) return <>{children}</>;
  /* Mientras se comprueba no se enseña la aplicación: si luego resulta que hay
     candado, ya se habría visto por encima lo que el candado tapa. */
  if (estado === 'comprobando') return <Esperando />;
  if (estado === 'cerrado') return <PantallaBloqueo userId={userId} onEntrar={abrir} />;
  return <>{children}</>;
}

function Esperando() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <Marca size={32} className="animate-fade-in text-ink-400" />
    </div>
  );
}
