# Playoff360 — Sistema para entrenadores

> **Menos gestión. Más tiempo para entrenar.**

Herramienta de trabajo para el cuerpo técnico de **cualquier club**: plantilla, entrenamientos,
partidos, disponibilidad y una **pizarra táctica animada**.

Cada club es independiente: sus equipos, jugadoras, ejercicios y jugadas no son visibles para
ningún otro. Dentro del club, cada persona ve **sólo los equipos que tiene asignados**. El
aislamiento lo aplican las políticas de la base de datos, no la interfaz.

**No hay datos de ejemplo.** La plataforma arranca vacía y se llena con el trabajo real del club.

---

## 1. Puesta en marcha

### Paso 1 — Crear el esquema en Supabase

En el panel de Supabase → **SQL Editor** → **New query**, pega y ejecuta, por este orden:

1. `supabase/migrations/0001_esquema_inicial.sql`
2. `supabase/migrations/0002_clubes_pizarra_y_seguimiento.sql`
3. `supabase/migrations/0003_aislamiento_por_club.sql`
4. `supabase/migrations/0004_cerrar_funciones_publicas.sql`
5. `supabase/migrations/0005_ver_el_equipo_recien_creado.sql`
6. `supabase/migrations/0006_planes_y_suscripciones.sql`
7. `supabase/migrations/0007_anadir_el_nivel_max.sql` — **sola, y esperando a que termine**
8. `supabase/migrations/0008_tres_planes.sql`

Las ocho son **idempotentes y aditivas**: se pueden ejecutar más de una vez, no borran tablas, no
vacían registros y no reinician nada.

- La **0002** añade clubes, invitaciones, lesiones, valoraciones, asistencia por filas y jugadas de
  pizarra, y **conserva intactas** las columnas `jsonb` anteriores.
- La **0003** aísla cada club del resto. Antes de cerrar el acceso reparte la pertenencia, de modo
  que nadie pierde lo que ya veía.
- La **0004** retira del API pública las funciones de autorización. Supabase publica como REST toda
  función de `public`, así que `is_club_admin` o `create_club` eran invocables sin sesión. Sólo
  cambia permisos, no toca datos.
- La **0005** arregla que crear un equipo fallara siempre. Sólo redefine políticas de `teams`,
  diciendo lo mismo que antes pero leyéndolo de la fila. Ver abajo.
- La **0006** añade los planes (`plans`) y la suscripción de cada club (`subscriptions`), y hace
  que el límite de equipos lo imponga la base de datos, no la pantalla. `subscriptions` **no tiene
  ninguna política de escritura**: nadie puede ascenderse a sí mismo desde el navegador, ni con la
  sesión de quien administra el club. Sólo la escribe el webhook de Stripe, que corre en el
  servidor con la clave de servicio. Los planes se crean sin precio a propósito: mientras no haya
  uno decidido, la aplicación no enseña ninguna cifra ni deja contratar.
- La **0007** va aparte por una razón de PostgreSQL, no por capricho: se puede
  añadir un valor a un `enum` dentro de una transacción, pero **no se puede usar
  en esa misma transacción**. Si se pegara junto con la 0008, la fila del plan
  `max` fallaría con «unsafe use of new value of enum type».
- La **0008** deja los tres planes: Gratis con un equipo, Pro con cinco y Max sin
  límite. Como el límite es un dato y no código, son tres filas: la política que
  lo impone no se toca. Un club que ya tuviera siete equipos los **conserva
  todos** — el límite sólo se mira al crear uno nuevo, y bajar de plan no borra
  nada.

> **Una política no debe consultar su propia tabla.** Guardar con `.select()` es `RETURNING`, y
> devolver la fila recién escrita exige pasar la política de SELECT. Si esa política llama a una
> función `stable` que vuelve a buscar la fila en la misma tabla, la función trabaja con la
> instantánea del principio de la sentencia, donde esa fila **todavía no existe**: responde que no
> y tumba la escritura entera, con un error que parece de permisos. Las políticas tienen que
> decidir con las columnas que la fila ya trae (`club_id`, `created_by`, `team_id`).

> **El esquema tiene que estar vacío.** Las migraciones usan `create table if not exists`, de modo
> que si ya existen tablas llamadas `profiles`, `teams` o `players` con otras columnas, se saltarán
> en silencio y quedará un híbrido que arranca y falla por dentro. Si el proyecto viene de otro
> intento, retira su esquema antes.

Cada una termina con una consulta de comprobación. **Si alguna cifra no cuadra, para y avisa**
antes de seguir.

### Paso 2 — Autenticación

En **Authentication → Providers → Email**: deja **Email** activado y decide si quieres
**Confirm email**. Para un club pequeño suele ser más cómodo desactivarla.

Cuando ya estén todas las cuentas creadas, conviene **desactivar los registros nuevos** para que
nadie ajeno al club pueda crearse una cuenta: a partir de ahí se entra por invitación.

No hay proveedores sociales configurados y la interfaz no los ofrece.

### Paso 3 — Cada club se crea a sí mismo

Quien se registra y todavía no pertenece a ningún club **crea el suyo** al entrar y queda como su
administración. Desde ahí crea los equipos e invita al resto del cuerpo técnico.

Nadie recibe autoridad por el simple hecho de registrarse primero: la autoridad viene de ser
administración de un club concreto, y sólo alcanza a ese club.

### Paso 4 — Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # compilación de producción
```

### Paso 5 — Cobros (sólo si se va a cobrar)

Sin estas variables la aplicación funciona entera en plan gratuito: un equipo por club. No se cae
ni avisa de nada raro; simplemente no se puede contratar.

En **Netlify → Site configuration → Environment variables**:

| Variable | Para qué |
|---|---|
| `STRIPE_SECRET_KEY` | Crear la sesión de pago y abrir el portal. |
| `STRIPE_WEBHOOK_SECRET` | Comprobar que el aviso de Stripe es de Stripe y no de cualquiera. |
| `SUPABASE_URL` | Proyecto sobre el que escribe el webhook. |
| `SUPABASE_SERVICE_ROLE_KEY` | Escribir `subscriptions`, que nadie más puede tocar. |

Las cuatro son **de servidor**. Ninguna lleva el prefijo `VITE_`, y ésa es toda la diferencia: Vite
sólo mete en el navegador lo que empieza por `VITE_`. La clave de servicio salta la seguridad por
filas entera, así que si aparece alguna vez en el navegador hay que rotarla, no taparla.

Después, en Stripe:

1. Crear los productos **Pro** y **Max**, cada uno con dos precios, mensual y anual,
   **con los importes que se decidan**.
2. Guardar sus identificadores en la tabla `plans`, una fila por plan:
   `update plans set stripe_price_monthly = 'price_…', stripe_price_yearly = 'price_…',
   price_monthly = <céntimos>, price_yearly = <céntimos> where tier = 'pro';`
   (y lo mismo con `where tier = 'max'`).
3. Apuntar el webhook a `https://<dominio>/.netlify/functions/stripe-webhook` con los eventos
   `checkout.session.completed` y `customer.subscription.*`.

Hasta que el paso 2 esté hecho, la pantalla de plan dice «Precio por decidir» y no deja pagar. Es
deliberado: preferimos eso a enseñar una cifra inventada.

---

## 2. Cómo se pone en marcha el club

1. **Alguien crea su cuenta y, al entrar, su club** → queda como administración de ese club.
2. **Crea los equipos** de la temporada en *Equipo técnico → Crear equipo*.
3. **Invita al cuerpo técnico** en *Equipo técnico → Invitaciones*: se genera un enlace con
   caducidad de 14 días, ligado a un correo. **La plataforma no envía correos**: el enlace lo
   comparte quien invita.
4. Al aceptar la invitación, esa persona entra ya con su equipo asignado.
5. Cada entrenadora **añade su plantilla** (una a una o importando un `.csv`) y empieza a trabajar.

---

## 3. Secciones

| Sección | Qué hay |
|---|---|
| **Inicio** | Lo que toca hoy: próximo entrenamiento, próximo partido, última asistencia |
| **Calendario** | Entrenamientos y partidos en una agenda, con exportación `.ics` |
| **Plantilla** | Fichas, dorsales, posiciones, importación desde hoja de cálculo |
| **Disponibilidad y lesiones** | Partes con fechas, limitaciones y seguimiento |
| **Entrenamientos** | Sesiones con sus bloques, material y asistencia |
| **Biblioteca de ejercicios** | Ejercicios del club, con esquema animado |
| **Pizarra táctica** | Jugadas animadas, guardadas y compartidas con el club |
| **Partidos** | Convocatorias, resultados y notas |
| **Analíticas** | Asistencia y participación calculadas sobre lo registrado |
| **Equipo técnico** | Equipos, roles e invitaciones (administración del club) |
| **Ajustes y ayuda** | Cuenta, permisos, preguntas frecuentes y comentarios |

---

## 4. La pizarra táctica

Es el centro del producto y funciona con un **motor basado en tiempo**:

- Las posiciones se calculan en cada fotograma a partir del reloj del navegador y se interpolan
  entre fotogramas clave. **No es una sucesión de imágenes** ni una cadena de temporizadores.
- La reproducción dura lo mismo a 30 que a 120 fotogramas por segundo, y **pausar y continuar no
  produce ningún salto**: al reanudar se reajusta el origen del tiempo.
- El **estado de reproducción está separado del de edición**: mover el cabezal no altera la jugada.
  Mientras se reproduce no se edita.
- Línea de tiempo con los fotogramas de cada objeto, cabezal arrastrable, velocidades 0,5× / 1× / 2×
  y bucle.
- Cada tramo dice qué es —carrera, conducción, pase o desmarque— y se dibuja con su propio trazo.
- Campo completo o medio, F11 y F7. Deshacer y rehacer.
- **Exportación a imagen** del instante actual. No exportamos vídeo: la grabación desde el navegador
  no es fiable en todos los equipos y preferimos no ofrecerlo hasta que lo sea.

---

## 5. Seguridad y privacidad

La protección **no está en la interfaz, está en la base de datos**. Todas las tablas tienen
seguridad por filas (RLS) activada:

| Regla | Cómo se aplica |
|---|---|
| Sin sesión no se lee ni una fila | Todas las políticas exigen `authenticated` |
| Un club no ve nada de otro club | Todo el acceso pasa por `club_members`; no hay ningún atajo global |
| Sólo se ven los equipos del club, y dentro de él los asignados | `has_team_access(team_id)` |
| Sólo la administración del club crea equipos y asigna | `is_club_admin(club_id)` / `can_manage_team(id)` |
| Sólo se ven los perfiles de quien comparte club | `shares_club_with(profile_id)` |
| Las invitaciones las valida el servidor | `accept_invitation(token)` comprueba correo, caducidad y revocación |
| Tareas y avisos son estrictamente personales | `profile_id = auth.uid()` |

**El cargo no da permisos.** `profiles.role` («Entrenadora», «Preparadora física»…) es descriptivo.
Quién puede administrar un club lo dice `club_members.role`, y lo comprueba el servidor en cada
consulta. Esto se verificó ejecutando las tres migraciones sobre un Postgres vacío y midiendo qué
ve cada persona: antes de la 0003 una entrenadora veía los equipos de otro club; después, sólo el
suyo, y el servidor rechaza escribir en el ajeno.

Aunque alguien manipule la aplicación en su navegador, **el servidor sigue sin devolverle datos de
equipos que no le corresponden**. Ocultar un botón no es autorización.

**Sobre la clave `anon`:** está en el código a propósito. Es una clave *publicable*, pensada para ir
en el navegador, y por sí sola no da acceso a nada — quien decide es RLS. Puede sustituirse por
variables de entorno (`.env`, ver `.env.example`).

---

## 6. Qué no hace

Está aquí porque preferimos decirlo antes de que se descubra usándola:

- **No envía mensajes ni correos** a las familias. Prepara las listas y tú las compartes.
- **No genera diagnósticos ni recomendaciones médicas.** Guarda lo que anota el cuerpo técnico.
- **No calcula métricas físicas, riesgo de lesión ni rendimiento predictivo.**
- **No convierte en ceros los datos que faltan.** Si no hay dato, dice que no hay dato.
- **No exporta la animación en vídeo**, sólo imagen.
- **No permite subir el escudo como archivo**: se pega la dirección de una imagen pública.
- **Todavía no se puede contratar ningún plan de pago**: la pasarela está montada y probada, pero
  **no hay precios decididos**. Hasta que lo haya, la aplicación no enseña ninguna cifra y el botón de
  contratar está desactivado. No hay ningún importe de ejemplo escondido en el código.

Las páginas legales están redactadas pero **marcadas como pendientes de revisión**: los datos del
titular (razón social, identificación fiscal, dirección, plazos de conservación) los debe aportar el
club, y el texto debe revisarlo alguien con criterio jurídico.

---

## 7. Arquitectura

```
src/
├─ types/           Modelo de dominio (espejo del esquema SQL)
├─ lib/             Utilidades sin dependencias (fechas, texto, CSV)
├─ services/
│   ├─ supabase     Cliente y traducción de errores a lenguaje comprensible
│   ├─ db           Espacio de trabajo: lo que se carga al entrar
│   ├─ auth         Sesión y comprobaciones de rol
│   ├─ clubs        Clubes: crear el propio, editarlo y saber a cuál perteneces
│   ├─ invitations  Invitaciones: crear, consultar, aceptar, anular
│   ├─ injuries     Partes de lesión y su seguimiento
│   ├─ plays        Jugadas de la pizarra
│   └─ calendar     Agenda unificada y exportación iCalendar
├─ store/           Estado (reducer) + selectores derivados
├─ components/      ui · layout · domain
└─ features/
    └─ board/       scene · playback · BoardStage · Timeline · BoardEditor
```

Dos reglas:

1. **Ningún componente importa `supabase` directamente.** Se escribe con `useClub().actions` o con
   un servicio, que primero guarda en el servidor y sólo después actualiza el estado local: la
   interfaz nunca muestra como guardado algo que la base de datos ha rechazado.
2. **El motor de la pizarra no conoce React.** `scene.ts` y `playback.ts` son funciones puras y un
   bucle de tiempo; los componentes sólo dibujan.

---

## 8. Diseño

- **La aplicación y la página pública no se rigen igual.** Dentro manda la información y no hay
  adornos; fuera hay que convencer a alguien que llega por primera vez. Lo de abajo, salvo donde
  se diga, describe la aplicación.
- **Dos marcas, sin mezclarlas:** la del producto (Playoff360) es igual para todos los clubes y es
  tipográfica, sin meter nada dentro de un cuadrado; la del club cambia en cada instalación y sin
  escudo subido se usan sus iniciales sobre navy, nunca un escudo genérico que no es de nadie. El
  símbolo suelto (`Aro`, el aro que el balón cierra) sólo se usa donde hace falta un icono
  cuadrado de verdad: la pestaña del navegador.
- **Color:** navy mate `#101C2D` sobre blanco y `#F4F6F8`. Bordes `#DCE2E8`, texto secundario
  `#647184`. El color funcional (verde, ámbar, rojo) sólo cuando transmite información. El verde de
  campo (`pitch`) es el acento de la marca y la página pública lo usa como tal.
- **Sin adornos:** ni emojis, ni iconos decorativos por tarjeta, ni degradados, ni sombras
  exageradas, ni tarjetas gigantes redondeadas. Los iconos acompañan acciones, no decoran. La
  página pública sí usa fondos oscuros, resplandores y titulares grandes: es lo único del producto
  que tiene que llamar la atención.
- **La página pública no inventa nada:** sus capturas son pantallas reales de la aplicación, que
  genera `herramientas/capturas.mjs` con un club de ejemplo. No hay testimonios, escudos de
  clientes, cifras de uso ni precios, porque nada de eso existe.
- **Tipografía contenida:** dentro de la aplicación no hay titulares enormes; manda la información.
- **Móvil:** navegación inferior con cuatro destinos y una hoja «Más» con todas las secciones.
- **Atajos:** `⌘K` búsqueda global · `⌘I` menú Crear · en la pizarra, espacio reproduce y las flechas
  mueven el cabezal.
