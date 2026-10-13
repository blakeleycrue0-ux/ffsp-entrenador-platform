/**
 * LA GUÍA, NADA MÁS DARSE DE ALTA.
 * ---------------------------------------------------------------------------
 * La llama el navegador en cuanto termina el alta, para que la guía llegue
 * mientras la persona todavía está delante de la pantalla y no al día
 * siguiente. Quién es se comprueba CONTRA SUPABASE con el testigo de la
 * sesión, no con lo que diga el cuerpo de la petición: si no, cualquiera
 * podría pedir que se le mandara un correo a otro.
 *
 * Y no pasa nada si esta llamada se pierde —se cerró la pestaña, se fue la
 * red—: `correo-ronda` repasa a diario quién se quedó sin guía. Las dos
 * pasan por `unaVez()`, así que por mucho que coincidan sale una sola.
 *
 * ES UN CORREO DE SERVICIO: no mira el consentimiento, porque explicar lo que
 * alguien acaba de crear es parte de prestar el servicio, no publicidad.
 */

import { admin, error, json, protegido, quienLlama } from './_comun.mts';
import { envia, unaVez, SITIO } from './_correo.mts';
import { bienvenida } from './_plantillas.mts';

/* `name` y no `nombre`: estos dos campos los lee Brevo tal cual, así que son
   suyos y van en su idioma. */
export const GUIA = {
  url: `${SITIO}/Playoff360-guia.pdf`,
  name: 'Playoff360 - Guia.pdf',
};

export default protegido('correo-bienvenida', async (req: Request): Promise<Response> => {
  const quien = await quienLlama(req);
  if (!quien) return error('Tu sesión ha caducado. Vuelve a entrar.', 401);

  const db = admin();
  const { data: perfil } = await db
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', quien)
    .maybeSingle();

  if (!perfil?.email) return error('No hay a qué dirección mandarlo.', 404);

  const resultado = await unaVez(db, perfil.id, 'bienvenida', async () => {
    const carta = bienvenida(perfil.full_name, GUIA.url);
    await envia({
      a: perfil.email,
      nombre: perfil.full_name,
      asunto: carta.asunto,
      html: carta.html,
      texto: carta.texto,
      adjuntos: [GUIA],
    });
  });

  return json({ resultado });
});
