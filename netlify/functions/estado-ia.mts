/**
 * ¿Está el asistente configurado de verdad?
 * ---------------------------------------------------------------------------
 * MISMO PROBLEMA QUE CON EL COBRO, Y MISMA SOLUCIÓN. El asistente está escrito
 * entero —la función, el contexto, la aduana que decide qué datos salen— y
 * aun así no puede contestar: le falta `ANTHROPIC_API_KEY`, que la pone una
 * persona en el panel de Netlify y no el repositorio.
 *
 * Sin este punto, la aplicación tendría dos opciones y las dos malas: enseñar
 * el asistente en el menú y que cada intento acabe en «todavía no está
 * configurado», o no enseñarlo nunca y que el día que se ponga la clave nadie
 * se entere. Prometer una función que falla es peor que decir que no está.
 *
 * Así que la entrada del menú deja de ser una suposición y pasa a ser un dato
 * que se pregunta. El día que se ponga la clave, aparece sola: no hay que
 * desplegar nada.
 *
 * QUÉ DEVUELVE, Y QUÉ NO. Sólo `{ listo: true | false }`. No dice qué falta:
 * un listado de variables ausentes es un mapa para quien busque por dónde
 * entrar, y quien necesita el detalle lo tiene en los registros de la propia
 * función, que falla con el nombre exacto.
 */

const NECESARIAS = [
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export default async (): Promise<Response> => {
  const listo = NECESARIAS.every((n) => Boolean(process.env[n]));
  return new Response(JSON.stringify({ listo }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      /* Un minuto: la respuesta cambia como mucho una vez, y el menú no puede
         pagar una ida y vuelta al servidor cada vez que se abre. */
      'cache-control': 'public, max-age=60',
    },
  });
};
