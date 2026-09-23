# FFSP — Sistema para entrenadores

> **Menos gestión. Más tiempo para entrenar.**

Herramienta de trabajo del cuerpo técnico del Santa Ponsa CF: plantilla, entrenamientos, partidos,
disponibilidad y una **pizarra táctica animada**. Cada persona entra con su cuenta y ve
**únicamente los equipos que tiene asignados**.

**No hay datos de ejemplo.** La plataforma arranca vacía y se llena con el trabajo real del club.

---

## 1. Puesta en marcha

### Paso 1 — Crear el esquema en Supabase

En el panel de Supabase → **SQL Editor** → **New query**, pega y ejecuta, por este orden:

1. `supabase/migrations/0001_esquema_inicial.sql`
2. `supabase/migrations/0002_clubes_pizarra_y_seguimiento.sql`

Las dos son **idempotentes y aditivas**: se pueden ejecutar más de una vez, no borran tablas, no
vacían registros y no reinician nada. La 0002 añade clubes, invitaciones, lesiones, valoraciones,
asistencia por filas y jugadas de pizarra, y **conserva intactas** las columnas `jsonb` anteriores.

La 0002 termina con una consulta de comprobación que compara lo que había en `jsonb` con lo que se
ha copiado a las tablas nuevas. Si las cifras no coinciden, no sigas: avisa antes de tocar nada.

### Paso 2 — Autenticación

En **Authentication → Providers → Email**: deja **Email** activado y decide si quieres
**Confirm email**. Para un club pequeño suele ser más cómodo desactivarla.

Cuando ya estén todas las cuentas creadas, conviene **desactivar los registros nuevos** para que
nadie ajeno al club pueda crearse una cuenta: a partir de ahí se entra por invitación.

No hay proveedores sociales configurados y la interfaz no los ofrece.

### Paso 3 — La primera cuenta es la coordinadora

La primera persona que se registre queda como **coordinadora** (lo hace un trigger de la base de
datos). Es quien crea los equipos e invita al resto del cuerpo técnico.

### Paso 4 — Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # compilación de producción
```

---

## 2. Cómo se pone en marcha el club

1. **La coordinadora crea su cuenta** → queda como coordinadora.
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
| Sólo se ven los equipos asignados | `has_team_access(team_id)` sobre `team_staff` y `club_members` |
| Sólo la administración crea equipos y asigna | `is_coordinator()` / `is_club_admin(club_id)` |
| Las invitaciones las valida el servidor | `accept_invitation(token)` comprueba correo, caducidad y revocación |
| Tareas y avisos son estrictamente personales | `profile_id = auth.uid()` |

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
- **No tiene planes de pago ni pasarela**: no están decididos.

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
│   ├─ clubs        Clubes y pertenencia
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

- **Color:** navy mate `#101C2D` sobre blanco y `#F4F6F8`. Bordes `#DCE2E8`, texto secundario
  `#647184`. El color funcional (verde, ámbar, rojo) sólo cuando transmite información.
- **Sin adornos:** ni emojis, ni iconos decorativos por tarjeta, ni degradados, ni sombras
  exageradas, ni tarjetas gigantes redondeadas. Los iconos acompañan acciones, no decoran.
- **Tipografía contenida:** dentro de la aplicación no hay titulares enormes; manda la información.
- **Móvil:** navegación inferior con cuatro destinos y una hoja «Más» con todas las secciones.
- **Atajos:** `⌘K` búsqueda global · `⌘I` menú Crear · en la pizarra, espacio reproduce y las flechas
  mueven el cabezal.
