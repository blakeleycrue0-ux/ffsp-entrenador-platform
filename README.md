# FFSP — Sistema para entrenadores

> **Menos gestión. Más tiempo para entrenar.**

Plataforma de gestión para el cuerpo técnico del Santa Ponsa CF. Cada entrenadora entra con su
cuenta, ve **únicamente los equipos que tiene asignados** y monta ahí su trabajo: plantilla,
entrenamientos, partidos, convocatorias, asistencia y comunicación.

**No hay datos de ejemplo.** La plataforma arranca vacía y se llena con el trabajo real del club.

---

## 1. Puesta en marcha (una sola vez)

### Paso 1 — Crear las tablas en Supabase

Abre el panel de Supabase del proyecto → **SQL Editor** → **New query**, pega el contenido
completo de `supabase/migrations/0001_esquema_inicial.sql` y pulsa **Run**.

Eso crea las tablas, los tipos, los índices, las políticas de seguridad y las plantillas de
mensaje por defecto. Es idempotente: puede ejecutarse más de una vez sin romper nada.

### Paso 2 — Ajustar la autenticación

En **Authentication → Providers → Email**:

- Deja activado **Email**.
- Decide si quieres **Confirm email**. Con la confirmación activada, cada persona recibe un correo
  antes de poder entrar; sin ella, entra directamente. Para un club pequeño suele ser más cómodo
  desactivarla.

Cuando ya estén todas las cuentas creadas, en **Authentication → Sign In / Providers** conviene
**desactivar los registros nuevos** para que nadie ajeno al club pueda crearse una cuenta.

### Paso 3 — La primera cuenta es la coordinadora

La primera persona que se registre queda automáticamente como **coordinadora** (lo hace un trigger
de la base de datos). Es quien podrá crear equipos y asignar al resto del cuerpo técnico.

### Paso 4 — Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # compilación de producción
```

---

## 2. Cómo se pone en marcha el club

1. **La coordinadora crea su cuenta** → queda como coordinadora del club.
2. **Crea los equipos** de la temporada en *Gestión del club → Crear equipo*.
3. **Cada entrenadora crea su cuenta** desde la pantalla de acceso. Al entrar todavía no ve nada.
4. **La coordinadora le asigna su equipo** en *Gestión del club → Equipos → Asignar*.
5. A partir de ahí, cada entrenadora **sólo ve su equipo** y empieza a trabajar: añade jugadoras,
   planifica entrenamientos, crea partidos, convoca y pasa asistencia.

---

## 3. Seguridad y privacidad

La protección **no está en la interfaz, está en la base de datos**. Todas las tablas tienen
seguridad por filas (RLS) activada:

| Regla | Cómo se aplica |
|---|---|
| Sin sesión no se lee ni una fila | Todas las políticas exigen `authenticated` |
| Una entrenadora sólo ve sus equipos | `has_team_access(team_id)` comprueba `team_staff` |
| Sólo coordinación crea equipos y asigna | `is_coordinator()` en las políticas de `teams` y `team_staff` |
| Tareas y avisos son estrictamente personales | `profile_id = auth.uid()` |
| La biblioteca de ejercicios es del club | Lectura común; edición sólo de quien lo creó o coordinación |

Esto significa que, aunque alguien manipule la aplicación en su navegador, **el servidor sigue sin
devolverle datos de equipos que no le corresponden**.

**Sobre la clave `anon`:** está en el código a propósito. Es una clave *publicable*, pensada para
ir en el navegador, y por sí sola no da acceso a nada — quien decide es RLS. Puede sustituirse por
variables de entorno (`.env`, ver `.env.example`) para apuntar a otro proyecto.

---

## 4. Módulos

**Gestión** · Equipos · Jugadoras (fichas, posiciones, disponibilidad, lesiones, familias) ·
Calendario día/semana/mes con exportación `.ics` · Partidos · Convocatorias · Asistencia

**Formación** · Planificaciones con constructor visual arrastrable · Biblioteca de ejercicios ·
Editor táctico sobre campo · Generador de sesiones con IA

**Comunicación** · Mensajes con plantillas del club · Vista previa exacta de WhatsApp · Asistente IA

**Análisis** · Asistencia media, evolución y jugadoras a las que prestar atención

**Club** (sólo coordinación) · Crear equipos · Asignar cuerpo técnico · Gestionar roles

---

## 5. Arquitectura

```
src/
├─ types/           Modelo de dominio (espejo exacto del esquema SQL)
├─ services/
│   ├─ supabase     Cliente y traducción de errores a lenguaje comprensible
│   ├─ db           Único punto que habla con la base de datos (camelCase ↔ snake_case)
│   ├─ auth         Sesión de Supabase Auth y comprobaciones de rol
│   ├─ whatsapp     Composición de mensajes y capa de envío
│   ├─ ai           FFSP Assistant: intención → contexto del club → respuesta
│   └─ calendar     Agenda unificada y exportación iCalendar
├─ store/           Estado (reducer) + selectores derivados
├─ components/      ui · layout · domain
└─ features/        Una carpeta por módulo de producto
```

Regla: **ningún componente importa `supabase` directamente.** Escriben con `useClub().actions`,
que primero guarda en el servidor y sólo después actualiza el estado local — así la interfaz nunca
muestra como guardado algo que la base de datos ha rechazado.

---

## 6. Integraciones — qué está conectado y qué no

| Integración | Estado | Qué falta |
|---|---|---|
| **Supabase** (datos y acceso) | **Conectado** | Nada: ejecutar la migración |
| WhatsApp Business | Sin conectar | Credenciales del club: WhatsApp Cloud API con número verificado, token permanente y plantillas aprobadas por Meta |
| Asistente IA | Motor local | Clave de API de un modelo, para sustituir `localProvider` por `remoteProvider` en `services/ai.ts` |
| Calendario externo | Exportación `.ics` | Autorización OAuth para sincronización bidireccional |

Mientras WhatsApp no esté conectado, cada mensaje se guarda en la plataforma marcado como **no
enviado** y así se muestra en la interfaz. **Nunca se afirma que un mensaje ha salido si no lo ha
hecho.**

El asistente tampoco envía comunicación externa por su cuenta: prepara el borrador y el envío es
siempre una acción explícita desde la vista previa.

---

## 7. Diseño

- **Color:** lila `#653F8A`, extraído del escudo del Santa Ponsa CF, en escala de 50 a 900.
  Reservado para acciones principales, estados activos y progreso; el resto es blanco y grises.
- **Escudo:** se usa entero, con aire y sin recolorear.
- **Móvil:** navegación inferior, botón flotante de creación y hoja «Más» con todas las secciones.
- **Atajos:** `⌘K` búsqueda global · `⌘J` asistente · `⌘I` menú Crear.
