# Los dos documentos

**`Playoff360.pdf`** — la presentación. Dieciséis láminas de 1920 × 1080 que
cuentan qué es Playoff360, qué hace, qué no hace, cuánto cuesta, cómo está
construido y en qué punto está hoy. Para enseñar.

**`Playoff360-administracion.pdf`** — la hoja de administración. A4 vertical,
en blanco y negro, para imprimir y rellenar a mano: las seis cuentas, las
claves (dónde viven y cómo se cambian), qué hacer si se filtra una, y la lista
con casillas de lo que falta para que todo sea legal. Interno.

## Cómo se rehacen

```bash
npm run build && npx vite preview --port 4173   # hace falta para las capturas
DESTINO=presentacion/img node pruebas/capturas.mjs
node presentacion/construir.mjs      # la presentación
node presentacion/imprimible.mjs     # la hoja de administración
```

El paso de las capturas sólo hace falta cuando cambia el aspecto de la
aplicación.

## En la hoja de administración no va ninguna clave

Van los nombres, para qué sirve cada una y dónde se cambia, con una línea en
blanco al lado para anotarla a mano. `imprimible.mjs` se niega a generar el PDF
si encuentra una credencial de verdad en el HTML —`sk_live_`, `rk_live_`,
`whsec_`, un JWT— y dice cuál. Este repositorio es público: lo que se guarde
aquí queda publicado.

## Qué hay aquí

| Archivo | Qué es |
| --- | --- |
| `presentacion.html` | **El origen.** Cada `<section class="lamina">` es una página. Se edita esto, no el PDF. |
| `construir.mjs` | Lo imprime a PDF y comprueba que nada se sale ni se recorta. |
| `portada.jpg` | La portada, tal y como vino. 1920 × 1080. |
| `administracion.html` | El origen de la hoja de administración. |
| `imprimible.mjs` | La imprime a A4 y se niega si encuentra una clave de verdad dentro. |
| `Playoff360-administracion.pdf` | Lo que se imprime y se rellena a mano. |
| `portada-a-jpeg.mjs` | La pasó de PNG de 2,4 MB a JPEG de 400 kB sin tocar un píxel. |
| `img/` | Las capturas, hechas desde la aplicación de verdad con el club de ejemplo. |
| `Playoff360.pdf` | Lo que se enseña. |

## Lo que no lleva

Ni número de clubes, ni testimonios, ni valoraciones, ni logotipos de nadie: no
existen. Las únicas cifras son los precios, que están en la tabla `plans`, y el
número de herramientas, que se cuentan mirando el producto.

Hay una lámina entera —la 15— dedicada a lo que **todavía no está construido**,
con su nombre. Es la misma lista que `services/entitlements.ts` marca como
`lista: false`, y por eso ninguna de esas funciones aparece anunciada ni en la
página de precios ni dentro de la aplicación.

## Dos cosas que hay que mantener a mano

1. **Los precios de la lámina 12 están escritos a mano.** Es el único sitio de
   todo el proyecto donde lo están: la portada y la aplicación los leen de la
   base de datos, pero un PDF no puede consultar nada. Si cambian en `plans`,
   hay que cambiarlos aquí.
2. **Las capturas de `img/` no son las de la portada.** `public/producto` es
   otra decisión y no se toca desde aquí; estas se rehacen con el `DESTINO` de
   arriba.
