/**
 * Lo que el navegador tiene que ver del correo, que es casi nada.
 * ---------------------------------------------------------------------------
 * Aquí no se escribe ningún correo ni se conoce ninguna clave. Sólo se avisa
 * al servidor de que acaba de nacer una cuenta, y se cambia la casilla del
 * permiso. Quién recibe qué lo decide el servidor, con la clave de servicio:
 * si lo decidiera el navegador, cualquiera podría pedir que se mandara un
 * correo a quien quisiera.
 */

import { supabase } from './supabase';

/**
 * Pide la guía de bienvenida para quien entra, si todavía no la tiene.
 *
 * QUIÉN DECIDE QUE NO SE REPITA ES EL SERVIDOR, no esto: `emails_enviados`
 * tiene clave primaria por persona y tipo, así que el segundo intento choca
 * y se va sin mandar nada. Por eso se puede llamar al entrar sin miedo.
 *
 * La marca de abajo no es la que protege: es para no hacer la misma llamada
 * en cada recarga de la pestaña. Vive en `sessionStorage` —no en
 * `localStorage`— a propósito: si se guardara para siempre en el navegador y
 * el envío hubiera fallado aquel día, esta llamada no se volvería a intentar
 * nunca desde este ordenador. Olvidándola al cerrar la pestaña, el siguiente
 * día vuelve a probar, que es lo que hay que hacer con algo que pudo fallar.
 *
 * NO LANZA NUNCA, y es deliberado: esto se llama mientras se carga la
 * aplicación. Que no salga un correo es un contratiempo; que alguien no pueda
 * entrar en su cuenta porque el correo no salió, no.
 */
const YA_PEDIDA = 'p360.guia-pedida';

export async function mandaLaGuia(): Promise<void> {
  try {
    if (sessionStorage.getItem(YA_PEDIDA)) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    sessionStorage.setItem(YA_PEDIDA, '1');
    await fetch('/.netlify/functions/correo-bienvenida', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    /* Silencio a propósito. Lo recoge la ronda. */
  }
}

/**
 * Cambia el permiso para novedades y avisos.
 *
 * Se guarda CUÁNDO y DESDE DÓNDE, no sólo el sí o el no: el RGPD pide poder
 * demostrar el consentimiento, y un `true` suelto no demuestra nada. Vale
 * igual para el no, que es lo que hay que poder enseñar si alguien reclama
 * que se dio de baja y le siguieron llegando.
 */
export async function cambiaNovedades(profileId: string, quiere: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      marketing_consent: quiere,
      marketing_consent_at: new Date().toISOString(),
      marketing_consent_src: 'ajustes',
    })
    .eq('id', profileId);
  if (error) throw error;
}
