/**
 * «Código de acceso» en Ajustes.
 * ---------------------------------------------------------------------------
 * Tres botones como mucho, y ninguno promete nada que no haga: poner, cambiar
 * y quitar. Lo que el código es —y lo que NO es— se dice aquí en una línea,
 * porque llamarlo «seguridad» a secas haría pensar que protege la cuenta, y lo
 * que protege es la pantalla.
 */

import { useEffect, useState } from 'react';
import { Button, Modal, Panel, PanelHeader, Tag } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { ConfigurarCodigo } from './ConfigurarCodigo';
import { Puntos, Teclado, LARGO, type Fase } from './Teclado';
import { passcode } from '@/services/passcode';
import { humanError } from '@/services/supabase';

export function CodigoPanel({ plano = false }: { plano?: boolean } = {}) {
  const toast = useToast();
  const [tiene, setTiene] = useState<boolean | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [configurar, setConfigurar] = useState(false);
  const [quitar, setQuitar] = useState(false);

  const mirar = () => {
    passcode
      .estado()
      .then((e) => { setTiene(e.tiene); setFallo(null); })
      .catch((e) => { setTiene(null); setFallo(humanError(e)); });
  };

  useEffect(mirar, []);

  const cuerpo = (
    <>
      {plano ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg text-ink-900">Código de acceso</h3>
            {tiene ? <Tag tone="solid">Puesto</Tag> : null}
          </div>
          <p className="mt-1 text-sm text-ink-600">
            Un candado de cuatro cifras al volver a la aplicación en este dispositivo.
          </p>
        </div>
      ) : (
        <PanelHeader
          title="Código de acceso"
          description="Un candado de cuatro cifras al volver a la aplicación en este dispositivo."
          actions={tiene ? <Tag tone="solid">Puesto</Tag> : undefined}
        />
      )}

      <div className={plano ? 'mt-4 space-y-4' : 'space-y-4 p-5'}>
        <p className="text-base leading-relaxed text-ink-500">
          No sustituye a tu contraseña: tu cuenta sigue entrando con el correo y la contraseña de
          siempre. El código tapa la pantalla cuando el móvil anda de mano en mano.
        </p>

        {fallo && <p className="text-base leading-relaxed text-bad">{fallo}</p>}

        {tiene !== null && (
          <div className="flex flex-wrap gap-2">
            {/* Secundario: en Ajustes no hay UNA acción principal, hay varias
                secciones con la suya. Tres botones azules en la misma página
                no jerarquizan nada, sólo hacen ruido. */}
            <Button variant="secondary" onClick={() => setConfigurar(true)}>
              {tiene ? 'Cambiar el código' : 'Poner un código'}
            </Button>
            {tiene && (
              <Button variant="ghost" onClick={() => setQuitar(true)}>
                Quitarlo
              </Button>
            )}
          </div>
        )}
      </div>

      <Modal open={configurar} onClose={() => setConfigurar(false)} title="Código de acceso">
        <div className="pb-2 pt-1">
          <ConfigurarCodigo
            yaTiene={Boolean(tiene)}
            onCancelar={() => setConfigurar(false)}
            onHecho={() => {
              setConfigurar(false);
              setTiene(true);
              toast.success('Código guardado');
            }}
          />
        </div>
      </Modal>

      <Modal open={quitar} onClose={() => setQuitar(false)} title="Quitar el código">
        <div className="pb-2 pt-1">
          <Quitar
            onCancelar={() => setQuitar(false)}
            onHecho={() => {
              setQuitar(false);
              setTiene(false);
              toast.success('Código quitado');
            }}
          />
        </div>
      </Modal>
    </>
  );

  return plano ? <section>{cuerpo}</section> : <Panel>{cuerpo}</Panel>;
}

/** Para quitarlo hay que escribirlo: si no, cualquiera con el móvil lo quita. */
function Quitar({ onCancelar, onHecho }: { onCancelar: () => void; onHecho: () => void }) {
  const [pin, setPin] = useState('');
  const [fase, setFase] = useState<Fase>('escribiendo');
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState(false);

  const escribir = async (v: string) => {
    if (fase !== 'escribiendo' || yendo) return;
    setError(null);
    setPin(v);
    if (v.length < LARGO) return;

    setYendo(true);
    try {
      const r = await passcode.quitar(v);
      if (r.ok) {
        setFase('bien');
        window.setTimeout(onHecho, 720);
        return;
      }
      setFase('mal');
      setError(r.motivo === 'bloqueado' ? 'Demasiados intentos. Espera un poco.' : 'No es ese código.');
      window.setTimeout(() => { setPin(''); setFase('escribiendo'); }, 520);
    } catch (e) {
      setPin('');
      setError(humanError(e));
    } finally {
      setYendo(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[340px] text-center">
      <p className="min-h-[38px] text-base leading-relaxed text-ink-500">
        {error ? <span className="text-bad">{error}</span> : 'Escribe el código que tienes puesto.'}
      </p>
      <div className="mt-3">
        <Puntos valor={pin} fase={fase} />
      </div>
      <div className="mt-7">
        <Teclado
          valor={pin}
          onChange={(v) => void escribir(v)}
          disabled={fase !== 'escribiendo' || yendo}
          extra={{ label: 'Cancelar', onClick: onCancelar }}
        />
      </div>
    </div>
  );
}
