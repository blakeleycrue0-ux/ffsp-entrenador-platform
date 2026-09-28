# Cómo se coloca la interfaz

Este archivo existe porque la alternativa es que cada pantalla vuelva a
elegir sus propios números, que es exactamente lo que había antes: cinco
archivos con cinco distancias distintas para la misma separación, y en cuanto
una cambiaba, las otras cuatro se quedaban mal sin que nadie se enterara.

## Las medidas

Están en `src/styles/index.css`, dentro de `:root`, y se cambian ahí.

| Variable | Qué es |
| --- | --- |
| `--header-h` | Alto de la cabecera pegada arriba. |
| `--sidebar-w` | Ancho del menú lateral en escritorio. |
| `--nav-h` | Alto del dique flotante en móvil. En escritorio es `0`. |
| `--nav-gap` | Separación del dique al borde inferior. |
| `--safe-top` / `--safe-bottom` | Las zonas seguras del dispositivo. |
| `--sobre-nav` | Dónde empieza el dique contando desde abajo. Lo usa cualquier cosa que quiera quedarse por encima de él. |
| `--hueco-inferior` | Lo que la página deja libre al final para que su último renglón se lea entero. |
| `--pagina-x` / `--pagina-top` | Márgenes de la página. |

**Una pantalla no escribe ninguno de estos números a mano.** Si aparece un
`pb-[104px]` o un `bottom-[76px]` dentro de una pantalla, el fallo está en el
armazón, no en la pantalla.

## Quién pone el espacio

`AppShell` pone la cabecera, el ancho máximo, los márgenes laterales y el
hueco de abajo. Una pantalla sólo declara **cuánto ancho necesita**, con
`useAnchura(...)`, porque eso depende de la tarea y no del tamaño de la
pantalla:

- `formulario` (760 px) — se lee de un tirón: perfiles, editores, ajustes.
- `tabla` (1080 px) — listas con columnas: asistencia, partidos, facturación.
- `ancho` (1320 px) — plantillas, analíticas, calendarios.
- `completo` — la pizarra.

## Las capas

Tienen nombre, no número. En orden:

| Clase | Valor | Para qué |
| --- | --- | --- |
| `z-contenido` | 0 | La página. |
| `z-fijo` | 10 | Lo que se queda pegado dentro de su propio desplazamiento. |
| `z-flotante` | 20 | Barras y botones que flotan sobre la página. |
| `z-nav` | 30 | Cabecera, menú lateral y dique. |
| `z-velo` | 40 | El velo que apaga la aplicación detrás de una hoja. |
| `z-hoja` | 50 | Hojas, diálogos y menús contextuales. |
| `z-aviso` | 60 | Los avisos, que se ven incluso sobre una hoja. |

## El cristal es para lo que flota

`.cristal` va en el dique, la cabecera, las hojas, los diálogos, los menús y
las islas de la pizarra: cosas que se ponen ENCIMA de otra cosa. El contenido
normal —listas, cifras, formularios, titulares— va en el flujo del documento,
con `.panel` cuando agrupar añade algo y sin nada cuando no.

## Dos trampas de CSS que ya costaron caro

1. **`grid` sin columnas de base.** `grid gap-4 sm:grid-cols-2` deja por
   debajo de `sm` una única columna *automática*, que se dimensiona al
   contenido más largo. Con un nombre de club largo, una tarjeta medía 637 px
   dentro de una columna de 358. Siempre `grid-cols-1` de base.
2. **`<select>` con `w-auto`.** Un desplegable nativo crece hasta su opción
   más larga. `Select` lleva `max-w-full` para que no pueda.

## Cómo se comprueba

Dos guiones en el cuaderno de trabajo, que miden cajas y no capturas:

- `solapes.mjs` — trece pantallas por siete anchos (320 a 430) y dos altos,
  más escritorio. Busca desplazamiento horizontal, piezas fijas que se pisan,
  controles que siguen tapados cuando ya no se puede desplazar más, y texto
  que se sale de su caja.
- `contenido.mjs` — lo mismo con contenido que rompe: nombres de una letra,
  nombres de cincuenta caracteres, treinta jugadoras, ninguna y ningún equipo.
