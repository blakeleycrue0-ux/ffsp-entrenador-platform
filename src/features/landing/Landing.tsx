/**
 * Landing de producto — para enseñar el VLE a responsables de FFSP y a
 * entrenadores. Blanca, sobria, con el escudo como ancla y capturas
 * esquemáticas de la propia interfaz (no imágenes falsas de stock).
 */

import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Clock, MapPin,
  MessageSquare, Send, Shield, Sparkles, Users, UserSquare2,
} from 'lucide-react';
import { Crest, Wordmark } from '@/components/ui/Brand';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const MODULES = [
  { icon: UserSquare2, title: 'Planificación de sesiones', text: 'Constructor visual con biblioteca de ejercicios, línea de tiempo y duración calculada al vuelo.' },
  { icon: Users, title: 'Equipos y jugadores', text: 'Fichas completas, posiciones, disponibilidad, lesiones y evolución de cada jugador.' },
  { icon: ClipboardList, title: 'Asistencia en 30 segundos', text: 'Pasa lista desde el móvil en el campo. Marcar todos, corregir y guardar.' },
  { icon: MessageSquare, title: 'Convocatorias por WhatsApp', text: 'Selecciona, previsualiza el mensaje exacto y envía. Las respuestas se registran solas.' },
  { icon: CalendarDays, title: 'Calendario unificado', text: 'Entrenamientos, partidos y convocatorias en día, semana o mes. Exportable a tu calendario.' },
  { icon: BarChart3, title: 'Estadísticas útiles', text: 'Asistencia media, evolución y jugadores en riesgo. Sin gráficos innecesarios.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navegación */}
      <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Wordmark size="sm" />
          <nav className="hidden items-center gap-7 md:flex">
            {[
              ['Plataforma', '#plataforma'],
              ['Asistente IA', '#ia'],
              ['WhatsApp', '#whatsapp'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="text-[14px] text-ink-600 transition-colors hover:text-brand-800">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href="#plataforma" className="hidden text-[14px] font-medium text-ink-600 transition-colors hover:text-brand-800 sm:block">
              Conocer la plataforma
            </a>
            <Link
              to="/entrar"
              className="inline-flex h-10 items-center rounded-xl bg-brand-700 px-4 text-[14px] font-medium text-white shadow-brand transition-colors hover:bg-brand-800"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-brand-50/70 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-7 flex justify-center">
              <Crest size={92} />
            </div>
            <Badge tone="brand" className="mb-5">
              FFSP VLE · Santa Ponsa CF
            </Badge>
            <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[52px]">
              El centro de operaciones
              <br className="hidden sm:block" /> del entrenador.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-500 sm:text-[17.5px]">
              Planifica, gestiona, comunica y mejora desde un único lugar. Menos gestión, más tiempo para entrenar.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/entrar"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-700 px-7 text-[15px] font-medium text-white shadow-brand transition-all hover:-translate-y-0.5 hover:bg-brand-800"
              >
                Entrar <ArrowRight size={17} />
              </Link>
              <a
                href="#plataforma"
                className="inline-flex h-12 items-center rounded-xl border border-ink-200 bg-white px-6 text-[15px] font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-800"
              >
                Conocer la plataforma
              </a>
            </div>
            <p className="mt-5 text-[13px] text-ink-400">
              Versión de demostración con datos ficticios del club.
            </p>
          </div>

          {/* Maqueta del dashboard */}
          <div className="mx-auto mt-14 max-w-5xl">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Problema → solución */}
      <section className="border-y border-ink-200/70 bg-ink-50/50 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="section-title">El problema</p>
              <h2 className="mt-2 text-[26px] font-semibold leading-tight sm:text-[30px]">
                Un entrenador usa hoy diez herramientas distintas.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
                WhatsApp para avisar, el calendario del móvil para las horas, un Excel para la asistencia, PDFs sueltos
                con sesiones, notas para las convocatorias. Nada habla entre sí y todo el trabajo se hace dos veces.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['WhatsApp', 'Calendario', 'Notas', 'Excel', 'PDFs', 'Grupos', 'Documentos'].map((t) => (
                  <span key={t} className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[12.5px] text-ink-400 line-through">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="section-title">La solución</p>
              <h2 className="mt-2 text-[26px] font-semibold leading-tight sm:text-[30px]">
                Abre el VLE y lo sabes todo en cinco segundos.
              </h2>
              <ul className="mt-5 space-y-3">
                {[
                  'Qué tengo hoy y qué tengo mañana',
                  'Quién viene y quién falta',
                  'Qué entrenamiento tengo preparado',
                  'Quién está convocado y quién no ha confirmado',
                  'Qué tareas tengo pendientes',
                  'Cómo está evolucionando mi equipo',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-500" />
                    <span className="text-[14.5px] leading-relaxed text-ink-700">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section id="plataforma" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-title">La plataforma</p>
            <h2 className="mt-2 text-[28px] font-semibold leading-tight sm:text-[34px]">
              Todo el trabajo del entrenador, en un producto.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-500">
              Formación, entrenamientos, equipos, jugadores, partidos, convocatorias, asistencia, calendario y
              comunicación. Conectado entre sí, no en pestañas separadas.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.title} className="card card-hover p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 text-[15.5px] font-semibold">{m.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">{m.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* IA */}
      <section id="ia" className="border-y border-ink-200/70 bg-ink-50/50 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge tone="brand">FFSP Assistant</Badge>
            <h2 className="mt-4 text-[28px] font-semibold leading-tight sm:text-[34px]">
              Un asistente que conoce a tu equipo.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-500">
              No es un chat genérico. Consulta las asistencias reales, las lesiones y las posiciones de tu plantilla
              para prepararte la sesión, la convocatoria o el mensaje. Tú revisas y decides.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                '«Prepárame un entrenamiento de 90 minutos de presión tras pérdida»',
                '«¿Quién ha faltado a los últimos 5 entrenamientos?»',
                '«Prepara la convocatoria del sábado»',
                '«Escribe un WhatsApp para los padres»',
              ].map((q) => (
                <li key={q} className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="text-[14px] text-ink-700">{q}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[13px] leading-relaxed text-ink-400">
              El asistente nunca envía comunicación externa por su cuenta: siempre prepara un borrador que tú apruebas.
            </p>
          </div>

          <AssistantPreview />
        </div>
      </section>

      {/* WhatsApp */}
      <section id="whatsapp" className="py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2 lg:items-center">
          <WhatsAppPreview />
          <div className="lg:order-first">
            <Badge tone="success">Comunicación</Badge>
            <h2 className="mt-4 text-[28px] font-semibold leading-tight sm:text-[34px]">
              La convocatoria, enviada en dos pasos.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-500">
              Selecciona a los jugadores, revisa la vista previa exacta del mensaje y envía. Las respuestas
              «Voy / No puedo / Aún no lo sé» se registran automáticamente en la plataforma.
            </p>
            <div className="mt-6 space-y-3">
              {[
                ['Vista previa exacta', 'Ves el mensaje tal y como lo recibirán las familias, antes de enviarlo.'],
                ['Estados de entrega', 'Enviado, entregado, leído y respondido para cada destinatario.'],
                ['Plantillas del club', 'Convocatorias, horarios, cambios de campo y recordatorios listos para usar.'],
              ].map(([t, d]) => (
                <div key={t} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-pitch" />
                  <div>
                    <p className="text-[14.5px] font-medium text-ink-800">{t}</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-500">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-xl border border-sun/30 bg-sun/5 px-4 py-3 text-[13px] leading-relaxed text-[#8A5A10]">
              <strong className="font-semibold">Transparencia:</strong> en esta demostración la integración con WhatsApp
              Business no está conectada. La interfaz y la capa de integración están completas, y los envíos se marcan
              siempre como simulados — nunca decimos que un mensaje ha salido si no lo ha hecho.
            </p>
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="border-t border-ink-200/70 bg-brand-50/40 py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Crest size={60} className="mx-auto" />
          <h2 className="mt-6 text-[30px] font-semibold leading-tight sm:text-[38px]">
            Menos gestión. Más tiempo para entrenar.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-ink-500">
            Entra con un perfil de demostración y recorre la plataforma como lo haría un entrenador un martes a las 18:00.
          </p>
          <Link
            to="/entrar"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-700 px-7 text-[15px] font-medium text-white shadow-brand transition-all hover:-translate-y-0.5 hover:bg-brand-800"
          >
            Entrar en el VLE <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-200/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Wordmark size="sm" showSubtitle={false} />
          <p className="text-[12.5px] text-ink-400">
            FFSP VLE · Santa Ponsa CF · Temporada 2025/26 · Demostración de producto
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────── Maquetas de la propia interfaz ──────────────────── */

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
      <div className="flex items-center gap-2 border-b border-ink-200/80 bg-ink-50/70 px-4 py-2.5">
        <span className="flex gap-1.5">
          {['bg-ink-200', 'bg-ink-200', 'bg-ink-200'].map((c, i) => (
            <span key={i} className={cn('h-2.5 w-2.5 rounded-full', c)} />
          ))}
        </span>
        <span className="ml-3 rounded-md bg-white px-2.5 py-1 text-[11px] text-ink-400 ring-1 ring-ink-200">
          ffsp-vle.santaponsacf.com/app
        </span>
      </div>

      <div className="grid grid-cols-[190px_1fr] max-sm:grid-cols-1">
        <div className="border-r border-ink-200/70 p-3 max-sm:hidden">
          <Wordmark size="sm" showSubtitle={false} />
          <div className="mt-4 rounded-lg bg-brand-700 px-3 py-2 text-[12px] font-medium text-white">+ Crear</div>
          <div className="mt-3 space-y-0.5">
            {[
              ['Inicio', true], ['Mis equipos', false], ['Jugadores', false], ['Calendario', false],
              ['Planificaciones', false], ['Ejercicios', false], ['Mensajes', false], ['Asistente IA', false],
            ].map(([label, active]) => (
              <div
                key={label as string}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px]',
                  active ? 'bg-brand-50 font-medium text-brand-800' : 'text-ink-500',
                )}
              >
                {label as string}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-[17px] font-semibold text-ink-900">Hola, Toni 👋</p>
          <p className="mt-0.5 text-[12px] text-ink-500">Esto es lo que tienes preparado para hoy</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-200 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">Próximo entrenamiento</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-medium text-brand-800">Hoy</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-brand-700">Sub-17</p>
              <p className="text-[13.5px] font-semibold leading-tight text-ink-900">Táctica colectiva</p>
              <div className="mt-2.5 flex items-center gap-3 text-[11px] text-ink-500">
                <span className="flex items-center gap-1"><Clock size={11} /> 19:00</span>
                <span className="flex items-center gap-1"><MapPin size={11} /> Campo Municipal</span>
              </div>
              <div className="mt-3 flex gap-1">
                {[10, 15, 20, 25, 12, 8].map((w, i) => (
                  <div key={i} className="h-1.5 rounded-full bg-brand-200" style={{ flex: w }} />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-ink-200 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">Próximo partido</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-medium text-brand-800">Sábado</span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="flex-1 text-right text-[12px] font-semibold text-ink-900">Santa Ponsa CF</span>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-[9px] font-semibold text-brand-700">vs</span>
                <span className="flex-1 text-[12px] font-semibold text-ink-900">Atlético Palma</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-500">
                <span className="flex items-center gap-1"><Clock size={11} /> 17:30</span>
                <span className="flex items-center gap-1"><Shield size={11} /> Liga Nacional</span>
              </div>
            </div>

            <div className="rounded-xl border border-ink-200 p-3.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">Asistencia</span>
              <p className="mt-2 text-[20px] font-semibold leading-none text-ink-900">24 jugadores</p>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full">
                <div className="bg-pitch" style={{ width: '75%' }} />
                <div className="bg-sun" style={{ width: '17%' }} />
                <div className="bg-danger" style={{ width: '8%' }} />
              </div>
              <div className="mt-2 flex gap-3 text-[10.5px] text-ink-500">
                <span>18 confirmados</span><span>4 pendientes</span><span>2 ausentes</span>
              </div>
            </div>

            <div className="rounded-xl border border-ink-200 p-3.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">Convocatoria</span>
              <p className="mt-2 text-[20px] font-semibold leading-none text-ink-900">
                12 <span className="text-[13px] font-normal text-ink-400">/ 16 confirmados</span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: '75%' }} />
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1.5 text-[10.5px] font-medium text-brand-800">
                <Send size={11} /> Recordar a los 3 pendientes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
      <div className="flex items-center gap-3 border-b border-ink-200/80 px-5 py-3.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-700">
          <Sparkles size={15} className="text-white" />
        </span>
        <div>
          <p className="text-[13.5px] font-semibold text-ink-900">FFSP Assistant</p>
          <p className="text-[11px] text-ink-400">Contexto: Sub-17</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white">
            Prepárame un entrenamiento de 90 minutos para Sub-17 centrado en presión tras pérdida.
          </p>
        </div>
        <div className="flex gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50">
            <Sparkles size={13} className="text-brand-600" />
          </span>
          <div className="flex-1 space-y-2.5">
            <p className="rounded-2xl rounded-tl-md bg-ink-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-700">
              He preparado una sesión de 90 minutos con 7 bloques y progresión de carga. Revísala antes de guardarla.
            </p>
            <div className="overflow-hidden rounded-xl border border-ink-200">
              <div className="flex items-center justify-between border-b border-ink-100 bg-brand-50/40 px-3.5 py-2">
                <p className="text-[12px] font-semibold text-ink-900">Presión tras pérdida — 90′</p>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-800">1h 30′</span>
              </div>
              {[
                ['01', 'Activación articular + movilidad', '10′'],
                ['02', 'Rondo 5v2 a un toque', '15′'],
                ['03', 'Presión tras pérdida 6v6+3', '20′'],
                ['04', 'Juego reducido 7v7', '25′'],
              ].map(([n, t, d]) => (
                <div key={n} className="flex items-center gap-2.5 border-b border-ink-100 px-3.5 py-2 last:border-0">
                  <span className="grid h-5 w-5 place-items-center rounded bg-ink-100 text-[9.5px] font-semibold text-ink-500">{n}</span>
                  <span className="flex-1 truncate text-[12px] text-ink-700">{t}</span>
                  <span className="text-[11px] font-medium text-ink-500">{d}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <span className="rounded-lg bg-brand-700 px-3 py-1.5 text-[11.5px] font-medium text-white">Guardar entrenamiento</span>
              <span className="rounded-lg border border-ink-200 px-3 py-1.5 text-[11.5px] font-medium text-ink-600">Editar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
      <div className="flex items-center justify-between border-b border-ink-200/80 px-5 py-3.5">
        <p className="text-[13.5px] font-semibold text-ink-900">Vista previa del mensaje</p>
        <span className="rounded-full bg-sun/10 px-2.5 py-1 text-[10.5px] font-medium text-[#9A6412] ring-1 ring-inset ring-sun/25">
          No enviado
        </span>
      </div>
      <div className="bg-[#ECE5DD] p-5">
        <div className="rounded-xl rounded-tl-sm bg-white p-3.5 shadow-sm">
          <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink-800">
            {`*CONVOCATORIA*
Santa Ponsa CF — Sub-17

⚽ Santa Ponsa CF vs Atlético Palma
📅 Sábado 14 de marzo
🕐 17:30
📍 Campo Municipal

⏰ Citación: 16:15 — Vestuarios
👕 Equipación morada · medias moradas

*Convocados (16):*
1. Marc Ramis
2. Pau Coll
3. Joan Bauzá
4. Álex Serra
…

Confirmad asistencia respondiendo:
✅ Voy   ❌ No puedo   ❓ Aún no lo sé`}
          </p>
          <p className="mt-2 text-right text-[10px] text-ink-400">Vista previa · no enviado</p>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-ink-200/80 px-5 py-3.5">
        <Button size="sm" variant="outline">Editar</Button>
        <Button size="sm" variant="whatsapp" icon={<Send size={15} />}>
          Enviar por WhatsApp
        </Button>
      </div>
    </div>
  );
}
