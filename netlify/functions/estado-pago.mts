/**
 * ¿Puede cobrarse de verdad?
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTO. Que un plan tenga precio en Stripe y que el cobro
 * funcione son dos cosas distintas. Los precios están creados y guardados en
 * `plans`, pero cobrar necesita además cuatro variables de entorno en el
 * servidor —la clave de Stripe, la de servicio de Supabase, su URL y el
 * secreto del webhook—, y ésas las pone una persona en el panel de Netlify.
 *
 * Sin esto, la portada daría por abierta la caja en cuanto hubiera precios y
 * diría «se contrata desde la aplicación» mientras cada intento de pagar
 * devuelve «Falta la variable de entorno STRIPE_SECRET_KEY». Prometer un
 * cobro que falla es peor que decir que todavía no se puede.
 *
 * Así que «se puede pagar» deja de ser una suposición y pasa a ser un dato
 * que se pregunta. El día que se pongan las variables, la portada se entera
 * sola: no hay que desplegar nada ni tocar la base.
 *
 * QUÉ DEVUELVE, Y QUÉ NO. Sólo `{ listo: true | false }`. Es un punto público
 * y no tiene por qué contar qué le falta a la configuración de nadie: un
 * listado de variables ausentes es un mapa para quien busque por dónde entrar.
 * Quien necesita el detalle lo tiene en los registros de la función de pago,
 * que falla con el nombre exacto.
 */

const NECESARIAS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export default async (): Promise<Response> => {
  const listo = NECESARIAS.every((n) => Boolean(process.env[n]));
  return new Response(JSON.stringify({ listo }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      /* Un minuto de caché: la respuesta cambia como mucho una vez en la vida
         del proyecto, y la portada no puede permitirse una ida y vuelta al
         servidor en cada visita para pintar una sección. */
      'cache-control': 'public, max-age=60',
    },
  });
};

/* No lleva `export const config`: sin él, Netlify la sirve en
   `/.netlify/functions/estado-pago`, que es exactamente la dirección que pide
   el cliente. Las otras tres funciones —pagar, portal y webhook— tampoco lo
   llevan, y declararlo obligaría a traer `@netlify/functions` sólo por un
   tipo. */
