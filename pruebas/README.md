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

## Los datos son falsos

`mock.mjs` intercepta las llamadas a Supabase y devuelve un club de ejemplo.
No toca la base de datos ni necesita sesión.
