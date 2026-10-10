/**
 * La página pública.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ ESTA PÁGINA ES AZUL Y LA APLICACIÓN NO.
 *
 * No es una incoherencia: son dos trabajos distintos. La portada tiene que
 * detener a alguien que no sabe qué es esto y contarle un producto en quince
 * segundos; la herramienta tiene que desaparecer mientras se usa ocho horas a
 * la semana, y ahí el color de marca estorba. Stripe hace exactamente eso: una
 * portada llena de color y un panel de control casi gris.
 *
 * Por eso el azul vive en su propio espacio de nombres —`marca-*`, más las
 * clases de `index.css` agrupadas al final bajo «LA PORTADA»— y no toca la
 * escala `ink` del producto. Si algún día aparece un `bg-marca-600` dentro de
 * una pantalla de la aplicación, se ve a la legua en una revisión.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CÓMO ESTÁ CONSTRUIDA, PARA NO VOLVER A HACERLA DE BLOQUES
 *
 * La versión anterior se parecía a cualquier otra: titular, párrafo, tres
 * tarjetas blancas, captura, tres tarjetas blancas. Eso no es una página, es
 * una plantilla rellena. Lo que hay ahora se apoya en cuatro cosas:
 *
 *  1. UN SOLO RITMO. `--aire` en `.portada` manda el aire vertical de todas
 *     las secciones. Antes cada una elegía su `py-20 lg:py-28` y acababa
 *     habiendo cuatro ritmos, que es lo que hace que una página parezca
 *     montada con piezas sueltas.
 *
 *  2. TRES TAMAÑOS DE LETRA Y NINGUNO MÁS. `.t-xl`, `.t-l`, `.t-m`. La
 *     jerarquía se lee porque hay pocos escalones, no porque haya muchos.
 *
 *  3. NINGUNA SECCIÓN SE PARECE A LA DE AL LADO. Texto a la izquierda,
 *     después visual a la izquierda, después una franja oscura a sangre,
 *     después una lista numerada sin cajas. Si dos seguidas tienen la misma
 *     forma, una de las dos sobra.
 *
 *  4. LAS CAPTURAS SON EL PRODUCTO, NO UN ADORNO. Van en marco, con barra de
 *     ventana, superpuestas y con sombra de dos capas. Una captura pegada
 *     tal cual es un rectángulo flotando; enmarcada y apoyada, es una
 *     pantalla.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LO QUE ESTA PÁGINA NO TIENE, Y NO ES UN DESCUIDO
 *
 * No hay número de clubes, ni valoraciones, ni logotipos de nadie, ni
 * testimonios, ni «+4.900 equipos confían en nosotros». No porque no quepan:
 * porque no existen. Una cifra inventada en la primera pantalla es la forma
 * más rápida de no merecer la segunda. Donde la referencia pone una fila de
 * logotipos de clientes, aquí pasa una tira con los módulos que sí existen.
 *
 * Los planes y sus importes salen de la base de datos (`plans`, legible por
 * `anon`), no de una constante escrita aquí.
 *
 * Y «Lo que no hace» se queda en la portada, no en la letra pequeña:
 * descubrir un límite después de meter la plantilla entera es lo que hace
 * perder la confianza.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Menu, Minus, Plus, X } from 'lucide-react';
import { Wordmark } from '@/components/ui/Brand';
import { billing, importe, type Plan } from '@/services/billing';
import { loQueFalta, todoLoQueTrae } from '@/services/entitlements';
import { MaquetaAsistencia, MaquetaJugadora, MaquetaPanel, MaquetaPizarra } from './maquetas';
import { cn } from '@/lib/utils';

/* ─────────────────────────── Aparecer al llegar ──────────────────────────── */

function Revelar({
  children, delay = 0, className, as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li';
}) {
  const ref = useRef<HTMLElement>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisto(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisto(true);
          obs.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        opacity: visto ? 1 : 0,
        transform: visto ? 'none' : 'translateY(18px)',
        /* Acaba en `none`, no en `blur(0)`: un filtro de cero sigue siendo un
           filtro, promueve la capa y Safari rasteriza el texto dejándolo
           blando sin que nada parezca desenfocado. */
        filter: visto ? 'none' : 'blur(6px)',
        transition: `opacity .8s cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     transform .8s cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     filter .8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

/* ──────────────────────────────── Contenido ──────────────────────────────── */

const NAV: [string, string][] = [
  ['plataforma', 'Plataforma'],
  ['funciones', 'Funciones'],
  ['clubes', 'Clubes'],
  ['precios', 'Precios'],
];

/** Lo que pasa en la tira. Son los módulos que existen, uno por uno. */
const MODULOS = [
  'Plantilla', 'Asistencia', 'Entrenamientos', 'Pizarra táctica', 'Partidos',
  'Convocatorias', 'Calendario', 'Disponibilidad y lesiones', 'Biblioteca de ejercicios',
  'Analíticas', 'Cuerpo técnico',
];

const CLUB: [string, string, string][] = [
  ['01', 'Cada club, en su sitio', 'Lo tuyo no lo ve nadie de fuera. Y dentro, cada entrenador ve los equipos que le tocan.'],
  ['02', 'Varios equipos, una cuenta', 'Cadete, juvenil, femenino. Cambias de equipo desde arriba y sigues donde estabas.'],
  ['03', 'Se entra por invitación', 'Un enlace a un correo, con fecha de caducidad. Sin contraseñas compartidas por el grupo.'],
  ['04', 'En el campo, desde el móvil', 'Se abre en el navegador. No hay nada que instalar ni que actualizar.'],
];

const NO_HACE: [string, string][] = [
  ['No manda mensajes a las familias', 'Preparas la convocatoria y la copias donde ya habléis.'],
  ['No valora lesiones', 'Guarda lo que anota el cuerpo técnico. El criterio médico es del club.'],
  ['No analiza vídeo de partidos', 'La pizarra es para dibujar jugadas, no para leer un partido grabado.'],
];

const FAQ: [string, string][] = [
  [
    '¿Puede otro club ver lo nuestro?',
    'No. Cada club está separado del resto, y la separación no depende de que la aplicación se porte bien: la impone la base de datos. Dentro del club, cada persona ve sólo los equipos que tiene asignados.',
  ],
  [
    '¿Cómo empiezo?',
    'Creas tu cuenta, creas tu club y quedas como su administración. Desde ahí montas los equipos e invitas al resto del cuerpo técnico.',
  ],
  [
    '¿Hace falta instalar algo?',
    'No. Se abre en el navegador, en el móvil igual que en el ordenador, y no hay nada que actualizar.',
  ],
  [
    '¿Se puede exportar la jugada en vídeo?',
    'Sí. Se graba tal cual se reproduce y se descarga. También se exporta una imagen del instante que elijas.',
  ],
  /* SIN CIFRAS EN ESTE TEXTO, A PROPÓSITO. Los importes están en la tabla
     `plans` y la sección de precios los lee de ahí; repetirlos aquí a mano
     garantiza que algún día uno de los dos sitios mienta. */
  [
    '¿Qué pasa si dejo de pagar?',
    'No se borra nada. Conservas los equipos y los datos; sólo dejas de crear equipos nuevos por encima del límite del plan.',
  ],
];

/* ───────────────────────────────── Piezas ────────────────────────────────── */

function Rotulo({ children, tono = 'azul' }: { children: React.ReactNode; tono?: 'azul' | 'claro' | 'lima' }) {
  return (
    <p className={cn('rotulo', tono === 'azul' ? 'text-marca-600' : tono === 'lima' ? 'text-lima' : 'text-white/60')}>
      {children}
    </p>
  );
}

/**
 * La barra de ventana de un marco de producto.
 *
 * Cuesta veinte píxeles de alto y es lo que convierte un rectángulo en «una
 * aplicación». Sin ella, una captura recortada parece un trozo de imagen; con
 * ella, parece una pantalla abierta.
 */
function BarraVentana({ titulo, claro = false }: { titulo: string; claro?: boolean }) {
  return (
    <div className={cn('marco-barra', claro && 'border-black/[0.07]')}>
      <span className="flex gap-1.5" aria-hidden>
        <i className={cn('block h-2 w-2 rounded-full', claro ? 'bg-black/12' : 'bg-white/18')} />
        <i className={cn('block h-2 w-2 rounded-full', claro ? 'bg-black/12' : 'bg-white/18')} />
        <i className={cn('block h-2 w-2 rounded-full', claro ? 'bg-black/12' : 'bg-white/18')} />
      </span>
      <span className={cn('ml-1 truncate text-[11.5px] font-medium', claro ? 'text-grisis' : 'text-white/45')}>
        {titulo}
      </span>
    </div>
  );
}

/**
 * Una captura, enmarcada.
 *
 * Todas las de la página pasan por aquí para que no haya dos tratamientos
 * distintos. `prioridad` carga la imagen de inmediato en vez de esperar al
 * desplazamiento: sólo para la de la primera pantalla.
 */
/**
 * Una captura, enmarcada. SIEMPRE ENTERA.
 *
 * NO SE RECORTA NADA, Y ESO ES UN ARREGLO. Durante una versión, en el móvil
 * se desplazaba la imagen a la izquierda para tirar el menú lateral de la
 * aplicación y que la tabla creciera. Legible sí era, pero se veía lo que
 * era: una imagen cortada por un lado. Una captura a medias no parece una
 * decisión de diseño, parece que la página está rota —y quien la miró lo
 * dijo con esas palabras—.
 *
 * La solución no era recortar: era tener la captura que toca. Ahora
 * `pruebas/capturas.mjs` saca cada pantalla en los dos tamaños, y en el
 * móvil se enseña la toma vertical, que es una pantalla de móvil de verdad y
 * se lee entera. Lo hace `Pantalla`, aquí abajo.
 */
function Captura({
  src, alt, titulo, className, prioridad = false,
}: {
  src: string; alt: string; titulo: string; className?: string; prioridad?: boolean;
}) {
  return (
    <div className={cn('marco', className)}>
      <BarraVentana titulo={titulo} />
      <img
        src={src}
        alt={alt}
        width={2048}
        height={1296}
        loading={prioridad ? 'eager' : 'lazy'}
        decoding={prioridad ? 'sync' : 'async'}
        {...(prioridad ? { fetchPriority: 'high' as const } : {})}
        className="block w-full"
      />
    </div>
  );
}

/**
 * La misma pantalla, en el formato que le toca a cada ancho.
 *
 * Debajo de `md`, el móvil enmarcado y centrado: la captura vertical de la
 * aplicación, entera y a buen tamaño. De `md` para arriba, la de escritorio
 * en su marco de ventana. No es la misma imagen escalada: son dos capturas
 * distintas de la misma pantalla, hechas por el mismo guion.
 *
 * Se pintan las dos y se esconde una con `hidden`. Es a propósito: con
 * `<picture>` y `media` el navegador elige una sola, pero entonces el marco
 * —la barra de ventana, el borde del teléfono— tendría que cambiar también,
 * y eso no lo hace `<picture>`. Las dos imágenes son `lazy` salvo la de la
 * primera pantalla, así que la que no se ve no se descarga.
 */
function Pantalla({
  escritorio, movil, alt, altMovil, titulo, prioridad = false, className,
}: {
  escritorio: string; movil: string; alt: string;
  /** Sólo cuando la toma vertical enseña OTRA pantalla, no la misma. */
  altMovil?: string;
  titulo: string;
  prioridad?: boolean; className?: string;
}) {
  return (
    <>
      <div className={cn('mx-auto w-[62%] min-w-[180px] max-w-[260px] md:hidden', className)}>
        <Movil src={movil} alt={altMovil ?? alt} prioridad={prioridad} />
      </div>
      <Captura
        src={escritorio}
        alt={alt}
        titulo={titulo}
        prioridad={prioridad}
        className={cn('hidden md:block', className)}
      />
    </>
  );
}

/** Un móvil, con su captura vertical dentro. */
function Movil({
  src, alt, className, prioridad = false,
}: {
  src: string; alt: string; className?: string; prioridad?: boolean;
}) {
  return (
    <div className={cn('telefono', className)}>
      <img
        src={src} alt={alt} width={780} height={1560}
        loading={prioridad ? 'eager' : 'lazy'}
        decoding={prioridad ? 'sync' : 'async'}
        {...(prioridad ? { fetchPriority: 'high' as const } : {})}
        className="block w-full"
      />
    </div>
  );
}

/* ══════════════════════════════ La página ════════════════════════════════ */

export default function Landing() {
  const [planes, setPlanes] = useState<Plan[] | null>(null);
  const [menu, setMenu] = useState(false);
  const [conFondo, setConFondo] = useState(false);

  useEffect(() => {
    const alScroll = () => setConFondo(window.scrollY > 24);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  /* Los planes, de la base. Si no hay red o la tabla no responde, la página se
     dibuja igual con lo que se sabe sin preguntar a nadie —los nombres y lo que
     trae cada plan son código, no datos—. Una portada que se queda a medias
     porque falla una consulta es peor que una sin precios. */
  useEffect(() => {
    let vivo = true;
    billing.planes()
      .then((p) => { if (vivo) setPlanes(p); })
      .catch(() => { if (vivo) setPlanes([]); });
    return () => { vivo = false; };
  }, []);

  const irA = useCallback((id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="portada bg-white">
      {/* ═══════════════════════════ Navegación ═══════════════════════════
          Arriba del todo va sin fondo: está sobre el cielo, y un rectángulo
          blanco cortaría el degradado justo donde empieza. Al bajar se
          convierte en una cápsula blanca translúcida. */}
      <header className="fixed inset-x-0 top-0 z-nav px-3 pt-[max(10px,var(--safe-top))] sm:px-6 sm:pt-4">
        <div
          className={cn(
            'mx-auto flex h-[58px] max-w-[77.5rem] items-center gap-5 rounded-full px-3 transition-all duration-300 sm:px-5',
            conFondo
              ? 'border border-black/[0.06] bg-white/80 shadow-[0_10px_34px_-14px_rgba(16,19,26,0.22)] backdrop-blur-xl'
              : 'border border-transparent',
          )}
        >
          <a href="#" className="flex shrink-0 items-center" aria-label="Playoff360, inicio">
            <Wordmark tone={conFondo ? 'tinta' : 'light'} size="sm" />
          </a>

          <nav className="mx-auto hidden items-center gap-8 lg:flex">
            {NAV.map(([id, texto]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={irA(id)}
                className={cn(
                  'text-[14.5px] font-medium transition-colors',
                  conFondo ? 'text-grisis hover:text-tinta' : 'text-white/75 hover:text-white',
                )}
              >
                {texto}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link
              to="/entrar"
              className={cn(
                'hidden h-10 items-center rounded-full px-4 text-[14px] font-semibold transition-colors sm:inline-flex',
                conFondo ? 'text-tinta hover:bg-black/[0.04]' : 'text-white hover:bg-white/10',
              )}
            >
              Iniciar sesión
            </Link>
            {/* `whitespace-nowrap` y más pequeño en el móvil. Sin eso, en
                390 px «Empezar gratis» partía en dos líneas y el botón se
                convertía en un bloque de dos pisos que tapaba media cabecera. */}
            <Link
              to="/entrar"
              className={cn(
                'btn h-9 px-3.5 text-[13px] sm:h-10 sm:px-5 sm:text-[14px]',
                conFondo ? 'btn-azul' : 'btn-claro',
              )}
            >
              Empezar gratis
            </Link>

            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-label={menu ? 'Cerrar el menú' : 'Abrir el menú'}
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors lg:hidden',
                conFondo ? 'text-tinta hover:bg-black/[0.04]' : 'text-white hover:bg-white/10',
              )}
            >
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* El menú del móvil: una hoja debajo de la cápsula, no a pantalla
            completa. A pantalla completa se pierde dónde estabas. */}
        {menu && (
          <div className="mx-auto mt-2 max-w-[77.5rem] overflow-hidden rounded-3xl border border-black/[0.07] bg-white/95 p-2 shadow-[0_18px_50px_-18px_rgba(16,19,26,0.3)] backdrop-blur-xl lg:hidden">
            {NAV.map(([id, texto]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={irA(id)}
                className="block rounded-2xl px-4 py-3 text-[15.5px] font-medium text-tinta transition-colors hover:bg-black/[0.04]"
              >
                {texto}
              </a>
            ))}
            <Link
              to="/entrar"
              className="mt-1 block rounded-2xl px-4 py-3 text-[15.5px] font-medium text-grisis transition-colors hover:bg-black/[0.04] sm:hidden"
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </header>

      <main>
        <Portada />
        <Tira />
        <Declaracion />
        <Historias />
        <Pizarra />
        <Clubes />
        <Precios planes={planes} />
        <Preguntas />
        <Cierre />
      </main>

      <footer className="border-t border-black/[0.07] bg-white">
        <div className="cauce flex flex-col gap-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark tone="tinta" size="sm" />
          <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[14px] text-grisis">
            {/* LAS DOS RUTAS SON ÉSTAS Y NO OTRAS. Antes decían `/legal` y
                `/legal#privacidad`, que no existen: `App.tsx` las registra
                como `/aviso-legal` y `/privacidad`, y lo que no coincide cae
                en el comodín, que devuelve a la portada. Es decir, pulsar
                «Aviso legal» te dejaba donde estabas. Comprobado contra las
                rutas, no supuesto. */}
            <Link to="/aviso-legal" className="transition-colors hover:text-tinta">Aviso legal</Link>
            <Link to="/privacidad" className="transition-colors hover:text-tinta">Privacidad</Link>
            <Link to="/entrar" className="transition-colors hover:text-tinta">Iniciar sesión</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════ 1 · Portada ═════════════════════════════ */

/**
 * La primera pantalla.
 *
 * TRES CAPAS, Y CADA UNA HACE UNA COSA: el cielo (degradado), las nubes
 * (elipses difuminadas, sin una sola imagen) y la escena de producto en
 * perspectiva. El corte diagonal de abajo es lo que impide que esto se lea
 * como «una caja azul encima de la página».
 *
 * LA ESCENA NO ES UNA CAPTURA PEGADA. Es un abanico: la pizarra de frente y
 * adelantada, las otras cuatro piezas giradas hacia dentro con `rotateY`. Con
 * las cinco planas sería una fila de rectángulos; con la perspectiva es una
 * composición y se entiende de un vistazo que hay un producto detrás.
 *
 * EN EL MÓVIL NO ES LO MISMO ENCOGIDO. Cinco piezas superpuestas en 390 px no
 * se leen: se amontonan y queda una mancha. Ahí va una sola —la pizarra, que
 * es lo que distingue a esto— y las demás entran a partir de tablet.
 */
function Portada() {
  return (
    <section id="plataforma" className="cielo corte-abajo relative overflow-hidden">
      <div className="nubes nubes-mueve" aria-hidden />

      <div className="cauce relative pb-[clamp(60px,9vw,120px)] pt-[clamp(118px,15vw,180px)]">
        <div className="mx-auto max-w-[58rem] text-center">
          <Revelar>
            <span className="sello">
              <i className="block h-1.5 w-1.5 rounded-full bg-lima" aria-hidden />
              Para cuerpos técnicos de fútbol base
            </span>
          </Revelar>

          <Revelar delay={90}>
            <h1 className="t-xl mt-6 text-white">
              Todo tu fútbol.
              <br />
              <span className="text-white/70">Un solo sistema.</span>
            </h1>
          </Revelar>

          <Revelar delay={170}>
            <p className="mx-auto mt-6 max-w-[34rem] text-[16.5px] leading-[1.55] text-white/80 sm:text-[18px]">
              Plantilla, entrenamientos, asistencia, partidos y pizarra táctica.
              Menos gestión. Más fútbol.
            </p>
          </Revelar>

          <Revelar delay={250}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/entrar" className="btn btn-claro h-12 px-6 text-[15px]">
                Empezar gratis
                <ArrowRight size={16} />
              </Link>
              <a href="#funciones" onClick={(e) => { e.preventDefault(); document.getElementById('funciones')?.scrollIntoView({ behavior: 'smooth' }); }} className="btn btn-vidrio h-12 px-6 text-[15px]">
                Ver la plataforma
              </a>
            </div>
          </Revelar>
        </div>

        {/* ── El abanico ─────────────────────────────────────────────────────
            Cinco piezas, de fuera hacia dentro: tarjeta · móvil · PIZARRA ·
            tarjeta · tarjeta. Se solapan con márgenes negativos; si fueran de
            lado a lado sin tocarse sería una fila, no una composición.

            Los extremos entran a partir de `lg` y el segundo anillo a partir
            de `md`. En 390 px queda sólo la pizarra: cinco piezas superpuestas
            en un móvil no se leen, se amontonan y queda una mancha. */}
        <Revelar delay={340}>
          <div className="escena relative mt-[clamp(40px,5.5vw,74px)]">
            <div className="flex items-center justify-center">

              <div className="ala-2-izq hidden w-[17%] shrink-0 lg:block">
                <div className="flota-c"><MaquetaAsistencia /></div>
              </div>

              <div className="ala-1-izq -mr-[3%] hidden w-[16%] shrink-0 md:block lg:-ml-[2%]">
                <div className="flota-b">
                  <Movil
                    src="/producto/plantilla-movil.png"
                    alt="La plantilla del equipo en el móvil, con la asistencia de cada jugadora."
                    className="!rounded-[1.5rem] !border-[5px]"
                  />
                </div>
              </div>

              {/* EL CENTRO. De frente, adelantado y el más grande: es lo
                  primero que tiene que mirarse. */}
              <div className="ala-centro relative z-10 w-full shrink-0 md:w-[44%]">
                {/* EN EL MÓVIL, LA PLANTILLA Y NO LA PIZARRA. En el
                    escritorio la pizarra es lo que distingue a esto y va de
                    frente. Pero un campo de 105 × 68 metido en la pantalla
                    de un teléfono deja medio móvil en negro alrededor, y la
                    primera imagen de la portada no puede ser una pantalla
                    medio vacía. La plantilla llena: dieciséis nombres, sus
                    posiciones y su asistencia. La pizarra se ve más abajo,
                    moviéndose de verdad, que es como mejor se vende. */}
                <div className="flota-a">
                  <Pantalla
                    escritorio="/producto/pizarra.png"
                    movil="/producto/plantilla-movil.png"
                    alt="La pizarra táctica de Playoff360, con una salida desde atrás dibujada sobre el campo en perspectiva."
                    altMovil="La plantilla del equipo en el móvil: dieciséis jugadoras con su posición y su asistencia."
                    titulo="Pizarra táctica · Salida desde atrás"
                    prioridad
                  />
                </div>
              </div>

              <div className="ala-1-der -ml-[3%] hidden w-[20%] shrink-0 md:block lg:-mr-[2%]">
                <div className="flota-c"><MaquetaPanel /></div>
              </div>

              <div className="ala-2-der hidden w-[17%] shrink-0 lg:block">
                <div className="flota-b"><MaquetaJugadora /></div>
              </div>
            </div>
          </div>
        </Revelar>

        <p className="relative mt-9 text-center text-[12px] text-white/60">
          Las pantallas son del producto, con un equipo de ejemplo. Playoff360 empieza vacío.
        </p>
      </div>
    </section>
  );
}

/* ═════════════════════════════════ 2 · Tira ═══════════════════════════════ */

/**
 * Donde la referencia pone una fila de logotipos de clientes, aquí pasan los
 * módulos.
 *
 * Es la misma función —«esto hace muchas cosas»— sin inventarse a nadie. Y
 * dice algo que una fila de logotipos no dice: QUÉ hace.
 *
 * El contenido va dos veces en el marcado y la tira se desplaza media
 * anchura: así el bucle cierra sin salto. La copia va con `aria-hidden` para
 * que un lector de pantalla no lea la lista dos veces.
 */
function Tira() {
  const fila = (oculta: boolean) => (
    <ul
      className="flex shrink-0 items-center gap-10 pr-10 sm:gap-14 sm:pr-14"
      aria-hidden={oculta || undefined}
    >
      {MODULOS.map((m) => (
        <li key={m} className="flex shrink-0 items-center gap-3">
          <i className="block h-1 w-1 rounded-full bg-marca-500" aria-hidden />
          <span className="whitespace-nowrap font-titulo text-[14px] font-medium tracking-[-0.01em] text-grisis">
            {m}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="border-b border-black/[0.06] bg-white py-7">
      <div className="tira overflow-hidden">
        <div className="tira-mueve flex w-max">
          {fila(false)}
          {fila(true)}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ 3 · La declaración ═══════════════════════════ */

/**
 * La segunda pantalla: tipografía grande, mucho aire y una sola imagen.
 *
 * Asimétrica a propósito. Una rejilla de dos columnas iguales con texto a un
 * lado y foto al otro es la forma más rápida de que algo parezca una
 * plantilla; siete y cinco columnas, con la imagen desbordando hacia fuera,
 * se lee como una página compuesta.
 *
 * Las tres cifras de abajo son ESTRUCTURALES, no de negocio: cuántos módulos
 * hay, cuántos sitios hacen falta y cuánto hay que instalar. Son
 * comprobables mirando el producto. No hay ni un «+500 clubes».
 */
function Declaracion() {
  return (
    <section className="seccion bg-white">
      <div className="cauce">
        <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-14">
          <Revelar className="lg:col-span-7">
            <Rotulo>La plataforma</Rotulo>
            <h2 className="t-l mt-5">
              Diseñado para entrenadores.
              <br />
              Preparado para <span className="lima-bajo">clubes</span>.
            </h2>
          </Revelar>

          <Revelar delay={110} className="lg:col-span-5">
            <p className="entradilla lg:ml-auto">
              Un sitio para la plantilla, la semana de entrenamientos, la convocatoria del
              sábado y la jugada que quieres que salga. Lo mismo para un equipo que para
              todo un club.
            </p>
          </Revelar>
        </div>

        <Revelar delay={160}>
          <div className="relative mt-12 lg:mt-16">
            {/* EN EL MÓVIL, EL CALENDARIO Y NO LA PLANTILLA: la plantilla ya
                es la primera pantalla de la portada, y dos veces la misma
                captura en la misma bajada se lee como que sólo hay una
                pantalla. El calendario cuenta lo que dice el párrafo de al
                lado —la semana, la convocatoria del sábado— y es una
                pantalla distinta. */}
            <Pantalla
              escritorio="/producto/plantilla.png"
              movil="/producto/calendario-movil.png"
              alt="La pantalla de plantilla, con las dieciséis jugadoras, su posición, su asistencia y su estado."
              altMovil="El calendario del equipo en el móvil, con los entrenamientos y el partido de la semana."
              titulo="Plantilla · Cadete A"
            />
            {/* El móvil asomando por la esquina. Desborda el marco a
                propósito: es lo que impide que la composición se lea como un
                rectángulo dentro de otro. */}
            <div className="absolute -bottom-10 -right-2 hidden w-[17%] max-w-[168px] md:block xl:-right-10">
              <Movil
                src="/producto/plantilla-movil.png"
                alt="La misma plantilla, en el móvil."
              />
            </div>
          </div>
        </Revelar>

        <div className="mt-20 grid gap-px overflow-hidden rounded-2xl bg-black/[0.07] sm:grid-cols-3 lg:mt-24">
          {([
            ['Once módulos', 'Plantilla, asistencia, entrenamientos, ejercicios, partidos, convocatorias, calendario, disponibilidad, pizarra, analíticas y cuerpo técnico.'],
            ['Un solo sitio', 'Nada de una hoja de cálculo para la asistencia y un grupo de mensajería para todo lo demás.'],
            ['Cero instalación', 'Se abre en el navegador. En el campo, desde el móvil; en casa, desde el ordenador.'],
          ] as [string, string][]).map(([t, d], i) => (
            <Revelar key={t} delay={i * 80} className="bg-white p-6 sm:p-7">
              <h3 className="t-m">{t}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-grisis">{d}</p>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ 4 · Las historias ════════════════════════════ */

/**
 * Dos secciones seguidas que NO se parecen.
 *
 * La primera lleva el texto a la izquierda y el producto a la derecha, sobre
 * blanco. La segunda invierte el orden y cambia de fondo. Es lo mínimo para
 * que al bajar no dé la sensación de estar viendo la misma caja otra vez.
 */
function Historias() {
  return (
    <>
      <section id="funciones" className="seccion scroll-mt-24 bg-[#F4F7FC]">
        <div className="cauce">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* El producto a la IZQUIERDA aquí: en la sección anterior iba a
                la derecha, y alternar es lo que da ritmo. */}
            <Revelar className="relative lg:col-span-7">
              <Pantalla
                escritorio="/producto/entrenamientos.png"
                movil="/producto/entrenamientos-movil.png"
                alt="La pantalla de entrenamientos, con la sesión dividida en bloques y sus minutos."
                titulo="Entrenamientos · Semana 14"
              />
              {/* El móvil asomando por la esquina entra a partir de `md`:
                  por debajo, la pantalla principal YA es el móvil y habría
                  dos teléfonos iguales en la misma composición. */}
              <div className="absolute -bottom-8 -left-4 hidden w-[20%] max-w-[150px] md:block lg:-left-12">
                <Movil
                  src="/producto/entrenamientos-movil.png"
                  alt="La sesión del día en el móvil, bloque por bloque."
                />
              </div>
            </Revelar>

            <Revelar delay={120} className="lg:col-span-5">
              <Rotulo>Entrenamientos</Rotulo>
              <h2 className="t-l mt-5">Cada sesión, en bloques.</h2>
              <p className="entradilla mt-5">
                Activación, parte principal, competición. Con sus minutos, su material y los
                ejercicios de tu biblioteca. La preparas el martes y el jueves la tienes en
                el bolsillo.
              </p>
              <ul className="mt-7 space-y-3">
                {['Biblioteca de ejercicios reutilizables', 'Lista de asistencia de la sesión', 'Quién está disponible y quién no'].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] text-tinta">
                    <Check size={17} className="mt-0.5 shrink-0 text-marca-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </Revelar>
          </div>
        </div>
      </section>

      <section className="seccion bg-white">
        <div className="cauce">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <Revelar className="lg:col-span-5">
              <Rotulo>Partidos y analíticas</Rotulo>
              <h2 className="t-l mt-5">
                El sábado
                <br />
                empieza el martes.
              </h2>
              <p className="entradilla mt-5">
                Convocatoria, alineación y resultado. Y después, lo que de verdad dice la
                temporada: quién viene a entrenar, quién se lo está ganando y a quién hay
                que preguntarle qué le pasa.
              </p>
              <Link to="/entrar" className="btn btn-linea mt-8 h-11 px-5 text-[14.5px]">
                Probarlo gratis
                <ArrowRight size={15} />
              </Link>
            </Revelar>

            {/* DOS CAPTURAS SOLAPADAS cuentan «hay más pantallas» sin tener
                que escribirlo. El calendario va detrás y asomando por arriba
                a la derecha.

                `isolate` + `z-0`/`z-10` y NO `-z-10`: un hijo con z-index
                negativo se va detrás del fondo opaco de la sección y
                desaparece. Con un contexto de apilamiento propio, «detrás»
                significa detrás de su hermano, que es lo que se quería. */}
            <Revelar delay={120} className="relative isolate lg:col-span-7">
              <div className="absolute -right-2 -top-14 z-0 hidden w-[58%] lg:block">
                <Captura
                  src="/producto/calendario.png"
                  alt=""
                  titulo="Calendario"
                  className="opacity-80"
                />
              </div>
              <div className="relative z-10">
                <Pantalla
                  escritorio="/producto/analiticas.png"
                  movil="/producto/analiticas-movil.png"
                  alt="El panel de analíticas, con la asistencia por jugadora y por sesión."
                  titulo="Analíticas · Cadete A"
                />
              </div>
            </Revelar>
          </div>
        </div>
      </section>
    </>
  );
}

/* ══════════════════════════════ 5 · La pizarra ════════════════════════════ */

/**
 * La franja oscura. Es el punto de inflexión de la página y la única sección
 * a sangre completa.
 *
 * Y AQUÍ NO HAY CAPTURA: hay pizarra. `MaquetaPizarra` envuelve `BoardDemo`,
 * que es el mismo motor que está dentro de la aplicación, con la misma cámara
 * y las mismas piezas. Es la mejor demostración que tiene este producto, y
 * enseñarla quieta en un PNG cuando se puede enseñar moviéndose sería tirarla.
 *
 * El azul del fondo no es el negro de la aplicación: `abismo` lleva azul
 * dentro, para que la pizarra puesta encima se lea COMO UNA PANTALLA y no
 * como un agujero del mismo color que el fondo.
 */
function Pizarra() {
  return (
    <section className="corte-arriba corte-abajo relative overflow-hidden bg-abismo">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[10%] top-[6%] h-[46vw] w-[46vw] rounded-full opacity-40 blur-[110px]"
        style={{ background: 'radial-gradient(circle, rgba(8,104,249,0.9) 0%, rgba(8,104,249,0) 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[8%] bottom-[0%] h-[40vw] w-[40vw] rounded-full opacity-30 blur-[110px]"
        style={{ background: 'radial-gradient(circle, rgba(54,200,255,0.9) 0%, rgba(54,200,255,0) 70%)' }}
      />

      <div className="cauce relative pb-[clamp(90px,11vw,150px)] pt-[clamp(110px,13vw,170px)]">
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <Revelar className="lg:col-span-7">
            <Rotulo tono="lima">Pizarra táctica</Rotulo>
            <h2 className="t-l mt-5 text-white">
              De la idea al campo,
              <br />
              en movimiento.
            </h2>
          </Revelar>
          <Revelar delay={110} className="lg:col-span-5">
            <p className="entradilla text-white/60">
              Dibuja la jugada, dale a reproducir y mírala salir. Después la exportas en
              vídeo y la mandas al grupo del equipo.
            </p>
          </Revelar>
        </div>

        {/* A 1240 px de ancho el campo salía de 800 px de alto y se comía la
            pantalla entera: dejaba de ser una demostración y pasaba a ser una
            pared verde. Acotado a 60rem respira, y el azul que queda a los
            lados es lo que hace que se lea como una pantalla encendida en una
            habitación a oscuras. */}
        <Revelar delay={180}>
          <div className="relative mx-auto mt-10 max-w-[60rem] lg:mt-14">
            <MaquetaPizarra />
            <span className="absolute -top-3 left-5 flex items-center gap-2 rounded-full border border-white/15 bg-abismo2 px-3 py-1.5 text-[11.5px] font-medium text-white/75">
              <i className="pulso block h-1.5 w-1.5 shrink-0 rounded-full bg-lima" aria-hidden />
              En directo
            </span>
          </div>
        </Revelar>

        <Revelar delay={240}>
          <p className="mx-auto mt-7 max-w-[46ch] text-center text-[13.5px] leading-relaxed text-white/50">
            No es un vídeo ni una captura: es el mismo componente que hay dentro de la
            aplicación, moviéndose aquí.
          </p>
        </Revelar>
      </div>
    </section>
  );
}

/* ══════════════════════════════ 6 · Los clubes ════════════════════════════ */

/**
 * Una lista numerada, sin una sola tarjeta.
 *
 * Es a propósito: a estas alturas de la página ya se han visto marcos,
 * capturas y una franja oscura. Otra rejilla de cajas blancas sería la cuarta
 * vez que aparece la misma forma. Aquí manda la tipografía y las líneas
 * finas; el número grande en gris claro hace de ancla visual y no necesita
 * ninguna caja alrededor.
 */
function Clubes() {
  return (
    <section id="clubes" className="seccion scroll-mt-24 bg-white">
      <div className="cauce">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <Revelar className="lg:col-span-5">
            <Rotulo>Para clubes</Rotulo>
            <h2 className="t-l mt-5">
              Varios equipos.
              <br />
              Un solo club.
            </h2>
            <p className="entradilla mt-5">
              Lo que un club necesita no es más funciones: es saber quién ve qué.
            </p>
          </Revelar>

          <div className="lg:col-span-7">
            <ul>
              {CLUB.map(([n, titulo, texto], i) => (
                <Revelar as="li" key={n} delay={i * 70} className="flex gap-6 border-t border-black/[0.09] py-7 first:border-t-0 first:pt-0 sm:gap-10">
                  <span className="font-titulo text-[13px] font-medium tabular-nums text-marca-300">{n}</span>
                  <div className="min-w-0">
                    <h3 className="t-m">{titulo}</h3>
                    <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-grisis">{texto}</p>
                  </div>
                </Revelar>
              ))}
            </ul>
          </div>
        </div>

        {/* LO QUE NO HACE, EN LA PORTADA Y NO EN LA LETRA PEQUEÑA.
            Descubrir un límite después de meter la plantilla entera es lo que
            hace perder la confianza. Puesto aquí, al lado de lo que sí hace,
            cuesta tres líneas y se gana una. */}
        <Revelar delay={120}>
          <div className="mt-20 rounded-3xl bg-[#F4F7FC] p-7 sm:p-10 lg:mt-24">
            <h3 className="t-m">Lo que no hace, dicho aquí</h3>
            <div className="mt-7 grid gap-7 sm:grid-cols-3 sm:gap-10">
              {NO_HACE.map(([t, d]) => (
                <div key={t}>
                  <p className="flex items-start gap-2.5 text-[15px] font-semibold text-tinta">
                    <Minus size={16} className="mt-1 shrink-0 text-grisis" />
                    {t}
                  </p>
                  <p className="ml-[26px] mt-1.5 text-[14.5px] leading-relaxed text-grisis">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </Revelar>
      </div>
    </section>
  );
}

/* ═══════════════════════════════ 7 · Precios ══════════════════════════════ */

/**
 * Los planes, de la base de datos.
 *
 * LAS CIFRAS SALEN DE `plans`, NO DE AQUÍ. Ni una sola está escrita en este
 * fichero: el importe, el importe anual, cuántos equipos caben y los días de
 * prueba se leen de la tabla, que es donde los decidió quien manda en el
 * producto (migración 0012). Si mañana Pro cuesta otra cosa, se cambia una
 * fila y esta sección cuenta la verdad sin desplegar nada. Escribir «5,99 €»
 * en el HTML sería garantizar que algún día la portada mienta.
 *
 * Y SI LA CONSULTA FALLA, NO SE INVENTA NADA. Sin red, `planes` llega a nulo y
 * la tarjeta dice que el precio no se ha podido cargar, en vez de enseñar una
 * cifra de repuesto.
 *
 * PRECIO PUESTO NO ES CAJA ABIERTA. Son dos columnas distintas: el importe
 * vive en `price_monthly`, y poder pagar depende de `stripe_price_monthly`,
 * que sigue vacía porque la cuenta de Stripe no está terminada. De ahí
 * `contratable`. Mientras sea falso, ninguna tarjeta ofrece pagar y la
 * aplicación no cierra ninguna función: se dice arriba, en grande, en vez de
 * dejar que alguien lo descubra al pulsar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO SON TRES TARJETAS IGUALES
 *
 * Tres cajas con el mismo borde, el mismo relleno y la misma sombra se leen
 * como un formulario de elección, no como una oferta. Aquí hay UNA pieza con
 * tres columnas separadas por filetes de un píxel, y la del medio sale del
 * plano: fondo oscuro, un poco más alta y con su propio sello. El ojo va
 * primero al plan recomendado, que es justo para lo que sirve destacarlo.
 */
function Precios({ planes }: { planes: Plan[] | null }) {
  const NOMBRES: Record<string, string> = { free: 'Gratis', pro: 'Pro', max: 'Max' };
  /* PARA QUIÉN ES CADA UNO, en una línea.
     No es relleno: las columnas de Pro y Max añaden una o dos funciones, así
     que sin esto quedaban medio vacías y el hueco se leía como «aquí falta
     algo». Y responde a la pregunta que de verdad se hace quien mira una
     tabla de precios, que no es «qué trae» sino «cuál es el mío». */
  const PARA_QUIEN: Record<string, string> = {
    free: 'Para empezar con un equipo y ver si esto te sirve.',
    pro: 'Para el entrenador que lleva su equipo y quiere la pizarra entera.',
    max: 'Para el club con varios equipos y varias personas en el cuerpo técnico.',
  };
  const niveles = ['free', 'pro', 'max'] as const;
  const seVende = (planes ?? []).some((p) => p.contratable);
  const buscar = (t: string) => (planes ?? []).find((p) => p.tier === t);

  const equiposDe = (n: number | null | undefined) =>
    n === null ? 'Equipos sin límite' : n === 1 ? 'Un equipo' : typeof n === 'number' ? `Hasta ${n} equipos` : null;

  return (
    <section id="precios" className="seccion scroll-mt-24 bg-[#F4F7FC]">
      <div className="cauce">
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <Revelar className="lg:col-span-7">
            <Rotulo>Precios</Rotulo>
            <h2 className="t-l mt-5">
              Gratis de verdad.
              <br />
              Y barato en serio.
            </h2>
          </Revelar>
          <Revelar delay={100} className="lg:col-span-5">
            <p className="entradilla lg:ml-auto">
              Pensado para un entrenador de fútbol base y para clubes pequeños. Gratis no es
              una prueba de quince días: es un plan, con un equipo, para siempre.
            </p>
          </Revelar>
        </div>

        {/* EL AVISO VA ARRIBA Y NO EN LA LETRA PEQUEÑA. Hay precios puestos y
            no hay forma de pagarlos: quien lea las tarjetas tiene que saberlo
            antes de buscar el botón, no después. */}
        {!seVende && (
          <Revelar delay={150}>
            <p className="mt-9 rounded-2xl border border-marca-600/20 bg-marca-50 px-5 py-4 text-[14.5px] leading-relaxed text-tinta">
              <span className="font-semibold">Todavía no se puede pagar.</span>{' '}
              No hay pasarela de cobro abierta, así que hoy no hay nada que contratar y
              <span className="font-semibold"> no hay ninguna función cerrada</span>: se use
              el plan que se use, está todo disponible. Estos son los precios que se
              aplicarán cuando se abra.
            </p>
          </Revelar>
        )}

        <Revelar delay={200}>
          <div className="mt-10 overflow-hidden rounded-[26px] border border-black/[0.08] bg-white lg:grid lg:grid-cols-3">
            {niveles.map((tier) => {
              const plan = buscar(tier);
              const destacado = tier === 'pro';
              const moneda = plan?.currency ?? 'eur';
              const mensual = importe(plan?.priceMonthly ?? null, moneda);
              const anual = importe(plan?.priceYearly ?? null, moneda);
              /* El ahorro no se escribe: se resta. Doce mensualidades menos lo
                 que cuesta el año. Así no puede quedarse desfasado respecto a
                 los dos importes que tiene al lado. */
              const ahorro =
                plan && plan.priceMonthly !== null && plan.priceYearly !== null && plan.priceMonthly > 0
                  ? importe(plan.priceMonthly * 12 - plan.priceYearly, moneda)
                  : null;
              const gratis = plan?.priceMonthly === 0;
              const equipos = equiposDe(plan?.maxTeams);
              /* Gratis enseña lo suyo; los de arriba, sólo lo que AÑADEN.
                 Repetir debajo de Pro las mismas once líneas obliga a leerlas
                 dos veces para descubrir que son las mismas. */
              const lista = tier === 'free' ? todoLoQueTrae('free') : loQueFalta(tier);

              return (
                <article
                  key={tier}
                  className={cn(
                    'flex flex-col p-7 sm:p-9',
                    destacado
                      ? 'bg-abismo text-white lg:-my-4 lg:rounded-[26px] lg:py-12 lg:shadow-[0_30px_70px_-30px_rgba(6,12,27,0.55)]'
                      : 'border-t border-black/[0.08] lg:border-l lg:border-t-0 lg:first:border-l-0',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <h3 className={cn('font-titulo text-[15px] font-semibold tracking-[-0.01em]', destacado ? 'text-white' : 'text-tinta')}>
                      {plan?.name ?? NOMBRES[tier]}
                    </h3>
                    {destacado && (
                      <span className="rounded-full bg-lima px-2.5 py-0.5 font-titulo text-[10.5px] font-semibold uppercase tracking-[0.1em] text-abismo">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <p className={cn('mt-3 min-h-[2.6em] max-w-[30ch] text-[14px] leading-snug', destacado ? 'text-white/55' : 'text-grisis')}>
                    {PARA_QUIEN[tier]}
                  </p>

                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className={cn('font-titulo text-[42px] font-semibold leading-none tracking-[-0.04em]', destacado ? 'text-white' : 'text-tinta')}>
                      {mensual ?? 'Sin precio'}
                    </span>
                    {mensual && !gratis && (
                      <span className={cn('text-[14px] font-medium', destacado ? 'text-white/55' : 'text-grisis')}>/mes</span>
                    )}
                  </p>

                  <p className={cn('mt-2 min-h-[1.25rem] text-[13.5px]', destacado ? 'text-white/55' : 'text-grisis')}>
                    {!plan
                      ? 'No hemos podido cargar el precio'
                      : gratis
                        ? 'Para siempre, sin tarjeta'
                        : anual
                          ? `o ${anual} al año${ahorro ? ` — ahorras ${ahorro}` : ''}`
                          : 'Sin precio anual'}
                  </p>

                  {equipos && (
                    <p className={cn('mt-6 font-titulo text-[15px] font-semibold', destacado ? 'text-white' : 'text-tinta')}>
                      {equipos}
                    </p>
                  )}

                  <p className={cn('mt-6 rotulo', destacado ? 'text-white/45' : 'text-grisis')}>
                    {tier === 'free' ? 'Incluye' : `Todo lo de ${tier === 'pro' ? 'Gratis' : 'Pro'}, y`}
                  </p>

                  {lista.length > 0 ? (
                    <ul className="mt-4 flex-1 space-y-2.5">
                      {lista.map((t) => (
                        <li key={t} className={cn('flex items-start gap-2.5 text-[14.5px] leading-snug', destacado ? 'text-white/80' : 'text-grisis')}>
                          <Check size={15} className={cn('mt-0.5 shrink-0', destacado ? 'text-lima' : 'text-marca-600')} />
                          <span className="min-w-0">{t}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    /* Si un plan no añade NINGUNA función construida, lo que lo
                       distingue es cuántos equipos caben. Decirlo es mejor que
                       rellenar la columna con promesas. */
                    <p className={cn('mt-4 flex-1 text-[14.5px] leading-relaxed', destacado ? 'text-white/70' : 'text-grisis')}>
                      Ninguna función nueva de momento: lo que cambia es cuántos equipos caben.
                    </p>
                  )}

                  {/* Los días de prueba salen de la tabla, igual que todo lo
                      demás, y sólo se enseñan cuando haya algo que probar. */}
                  {seVende && !gratis && (plan?.trialDays ?? 0) > 0 && (
                    <p className={cn('mt-4 text-[13px]', destacado ? 'text-white/55' : 'text-grisis')}>
                      {plan?.trialDays} días de prueba antes del primer cobro
                    </p>
                  )}

                  <div className="mt-8">
                    {gratis ? (
                      <Link to="/entrar" className="btn btn-azul h-11 w-full text-[14.5px]">
                        Empezar gratis
                      </Link>
                    ) : (
                      <p className={cn(
                        'rounded-full px-4 py-2.5 text-center text-[13px]',
                        destacado ? 'bg-white/[0.07] text-white/60' : 'bg-black/[0.03] text-grisis',
                      )}>
                        {seVende ? 'Se contrata desde la aplicación' : 'Hoy ya lo tienes, sin pagar nada'}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </Revelar>
      </div>
    </section>
  );
}

/* ══════════════════════════════ 8 · Preguntas ═════════════════════════════ */

/**
 * Sin cajas, sin acordeón de tarjetas: filetes finos y tipografía. Es la
 * tercera forma distinta de presentar una lista en esta página, y a estas
 * alturas lo que hace falta es que descanse la vista.
 */
function Preguntas() {
  const [abierta, setAbierta] = useState<number | null>(0);
  return (
    <section className="seccion-corta bg-white">
      <div className="cauce">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <Revelar className="lg:col-span-4">
            <Rotulo>Preguntas</Rotulo>
            <h2 className="t-l mt-5">Lo que se suele preguntar.</h2>
          </Revelar>

          <div className="lg:col-span-8">
            <ul>
              {FAQ.map(([p, r], i) => {
                const activa = abierta === i;
                return (
                  <li key={p} className="border-t border-black/[0.09] first:border-t-0">
                    <button
                      type="button"
                      onClick={() => setAbierta(activa ? null : i)}
                      aria-expanded={activa}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left"
                    >
                      <span className="font-titulo text-[16.5px] font-medium tracking-[-0.02em] text-tinta sm:text-[18px]">
                        {p}
                      </span>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/[0.1] text-marca-600">
                        {activa ? <Minus size={14} /> : <Plus size={14} />}
                      </span>
                    </button>
                    {activa && (
                      <p className="max-w-[62ch] pb-6 text-[15px] leading-relaxed text-grisis">{r}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════ 9 · El cierre ════════════════════════════ */

function Cierre() {
  return (
    <section className="cielo corte-arriba relative overflow-hidden">
      <div className="nubes" aria-hidden />
      <div className="cauce relative pb-[clamp(90px,11vw,140px)] pt-[clamp(110px,13vw,170px)] text-center">
        <Revelar>
          <h2 className="t-xl mx-auto max-w-[22ch] text-white">
            El próximo paso de tu equipo empieza aquí.
          </h2>
        </Revelar>
        <Revelar delay={110}>
          <p className="mx-auto mt-6 max-w-[34rem] text-[16.5px] leading-[1.55] text-white/80 sm:text-[17.5px]">
            Creas tu club, montas el equipo y empiezas. Sin tarjeta y sin que nadie te llame.
          </p>
        </Revelar>
        <Revelar delay={190}>
          <Link to="/entrar" className="btn btn-claro mt-9 h-12 px-7 text-[15px]">
            Crear cuenta gratis
            <ArrowRight size={16} />
          </Link>
        </Revelar>
      </div>
    </section>
  );
}
