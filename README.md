# FFSP VLE — Sistema inteligente para entrenadores

> **Menos gestión. Más tiempo para entrenar.**

Centro de operaciones del entrenador de la FFSP / Santa Ponsa CF. Un único producto donde
planificar, gestionar el equipo, pasar asistencia, convocar, comunicar y analizar — en lugar de
repartir el mismo trabajo entre WhatsApp, el calendario del móvil, un Excel y un puñado de PDFs.

---

## 1. Qué resuelve

El entrenador abre la plataforma a las 18:00, antes del entrenamiento, y responde de un vistazo:

| Pregunta | Dónde se responde |
|---|---|
| ¿Qué tengo hoy y mañana? | Dashboard · Calendario |
| ¿Quién viene y quién falta? | Asistencia · Ficha de jugador |
| ¿Qué entrenamiento tengo preparado? | Planificaciones · detalle de sesión |
| ¿Cuándo es el próximo partido y quién está convocado? | Partidos · Convocatoria |
| ¿Quién no ha confirmado? | Dashboard · Convocatoria |
| ¿Tengo mensajes o tareas pendientes? | Notificaciones · Tareas |
| ¿Cómo evoluciona mi equipo? | Estadísticas |
| ¿Y si no quiero hacerlo a mano? | **FFSP Assistant** |

---

## 2. Módulos

**Gestión** · Equipos · Jugadores (fichas, posiciones, disponibilidad, lesiones) · Calendario
(día/semana/mes + exportación `.ics`) · Partidos · Convocatorias · Asistencia

**Formación** · Planificaciones con constructor visual arrastrable · Biblioteca de ejercicios ·
Editor táctico sobre campo · Generador de sesiones con IA

**Comunicación** · Mensajes y plantillas · Vista previa exacta e integración WhatsApp · Asistente IA

**Análisis** · Estadísticas de asistencia, evolución y jugadores en riesgo

---

## 3. Arquitectura

```
src/
├─ types/           Modelo de dominio (contrato único de datos)
├─ data/            Datos de demostración deterministas, anclados a la fecha actual
├─ services/        Integraciones aisladas de la UI
│   ├─ repository   Persistencia   (hoy localStorage → mañana API REST)
│   ├─ auth         Sesión, roles y permisos
│   ├─ whatsapp     Composición y envío de mensajes
│   ├─ ai           FFSP Assistant: intención → contexto del club → respuesta
│   └─ calendar     Agenda unificada y exportación iCalendar
├─ store/           Estado global (reducer tipado) + selectores derivados
├─ components/
│   ├─ ui/          Sistema de componentes neutro y reutilizable
│   ├─ layout/      Sidebar, topbar, navegación móvil, búsqueda global
│   └─ domain/      Estados, badges y micrográficos del dominio
└─ features/        Una carpeta por módulo de producto
```

Regla de separación: **la UI no conoce la persistencia y los servicios no conocen la UI.** Toda
la lógica derivada (asistencia media, próximos eventos, propuestas de convocatoria, búsqueda) vive
en `store/selectors.ts`, no en los componentes.

### Sustituir la capa de datos por un backend real

`services/repository.ts` es el único punto que toca el almacenamiento:

```ts
load()  → GET   /api/club
save()  → PATCH /api/club
reset() → restaurar datos de demostración
```

Cambiar esas tres funciones por llamadas HTTP no requiere tocar ni un componente.

---

## 4. Integraciones — qué está conectado y qué no

Este punto es deliberado: **la plataforma nunca finge que algo ha ocurrido.**

| Integración | Estado | Qué hay hecho | Qué falta |
|---|---|---|---|
| WhatsApp Business | **Sin conectar** | Interfaz completa, plantillas, vista previa exacta, estados de entrega y capa de transporte aislada | Credenciales del club (WhatsApp Cloud API: número verificado, token permanente y plantillas aprobadas por Meta) |
| Asistente IA | **Motor local** | Detección de intención, contexto real del club y respuestas accionables | Clave de API de un modelo para sustituir `localProvider` por `remoteProvider` |
| Calendario externo | **Exportación** | Agenda unificada y descarga `.ics` | Autorización OAuth para sincronización bidireccional |

Mientras WhatsApp no esté conectado, todo envío se registra dentro del VLE y se marca
explícitamente como simulación (`demo: true`), tanto en la interfaz como en el resultado del
servicio. El asistente indica siempre que usa el motor local.

**Regla de seguridad del asistente:** nunca envía comunicación externa por su cuenta. Prepara el
borrador; el envío es siempre una acción explícita del entrenador desde la vista previa.

---

## 5. Permisos y privacidad

- Un técnico sólo ve y edita los **equipos que tiene asignados** (`visibleTeams`); las rutas de
  detalle redirigen si el recurso no le pertenece.
- Los datos personales de jugadores y familias requieren el permiso `players.read.sensitive` y sólo
  aparecen dentro de la ficha individual: nunca en listados, búsquedas ni exportaciones.
- La arquitectura de roles (`entrenador`, `segundo entrenador`, `preparador físico`, `coordinador`,
  `director deportivo`, `administrador`) está definida en `types` y aplicada en `services/auth.ts`.

En la pantalla de acceso se puede entrar con distintos perfiles para comprobar cómo cambian los
permisos y los equipos visibles.

---

## 6. Diseño

- **Color:** lila `#653F8A`, extraído del escudo del Santa Ponsa CF, en escala completa de 50 a 900.
  Se reserva para acciones principales, estados activos, indicadores y progreso. El resto es blanco
  y grises.
- **Base:** blanco, mucho aire, sombras muy suaves, bordes finos, tarjetas de 14–18 px de radio.
- **Escudo:** se usa entero, con aire y sin recolorear. Marca de agua al 4,5 % en cabeceras.
- **Movimiento:** transiciones de 150–280 ms, sin animaciones decorativas; se respeta
  `prefers-reduced-motion`.
- **Móvil:** navegación inferior de cinco destinos, botón flotante de creación al alcance del pulgar
  y hoja «Más» con todas las secciones — en móvil no se esconde ninguna función.

---

## 7. Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # compilación de producción
npm run preview    # servir la compilación
```

**Atajos:** `⌘K` / `Ctrl+K` búsqueda global · `⌘J` / `Ctrl+J` asistente · `⌘I` / `Ctrl+I` menú Crear.

---

## 8. Datos de demostración

Todo el contenido es ficticio y se genera de forma determinista y **relativa a la fecha actual**,
de modo que siempre hay entrenamiento hoy, partido el fin de semana y convocatorias a medio
confirmar: 4 equipos, 89 jugadores, 12 ejercicios con esquemas tácticos, sesiones, partidos,
convocatorias, mensajes y 10 registros de asistencia.

Los cambios que se hagan se guardan en el navegador. **Configuración → Datos → Restaurar** devuelve
la plataforma a su estado inicial, útil antes de una demostración.
