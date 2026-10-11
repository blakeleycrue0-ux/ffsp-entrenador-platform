# Comprobaciones de maquetación

Miden **cajas**, no capturas. Una captura hay que mirarla y creerse lo que se
ve; una caja se compara con otra y el resultado es un sí o un no.

## Cómo se pasan

Hace falta la aplicación compilada y servida:

```sh
npm run build
npm run preview          # deja esto corriendo en otra terminal
npm run maqueta          # un ancho, rápido, para ir iterando
npm run maqueta:completo # los siete anchos y dos altos
npm run maqueta:contenido
npm run maqueta:fragmentos
```

Si Chromium no está donde Playwright lo busca, se le dice:
`CHROMIUM=/ruta/al/chrome npm run maqueta`.

## Qué comprueba `solapes.mjs`

Trece pantallas, siete anchos (320, 360, 375, 390, 393, 414 y 430) y dos
altos, más dos tamaños de escritorio:

- que la página no se desplace en horizontal;
- que las piezas fijas —cabecera y dique— no se pisen entre ellas;
- que nada quede tapado por la cabecera al abrir la pantalla;
- que ningún botón, enlace o campo **siga** debajo del dique cuando ya no se
  puede desplazar más (pasar por debajo mientras se desplaza es lo normal en
  una barra flotante; quedarse ahí, no);
- que ningún texto se salga de su caja.

## Qué comprueba `contenido.mjs`

Lo mismo, pero con contenido que rompe de verdad: un club con un nombre de
sesenta caracteres, jugadoras con nombre de una letra y con cincuenta, treinta
jugadoras, ninguna y ningún equipo. Los diseños se rompen con los extremos,
no con «Cadete A».

## Qué comprueba `fragmentos.mjs`

Esta no mide cajas: mide que la aplicación sobreviva a que una de sus partes
no llegue. Cada pantalla se descarga por separado, y cuando uno de esos
archivos falta —se publicó una versión nueva con la pestaña abierta, o se cayó
la red un segundo— caían **las trece secciones a la vez**, con un botón de
reintentar que no podía funcionar porque `React.lazy` se queda con la promesa
rechazada. Aquí se sirven ocho fragmentos como HTML, igual que hacía el
comodín del hosting, y se exige que:

- si los archivos nuevos sí están, se arregle sola: una recarga y ya;
- si siguen sin estar, no entre en bucle de recargas y diga la verdad, con un
  botón que recargue de verdad.

## Qué comprueba `cookies.mjs`

Esta no es de maquetación: es de palabra dada. La política de privacidad
promete cuatro cosas sobre la medición de visitas, y las cuatro se rompen con
un descuido de dos líneas:

- que **no se pida nada a Google antes de aceptar** —ni el script, ni la
  cookie—;
- que **rechazar sea igual de fácil que aceptar**: se miden los dos botones, y
  si uno se queda más pequeño, falla;
- que **dentro de `/app` no se mida nada**, porque las direcciones de dentro
  llevan identificadores de fichas de menores;
- que la dirección que se envía vaya **recortada**: sin consulta y sin
  fragmento, que es donde Supabase deja el token de un correo de recuperación.

```sh
npm run maqueta:cookies
```

Falló cuando tenía que fallar: el aviso de cookies arrancaba la medición por su
cuenta en cuanto veía un permiso guardado, también dentro de la aplicación. No
mandaba ninguna visita, pero pedía el script —y la petición lleva la dirección
entera en su cabecera `Referer`—. Lo cazó esta prueba, no una revisión.

## Qué comprueba `complejidad.mjs`

«Es demasiado complicada» es una opinión hasta que se cuenta. Esto la cuenta:
para cada pantalla, en un iPhone de 390 px, mide cuántas cosas se pueden
pulsar o escribir (**decisiones**), cuántas se pintan como «la» acción
(**principales**), cuántos huecos hay que rellenar (**campos**), en cuántas
cajas está repartido (**paneles**), cuánto hay que leer (**palabras**) y cuánto
mide de arriba abajo (**alto**).

No mide la cabecera, la pastilla del móvil ni las pestañas de la sección: están
en todas las pantallas de una sección por igual y falsearían la comparación.

Cada pantalla tiene su tope, y el tope no es un gusto: es el punto donde deja
de poder entenderse de un vistazo. Si algo lo pasa, no es que «sea rica en
funciones»: es que hay que repartirla en dos o guardar lo avanzado detrás de
«Más opciones».

Esta prueba es la que puso números al rediseño:

```
                      antes   después
Pasar lista              99        19     (y 0 → 1 acción principal)
Plantilla                28        24
Nuevo entrenamiento      27         7     (11 campos → 5)
Nuevo ejercicio          25         7     (2 principales → 1)
Nueva jugadora           24         7     (14 campos → 4)
Inicio                   15        11     (7 paneles → 2)
Equipo técnico           12        12     (3 principales → 1)
```

Y tiene un punto ciego que conviene recordar: en este Chromium, **lo que hay
dentro de un `<details>` cerrado sigue teniendo caja** —mide 324×48 y dice
`visibility: visible`—, así que la comprobación de siempre contaba los campos
guardados detrás de «Más opciones» como si estuvieran a la vista. Es justo lo
contrario de lo que esto mide.

## Qué comprueban `crear.mjs`, `lista.mjs` y `partido.mjs`

Las tres tareas que un entrenador hace de verdad: apuntar un entrenamiento,
pasar lista y preparar un partido. **No miran botones: miran lo que se escribe
en el servidor.** Si no sale un `POST`, no se ha creado nada, diga lo que diga
la pantalla.

```sh
npm run app:crear     # crear entrenamientos, uno o el trimestre entero
npm run app:lista     # pasar lista
npm run app:partido   # apuntar un partido y convocar
npm run app:complejidad
```

`crear.mjs` cubre lo que más se usa de todo esto: meter la temporada entera
marcando los días de la semana, **cada uno con su hora y su duración** —el
lunes a las 18:45 y el viernes a las 19:30 no es un caso raro—, y comprueba en
las veintisiete filas que llegan al servidor que todos los lunes van a su hora
y todos los viernes a la suya.

Las tres han encontrado cosas que nadie buscaba: `crear.mjs` vio que **pulsar
una casilla no hacía nada** en toda la aplicación (un `<label>` con un
`<button>` dentro: el navegador cambiaba el estado dos veces); `lista.mjs`, que
se podía estar pasando lista **de otro día** sin enterarse, porque la pantalla
no miraba la dirección; y `partido.mjs` se dio por buena a sí misma con el
identificador `nuevo`, que choca con la ruta `/app/partidos/nuevo` —el mock
mandaba a la ficha y se llegaba al formulario—.

## Qué comprueba `sin-azul.mjs`

El encargo decía dos cosas a la vez, y las dos son medibles: **dentro de la
plataforma no queda azul**, y **la portada sigue siendo azul**.

```sh
npm run app:sin-azul
```

Recorre las dieciocho pantallas de la aplicación más la de entrar y mira el
color **calculado** de cada elemento visible: fondo, texto, bordes, trazo,
relleno y los colores de la sombra. Un color cuenta como azul cuando su
componente azul se separa de las otras dos —`b − max(r, g) > 10`— y se ve de
verdad, es decir, su alfa llega a 0,12. Eso caza lo que no se ve en una
captura: el borde de un campo enfocado, el aro del foco del teclado, el punto
de un gráfico, un desplegable que sólo sale al tocarlo.

Y comprueba lo contrario en `/`: si alguien «limpia» el azul tocando un color
compartido, la portada se queda en gris y aquí salta. Es la red que sujeta la
única regla que no se negocia —**la portada no se toca**— mientras se repinta
todo lo demás.

## Qué comprueban `camara.mjs`, `pizarra.mjs` y `video.mjs`

La pizarra se mira desde donde se quiera: la cámara gira y se inclina. Eso son
cuentas, y las cuentas o cuadran o no:

```sh
npm run pizarra:camara   # sin navegador: proyectar, desproyectar, encuadre
npm run pizarra          # las seis vistas en el navegador
npm run pizarra:video    # que el vídeo encuadre igual que la pantalla
```

Lo que más importa de `pizarra.mjs` no es que se vea bonito —eso hay que
mirarlo— sino que **siga siendo usable**: que al tocar una ficha se seleccione
esa ficha y no la de al lado, con el campo girado e inclinado. Si la cuenta de
ida y la de vuelta no encajaran, arrastrar se iría de sitio y la pizarra no
serviría para nada. Con `CAPTURAS=<carpeta>` deja además una imagen por vista.

Hay un detalle en el que se cayó esta prueba y conviene recordar: durante un
rato **pasó mientras dibujaba siempre la vista cenital**, porque la escena
perdía la cámara al cargarse. Una prueba que pasa no vale nada si no se ha
comprobado que falla cuando tiene que fallar.

## Los datos son falsos

`mock.mjs` intercepta las llamadas a Supabase y devuelve un club de ejemplo.
No toca la base de datos ni necesita sesión.
