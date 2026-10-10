/**
 * Aviso legal y privacidad.
 * ---------------------------------------------------------------------------
 * Los datos del titular no se inventan. Todo lo que debe aportar el club está
 * marcado como pendiente, de forma visible, para que nadie los dé por buenos.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wordmark } from '@/components/ui/Brand';
import { Button, Tag } from '@/components/ui';
import { decidir, decision } from '@/services/analitica';

/** Dato que el club tiene que facilitar antes de publicar. */
const Pendiente = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded border border-warn/35 bg-warn/8 px-1.5 py-0.5 text-sm text-warn">
    {children}
  </span>
);

/**
 * Cambiar de opinión sobre la medición, aquí mismo.
 *
 * NO ES UN ADORNO: retirar el consentimiento tiene que ser tan fácil como
 * darlo, y el aviso de abajo no vuelve a salir una vez respondido. Sin esto,
 * quien aceptara no tendría más forma de revocarlo que borrar los datos del
 * navegador, que no es «igual de fácil».
 *
 * Quitar el permiso NO descarga el script que ya esté cargado —eso no se puede
 * hacer sin recargar—, así que lo dice en vez de prometerlo: deja de medir a
 * partir de la próxima carga, y `visita()` ya no manda nada desde este mismo
 * momento porque pregunta por la decisión antes de cada envío.
 */
function ElegirMedicion() {
  const [ahora, setAhora] = useState<'si' | 'no' | null>(() => decision());

  const cambiar = (d: 'si' | 'no') => () => {
    decidir(d);
    setAhora(d);
  };

  return (
    <div className="mt-4 rounded-lg border border-line bg-raised/60 px-4 py-3.5">
      <p className="text-base text-ink-800">
        {ahora === 'si'
          ? 'Ahora mismo: la medición de visitas está aceptada en este navegador.'
          : ahora === 'no'
            ? 'Ahora mismo: la medición de visitas está rechazada en este navegador.'
            : 'Todavía no has respondido al aviso en este navegador, así que no se está midiendo nada.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <Button size="sm" variant={ahora === 'si' ? 'primary' : 'quiet'} onClick={cambiar('si')}>
          Aceptar la medición
        </Button>
        <Button size="sm" variant={ahora === 'no' ? 'primary' : 'quiet'} onClick={cambiar('no')}>
          Rechazarla
        </Button>
      </div>
      {ahora === 'no' && (
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          Si acababas de aceptarla en esta misma visita, el script de Google ya está cargado en esta
          pestaña y no se puede descargar sin recargar la página. No se le envía nada más desde
          ahora, y al recargar no se vuelve a pedir.
        </p>
      )}
    </div>
  );
}

export default function LegalPage() {
  const { pathname } = useLocation();
  const privacy = pathname.includes('privacidad');

  return (
    <div className="min-h-screen bg-panel">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/">
            <Wordmark size="sm" />
          </Link>
          <Link
            to={privacy ? '/aviso-legal' : '/privacidad'}
            className="text-sm text-ink-700 underline underline-offset-2 hover:text-ink-900"
          >
            {privacy ? 'Aviso legal' : 'Privacidad'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {privacy ? 'Política de privacidad' : 'Aviso legal'}
          </h1>
          <Tag tone="warn">Pendiente de revisión</Tag>
        </div>

        <div className="rounded-md border border-warn/30 bg-warn/6 px-4 py-3 text-base leading-relaxed text-ink-800">
          Este texto está redactado pero <strong>no está completo ni revisado</strong>. Los datos
          marcados en amarillo los debe aportar el club antes de publicar la web, y el conjunto debe
          revisarlo alguien con criterio jurídico. Hasta entonces no puede considerarse un documento
          legal válido.
        </div>

        <div className="mt-8 space-y-7 text-base leading-relaxed text-ink-800 [&_h2]:text-lg [&_h2]:font-semibold">
          <section>
            <h2>Titular</h2>
            <ul className="mt-2 space-y-1.5">
              <li>
                Denominación: <Pendiente>razón social del club</Pendiente>
              </li>
              <li>
                Identificación fiscal: <Pendiente>CIF / NIF</Pendiente>
              </li>
              <li>
                Domicilio: <Pendiente>dirección postal completa</Pendiente>
              </li>
              <li>
                Contacto: <Pendiente>correo electrónico de contacto</Pendiente>
              </li>
              <li>
                Inscripción registral: <Pendiente>registro y número, si procede</Pendiente>
              </li>
            </ul>
          </section>

          {privacy ? (
            <>
              <section>
                <h2>Qué datos se tratan</h2>
                <p className="mt-2">
                  La plataforma almacena los datos que el cuerpo técnico introduce para gestionar los
                  equipos: nombre, dorsal, posición, fecha de nacimiento, teléfono y correo de la
                  jugadora o de sus tutores legales, disponibilidad, asistencia a entrenamientos,
                  convocatorias, minutos y anotaciones del cuerpo técnico, incluidos los partes de
                  lesión.
                </p>
                <p className="mt-2">
                  De quien accede a la plataforma se guarda el correo electrónico, el nombre y el rol
                  dentro del club. Las contraseñas las gestiona el proveedor de autenticación y nunca
                  son visibles para el club ni para la plataforma.
                </p>
              </section>

              <section>
                <h2>Datos de menores</h2>
                <p className="mt-2">
                  Cuando la jugadora es menor de edad, los datos de contacto corresponden a sus
                  tutores legales y su tratamiento requiere el consentimiento de estos.{' '}
                  <Pendiente>procedimiento de recogida del consentimiento</Pendiente>
                </p>
              </section>

              <section>
                <h2>Para qué se usan</h2>
                <p className="mt-2">
                  Únicamente para la gestión deportiva de los equipos: planificar entrenamientos,
                  convocar, registrar asistencia y hacer seguimiento de la temporada. No se usan con
                  fines comerciales, no se ceden a terceros ni se utilizan para elaborar perfiles
                  automáticos.
                </p>
                <p className="mt-2">
                  Las anotaciones de lesión sirven para que el cuerpo técnico sepa con quién puede
                  contar. <strong>La plataforma no emite diagnósticos ni recomendaciones médicas.</strong>
                </p>
              </section>

              <section>
                <h2>Quién puede verlos</h2>
                <p className="mt-2">
                  El acceso está limitado por equipo: cada persona del cuerpo técnico sólo puede ver
                  los datos de los equipos que tiene asignados. La restricción se aplica en el
                  servidor, no en la interfaz. Los datos de contacto sólo aparecen dentro de la ficha
                  individual.
                </p>
              </section>

              <section>
                <h2>Dónde se guardan</h2>
                <p className="mt-2">
                  Los datos se alojan en la infraestructura de Supabase.{' '}
                  <Pendiente>región de alojamiento y contrato de encargado de tratamiento</Pendiente>
                </p>
              </section>

              <section>
                <h2>Cuánto tiempo se conservan</h2>
                <p className="mt-2">
                  <Pendiente>plazos de conservación que fije el club</Pendiente> Una jugadora que deja
                  el equipo se archiva para conservar el historial deportivo de la temporada; su
                  supresión definitiva se realiza a petición.
                </p>
              </section>

              {/* ── LO QUE SÍ SALE DE AQUÍ ────────────────────────────────
                  Arriba dice que los datos no se ceden a terceros, y eso es
                  cierto de los datos de las jugadoras. Pero hay dos terceros
                  que intervienen en la web pública y en el cobro, y no
                  nombrarlos dejaría esa frase incompleta. */}
              <section>
                <h2>Cookies y medición de visitas</h2>
                <p className="mt-2">
                  La web pública —la portada, la pantalla de entrada y estos textos— puede medir
                  cuántas visitas recibe con Google Analytics, que para ello guarda una cookie en el
                  navegador. Sólo se carga si se acepta en el aviso que aparece abajo la primera vez;
                  mientras no se acepta, no se solicita nada a Google y no se guarda ninguna cookie.
                </p>
                <p className="mt-2">
                  <strong>Dentro de la aplicación no se mide nada.</strong> Ni visitas, ni pantallas,
                  ni acciones. Las direcciones de dentro contienen identificadores de fichas y
                  sesiones, y no se envían a ningún tercero. De las páginas públicas se envía
                  únicamente la ruta, sin parámetros ni fragmento, y la medición no se usa para
                  publicidad ni para elaborar perfiles.
                </p>
                <p className="mt-2">
                  No se usan cookies de publicidad ni de redes sociales. La sesión de quien entra en
                  la aplicación se mantiene con almacenamiento del propio navegador, que es necesario
                  para el funcionamiento y no se puede desactivar sin impedir el acceso.
                </p>
                <ElegirMedicion />
              </section>

              <section>
                <h2>Pagos</h2>
                <p className="mt-2">
                  Si se contrata un plan de pago, el cobro lo procesa Stripe. Los datos de la tarjeta
                  se introducen en una página de Stripe y{' '}
                  <strong>no pasan en ningún momento por esta plataforma</strong>, que no los recibe
                  ni los almacena. De la suscripción se guarda aquí el plan, su estado y las fechas
                  de renovación. Las facturas las conserva Stripe.{' '}
                  <Pendiente>contrato con Stripe y datos fiscales del titular</Pendiente>
                </p>
              </section>

              <section>
                <h2>Derechos</h2>
                <p className="mt-2">
                  Puede solicitarse el acceso, la rectificación, la supresión, la limitación, la
                  portabilidad y la oposición al tratamiento escribiendo a{' '}
                  <Pendiente>correo de contacto para ejercer derechos</Pendiente>. También puede
                  presentarse una reclamación ante la Agencia Española de Protección de Datos.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2>Objeto</h2>
                <p className="mt-2">
                  Este sitio es la herramienta de trabajo del cuerpo técnico del club para gestionar
                  equipos, entrenamientos, partidos y disponibilidad. El acceso está restringido a las
                  personas autorizadas por el club.
                </p>
              </section>

              <section>
                <h2>Condiciones de uso</h2>
                <p className="mt-2">
                  Cada cuenta es personal e intransferible. Quien accede se compromete a usar la
                  plataforma para la gestión deportiva del club y a tratar con confidencialidad los
                  datos de jugadoras y familias a los que tenga acceso.
                </p>
              </section>

              <section>
                <h2>Propiedad intelectual</h2>
                <p className="mt-2">
                  El escudo y los signos distintivos del club pertenecen a su titular. El resto del
                  contenido de la plataforma pertenece a{' '}
                  <Pendiente>titular de los derechos sobre el software</Pendiente>.
                </p>
              </section>

              <section>
                <h2>Responsabilidad</h2>
                <p className="mt-2">
                  La plataforma registra la información que introduce el cuerpo técnico. No genera
                  valoraciones médicas ni previsiones automáticas, y la exactitud de los datos
                  registrados es responsabilidad de quien los introduce.
                </p>
              </section>

              <section>
                <h2>Legislación aplicable</h2>
                <p className="mt-2">
                  <Pendiente>jurisdicción y legislación que determine el club</Pendiente>
                </p>
              </section>
            </>
          )}
        </div>

        <p className="mt-10 border-t border-line pt-5 text-sm text-muted">
          Última revisión: pendiente. Este documento no debe publicarse como definitivo hasta que se
          completen los datos marcados y lo revise el club.
        </p>
      </main>
    </div>
  );
}
