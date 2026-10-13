/**
 * DARSE DE BAJA. UN CLIC, SIN ENTRAR.
 * ---------------------------------------------------------------------------
 * La ley pide un medio «sencillo y gratuito» de oponerse en cada mensaje, y
 * un enlace que te lleva a una pantalla de inicio de sesión no es ninguna de
 * las dos cosas: quien quiere dejar de recibir correos casi nunca se acuerda
 * de la contraseña, y el que no puede darse de baja marca como spam.
 *
 * Por eso vale el token y no la sesión. El token no abre nada más: no deja
 * leer ni cambiar ningún dato, sólo poner a `false` una casilla. Lo peor que
 * puede hacer quien adivine uno es dejar a alguien sin novedades.
 *
 * Responde HTML y no JSON porque esto lo abre una persona en el navegador
 * desde el pie de un correo, no un programa.
 */

import { admin, protegido } from './_comun.mts';

const pagina = (titulo: string, texto: string, ok: boolean) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titulo} · Playoff360</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#F4F5F7;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
         color:#10131A; padding:24px; }
  .caja { max-width:460px; background:#fff; border:1px solid #D7DAE0; border-radius:14px;
          padding:32px; }
  .marca { font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
           margin:0 0 20px; }
  h1 { font-size:21px; line-height:1.3; margin:0 0 12px; }
  p { font-size:15px; line-height:1.6; color:#5A6170; margin:0 0 10px; }
  a { color:#10131A; font-weight:600; }
</style></head>
<body><div class="caja">
  <p class="marca">Playoff360</p>
  <h1>${titulo}</h1>
  <p>${texto}</p>
  ${ok ? '<p>Los correos de la cuenta —confirmar el alta, recuperar la contraseña— '
       + 'siguen llegando: ésos no son novedades, son parte del servicio.</p>' : ''}
  <p><a href="/">Volver a Playoff360</a></p>
</div></body></html>`;

const html = (cuerpo: string, status = 200) =>
  new Response(cuerpo, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

export default protegido('baja-correo', async (req: Request): Promise<Response> => {
  const token = new URL(req.url).searchParams.get('t');
  if (!token) {
    return html(pagina('Enlace incompleto',
      'A este enlace le falta la parte que dice quién eres. Copia la dirección entera '
      + 'desde el correo, o escríbeme y te doy de baja a mano.', false), 400);
  }

  const db = admin();
  const { data: perfil } = await db
    .from('profiles')
    .select('id, marketing_consent')
    .eq('unsubscribe_token', token)
    .maybeSingle();

  if (!perfil) {
    return html(pagina('Este enlace ya no vale',
      'Puede que la cuenta se haya borrado. Si sigues recibiendo correos, respóndeme '
      + 'a uno y lo corto yo.', false), 404);
  }

  /* Darse de baja dos veces no es un error: es la misma persona pulsando el
     enlace de dos correos distintos. Se contesta lo mismo. */
  if (perfil.marketing_consent) {
    await db.from('profiles').update({
      marketing_consent: false,
      marketing_consent_at: new Date().toISOString(),
      marketing_consent_src: 'baja',
    }).eq('id', perfil.id);
  }

  return html(pagina('Hecho, no recibirás más',
    'Te he quitado de las novedades y de los avisos. No hace falta que hagas nada más.',
    true));
});
