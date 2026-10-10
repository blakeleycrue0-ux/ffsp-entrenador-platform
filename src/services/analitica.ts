/**
 * La medición de la web pública.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Google Analytics 4, con tres condiciones que no son opcionales.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 1 · NO SE CARGA NADA HASTA QUE ALGUIEN DICE SÍ
 *
 * El fragmento que publica Google carga `gtag.js` en cuanto se abre la página
 * y escribe su cookie antes de que nadie haya aceptado nada. Aquí no: el
 * script no se pide hasta que hay un sí explícito. Mientras no lo haya no se
 * pide a Google ni un byte, así que no hay cookie que avisar ni dato que
 * enviar, y decir «no» no deja nada a medias: lo que no se cargó no hay que
 * desactivarlo.
 *
 * Esto no es celo de más. Quien entra aquí es un entrenador de fútbol base en
 * España, el aviso previo lo exige la ley de aquí, y un banner que informa de
 * una cookie que ya está puesta no informa: avisa.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 2 · NUNCA DENTRO DE LA APLICACIÓN
 *
 * Esto mide la portada, la entrada y los textos legales. Nada más. Dentro de
 * `/app` no se mide, y el motivo no es la privacidad en abstracto:
 *
 *   · Las direcciones de dentro llevan identificadores: `/app/plantilla/<id>`
 *     es una jugadora, `/app/entrenamientos/<id>` es una sesión. Mandar esas
 *     rutas a un tercero es mandarle la forma de la base de datos y el
 *     identificador de la ficha de una menor de edad.
 *   · El título de la pestaña lleva nombres propios en varias pantallas, y
 *     `gtag` manda el título con cada visita.
 *
 * Son datos de menores en un club. No salen de aquí para contar visitas.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 3 · LA DIRECCIÓN SE MANDA A MANO, Y RECORTADA
 *
 * `gtag` coge por su cuenta `location.href` entero. Y en esta web el `href`
 * puede llevar cosas que no pueden salir: Supabase devuelve de un correo de
 * recuperación o de invitación a `/entrar#access_token=...`, que es una sesión
 * abierta en texto plano, y los enlaces que se comparten traen `?utm_...` y lo
 * que haya pegado alguien. Por eso cada visita se manda con `page_location`
 * puesto a mano: origen y ruta, sin interrogante y sin almohadilla. Lo que no
 * se escribe no se puede filtrar por descuido.
 *
 * Y sin señales de publicidad: `allow_google_signals` y la personalización de
 * anuncios van apagadas. Esto cuenta cuánta gente entra, no construye un
 * público al que vender nada.
 */

/**
 * El identificador de medición. No es un secreto —va en el HTML de cualquier
 * web que use Analytics y se lee desde el navegador—, así que vive aquí y no
 * en una variable de entorno: ponerlo en el servidor no lo esconde de nadie y
 * sí deja la medición apagada en cuanto alguien despliegue sin la variable.
 */
const MEDICION = 'G-41JCMJGND0';

/**
 * Dónde se guarda la decisión.
 *
 * AQUÍ SÍ VA EN EL NAVEGADOR, y es el único sitio donde puede ir. Quien mira
 * la portada no ha entrado: no hay cuenta, no hay fila en ninguna tabla y no
 * hay nada que vincular a una persona. Guardar el consentimiento en la base de
 * datos obligaría a identificar a quien todavía es anónimo, que es lo
 * contrario de lo que se le está preguntando. Y es por aparato porque es una
 * decisión sobre ESTE navegador: el permiso para poner una cookie aquí.
 */
const CLAVE = 'p360:medicion';

export type Decision = 'si' | 'no';

/* El arranque ocurre una vez. Si dos pantallas lo piden, sólo una carga. */
let arrancada = false;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/**
 * Qué decidió esta persona, o `null` si todavía no se le ha preguntado.
 *
 * En una ventana privada, con las cookies bloqueadas o con el almacenamiento
 * lleno, leer `localStorage` LANZA. Si eso pasa se devuelve `null`, que
 * significa «no consta que haya dicho sí»: se vuelve a preguntar y no se mide.
 */
export function decision(): Decision | null {
  try {
    const v = window.localStorage.getItem(CLAVE);
    return v === 'si' || v === 'no' ? v : null;
  } catch {
    return null;
  }
}

/** Guarda la decisión y, si es un sí, arranca. Si es un no, no toca nada. */
export function decidir(d: Decision): void {
  try {
    window.localStorage.setItem(CLAVE, d);
  } catch {
    /* Si no se puede guardar, la decisión vale para esta visita y mañana se
       vuelve a preguntar. Molesta; es mejor que medir sin permiso. */
  }
  if (d === 'si') arrancar();
}

/** ¿Se puede medir ahora mismo? */
export const medicionActiva = (): boolean => decision() === 'si';

/**
 * Carga `gtag.js` y lo configura. Idempotente: llamarla dos veces no carga dos
 * scripts.
 */
export function arrancar(): void {
  if (arrancada || typeof document === 'undefined') return;
  arrancada = true;

  window.dataLayer = window.dataLayer ?? [];
  /* La forma de siempre: `arguments`, no un array. `gtag.js` lee lo que haya
     en `dataLayer` esperando objetos `arguments`, y pasarle arrays hace que
     ignore en silencio lo que se le mandó antes de cargar. */
  const gtag: Gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEDICION}`;
  document.head.appendChild(s);

  gtag('js', new Date());
  gtag('config', MEDICION, {
    /* La visita la manda `visita()`, con la dirección recortada. Si se dejara
       automática, la primera sería con el `href` entero. */
    send_page_view: false,
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

/**
 * Una visita. `ruta` es sólo la ruta: ni consulta ni fragmento.
 *
 * Si no hay permiso no hace nada, y no se guarda para mandarlo después: una
 * visita que no se pudo medir es una visita que no se mide.
 */
export function visita(ruta: string): void {
  if (!medicionActiva()) return;
  arrancar();
  window.gtag?.('event', 'page_view', {
    page_location: `${window.location.origin}${ruta}`,
    page_path: ruta,
    /* El título también a mano. El de la pestaña puede llevar un nombre
       propio, y aquí no hace falta más que saber qué página es. */
    page_title: ruta === '/' ? 'Portada' : ruta,
  });
}

/**
 * Las rutas que se miden. Lista explícita, no «todo lo que no sea /app»:
 * mañana alguien añade una pantalla con identificadores en la dirección y una
 * regla por descarte la mediría sin que nadie lo decida.
 */
const PUBLICAS = ['/', '/entrar', '/aviso-legal', '/privacidad'];

export const esPublica = (ruta: string): boolean => PUBLICAS.includes(ruta);
