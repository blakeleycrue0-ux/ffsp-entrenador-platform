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

## Los datos son falsos

`mock.mjs` intercepta las llamadas a Supabase y devuelve un club de ejemplo.
No toca la base de datos ni necesita sesión.
