/**
 * Página pública.
 * ---------------------------------------------------------------------------
 * Enseña el producto funcionando: la pizarra de la portada es la de verdad,
 * interactiva, y las capturas son pantallas reales de la aplicación con un
 * club de ejemplo.
 *
 * Lo que NO hay, y no es un descuido: cifras de uso, escudos de clubes,
 * premios, testimonios y precios. Nada de eso está verificado ni decidido, y
 * ponerlo sería mentir en la primera pantalla que ve alguien. Las tres cifras
 * que sí hay bajo la portada son hechos comprobables del producto, no
 * indicadores de tracción.
 *
 * SOBRE EL ASPECTO. Negro, blanco y grafito. Ni un color de marca. La portada
 * abre con el campo de partículas a pantalla completa y el titular abajo, no
 * centrado: centrado es lo que hace cualquier plantilla, y bajarlo deja que la
 * imagen respire y que la primera pantalla sea atmósfera en vez de texto.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Minus, Plus, Shield, Smartphone, Zap } from 'lucide-react';
import { Wordmark } from '@/components/ui/Brand';
import { Ambiente } from '@/components/visual/Particulas';
import { BoardDemo } from '@/features/board/BoardDemo';
import { cn } from '@/lib/utils';

/* ──────────────────────────── Aparición al bajar ──────────────────────────── */

/**
 * Aparece cuando entra en pantalla, y una sola vez. Si el sistema pide menos
 * movimiento, no hay animación: se muestra y punto.
 */
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
      { rootMargin: '0px 0px -12% 0px' },
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
        transform: visto ? 'none' : 'translateY(14px)',
        filter: visto ? 'none' : 'blur(5px)',
        transition: `opacity .8s cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     transform .8s cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     filter .8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ───────────────────────────────── Marcos ─────────────────────────────────── */

/** Marco de navegador. Sin los tres puntos de colores de siempre. */
function Ventana({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-line bg-surface',
        'shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-line-sutil bg-panel px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/14" />
          <span className="h-2 w-2 rounded-full bg-white/14" />
          <span className="h-2 w-2 rounded-full bg-white/14" />
        </span>
        <span className="mx-auto hidden rounded-md px-3 py-0.5 text-[11px] tracking-normal text-ink-500 sm:block">
          playoff360.site
        </span>
      </div>
      {children}
    </div>
  );
}

/** Marco de teléfono para las capturas verticales. */
function Telefono({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[2.1rem] border-[7px] border-ink-200 bg-ink-200',
        'shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]',
        className,
      )}
    >
      <img src={src} alt={alt} loading="lazy" decoding="async" className="block w-full" />
    </div>
  );
}

/* ──────────────────────────────── Contenido ───────────────────────────────── */

const CAPACIDADES = [
  {
    clave: 'pizarra',
    titulo: 'Pizarra táctica animada',
    texto:
      'Coloca a las jugadoras, muévelas en distintos instantes y dale a reproducir: las posiciones se calculan en cada fotograma a partir del reloj, así que el movimiento es continuo y al pausar no salta. El campo se mira desde donde haga falta —cenital, de banda, tras la portería— y se exporta a imagen o a vídeo.',
    imagen: '/producto/pizarra.png',
    detalles: ['Campo completo o medio, y en perspectiva', 'Carrera, conducción, pase y desmarque', 'Trayectorias curvas, a mano o con el tirador'],
  },
  {
    clave: 'plantilla',
    titulo: 'La plantilla, al día',
    texto:
      'Ficha de cada jugadora con su dorsal, su posición y su historial. La disponibilidad se lleva aparte, con sus fechas y sus limitaciones, y la importación desde CSV detecta duplicados antes de escribir nada.',
    imagen: '/producto/plantilla.png',
    detalles: ['Importar desde CSV con vista previa', 'Disponibilidad con fechas', 'Nada se guarda sin confirmar'],
  },
  {
    clave: 'entrenamientos',
    titulo: 'La semana, montada',
    texto:
      'Cada sesión se monta por bloques, con su duración, su material y su objetivo, tirando de la biblioteca de ejercicios. Pasar lista son dos toques en el campo: todas presentes y corriges las excepciones.',
    imagen: '/producto/entrenamientos.png',
    detalles: ['Biblioteca de ejercicios reutilizable', 'Seis estados de asistencia', '«Sin registrar» no es una ausencia'],
  },
  {
    clave: 'calendario',
    titulo: 'Todo en un calendario',
    texto:
      'Entrenamientos, partidos y convocatorias en una sola vista, para ver los choques antes de que ocurran. La convocatoria se prepara aquí y se copia para compartirla por donde ya habléis con el equipo.',
    imagen: '/producto/calendario.png',
    detalles: ['Exporta a tu calendario', 'Convocatoria lista para copiar', 'Por equipo, no revuelto'],
  },
  {
    clave: 'analiticas',
    titulo: 'Analíticas que no se inventan nada',
    texto:
      'La asistencia se calcula sólo sobre las sesiones con lista pasada en las que la jugadora podía estar. Una falta justificada, una lesión o una sesión sin registrar no cuentan como un cero: se escribe «sin datos» y se explica por qué.',
    imagen: '/producto/analiticas.png',
    detalles: ['Cada cifra explica su cálculo', 'Sin ceros inventados', 'Sin predicciones de rendimiento'],
  },
] as const;

/**
 * Tres hechos del producto, no indicadores de uso. No hay cifras de clubes ni
 * de usuarias porque no están verificadas, y poner una inventada en la primera
 * pantalla es la manera más rápida de no merecer la siguiente.
 */
const HECHOS = [
  ['6', 'áreas en un mismo espacio'],
  ['0 €', 'hoy, y sin pasarela de cobro'],
  ['14', 'días que dura una invitación'],
] as const;

const PILARES = [
  {
    icono: Shield,
    titulo: 'Cada club, aislado',
    texto:
      'El aislamiento lo imponen las políticas de la base de datos, no la interfaz. Esconder un botón no autoriza nada.',
  },
  {
    icono: Smartphone,
    titulo: 'En el campo, desde el móvil',
    texto:
      'Todo el trabajo cabe en el bolsillo y no hay que instalar ninguna aplicación. Se abre y ya está.',
  },
  {
    icono: Zap,
    titulo: 'Empieza vacía',
    texto:
      'Sin datos de mentira que luego hay que borrar. Se llena con el trabajo real de tu club desde el primer día.',
  },
];

const PASOS = [
  ['Crea tu cuenta y tu club', 'Quien lo crea queda como su administración. Un minuto.'],
  ['Monta los equipos y la plantilla', 'A mano o importando un CSV, con vista previa antes de escribir.'],
  ['Invita al cuerpo técnico', 'Un enlace ligado a un correo que caduca a los catorce días.'],
];

const NO_HACE = [
  'No envía mensajes ni correos a las familias.',
  'No genera diagnósticos ni recomendaciones médicas.',
  'No calcula métricas físicas ni rendimiento predictivo.',
  'No convierte en ceros los datos que faltan.',
  'No tiene planes de pago: no están decididos.',
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
  [
    '¿Cuánto cuesta?',
    'No hay planes de pago decididos ni pasarela de cobro, así que ahora mismo no cuesta nada y tampoco se puede pagar. Cuando haya una decisión se dirá aquí, no en la letra pequeña.',
  ],
];

/* ─────────────────────────────── Piezas ───────────────────────────────────── */

/** El botón principal: blanco con texto negro. Esto sustituye al azul. */
function Principal({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'metal-claro inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6',
        'text-md font-medium text-ink-0',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** El secundario: grafito con filo de luz. */
function Secundario({
  children, className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        'metal inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6',
        'text-md font-medium text-ink-800',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** El sello de arriba del titular. */
function Sello({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-600">
      <span className="h-1 w-1 rounded-full bg-ink-600" />
      {children}
    </span>
  );
}

/* ─────────────────────────────── Página ──────────────────────────────────── */

export default function Landing() {
  const [abierta, setAbierta] = useState<number | null>(0);
  const [activa, setActiva] = useState(0);
  const [conFondo, setConFondo] = useState(false);

  useEffect(() => {
    const alScroll = () => setConFondo(window.scrollY > 24);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  const irA = useCallback((id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const cap = CAPACIDADES[activa]!;

  return (
    <div className="bg-surface">
      {/* ── Navegación ─────────────────────────────────────────────────────
          Flota sobre el ambiente en una cápsula de grafito. Al bajar se cierra
          un poco más para que el texto de la página no se pise con ella. */}
      <header className="fixed inset-x-0 top-0 z-nav px-4 pt-[max(14px,var(--safe-top))]">
        <div
          className={cn(
            'mx-auto flex h-14 max-w-5xl items-center gap-5 rounded-2xl px-3 pl-4 transition-all duration-400 ease-suave',
            conFondo
              ? 'border border-line-sutil bg-surface/82 backdrop-blur-xl'
              : 'border border-transparent bg-transparent',
          )}
        >
          <a href="#" className="flex items-center" aria-label="Playoff360, inicio">
            <Wordmark tone="light" size="sm" />
          </a>

          <nav className="hidden items-center gap-6 text-sm text-ink-600 md:flex">
            {[
              ['producto', 'Producto'],
              ['pizarra', 'Pizarra'],
              ['limites', 'Límites'],
              ['preguntas', 'Preguntas'],
            ].map(([id, texto]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={irA(id)}
                className="transition-colors duration-250 ease-suave hover:text-ink-900"
              >
                {texto}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              to="/entrar"
              className="hidden h-9 items-center rounded-lg px-3.5 text-sm font-medium text-ink-700 transition-colors duration-250 ease-suave hover:text-ink-900 sm:inline-flex"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/entrar"
              className="metal-claro inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-ink-0"
            >
              Crear mi club
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Portada ────────────────────────────────────────────────────────
            Pantalla completa, el ambiente detrás y el titular ABAJO. Centrado
            vertical es lo que hace cualquier plantilla; bajarlo deja que la
            imagen respire y que lo primero que se ve sea atmósfera. */}
        {/* `min(100svh, 1000px)`: en una pantalla muy alta —un monitor girado,
            una tableta de pie— un alto de pantalla completa dejaba un vacío de
            metro y medio encima del titular. Con el tope, la portada deja de
            crecer y empieza antes la sección siguiente. */}
        <section className="relative flex min-h-[min(100svh,1000px)] flex-col justify-end overflow-hidden">
          <Ambiente intensidad={1} velo="abajo" />

          <div className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-32 sm:pb-20 lg:pb-24">
            <div className="animate-entra" style={{ animationDelay: '120ms' }}>
              <Sello>Para cuerpos técnicos</Sello>
            </div>

            <h1
              className="animate-entra mt-6 max-w-[16ch] text-4xl text-ink-900 sm:text-6xl lg:text-7xl"
              style={{ animationDelay: '240ms', fontWeight: 540 }}
            >
              Todo el cuerpo técnico.
              <br />
              Un solo espacio.
            </h1>

            <p
              className="animate-entra mt-6 max-w-[52ch] text-md text-ink-700 sm:text-lg"
              style={{ animationDelay: '380ms' }}
            >
              Plantilla, asistencia, entrenamientos, disponibilidad, partidos, rendimiento y
              pizarra táctica en un mismo sitio. Sin perder el contexto por el camino.
            </p>

            <div
              className="animate-entra mt-9 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '500ms' }}
            >
              <Principal to="/entrar">
                Crear mi club
                <ArrowRight size={16} />
              </Principal>
              <Secundario onClick={() => document.getElementById('producto')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver cómo funciona
              </Secundario>
            </div>

            {/* Tres hechos. No son indicadores de uso: son cosas que se pueden
                comprobar abriendo el producto. */}
            <dl
              className="animate-entra mt-14 grid max-w-2xl grid-cols-1 gap-x-10 gap-y-7 border-t border-line-sutil pt-8 sm:grid-cols-3"
              style={{ animationDelay: '640ms' }}
            >
              {HECHOS.map(([cifra, pie]) => (
                <div key={pie} className="min-w-0">
                  <dt className="cifra text-3xl">{cifra}</dt>
                  <dd className="mt-2 text-sm text-ink-600">{pie}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── La pizarra, funcionando de verdad ──────────────────────────── */}
        <section id="pizarra" className="scroll-mt-24 border-t border-line-sutil bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <Revelar>
              <p className="eyebrow">La pizarra</p>
              <h2 className="mt-3 max-w-[22ch] text-3xl text-ink-900 sm:text-4xl">
                No es un vídeo. Es el producto.
              </h2>
              <p className="mt-4 max-w-[58ch] text-md text-ink-700">
                Esta pizarra es la misma que hay dentro de la aplicación, con el mismo motor.
                Dale a reproducir.
              </p>
            </Revelar>

            <Revelar delay={120} className="mt-10">
              <BoardDemo tone="dark" />
            </Revelar>
          </div>
        </section>

        {/* ── Capacidades ───────────────────────────────────────────────── */}
        <section id="producto" className="scroll-mt-24 border-t border-line-sutil">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <Revelar>
              <p className="eyebrow">El producto</p>
              <h2 className="mt-3 max-w-[20ch] text-3xl text-ink-900 sm:text-4xl">
                Seis áreas que ya no viven en seis sitios.
              </h2>
            </Revelar>

            {/* Las pestañas son una fila de texto con una línea debajo, no una
                hilera de tarjetas: la navegación no tiene por qué ocupar como
                el contenido. */}
            <Revelar delay={80} className="mt-10 overflow-x-auto">
              <div className="flex min-w-max gap-1 border-b border-line-sutil">
                {CAPACIDADES.map((c, i) => (
                  <button
                    key={c.clave}
                    type="button"
                    onClick={() => setActiva(i)}
                    aria-pressed={i === activa}
                    className={cn(
                      'relative px-4 py-3 text-sm font-medium transition-colors duration-250 ease-suave',
                      i === activa ? 'text-ink-900' : 'text-ink-600 hover:text-ink-800',
                    )}
                  >
                    {c.titulo.split(',')[0]}
                    {i === activa && (
                      <span className="absolute inset-x-3 -bottom-px h-px bg-ink-900" />
                    )}
                  </button>
                ))}
              </div>
            </Revelar>

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14">
              <div className="min-w-0">
                <h3 className="text-2xl text-ink-900">{cap.titulo}</h3>
                <p className="mt-4 text-md leading-relaxed text-ink-700">{cap.texto}</p>
                <ul className="mt-7 space-y-3">
                  {cap.detalles.map((d) => (
                    <li key={d} className="flex gap-3 text-base text-ink-700">
                      <Check size={16} className="mt-1 shrink-0 text-ink-500" />
                      <span className="min-w-0">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Ventana className="min-w-0">
                <img
                  src={cap.imagen}
                  alt={`Pantalla de ${cap.titulo.toLowerCase()} en Playoff360`}
                  loading="lazy"
                  decoding="async"
                  className="block w-full"
                />
              </Ventana>
            </div>
          </div>
        </section>

        {/* ── En el móvil ───────────────────────────────────────────────── */}
        <section className="border-t border-line-sutil">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
              <Revelar className="min-w-0">
                <p className="eyebrow">A pie de campo</p>
                <h2 className="mt-3 max-w-[18ch] text-3xl text-ink-900 sm:text-4xl">
                  Lo que se usa de pie, con una mano.
                </h2>
                <p className="mt-4 max-w-[52ch] text-md text-ink-700">
                  Pasar lista, consultar una ficha o mirar la sesión del día no debería requerir
                  sentarse. No hay que instalar nada: se abre en el navegador del móvil y ya está.
                </p>
                <div className="mt-8 space-y-5 border-t border-line-sutil pt-7">
                  {PILARES.map((p) => (
                    <div key={p.titulo} className="flex gap-4">
                      <p.icono size={17} strokeWidth={1.6} className="mt-0.5 shrink-0 text-ink-500" />
                      <div className="min-w-0">
                        <p className="text-base font-medium text-ink-800">{p.titulo}</p>
                        <p className="mt-1 text-sm text-ink-600">{p.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Revelar>

              <Revelar delay={100} className="min-w-0">
                <div className="flex justify-center gap-4 sm:gap-6">
                  <Telefono
                    src="/producto/plantilla-movil.png"
                    alt="La plantilla en el móvil"
                    className="w-[46%] max-w-[230px] translate-y-5"
                  />
                  <Telefono
                    src="/producto/entrenamientos-movil.png"
                    alt="Los entrenamientos en el móvil"
                    className="w-[46%] max-w-[230px] -translate-y-5"
                  />
                </div>
              </Revelar>
            </div>
          </div>
        </section>

        {/* ── Cómo se empieza ───────────────────────────────────────────── */}
        <section className="border-t border-line-sutil">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <Revelar>
              <p className="eyebrow">Cómo se empieza</p>
              <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Tres pasos, y el club es tuyo.</h2>
            </Revelar>

            {/* Números grandes y una línea. Sin tarjetas: lo que ordena esto es
                la numeración, no un contenedor alrededor de cada paso. */}
            <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line-sutil bg-line-sutil sm:grid-cols-3">
              {PASOS.map(([titulo, texto], i) => (
                <li key={titulo} className="bg-surface p-7">
                  <Revelar delay={i * 90}>
                    <span className="cifra text-2xl text-ink-400">0{i + 1}</span>
                    <p className="mt-5 text-lg text-ink-900">{titulo}</p>
                    <p className="mt-2 text-sm text-ink-600">{texto}</p>
                  </Revelar>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Lo que no hace ────────────────────────────────────────────── */}
        <section id="limites" className="scroll-mt-24 border-t border-line-sutil">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Revelar className="min-w-0">
                <p className="eyebrow">Los límites</p>
                <h2 className="mt-3 max-w-[16ch] text-3xl text-ink-900 sm:text-4xl">
                  Lo que no hace, dicho aquí.
                </h2>
                <p className="mt-4 max-w-[48ch] text-md text-ink-700">
                  Está en la portada y no en la letra pequeña a propósito. Descubrir un límite
                  después de meter la plantilla entera es lo que hace perder la confianza.
                </p>
              </Revelar>

              <Revelar delay={100} className="min-w-0">
                <ul className="divide-y divide-line-sutil border-y border-line-sutil">
                  {NO_HACE.map((t) => (
                    <li key={t} className="flex items-start gap-3 py-4 text-base text-ink-700">
                      <Minus size={15} className="mt-1.5 shrink-0 text-ink-500" />
                      <span className="min-w-0">{t}</span>
                    </li>
                  ))}
                </ul>
              </Revelar>
            </div>
          </div>
        </section>

        {/* ── Preguntas ─────────────────────────────────────────────────── */}
        <section id="preguntas" className="scroll-mt-24 border-t border-line-sutil">
          <div className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
            <Revelar>
              <p className="eyebrow">Preguntas</p>
              <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Lo que se suele preguntar.</h2>
            </Revelar>

            <div className="mt-10 border-t border-line-sutil">
              {FAQ.map(([p, r], i) => (
                <div key={p} className="border-b border-line-sutil">
                  <button
                    type="button"
                    onClick={() => setAbierta(abierta === i ? null : i)}
                    aria-expanded={abierta === i}
                    className="flex w-full items-start justify-between gap-5 py-5 text-left"
                  >
                    <span className="min-w-0 text-md text-ink-900">{p}</span>
                    <span className="mt-0.5 shrink-0 text-ink-500">
                      {abierta === i ? <Minus size={16} /> : <Plus size={16} />}
                    </span>
                  </button>
                  {abierta === i && (
                    <p className="animate-fade-up max-w-[62ch] pb-6 text-base leading-relaxed text-ink-700">
                      {r}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cierre ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-line-sutil">
          <Ambiente intensidad={0.75} densidad={0.7} velo="centro" />
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center lg:py-32">
            <Revelar>
              <h2 className="mx-auto max-w-[18ch] text-3xl text-ink-900 sm:text-5xl">
                Empieza con tu club hoy.
              </h2>
              <p className="mx-auto mt-5 max-w-[46ch] text-md text-ink-700">
                Creas la cuenta, creas el club y empiezas a montar la semana. No cuesta nada y no
                hay nada que configurar antes.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Principal to="/entrar">
                  Crear mi club
                  <ArrowRight size={16} />
                </Principal>
                <Link
                  to="/entrar"
                  className="metal inline-flex h-12 items-center justify-center rounded-xl px-6 text-md font-medium text-ink-800"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </Revelar>
          </div>
        </section>
      </main>

      {/* ── Pie ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-line-sutil">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="min-w-0">
              <Wordmark tone="light" size="sm" />
              <p className="mt-3 max-w-[34ch] text-sm text-ink-600">
                El sistema de trabajo del cuerpo técnico, para cualquier club.
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-600">
              <a href="#producto" onClick={irA('producto')} className="hover:text-ink-900">
                Producto
              </a>
              <a href="#limites" onClick={irA('limites')} className="hover:text-ink-900">
                Límites
              </a>
              <a href="#preguntas" onClick={irA('preguntas')} className="hover:text-ink-900">
                Preguntas
              </a>
              <Link to="/entrar" className="inline-flex items-center gap-1 hover:text-ink-900">
                Entrar
                <ArrowUpRight size={13} />
              </Link>
              <Link to="/aviso-legal" className="hover:text-ink-900">
                Aviso legal
              </Link>
              <Link to="/privacidad" className="hover:text-ink-900">
                Privacidad
              </Link>
            </nav>
          </div>

          <p className="mt-10 border-t border-line-sutil pt-6 text-xs text-ink-500">
            © {new Date().getFullYear()} Playoff360
          </p>
        </div>
      </footer>
    </div>
  );
}
