# La cámara de la pizarra

Antes el campo sólo se podía mirar de dos maneras, horizontal y vertical, y las
dos eran planas: el campo visto desde justo encima. Eso sirve para colocar
fichas, pero no se parece a lo que ve una entrenadora desde la banda, y hay
jugadas —una salida de portería, un córner— que sólo se entienden mirándolas
desde donde ocurren.

Ahora el campo está en el suelo de un espacio de tres dimensiones y la cámara lo
orbita: **gira** alrededor del centro y se **inclina** desde el cenit hasta casi
el césped. Con eso salen todas las vistas, incluidas las dos de antes, que no
son más que inclinación cero.

## Dónde está cada cosa

| Archivo | De qué se ocupa |
| --- | --- |
| `camara.ts` | Las cuentas. Proyectar, desproyectar, el encuadre y las vistas con nombre. **No dibuja nada.** |
| `Pitch.tsx` | El campo y sus porterías, punto por punto a través de la cámara. |
| `piezas.tsx` | Las fichas: jugadoras, balón, conos, picas, zonas, porterías sueltas. |
| `BoardStage.tsx` | La pantalla: interacción, arrastre, trayectorias, orden de profundidad. |
| `lienzo.ts` | El mismo dibujo sobre un lienzo, para grabar el vídeo. |
| `Vista.tsx` | El mando: vistas con nombre, inclinación y giro. |

## Las cuentas

El campo se centra (`a = x − largo/2`, `b = y − ancho/2`) y se gira un ángulo ψ:

```
u = a·cos ψ − b·sen ψ      (hacia la derecha de la pantalla)
w = a·sen ψ + b·cos ψ      (hacia abajo; lo lejano es w negativo)
```

La cámara se pone a distancia D del centro, inclinada θ respecto de la vertical.
Para un punto `(u, w, z)` —z es la altura sobre el césped, en metros—:

```
zc = D − w·sen θ − z·cos θ
sx = D·u / zc
sy = D·(w·cos θ − z·sen θ) / zc
```

La distancia focal se fija **igual a D** a propósito: con θ = 0 y ψ = 0 queda
`sx = u`, `sy = w`, es decir el dibujo plano de siempre. Y la vista cenital se
atajan incluso las restas del centrado, porque `(68/12 − 34) + 34` no vuelve al
mismo número en coma flotante y bastaba ese error del decimal quince para que
una jugada guardada no abriera idéntica.

`D` vale 2,6 veces el radio del campo. Es el único número con criterio aquí: más
bajo exagera la perspectiva y el fondo se hace diminuto; más alto la aplana
hasta que no se nota. Con la inclinación al máximo, la línea de fondo lejana
mide el 68 % de la cercana.

La inclinación se recorta a 62°. Por encima, el fondo se va al infinito y el
campo deja de ser utilizable.

## Qué se proyecta punto a punto y qué no

**El campo y sus porterías, sí.** Son lo grande, y ahí un atajo se vería. Las
rectas siguen siendo rectas bajo una proyección proyectiva, así que de un
rectángulo bastan sus cuatro esquinas; los círculos y los arcos **no**, y se
trocean en polilíneas.

**Las fichas, no.** Cerca de un punto la proyección se comporta de una manera
muy simple y basta con tres números que da la cámara:

- lo **tumbado** en el césped se achata en vertical por `aplanado` (cos θ);
- lo que tiene **altura** sube en pantalla `alzado` (sen θ) por cada metro;
- lo alineado con el campo gira `vuelta` grados.

Así cada ficha se dibuja una vez en coordenadas propias y se coloca con un
`translate` y un `scale`, y la reproducción sigue costando lo mismo que antes:
mover un atributo por ficha y por fotograma.

El error de ese atajo es tratar cada pieza como si toda ella estuviera a la
distancia de su centro. Para una ficha de dos metros no se nota. Para lo más
grande que se puede poner —una zona de 30 × 20 en un campo de fútbol 7, con la
cámara al máximo— el lado de atrás sale un 8 % más grande de lo que debería: un
paralelogramo donde tocaría un trapecio. Medido y aceptado.

## El encuadre

La caja sale de las cuatro esquinas del campo con su margen. Pero el césped no
es lo único que se dibuja: el larguero está a 2,44 m del suelo y, con la cámara
inclinada, sube en pantalla por encima de la línea de fondo. Sin contar con eso
la portería del fondo salía cortada —se vio—. En plano no hace falta, y así el
encuadre de siempre sigue siendo exactamente el de siempre.

## Las jugadas de antes

Una jugada guardada sólo tiene `vertical`. `camaraDe()` la traduce: sin
inclinación y, si estaba de pie, girada un cuarto de vuelta. La cámara nueva se
guarda en `scene.camara` y `parseScene` la valida a mano, porque viene de la
base de datos y un número disparatado mandaría el campo al infinito.

## Dos dibujos, una cámara

La pizarra se dibuja dos veces: en SVG para la pantalla y sobre un lienzo para
grabar el vídeo, porque serializar el SVG treinta veces por segundo no da el
tiempo. Dos dibujos es una fuente permanente de que uno se quede atrás.

Lo que de verdad se escapaba no eran los colores sino la **geometría**: cada
archivo tenía su manera de colocar el campo. Ahora los dos pasan por la misma
cámara y por los mismos colores, así que lo único que se repite es el trazo.
`pruebas/video.mjs` lo comprueba midiendo dónde cae cada mojón del campo en los
dos dibujos.

## Cómo se comprueba

```sh
npm run pizarra:camara   # las cuentas, sin navegador
npm run build && npm run preview
npm run pizarra          # las seis vistas en el navegador de verdad
npm run pizarra:video    # que el vídeo encuadre como la pantalla
```

Lo que más importa de `pizarra.mjs` no es que se vea bonito —eso hay que
mirarlo— sino que **siga siendo usable**: que al tocar una ficha se seleccione
esa ficha y no la de al lado, con el campo girado e inclinado. Si la cuenta de
ida y la de vuelta no encajaran, arrastrar se iría de sitio.
