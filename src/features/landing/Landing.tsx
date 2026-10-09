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
 * LO QUE ESTA PÁGINA NO TIENE, Y NO ES UN DESCUIDO
 *
 * No hay número de clubes, ni valoraciones, ni logotipos de nadie, ni
 * testimonios, ni «+4.900 equipos confían en nosotros». No porque no quepan:
 * porque no existen. Una cifra inventada en la primera pantalla es la forma
 * más rápida de no merecer la segunda.
 *
 * Los planes salen de la base de datos (`plans`, legible por `anon`), no de
 * una constante escrita aquí. Hoy no tienen precio decidido, así que la
 * sección de precios lo dice en vez de poner una cifra de adorno; el día que
 * haya precios, esta página los enseña sin tocar una línea.
 *
 * Y «Lo que no hace» se queda en la portada, no en la letra pequeña:
 * descubrir un límite después de meter la plantilla entera es lo que hace
 * perder la confianza.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Minus, Plus } from 'lucide-react';
import { Wordmark } from '@/components/ui/Brand';
import { billing, importe, type Plan } from '@/services/billing';
import { loQueFalta, todoLoQueTrae } from '@/services/entitlements';
import {
  MaquetaAsistencia, MaquetaCifras, MaquetaJugadora, MaquetaPanel, MaquetaPizarra,
} from './maquetas';
import { cn } from '@/lib/utils';

/* ─────────────────────────── Aparecer al llegar ──────────────────────────── */

function Revelar({
  children, delay = 0, className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
      { rootMargin: '0px 0px -10% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visto ? 1 : 0,
        transform: visto ? 'none' : 'translateY(16px)',
        /* Acaba en `none`, no en `blur(0)`: un filtro de cero sigue siendo un
           filtro, promueve la capa y Safari rasteriza el texto dejándolo
           blando sin que nada parezca desenfocado. */
        filter: visto ? 'none' : 'blur(6px)',
        transition: `opacity .75s cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     transform .75s cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     filter .75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────── Contenido ──────────────────────────────── */

const NAV: [string, string][] = [
  ['plataforma', 'Plataforma'],
  ['funciones', 'Funciones'],
  ['clubes', 'Para clubes'],
  ['precios', 'Precios'],
];

/** Las cuatro áreas. Todo lo que se describe existe y funciona hoy. */
const AREAS = [
  {
    titulo: 'Gestión de jugadoras',
    texto:
      'Ficha con dorsal, posición e historial. La disponibilidad se lleva aparte, con sus fechas y sus limitaciones.',
    pie: 'Importa desde CSV con vista previa',
  },
  {
    titulo: 'Planificación de entrenamientos',
    texto:
      'Cada sesión se monta por bloques —duración, material y objetivo— tirando de la biblioteca de ejercicios.',
    pie: 'Biblioteca reutilizable entre equipos',
  },
  {
    titulo: 'Estadísticas y rendimiento',
    texto:
      'Cada cifra explica de dónde sale. Lo que falta se escribe «sin datos»; no se convierte en un cero.',
    pie: 'Sin predicciones ni diagnósticos',
  },
  {
    titulo: 'Control de asistencia',
    texto:
      'Pasar lista son dos toques en el campo: todas presentes y corriges las excepciones. Seis estados, no dos.',
    pie: '«Sin registrar» no es una ausencia',
  },
] as const;

const PILARES: [string, string][] = [
  [
    'Cada club, aislado',
    'El aislamiento lo imponen las políticas de acceso de la base de datos, no la interfaz. Esconder un botón nunca ha sido autorización.',
  ],
  [
    'Varios equipos, un club',
    'Cada persona del cuerpo técnico ve sólo los equipos que tiene asignados. La administración del club reparte.',
  ],
  [
    'Invitaciones con caducidad',
    'Un enlace ligado a un correo que caduca a los catorce días. Sin cuentas sueltas ni contraseñas compartidas.',
  ],
  [
    'En el campo, desde el móvil',
    'Todo el trabajo cabe en el bolsillo y no hay que instalar nada. Se abre en el navegador y ya está.',
  ],
];

const NO_HACE = [
  'No envía mensajes ni correos a las familias.',
  'No genera diagnósticos ni recomendaciones médicas.',
  'No calcula métricas físicas ni rendimiento predictivo.',
  'No convierte en ceros los datos que faltan.',
];

const FAQ: [string, string][] = [
  [
    '¿Puede otro club ver lo nuestro?',
    'No. Cada club está aislado del resto, y el aislamiento lo imponen las políticas de acceso de la base de datos: no depende de que la aplicación se comporte bien. Dentro del club, cada persona ve sólo los equipos que tiene asignados.',
  ],
  [
    '¿Cómo empiezo con mi club?',
    'Creas tu cuenta, creas tu club y quedas como su administración. Desde ahí montas los equipos e invitas al resto del cuerpo técnico con un enlace que caduca a los catorce días.',
  ],
  [
    '¿Envía las convocatorias a las familias?',
    'No. Prepara la lista y la copias para compartirla por donde ya habléis con el equipo. No prometemos un envío que no hacemos.',
  ],
  [
    '¿Se puede exportar la animación en vídeo?',
    'Sí. Se graba la jugada tal cual se reproduce y se descarga; el formato depende de lo que sepa grabar tu navegador, así que la aplicación dice cuál va a salir antes de empezar. También se exporta una imagen del instante que elijas.',
  ],
  [
    '¿Valora lesiones o predice el rendimiento?',
    'No. Guarda lo que anota el cuerpo técnico, con sus fechas y sus limitaciones. No emite diagnósticos ni estimaciones: eso es competencia del personal sanitario del club.',
  ],
];

/* ───────────────────────────────── Piezas ────────────────────────────────── */

function Rotulo({ children, tono = 'azul' }: { children: React.ReactNode; tono?: 'azul' | 'claro' }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.16em]',
        tono === 'azul' ? 'text-marca-600' : 'text-white/70',
      )}
    >
      {children}
    </p>
  );
}

function Titular({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={cn('mt-3 text-[30px] leading-[1.08] text-tinta sm:text-[40px] lg:text-[46px]', className)}
      style={{ fontWeight: 600, letterSpacing: '-0.035em' }}
    >
      {children}
    </h2>
  );
}

function Parrafo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[15px] leading-relaxed text-grisis sm:text-[16.5px]', className)}>
      {children}
    </p>
  );
}

/* ════════════════════════════════ La página ══════════════════════════════ */

export default function Landing() {
  const [abierta, setAbierta] = useState<number | null>(0);
  const [conFondo, setConFondo] = useState(false);
  const [menu, setMenu] = useState(false);
  const [planes, setPlanes] = useState<Plan[] | null>(null);

  useEffect(() => {
    const alScroll = () => setConFondo(window.scrollY > 16);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  /* Los planes, de la base. Si no hay red o la tabla no responde, la sección
     se dibuja igual con lo que se sabe sin preguntar a nadie —los nombres y lo
     que trae cada plan son código, no datos—. Una portada que se queda a
     medias porque falla una consulta es peor que una sin precios. */
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
    <div className="bg-white">
      {/* ══════════════════════════ Navegación ══════════════════════════════
          Al bajar se convierte en una cápsula blanca translúcida. Arriba del
          todo va sin fondo: ahí está sobre el cielo, y un rectángulo blanco
          cortaría el degradado justo donde empieza. */}
      <header className="fixed inset-x-0 top-0 z-nav px-3 pt-[max(10px,var(--safe-top))] sm:px-5 sm:pt-3">
        <div
          className={cn(
            'mx-auto flex h-14 max-w-6xl items-center gap-4 rounded-2xl px-3 transition-all duration-300 sm:px-4',
            conFondo
              ? 'border border-black/[0.07] bg-white/85 shadow-[0_8px_30px_-12px_rgba(16,19,26,0.18)] backdrop-blur-xl'
              : 'border border-transparent',
          )}
        >
          <a href="#" className="flex shrink-0 items-center" aria-label="Playoff360, inicio">
            <Wordmark tone={conFondo ? 'tinta' : 'light'} size="sm" />
          </a>

          <nav className="mx-auto hidden items-center gap-7 lg:flex">
            {NAV.map(([id, texto]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={irA(id)}
                className={cn(
                  'text-[14.5px] font-medium transition-colors',
                  conFondo ? 'text-grisis hover:text-tinta' : 'text-white/80 hover:text-white',
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
                'hidden h-10 items-center rounded-xl px-3.5 text-[14px] font-semibold transition-colors sm:inline-flex',
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
                'h-9 whitespace-nowrap px-3 text-[13px] sm:h-10 sm:px-4 sm:text-[14px]',
                conFondo ? 'boton-azul' : 'boton-marca',
              )}
            >
              Empezar gratis
              <ArrowRight size={14} className="shrink-0" />
            </Link>

            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-label={menu ? 'Cerrar el menú' : 'Abrir el menú'}
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors lg:hidden',
                conFondo ? 'text-tinta hover:bg-black/[0.04]' : 'text-white hover:bg-white/10',
              )}
            >
              <ChevronDown
                size={18}
                className={cn('transition-transform duration-300', menu && 'rotate-180')}
              />
            </button>
          </div>
        </div>

        {/* El menú del móvil: una hoja debajo de la cápsula, no a pantalla
            completa. A pantalla completa se pierde dónde estabas. */}
        {menu && (
          <div className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-black/[0.07] bg-white/95 p-2 shadow-[0_18px_50px_-18px_rgba(16,19,26,0.3)] backdrop-blur-xl lg:hidden">
            {NAV.map(([id, texto]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={irA(id)}
                className="block rounded-xl px-3 py-2.5 text-[15px] font-medium text-tinta transition-colors hover:bg-black/[0.04]"
              >
                {texto}
              </a>
            ))}
            <Link
              to="/entrar"
              className="mt-1 block rounded-xl px-3 py-2.5 text-[15px] font-medium text-grisis transition-colors hover:bg-black/[0.04] sm:hidden"
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </header>

      <main>
        {/* ═══════════════════════════ Portada ═══════════════════════════════ */}
        <section id="plataforma" className="cielo-marca corte-diagonal relative overflow-hidden">
          {/* Dos formas sueltas y muy suaves, para que el degradado no sea
              plano. Sin bordes ni brillos: sólo luz. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-[12%] top-[8%] h-[46vw] w-[46vw] rounded-full opacity-60 blur-[90px]"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[10%] top-[32%] h-[38vw] w-[38vw] rounded-full opacity-50 blur-[90px]"
            style={{ background: 'radial-gradient(circle, rgba(54,200,255,0.75) 0%, rgba(54,200,255,0) 70%)' }}
          />

          <div className="relative mx-auto max-w-6xl px-5 pb-[clamp(72px,12vw,170px)] pt-[clamp(88px,11vw,136px)]">
            <div className="mx-auto max-w-[60rem] text-center">
              <Revelar>
                <span className="inline-flex items-center rounded-full border border-white/25 bg-white/12 px-3 py-1 text-[11.5px] font-semibold tracking-[0.02em] text-white backdrop-blur-md">
                  Para cuerpos técnicos de fútbol base
                </span>
              </Revelar>

              <Revelar delay={90}>
                {/* DOS LÍNEAS, NO CUATRO. A 38 px en un móvil de 390, «Tu
                    equipo. Tus decisiones.» se partía en dos y el titular
                    entero ocupaba cuatro renglones: deja de leerse de un
                    vistazo y empuja los botones fuera de la primera pantalla.
                    32 en el móvil y 64 en el escritorio, con el contenedor
                    ensanchado para que la primera línea quepa entera. */}
                <h1
                  className="mt-5 text-[32px] leading-[1.06] text-white sm:text-[52px] lg:text-[64px]"
                  style={{ fontWeight: 600, letterSpacing: '-0.04em' }}
                >
                  Tu equipo. Tus decisiones.
                  <br />
                  <span className="realce-claro">Todo bajo control.</span>
                </h1>
              </Revelar>

              <Revelar delay={180}>
                <p className="mx-auto mt-4 max-w-[22rem] text-[15px] leading-relaxed text-white/80 sm:mt-5 sm:max-w-[34rem] sm:text-[17.5px]">
                  Gestiona jugadoras, entrenamientos, partidos y estadísticas desde una única
                  plataforma. Menos trabajo administrativo. Más tiempo para el fútbol.
                </p>
              </Revelar>

              <Revelar delay={260}>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                  <Link to="/entrar" className="boton-marca h-12 px-5 text-[15px]">
                    Empieza gratis
                    <ArrowRight size={16} />
                  </Link>
                  <a
                    href="#funciones"
                    onClick={irA('funciones')}
                    className="boton-vidrio h-12 px-5 text-[15px]"
                  >
                    Descubre Playoff360
                  </a>
                </div>
              </Revelar>
            </div>

            {/* ── Las maquetas ───────────────────────────────────────────────
                EN EL MÓVIL NO ES LO MISMO ENCOGIDO. Tres tarjetas superpuestas
                en 390 px no se leen: se amontonan y queda una mancha. Ahí va
                una sola —la pizarra, que es lo que distingue a esto— y las
                demás aparecen a partir de tablet, cuando hay sitio de verdad
                para una composición. */}
            {/* El hueco de los lados no es decorativo: las tarjetas vuelan
                hacia fuera de la pizarra y necesitan sitio DENTRO de la
                ventana. Entre 768 y 1279 px el contenedor ya toca los bordes,
                así que se estrecha 80 px por lado y la pizarra encoge; a
                partir de 1280 sobra margen y se quita el relleno. Sin esto,
                en el iPad la tarjeta de la izquierda se sale de pantalla. */}
            <div className="mx-auto mt-10 max-w-5xl sm:mt-16 md:px-20 xl:px-0">
              <div className="relative">
                <Revelar delay={320}>
                  <div className="flota-a">
                    <MaquetaPizarra />
                  </div>
                </Revelar>

                <Revelar delay={420} className="hidden md:block">
                  <div className="flota-b absolute -left-[6%] bottom-[-14%] w-[40%] xl:-left-[10%] xl:w-[34%]">
                    <MaquetaPanel />
                  </div>
                </Revelar>

                <Revelar delay={500} className="hidden md:block">
                  <div className="flota-c absolute -right-[5%] top-[-9%] w-[36%] xl:-right-[9%] xl:w-[31%]">
                    <MaquetaAsistencia />
                  </div>
                </Revelar>

                <Revelar delay={580} className="hidden lg:block">
                  <div className="flota-b absolute -right-[8%] bottom-[-17%] w-[30%]">
                    <MaquetaJugadora />
                  </div>
                </Revelar>
              </div>
            </div>

            <p className="relative mt-10 text-center text-[11.5px] text-white/55 md:mt-24 lg:mt-32">
              Las pantallas muestran un equipo de ejemplo. Playoff360 empieza vacío.
            </p>
          </div>
        </section>

        {/* ══════════════════════ Todo en un solo lugar ══════════════════════ */}
        <section id="funciones" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-[clamp(56px,8vw,104px)] lg:pb-28">
            <Revelar className="max-w-[40rem]">
              <Rotulo>Una nueva forma de gestionar tu equipo</Rotulo>
              <Titular>
                Todo lo que necesitas.
                <br />
                En un solo lugar.
              </Titular>
            </Revelar>

            {/* Rejilla asimétrica: la primera ocupa dos huecos. Cuatro cajas
                iguales en fila son una plantilla; esto no. */}
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Revelar className="lg:col-span-2">
                <article className="flex h-full flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-black/[0.07] bg-marca-50 p-6 sm:p-8">
                  <div className="max-w-[30rem]">
                    <h3 className="text-[20px] font-semibold leading-snug tracking-[-0.02em] text-tinta sm:text-[23px]">
                      {AREAS[0].titulo}
                    </h3>
                    <Parrafo className="mt-2.5">{AREAS[0].texto}</Parrafo>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-marca-600">
                      <Check size={14} />
                      {AREAS[0].pie}
                    </p>
                  </div>
                  <MaquetaJugadora className="w-full max-w-[22rem] self-end" />
                </article>
              </Revelar>

              <Revelar delay={80}>
                <article className="flex h-full flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-black/[0.07] bg-[#F6F8FC] p-6 sm:p-8">
                  <div>
                    <h3 className="text-[20px] font-semibold leading-snug tracking-[-0.02em] text-tinta sm:text-[23px]">
                      {AREAS[3].titulo}
                    </h3>
                    <Parrafo className="mt-2.5">{AREAS[3].texto}</Parrafo>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-marca-600">
                      <Check size={14} />
                      {AREAS[3].pie}
                    </p>
                  </div>
                  <MaquetaAsistencia className="w-full" />
                </article>
              </Revelar>

              <Revelar delay={120}>
                <article className="h-full rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-8">
                  <h3 className="text-[20px] font-semibold leading-snug tracking-[-0.02em] text-tinta sm:text-[23px]">
                    {AREAS[1].titulo}
                  </h3>
                  <Parrafo className="mt-2.5">{AREAS[1].texto}</Parrafo>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-marca-600">
                    <Check size={14} />
                    {AREAS[1].pie}
                  </p>
                </article>
              </Revelar>

              {/* La ancha lleva maqueta. Una caja de dos columnas con tres
                  líneas de texto dentro deja un hueco que no se lee como aire:
                  se lee como que falta algo. */}
              <Revelar delay={200} className="lg:col-span-2">
                <article className="grid h-full items-center gap-6 rounded-3xl border border-black/[0.07] bg-[#F6F8FC] p-6 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <div className="min-w-0">
                    <h3 className="text-[20px] font-semibold leading-snug tracking-[-0.02em] text-tinta sm:text-[23px]">
                      {AREAS[2].titulo}
                    </h3>
                    <Parrafo className="mt-2.5">{AREAS[2].texto}</Parrafo>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-marca-600">
                      <Check size={14} />
                      {AREAS[2].pie}
                    </p>
                  </div>
                  <MaquetaCifras className="min-w-0" />
                </article>
              </Revelar>
            </div>
          </div>
        </section>

        {/* ════════════════════════ El producto ══════════════════════════════
            Capturas de la aplicación DE VERDAD, hechas con
            `pruebas/capturas.mjs` desde el producto montado. Por eso son
            oscuras: el producto es oscuro. Enseñar aquí una maqueta clara
            sería vender otra cosa, y la primera pantalla después de
            registrarse desmentiría la portada. */}
        <section className="bg-[#0B0E14]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <Revelar className="max-w-[40rem]">
              <Rotulo tono="claro">El producto</Rotulo>
              <h2
                className="mt-3 text-[30px] leading-[1.08] text-white sm:text-[40px] lg:text-[46px]"
                style={{ fontWeight: 600, letterSpacing: '-0.035em' }}
              >
                El control de tu equipo,
                <br />
                como nunca antes.
              </h2>
              <p className="mt-4 max-w-[36rem] text-[15px] leading-relaxed text-white/55 sm:text-[16.5px]">
                No es una maqueta. Son capturas de la aplicación, hechas automáticamente desde el
                producto montado para que no puedan quedarse viejas.
              </p>
            </Revelar>

            <Revelar delay={100} className="mt-12">
              <div className="relative">
                <div className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)]">
                  <img
                    src="/producto/analiticas.png"
                    alt="Panel de analíticas de Playoff360, con la asistencia por jugadora y por sesión."
                    loading="lazy"
                    decoding="async"
                    className="block w-full"
                  />
                </div>
                {/* El móvil, encima y a un lado. Fuera de pantallas pequeñas:
                    superpuesto en 390 px taparía la captura que acompaña. */}
                {/* -right-8 sólo a partir de 1280: por debajo el contenedor ya
                    ocupa toda la ventana y 32 px de salida desbordan la página. */}
                <div className="absolute -bottom-8 -right-2 hidden w-[22%] max-w-[180px] overflow-hidden rounded-[1.6rem] border-[6px] border-[#1A1F2B] shadow-[0_30px_70px_-24px_rgba(0,0,0,0.95)] md:block xl:-right-8">
                  <img
                    src="/producto/plantilla-movil.png"
                    alt="La plantilla, en el móvil."
                    loading="lazy"
                    decoding="async"
                    className="block w-full"
                  />
                </div>
              </div>
            </Revelar>
          </div>
        </section>

        {/* ══════════════════ Las tres historias ═════════════════════════════ */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl space-y-20 px-5 py-20 lg:space-y-28 lg:py-28">
            <Historia
              rotulo="Jugadoras"
              titulo="Conoce mejor a cada jugadora."
              texto="Dorsal, posición, pie, historial de asistencia y las valoraciones de cada sesión. La disponibilidad va aparte, con sus fechas y lo que puede o no puede hacer, porque una lesión no es un estado permanente."
              puntos={[
                'Ficha completa con historial',
                'Disponibilidad con fechas y limitaciones',
                'Importación desde CSV con vista previa',
              ]}
              maqueta={<MaquetaJugadora />}
            />
            <Historia
              invertida
              rotulo="Entrenamientos"
              titulo="Cada entrenamiento cuenta."
              texto="La sesión se monta por bloques con su duración, su material y su objetivo, tirando de la biblioteca de ejercicios. Al acabar se pasa lista en dos toques, y lo que no se registró se queda como «sin registrar», no como una falta."
              puntos={[
                'Bloques con duración y material',
                'Biblioteca de ejercicios reutilizable',
                'Seis estados de asistencia',
              ]}
              maqueta={<MaquetaPanel />}
            />
            <Historia
              ancha
              rotulo="Pizarra táctica"
              titulo="De la pizarra al campo."
              texto="Coloca a las jugadoras, muévelas en distintos instantes y dale a reproducir. El campo se mira desde donde haga falta —cenital, de banda, tras la portería— y la jugada se exporta a imagen o a vídeo para mandarla al grupo."
              puntos={[
                'Carrera, conducción, pase y desmarque',
                'Trayectorias curvas, a mano o con el tirador',
                'Exporta a imagen o a vídeo',
              ]}
              maqueta={<MaquetaPizarra />}
            />
          </div>
        </section>

        {/* ═══════════════════════ Para clubes ═══════════════════════════════ */}
        <section id="clubes" className="scroll-mt-24 border-t border-black/[0.06] bg-[#F6F8FC]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <Revelar className="max-w-[52rem]">
              <Rotulo>Para clubes</Rotulo>
              <Titular>
                Varios equipos. Un solo sitio,
                <br />
                y separado del resto.
              </Titular>
            </Revelar>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {PILARES.map(([titulo, texto], i) => (
                <Revelar key={titulo} delay={i * 70}>
                  <article className="h-full rounded-2xl border border-black/[0.07] bg-white p-6">
                    <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-tinta">
                      {titulo}
                    </h3>
                    <Parrafo className="mt-2 text-[14.5px]">{texto}</Parrafo>
                  </article>
                </Revelar>
              ))}
            </div>

            <Revelar delay={160} className="mt-10">
              <div className="rounded-2xl border border-black/[0.07] bg-white p-6 sm:p-8">
                <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-tinta">
                  Lo que no hace, dicho aquí
                </h3>
                <Parrafo className="mt-2 max-w-[48ch] text-[14.5px]">
                  Está en la portada y no en la letra pequeña. Descubrir un límite después de meter
                  la plantilla entera es lo que hace perder la confianza.
                </Parrafo>
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {NO_HACE.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-grisis">
                      <Minus size={14} className="mt-1 shrink-0 text-marca-400" />
                      <span className="min-w-0">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Revelar>
          </div>
        </section>

        <Precios planes={planes} />

        {/* ═══════════════════════════ Preguntas ═════════════════════════════ */}
        <section className="border-t border-black/[0.06] bg-white">
          <div className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
            <Revelar>
              <Rotulo>Preguntas</Rotulo>
              <Titular>Lo que se suele preguntar.</Titular>
            </Revelar>

            <div className="mt-10 border-t border-black/[0.08]">
              {FAQ.map(([p, r], i) => (
                <div key={p} className="border-b border-black/[0.08]">
                  <button
                    type="button"
                    onClick={() => setAbierta(abierta === i ? null : i)}
                    aria-expanded={abierta === i}
                    className="flex w-full items-start justify-between gap-5 py-5 text-left"
                  >
                    <span className="min-w-0 text-[16px] font-medium text-tinta">{p}</span>
                    <span className="mt-0.5 shrink-0 text-marca-600">
                      {abierta === i ? <Minus size={17} /> : <Plus size={17} />}
                    </span>
                  </button>
                  {abierta === i && (
                    <p className="max-w-[62ch] pb-6 text-[15px] leading-relaxed text-grisis">{r}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════ Cierre ══════════════════════════════ */}
        <section className="cielo-cierre relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[8%] -top-[20%] h-[40vw] w-[40vw] rounded-full opacity-45 blur-[90px]"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)' }}
          />
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center lg:py-32">
            <Revelar>
              <h2
                className="mx-auto max-w-[20ch] text-[30px] leading-[1.08] text-white sm:text-[44px]"
                style={{ fontWeight: 600, letterSpacing: '-0.035em' }}
              >
                El próximo paso de tu equipo empieza aquí.
              </h2>
              <p className="mx-auto mt-5 max-w-[34rem] text-[15.5px] leading-relaxed text-white/80 sm:text-[17px]">
                Empieza a gestionar tu equipo de una forma más sencilla, inteligente y organizada.
              </p>
              <div className="mt-8 flex justify-center">
                <Link to="/entrar" className="boton-marca h-12 px-6 text-[15px]">
                  Crear cuenta gratis
                  <ArrowRight size={16} />
                </Link>
              </div>
            </Revelar>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark tone="tinta" size="sm" />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-grisis">
            <Link to="/aviso-legal" className="transition-colors hover:text-tinta">Aviso legal</Link>
            <Link to="/privacidad" className="transition-colors hover:text-tinta">Privacidad</Link>
            <Link to="/entrar" className="transition-colors hover:text-tinta">Iniciar sesión</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────── Una historia ───────────────────────────────── */

function Historia({
  rotulo, titulo, texto, puntos, maqueta, invertida, ancha,
}: {
  rotulo: string;
  titulo: string;
  texto: string;
  puntos: string[];
  maqueta: React.ReactNode;
  invertida?: boolean;
  /** Para la pizarra, que necesita más sitio que una tarjeta estrecha. */
  ancha?: boolean;
}) {
  return (
    <Revelar>
      <div
        className={cn(
          'grid items-center gap-10 lg:gap-16',
          ancha ? 'lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]' : 'lg:grid-cols-2',
        )}
      >
        <div className={cn('min-w-0', invertida && 'lg:order-2')}>
          <Rotulo>{rotulo}</Rotulo>
          <Titular className="max-w-[16ch]">{titulo}</Titular>
          <Parrafo className="mt-4 max-w-[46ch]">{texto}</Parrafo>
          <ul className="mt-6 space-y-2.5">
            {puntos.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[14.5px] text-tinta">
                <span
                  className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-marca-600 text-white"
                  aria-hidden
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className="min-w-0">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={cn('min-w-0', invertida && 'lg:order-1')}>{maqueta}</div>
      </div>
    </Revelar>
  );
}

/* ─────────────────────────────── Precios ─────────────────────────────────── */

/**
 * Los planes, de la base de datos.
 *
 * NO HAY PRECIOS INVENTADOS. `plans.price_monthly` está a nulo porque todavía
 * no hay una decisión, así que donde iría la cifra pone lo que pasa de verdad:
 * que no se puede contratar. Poner «9 €/mes» de adorno en una portada es
 * publicidad engañosa, y además el día que el precio sea otro, alguien ya lo
 * habrá leído.
 *
 * Lo que trae cada plan tampoco se escribe aquí: sale de `todoLoQueTrae`, el
 * mismo catálogo que usa la pantalla de facturación dentro de la aplicación, y
 * ese catálogo sólo lista lo que está CONSTRUIDO. Una capacidad a medias no
 * aparece, por muy bien que vendiera.
 */
function Precios({ planes }: { planes: Plan[] | null }) {
  const NOMBRES: Record<string, string> = { free: 'Gratis', pro: 'Pro', max: 'Max' };
  const niveles = ['free', 'pro', 'max'] as const;
  const seVende = (planes ?? []).some((p) => p.contratable);
  const buscar = (t: string) => (planes ?? []).find((p) => p.tier === t);

  /** Cuántos equipos caben, dicho en una línea. `null` es sin límite. */
  const equiposDe = (n: number | null | undefined) =>
    n === null ? 'Equipos sin límite' : n === 1 ? 'Un equipo' : typeof n === 'number' ? `Hasta ${n} equipos` : null;

  return (
    <section id="precios" className="scroll-mt-24 border-t border-black/[0.06] bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <Revelar className="max-w-[44rem]">
          <Rotulo>Precios</Rotulo>
          <Titular>Hoy, todo gratis.</Titular>
          <Parrafo className="mt-4 max-w-[48ch]">
            No hay planes de pago decididos ni pasarela de cobro. Mientras no la haya, ningún plan
            cierra nada: las tres columnas dan lo mismo, y se dice en vez de disimularlo con
            tres listas iguales.
          </Parrafo>
        </Revelar>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {niveles.map((tier, i) => {
            const plan = buscar(tier);
            const destacado = tier === 'pro';
            const precio = importe(plan?.priceMonthly ?? null, plan?.currency ?? 'eur');
            const equipos = equiposDe(plan?.maxTeams);
            /* Gratis enseña TODO lo que hay construido. Los de arriba enseñan
               sólo lo que añadirían el día que se puedan contratar: repetir
               debajo de Pro las mismas diez líneas obliga a leerlas dos veces
               para descubrir que son las mismas. */
            const lista = tier === 'free' ? todoLoQueTrae('free', false) : loQueFalta(tier, true);

            return (
              <Revelar key={tier} delay={i * 80}>
                <article
                  className={cn(
                    'flex h-full flex-col rounded-3xl border p-6 sm:p-7',
                    destacado
                      ? 'border-marca-600/30 bg-marca-50 shadow-[0_20px_50px_-28px_rgba(8,104,249,0.45)]'
                      : 'border-black/[0.08] bg-white',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold uppercase tracking-[0.08em] text-grisis">
                      {plan?.name ?? NOMBRES[tier]}
                    </h3>
                    {destacado && (
                      <span className="rounded-full bg-marca-600 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.03em] text-tinta">
                    {tier === 'free' ? '0 €' : (precio ?? 'Sin precio')}
                  </p>
                  <p className="mt-1.5 text-[13px] text-grisis">
                    {tier === 'free'
                      ? 'Para siempre, sin tarjeta'
                      : precio
                        ? 'al mes'
                        : 'todavía no se puede contratar'}
                  </p>

                  {equipos && (
                    <p className="mt-4 border-t border-black/[0.07] pt-4 text-[14px] font-semibold text-tinta">
                      {equipos}
                    </p>
                  )}

                  <p className="mt-4 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-grisis">
                    {tier === 'free' ? 'Incluye' : 'Añadiría'}
                  </p>

                  {lista.length > 0 ? (
                    <ul className="mt-2.5 flex-1 space-y-2">
                      {lista.map((t) => (
                        <li key={t} className="flex items-start gap-2 text-[14px] leading-relaxed text-grisis">
                          <Check size={14} className="mt-1 shrink-0 text-marca-600" />
                          <span className="min-w-0">{t}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    /* Max hoy no añade ninguna función construida: lo que lo
                       distingue es cuántos equipos caben. Decirlo es mejor que
                       rellenar la tarjeta con promesas. */
                    <p className="mt-2.5 flex-1 text-[14px] leading-relaxed text-grisis">
                      Nada que no esté ya en Pro. Lo que cambia es cuántos equipos caben.
                    </p>
                  )}

                  <div className="mt-6">
                    {tier === 'free' ? (
                      <Link to="/entrar" className="boton-azul h-11 w-full text-[14.5px]">
                        Empezar gratis
                      </Link>
                    ) : (
                      <p className="rounded-xl border border-black/[0.08] bg-[#F6F8FC] px-3 py-2.5 text-center text-[13px] leading-relaxed text-grisis">
                        {seVende
                          ? 'Disponible desde la aplicación'
                          : 'Hoy ya lo tienes, sin pagar nada'}
                      </p>
                    )}
                  </div>
                </article>
              </Revelar>
            );
          })}
        </div>
      </div>
    </section>
  );
}
