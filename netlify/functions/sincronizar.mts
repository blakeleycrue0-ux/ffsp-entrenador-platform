/**
 * Pregúntale a Stripe en qué plan está este club, y apúntalo.
 * ---------------------------------------------------------------------------
 * LA RED DE SEGURIDAD DEL COBRO, Y EXISTE PORQUE HIZO FALTA.
 *
 * El plan de un club lo escribía SÓLO el aviso de Stripe. Mientras el aviso
 * llegue, perfecto: es instantáneo y no hay que preguntar nada. Pero el aviso
 * es una petición de un tercero a un servidor, y eso falla. Falló: alguien
 * contrató la prueba de siete días, Stripe la cobró y la apuntó, y la
 * aplicación se quedó en el plan gratis, con un equipo, sin enterarse.
 *
 * Y lo peor no era eso. Era que no había salida: el portal de Stripe —donde
 * se cancela— necesita el identificador de cliente, que está justo en la fila
 * que no se había escrito. Había pagado, no tenía el plan y tampoco podía
 * darse de baja.
 *
 * Esto arregla las dos cosas de una vez. Va a Stripe, busca la suscripción de
 * este club y escribe lo que Stripe diga, usando EXACTAMENTE el mismo guardado
 * que el aviso —`guardarSuscripcion`—, no una copia que algún día discrepe.
 *
 * CUÁNDO SE LLAMA. Al volver de pagar, sin que nadie pulse nada, y desde el
 * botón «Actualizar estado del pago» de la pantalla de facturación. Las dos
 * veces es la misma operación y es idempotente: preguntar dos veces deja la
 * base igual.
 *
 * ESTO NO ES UN AGUJERO PARA ASCENDERSE SOLO. No se lee ni una palabra de lo
 * que mande el navegador sobre el plan: lo único que llega es un identificador
 * de club, se comprueba en el servidor que quien llama lo administra, y a
 * partir de ahí la única fuente es Stripe. Si en Stripe no hay suscripción, no
 * se escribe nada. No hay manera de pedir «ponme en Max».
 *
 * SE BUSCA POR `metadata.club_id`, que es lo que `pagar` deja puesto en cada
 * suscripción que abre. Buscar por correo o por nombre sería adivinar; esto es
 * la etiqueta que pusimos nosotros al abrir el pago.
 */

import type Stripe from 'stripe';
import {
  administraElClub, admin, error, guardarSuscripcion, json, protegido, quienLlama, stripe,
} from './_comun.mts';

export default protegido('sincronizar', async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return error('Sólo POST', 405);

  const quien = await quienLlama(req);
  if (!quien) return error('Sesión no válida. Vuelve a entrar.', 401);

  let cuerpo: { clubId?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return error('Petición ilegible');
  }
  const { clubId } = cuerpo;
  if (!clubId) return error('Falta el club');

  if (!(await administraElClub(quien, clubId))) {
    return error('Sólo quien administra el club puede revisar el pago.', 403);
  }

  const s = stripe();

  /* Primero por el cliente que ya conozcamos: es una lectura directa y no
     depende del índice de búsqueda de Stripe, que tarda unos segundos en
     enterarse de una suscripción recién creada. */
  const { data: previa } = await admin()
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('club_id', clubId)
    .maybeSingle();

  /* El tipo es el de la suscripción a secas, no el que devuelve `retrieve`:
     ése añade `lastResponse`, que las que salen de una lista no traen. */
  let encontrada: Stripe.Subscription | null = null;

  if (previa?.stripe_customer_id) {
    const lista = await s.subscriptions.list({
      customer: previa.stripe_customer_id as string,
      status: 'all',
      limit: 10,
    });
    encontrada = lista.data.find((x) => x.metadata?.club_id === clubId) ?? lista.data[0] ?? null;
  }

  /* Y si no había fila —que es justo el caso que esto viene a arreglar—, se
     busca por la etiqueta que `pagar` deja en cada suscripción. */
  if (!encontrada) {
    const busqueda = await s.subscriptions.search({
      query: `metadata['club_id']:'${clubId}'`,
      limit: 10,
    });
    /* La más reciente manda: si alguien canceló y volvió a contratar, el plan
       que vale es el último. */
    encontrada = busqueda.data.sort((a, b) => b.created - a.created)[0] ?? null;
  }

  if (!encontrada) {
    return json({ encontrada: false, mensaje: 'En Stripe no hay ninguna suscripción para este club.' });
  }

  await guardarSuscripcion(encontrada, clubId);

  return json({
    encontrada: true,
    estado: encontrada.status,
    nivel: encontrada.metadata?.nivel ?? null,
  });
});
