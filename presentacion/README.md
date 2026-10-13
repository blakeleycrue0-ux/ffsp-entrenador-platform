# La presentación

`Playoff360.pdf` — dieciséis láminas de 1920 × 1080 que cuentan qué es
Playoff360, qué hace, qué no hace, cuánto cuesta, cómo está construido y en qué
punto está hoy.

## Cómo se rehace

```bash
npm run build && npx vite preview --port 4173   # hace falta para las capturas
DESTINO=presentacion/img node pruebas/capturas.mjs
node presentacion/construir.mjs
```

El segundo paso sólo hace falta cuando cambia el aspecto de la aplicación.

## Qué hay aquí

| Archivo | Qué es |
| --- | --- |
| `presentacion.html` | **El origen.** Cada `<section class="lamina">` es una página. Se edita esto, no el PDF. |
| `construir.mjs` | Lo imprime a PDF y comprueba que nada se sale ni se recorta. |
| `portada.jpg` | La portada, tal y como vino. 1920 × 1080. |
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
