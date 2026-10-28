/**
 * Lo que el navegador sabe del entrenador IA, que es casi nada.
 * ---------------------------------------------------------------------------
 * Aquí no hay ninguna clave ni se habla con ninguna API de fuera. Se le manda
 * la conversación a nuestro servidor y él decide qué datos del club usar y qué
 * contestar. Si la llamada saliera desde aquí, la clave estaría en el
 * navegador y cualquiera podría gastarla.
 */

import { supabase } from './supabase';

export interface Turno {
  role: 'user' | 'assistant';
  content: string;
}

export interface Respuesta {
  texto: string;
  /** Qué miró para contestar, para poder enseñarlo. */
  miro: { jugadores: number; sesiones: number; partidos: number };
}

export async function pregunta(teamId: string, mensajes: Turno[]): Promise<Respuesta> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

  const r = await fetch('/.netlify/functions/entrenador', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ teamId, mensajes }),
  });

  /* El motivo que da el servidor, no uno inventado aquí: «no se ha podido
     conectar» cuando lo que pasa es que falta la clave manda a buscar el
     fallo donde no está. */
  const cuerpo = await r.json().catch(() => null) as { texto?: string; error?: string; miro?: Respuesta['miro'] } | null;
  if (!r.ok || !cuerpo?.texto) {
    throw new Error(cuerpo?.error ?? 'El asistente no ha podido contestar.');
  }
  return { texto: cuerpo.texto, miro: cuerpo.miro ?? { jugadores: 0, sesiones: 0, partidos: 0 } };
}

/**
 * ¿ESTÁ EL ASISTENTE CONFIGURADO EN EL SERVIDOR?
 * ---------------------------------------------------------------------------
 * El asistente está escrito entero y aun así no puede contestar si falta
 * `ANTHROPIC_API_KEY`, que la pone una persona en el panel de Netlify. La
 * entrada del menú se enseña sólo cuando el servidor dice que sí.
 *
 * SE PREGUNTA UNA VEZ POR PESTAÑA. La respuesta cambia como mucho una vez en
 * la vida del proyecto; pedirla cada vez que se abre el menú sería una ida y
 * vuelta al servidor por nada.
 *
 * Y UN FALLO CUENTA COMO «NO». Si la petición no contesta —sin red, la
 * función caída—, lo prudente es no ofrecer algo que puede acabar en un
 * error: equivocarse hacia «todavía no» no rompe nada; hacia «sí» deja a
 * alguien escribiendo una pregunta para encontrarse un fallo.
 */
let configurado: Promise<boolean> | null = null;

export function asistenteConfigurado(): Promise<boolean> {
  configurado ??= fetch('/.netlify/functions/estado-ia')
    .then((r) => (r.ok ? (r.json() as Promise<{ listo?: boolean }>) : { listo: false }))
    .then((j) => j.listo === true)
    .catch(() => false);
  return configurado;
}
