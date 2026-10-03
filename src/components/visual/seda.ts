/**
 * La seda.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ SE VE. Una tela enorme, hecha de puntos microscópicos, que atraviesa el
 * encuadre. Entra por fuera y sale por fuera: no se ve entera nunca, y esa es
 * justo la idea —lo que no cabe en el cuadro es lo que hace que parezca
 * grande—. Se pliega, se retuerce, se pone de canto y vuelve a abrirse.
 *
 * QUÉ SE HA QUITADO PARA LLEGAR AQUÍ. Antes esto era un mapa de alturas: una
 * cota `z = h(x, y)` sobre un suelo, mirada desde arriba y de lado. Un mapa de
 * alturas SIEMPRE da lo mismo —una montaña, un terreno, un ecualizador— porque
 * tiene línea del horizonte: hay un suelo, y el suelo se ve. Da igual lo que se
 * afine el ruido; el bulto se queda.
 *
 * Lo de aquí no es un mapa de alturas. Es una SUPERFICIE PARAMÉTRICA, una cinta
 * con un eje que la recorre y una anchura que gira alrededor de ese eje:
 *
 *     P(u, v) = C(u) + v·W·E₁(u) + pliegue(u, v)·E₂(u)
 *
 * `C(u)` es el eje, que serpentea en las tres direcciones. `E₁` y `E₂` son los
 * dos ejes de la sección, que giran un ángulo φ(u) según se avanza. Ese giro es
 * todo: donde φ deja la anchura mirando a la cámara, la tela se ve de frente y
 * ancha; donde la deja apuntando al fondo, se ve DE CANTO, y ahí miles de
 * puntos se apilan en un filo de dos píxeles y el filo se pone blanco. Es lo
 * mismo que pasa con una sábana al aire, y es lo que no se puede fingir
 * pintando un degradado.
 *
 * No hay horizonte porque no hay suelo. No hay montaña porque no hay cota.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DE DÓNDE SALE LA DENSIDAD
 *
 * Los puntos se reparten regular en (u, v), que es el tejido, no la pantalla.
 * Lo que varía es cuánta pantalla ocupa cada trozo de tejido, y eso lo deciden
 * tres cosas a la vez:
 *
 *   · La perspectiva. El extremo cercano se abre y los puntos se separan
 *     —polvo—; el lejano se comprime y se juntan —membrana—.
 *   · El escorzo. De canto, un palmo de tela entra en un filo. Ahí se acumula.
 *   · La luz. Lo que mira a la luz se ve; lo que mira al otro lado, no.
 *
 * El dibujado es ADITIVO: cada punto suma su luz a los cuatro píxeles que toca.
 * Donde se apilan, la suma satura sola y aparece la membrana casi blanca. No
 * hay que pintarla: sale de que allí hay más tela por píxel.
 *
 * Y donde la cosa queda muy oscura, en vez de pintar un velo gris uniforme se
 * tira un dado: el punto se dibuja pocas veces pero más fuerte, con la
 * probabilidad justa para que la luz total sea la misma. Así lo tenue se ve
 * como lo que es —polvo suelto, puntos contables— y no como una niebla plana.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO CORRE
 *
 * Son del orden de cien mil puntos por fotograma. A ocho senos cada uno no
 * sale: serían millones de llamadas trigonométricas por segundo y el móvil se
 * arrastra. Todos los términos son de la forma `sin(a·v + b·u + ωt)`, así que
 * se parten:
 *
 *     sin(a·v + θ) = sin(a·v)·cos θ + cos(a·v)·sin θ
 *
 * Lo de `v` se tabula una vez al cambiar de tamaño. Lo de `u` se calcula una
 * vez por columna. **El bucle interior no tiene ni un seno**: multiplica y
 * suma. Las normales son analíticas por lo mismo —derivar esa expresión da
 * otra de la misma forma, y las piezas ya están calculadas—; con diferencias
 * finitas habría que evaluar la superficie tres veces por punto.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA RETÍCULA NO SE PUEDE VER
 *
 * Una malla regular se delata: aparecen las filas y las columnas y el resultado
 * parece una red de alambre. Pero si se desordena el muestreo punto a punto se
 * pierde la tabulación de arriba y con ella la velocidad.
 *
 * La salida: `RETICULAS` juegos de tablas en `v`, cada uno desplazado y con su
 * propio temblor, y cada columna coge el suyo por un revoltijo de su índice. La
 * `u` de cada columna también lleva su desplazamiento. Las tablas siguen siendo
 * ocho, el bucle interior sigue sin senos, y no hay dos columnas alineadas.
 */

export type OpcionesSeda = {
  /** Cuánta luz. 1 es lo normal. */
  intensidad?: number;
  /** Cuántos puntos, relativo a lo que decide el tamaño. */
  densidad?: number;
  /** Un solo fotograma y a parar, para quien ha pedido menos movimiento. */
  quieto?: boolean;
};

/* ─────────────────────────── La forma de la tela ────────────────────────── */

/* El eje y la anchura, en unidades de cámara (la cámara está en el origen
   mirando hacia +Z). Son medias longitudes: la tela va de −LARGO a +LARGO. */
const LARGO = 2.72;
const ANCHO = 1.88;

/* La profundidad. El extremo de la izquierda queda cerca y el de la derecha
   lejos, y de ahí salen los dos tamaños del mismo trozo de tela. */
const Z_MEDIO = 2.46;
const Z_PENDIENTE = 1.02;

/* El giro de la sección. `GIRO_LINEAL` es media vuelta larga de un extremo al
   otro: es lo que hace que la tela se abra, se ponga de canto y se vuelva a
   abrir sin repetirse. */
const GIRO_BASE = 0.62;
const GIRO_LINEAL = 1.72;
const GIRO_ONDA = 0.46;
const GIRO_ONDA_K = 2.15;

/* Los pliegues: dos ondas que cruzan la anchura y viajan a lo largo. La
   segunda es más apretada y más baja, que es lo que da el pliegue dentro del
   pliegue en vez de una sola panza. */
const P1 = 0.355, P1_V = 1.52, P1_U = 1.08;
const P2 = 0.138, P2_V = 3.40, P2_U = 2.35;

/* El serpenteo del eje. */
const EY1 = 0.300, EY1_K = 1.62;
const EY2 = 0.156, EY2_K = 2.84;
const EZ1 = 0.330, EZ1_K = 1.11;

/* Dónde está centrada la tela de arriba abajo, antes de proyectar. */
const Y_BASE = 0.115;

/* ── LAS VELOCIDADES ────────────────────────────────────────────────────────
   «Muy lento» no es lo mismo que «período largo», y confundirlos costó una
   vuelta entera. El giro tenía un período de ochenta y ocho segundos, que
   suena lentísimo; pero la amplitud mueve la tela de lado a lado, así que una
   doscientosava parte de ese ciclo ya desplazaba cada punto tres píxeles y
   medio en cuatro décimas. Medido: nueve píxeles por segundo. Eso no es una
   tela respirando, es una tela ondeando, y además rebaraja el moteado entero
   entre fotograma y fotograma —ruido de televisión encima de la seda—.
   Lo que se mide y lo que importa es LA VELOCIDAD EN PANTALLA, no el período:
   `pruebas/portada.mjs` busca el corrimiento que mejor empareja dos instantes
   separados diez segundos y lo pasa a píxeles por segundo. Con estos números
   sale alrededor de UNO, o sea cinco píxeles si se aparta la vista cinco
   segundos: se mueve, y cuesta decir que se mueve. Hay que resistirse a
   subirlos; el intermedio que parecía razonable daba dos y medio, y a esa
   velocidad la tela deja de respirar y empieza a ondear. */
const V_GIRO = 0.00716;
const V_P1 = 0.00904;
const V_P2 = 0.01272;
const V_EY1 = 0.00668;
const V_EY2 = 0.01088;
const V_EZ1 = 0.00796;

/* La luz: de arriba, un poco a la izquierda y un poco hacia la cámara. */
const LX = -0.3123, LY = 0.7808, LZ = -0.5405;

/** Cuántas retículas desplazadas se barajan para que no se vea la malla. */
const RETICULAS = 16;

/**
 * Lo más que `Z` puede alejarse del eje dentro de una columna: media anchura
 * más el pliegue más grande. Sirve para descartar columnas enteras sin mirar
 * punto por punto, así que tiene que ser una cota de verdad, no una
 * aproximación: si se queda corta, se borran trozos de tela que sí se veían.
 */
const LIMITE_Z = ANCHO + P1 + P2 + 0.02;

/** Tope de píxeles del lienzo. Ver `mide`. */
const AREA_MAXIMA = 215000;

/**
 * Cada cuánto se redibuja, en milisegundos.
 *
 * La tela respira con períodos de cuarenta a noventa segundos: entre un
 * fotograma y el siguiente, a treinta por segundo, un punto se mueve menos de
 * una décima de píxel. Nadie puede ver la diferencia con sesenta, y cuesta la
 * mitad de procesador —que en un portátil es la mitad de ventilador y en un
 * móvil la mitad de batería—. Dibujar sesenta veces por segundo algo que
 * tarda un minuto en cambiar es tirar el trabajo.
 */
const PERIODO = 31;

/**
 * El listón del polvo: por debajo de esta aportación, un punto se sortea en vez
 * de pintarse tenue.
 *
 * NO ES UN AJUSTE FINO, ES LO QUE DECIDE QUE ESTO PAREZCA PARTÍCULAS. Con el
 * listón bajo (valía 4) casi ningún punto se sorteaba, y con el difuminado
 * encima la tela entera salía lisa: una pieza de escayola iluminada, no una
 * nube de puntos. Con el listón alto, la parte iluminada sigue cerrándose en
 * membrana continua —ahí cada punto aporta mucho más que esto— y las zonas
 * medias y oscuras se deshacen en puntos sueltos y contables.
 * De ahí sale, sin pintar ninguna de las cuatro, la escala que se pedía:
 * membrana blanca → polvo plateado → puntos grises sueltos → negro.
 */
const POLVO = 48;

/* ───────────────────────────── Revoltijos ───────────────────────────────── */

/** Un entero revuelto, para desordenar sin sortear nada en tiempo de ejecución. */
function revuelve(n: number): number {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
/** Lo mismo, entre 0 y 1. */
const revuelve01 = (n: number) => revuelve(n) / 4294967296;

/* ═════════════════════════════════════════════════════════════════════════ */

export function arrancaSeda(
  lienzo: HTMLCanvasElement,
  { intensidad = 1, densidad = 1, quieto = false }: OpcionesSeda = {},
): () => void {
  const ctx = lienzo.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  let ancho = 0, alto = 0;
  let imagen: ImageData | null = null;
  let lienzo32: Uint32Array | null = null;
  /* ── UN SOLO CANAL, NO CUATRO ────────────────────────────────────────────
     Esto es gris: los tres canales de cada punto valen lo mismo. Sumar sobre
     la imagen directamente obliga a escribir los tres, o sea doce escrituras
     por punto, y además sobre `Uint8ClampedArray`, que recorta en cada una.
     Aquí se suma sobre un solo canal en coma flotante —cuatro escrituras
     baratas por punto— y al final se pasa a gris de una pasada. Un recorrido
     más por los píxeles, sí; pero tres veces menos tráfico por los cientos de
     miles de puntos, que es donde está el tiempo. */
  let luz: Float32Array | null = null;
  let paso1: Float32Array | null = null;

  /* Las columnas: su `u` y su retícula. */
  let nu = 0, nv = 0;
  let colU = new Float32Array(0);
  let colRet = new Uint8Array(0);

  /* Las tablas en `v`, una tanda por retícula, todas seguidas en el mismo
     arreglo: la fila `j` de la retícula `k` está en `k*nv + j`. */
  let tV = new Float32Array(0);      // v·ANCHO
  let tP1s = new Float32Array(0);    // sin(P1_V·v)
  let tP1c = new Float32Array(0);    // cos(P1_V·v)
  let tP2s = new Float32Array(0);
  let tP2c = new Float32Array(0);
  let tOrilla = new Float32Array(0); // el desvanecido de los bordes largos

  let foco = 0, cx = 0, cy = 0, ganancia = 0;

  function mide() {
    /* ── EL LIENZO VA POR DEBAJO DE LA PANTALLA, Y ES A PROPÓSITO ───────
       El grano no se quita con más puntos: se quita con más puntos POR PÍXEL,
       y son dos cosas distintas. De doscientos mil puntos menos de la mitad
       caen dentro del cuadro; repartidos por un lienzo de un millón y medio de
       píxeles sale uno por cada siete, es decir, agujeros, es decir, papel de
       lija. Para taparlos con puntos harían falta diez veces más y no caben en
       dieciséis milisegundos.
       Bajar el lienzo a la mitad de lado sale cuatro veces más barato POR LOS
       DOS LADOS: cuatro veces menos píxeles que borrar y volcar, y cuatro
       veces más puntos por píxel. El navegador lo estira después con su propio
       filtrado, que es justo el suavizado que a esto le va bien: no hay bordes
       duros que se puedan ver escalonados, sólo una tela difusa.
       El brillo no hay que retocarlo: `ganancia` va con el foco al cuadrado y
       el foco va con el ancho, así que cambiar de resolución se compensa solo.
       (El tope por área es lo mismo para una ventana enorme.) */
    const css = Math.max(1, lienzo.clientWidth) * Math.max(1, lienzo.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1, Math.sqrt(AREA_MAXIMA / css));
    const w = Math.max(1, Math.round(lienzo.clientWidth * dpr));
    const h = Math.max(1, Math.round(lienzo.clientHeight * dpr));
    if (w === ancho && h === alto) return;
    ancho = w; alto = h;
    lienzo.width = w; lienzo.height = h;

    imagen = ctx!.createImageData(w, h);
    lienzo32 = new Uint32Array(imagen.data.buffer);
    luz = new Float32Array(w * h);
    paso1 = new Float32Array(w * h);

    /* ── EL ENCUADRE, Y POR QUÉ EL FOCO MIRA AL ALTO ───────────────────
       Con el foco atado al ancho, en un móvil salía bien y en un monitor
       apaisado la tela se comía el cuadro entero: no quedaba ni un palmo de
       negro y la navegación no se leía. El motivo es que lo que la tela ocupa
       de arriba abajo es `foco × anchura ÷ distancia`, así que atándolo al
       ancho, una ventana el doble de ancha da una tela el doble de alta —y
       encima con menos alto donde meterla—.
       Va al alto, y el ancho sólo pone un tope para que en una ventana
       estrecha y muy alta tampoco se desborde. El resultado: la tela ocupa la
       misma FRACCIÓN DE ALTURA en cualquier ventana, y lo que cambia con el
       ancho es cuánto trozo de tela se ve a lo largo, que es exactamente lo
       que pasaría al asomarse a una sábana por una ventana más ancha. */
    foco = Math.min(w * 0.92, h * 0.46);
    cx = w * 0.46;
    cy = h * 0.355;

    /* Cuántos puntos. Sube con el área pero no linealmente: en una pantalla
       grande hacen falta más, aunque no el triple. */
    /* LOS PUNTOS VAN CON EL TAMAÑO EN PANTALLA, NO CON EL DEL LIENZO.
       Parece lo mismo y no lo es: bajar el lienzo sirve justamente para subir
       los puntos POR PÍXEL, y si el número de puntos baja con él, no se gana
       nada. Así que los puntos los decide el hueco que ocupa la portada en la
       pantalla —lo que el visitante ve—, y el lienzo decide, por separado,
       sobre cuántos píxeles se reparten. */
    const objetivo = Math.round(Math.min(320000, css * 0.80) * densidad);
    /* LA PROPORCIÓN IMPORTA MÁS QUE EL TOTAL, Y NO ES LA QUE PARECE.
       Los puntos de una misma columna comparten `u`, así que la columna entera
       cae sobre UNA CURVA continua de la pantalla. Desordenar la `v` mueve
       cada punto a lo largo de esa curva, pero no lo saca de ella: la curva se
       queda, y lo que se ve es una tela peinada. Con la `v`, en cambio, basta
       el desorden, porque ahí no hay curva que seguir.
       Así que las dos direcciones no se tratan igual: muchas columnas muy
       juntas —hasta que las curvas se solapan y dejan de leerse— y muchas
       menos filas, desordenadas. Diez a uno, medido a ojo subiendo hasta que
       el peinado desaparece. */
    nu = Math.max(220, Math.round(Math.sqrt(objetivo * 10)));
    nv = Math.max(40, Math.round(objetivo / nu));

    colU = new Float32Array(nu);
    colRet = new Uint8Array(nu);
    for (let i = 0; i < nu; i++) {
      const t = (i + 0.5 + (revuelve01(i * 2654435761) - 0.5)) / nu;
      colU[i] = t * 2 - 1;
      colRet[i] = revuelve(i * 40503 + 7) % RETICULAS;
    }

    const n = RETICULAS * nv;
    tV = new Float32Array(n);
    tP1s = new Float32Array(n); tP1c = new Float32Array(n);
    tP2s = new Float32Array(n); tP2c = new Float32Array(n);
    tOrilla = new Float32Array(n);
    for (let k = 0; k < RETICULAS; k++) {
      const sesgo = (k + 0.5) / RETICULAS - 0.5;
      for (let j = 0; j < nv; j++) {
        const temblor = revuelve01(k * 9176 + j * 31337) - 0.5;
        const t = (j + 0.5 + sesgo + temblor) / nv;
        const v = t * 2 - 1;
        const p = k * nv + j;
        tV[p] = v * ANCHO;
        tP1s[p] = Math.sin(P1_V * v); tP1c[p] = Math.cos(P1_V * v);
        tP2s[p] = Math.sin(P2_V * v); tP2c[p] = Math.cos(P2_V * v);
        /* Las orillas largas no terminan en un corte: se deshacen. Una tela
           con el borde recto es una cinta, y una cinta no pesa. */
        const d = Math.max(0, 1 - Math.abs(v));
        const s = Math.min(1, d / 0.28);
        tOrilla[p] = s * s * (3 - 2 * s);
      }
    }

    /* Con el reparto por pantalla de `pinta`, toda la geometría se cancela y
       el brillo de un píxel acaba siendo, exactamente:
           iluminación × ESCALA × 255
       Es decir: la imagen no cambia de brillo al cambiar de tamaño de ventana
       ni al subir o bajar la densidad. Lo que cambia con la densidad es el
       GRANO —más puntos, membrana continua; menos, polvo suelto—, que es lo
       que se quiere poder tocar sin reajustar la luz cada vez. */
    /* Bajó de 2.35 a 1.35 al entrar el difuminado, y no es un retoque: antes
       la imagen era moteado de dos valores —un tercio de píxeles casi blancos
       y el resto negros—, que de lejos se lee oscuro y centelleante. Al
       cerrarse en una membrana continua, ese mismo brillo medio se lee como
       una masa clara que se come el cuadro. Misma luz, lectura distinta. */
    const ESCALA = 1.35;
    ganancia = intensidad * 255 * ESCALA * 4 * foco * foco / (nu * nv);
  }

  function pinta(t: number) {
    if (!luz || !paso1 || !lienzo32 || !imagen) return;
    luz.fill(0);

    const gTiempo = V_GIRO * t;
    const ey1T = V_EY1 * t, ey2T = V_EY2 * t, ez1T = V_EZ1 * t;
    const p1T = V_P1 * t, p2T = V_P2 * t;

    /* Dos de margen, no uno: la huella es de tres por tres y el píxel de la
       derecha de la última columna se iría a la fila siguiente. */
    const anchoMenos = ancho - 2;
    const altoMenos = alto - 2;

    for (let i = 0; i < nu; i++) {
      const u = colU[i]!;

      /* ── Lo que sólo depende de la columna ─────────────────────────────── */
      const giro = GIRO_BASE + GIRO_LINEAL * u + GIRO_ONDA * Math.sin(GIRO_ONDA_K * u + gTiempo);
      const giroU = GIRO_LINEAL + GIRO_ONDA * GIRO_ONDA_K * Math.cos(GIRO_ONDA_K * u + gTiempo);
      const cg = Math.cos(giro), sg = Math.sin(giro);

      const ejeY = Y_BASE
        + EY1 * Math.sin(EY1_K * u + ey1T)
        + EY2 * Math.sin(EY2_K * u + ey2T);
      const ejeYu = EY1 * EY1_K * Math.cos(EY1_K * u + ey1T)
        + EY2 * EY2_K * Math.cos(EY2_K * u + ey2T);

      const ejeZ = Z_MEDIO + Z_PENDIENTE * u + EZ1 * Math.sin(EZ1_K * u + ez1T);
      const ejeZu = Z_PENDIENTE + EZ1 * EZ1_K * Math.cos(EZ1_K * u + ez1T);

      const X = u * LARGO;
      const T0x = LARGO;

      /* ── LA COLUMNA ENTERA, DESCARTADA DE UNA VEZ ──────────────────────
         La tela se sale del cuadro por los dos lados a propósito, y el lado
         que queda cerca se sale MUCHO: a esa distancia el foco lo agranda
         todo, así que el extremo cercano acaba a casi dos pantallas de la
         izquierda. Medido, cerca de la mitad de los puntos caían fuera y se
         calculaban enteros —superficie, normal, luz— para después tirarlos
         en la comprobación de límites.
         Aquí se tira la columna entera antes de empezar. `X` no cambia dentro
         de una columna y `Z` sólo puede moverse lo que den la anchura y el
         pliegue, así que los dos extremos de la columna en pantalla salen de
         dos divisiones; si ese tramo no toca el cuadro, no hay nada que
         mirar punto por punto. */
      const zCerca = Math.max(0.42, ejeZ - LIMITE_Z);
      const zLejos = ejeZ + LIMITE_Z;
      const bordeA = cx + foco * X / zCerca;
      const bordeB = cx + foco * X / zLejos;
      if (bordeA < bordeB) {
        if (bordeB < 0 || bordeA > anchoMenos) continue;
      } else if (bordeA < 0 || bordeB > anchoMenos) continue;

      /* Las fases de los pliegues, partidas para que dentro no haya senos. */
      const f1 = P1_U * u + p1T, f2 = P2_U * u + p2T;
      const a1c = Math.cos(f1), a1s = Math.sin(f1);
      const a2c = Math.cos(f2), a2s = Math.sin(f2);

      /* Los extremos a lo largo también se deshacen. Con el foco atado al
         alto, en una ventana apaisada el extremo del fondo cae DENTRO del
         cuadro, y una tela que se acaba en seco a dos tercios de la pantalla
         deja de ser enorme: se ve el objeto entero y se le ve el final. */
      const d = (1 - Math.abs(u)) * 5;
      const finU = d >= 1 ? 1 : d <= 0 ? 0 : d * d * (3 - 2 * d);
      if (finU <= 0) continue;

      const base = colRet[i]! * nv;

      /* ── El bucle interior: ni un seno ─────────────────────────────────── */
      for (let j = 0; j < nv; j++) {
        const p = base + j;
        const vw = tV[p]!;
        const s1 = tP1s[p]!, c1 = tP1c[p]!;
        const s2 = tP2s[p]!, c2 = tP2c[p]!;

        /* sin(a·v + θ) y cos(a·v + θ), sin llamar a ninguna de las dos. */
        const sen1 = s1 * a1c + c1 * a1s, cos1 = c1 * a1c - s1 * a1s;
        const sen2 = s2 * a2c + c2 * a2s, cos2 = c2 * a2c - s2 * a2s;

        const pli = P1 * sen1 + P2 * sen2;
        const pliV = P1 * P1_V * cos1 + P2 * P2_V * cos2;
        const pliU = P1 * P1_U * cos1 + P2 * P2_U * cos2;

        const Y = ejeY + vw * sg + pli * cg;
        const Z = ejeZ + vw * cg - pli * sg;
        if (Z < 0.42) continue;

        const iz = 1 / Z;
        const sx = cx + foco * X * iz;
        if (sx < 0 || sx > anchoMenos) continue;
        const sy = cy - foco * Y * iz;
        if (sy < 0 || sy > altoMenos) continue;

        /* La normal, analítica. ∂P/∂v no tiene componente en X, así que el
           producto vectorial se queda en tres multiplicaciones. */
        const dvy = ANCHO * sg + pliV * cg;
        const dvz = ANCHO * cg - pliV * sg;
        const q = vw * giroU + pliU;
        const duy = ejeYu + q * cg - pli * giroU * sg;
        const duz = ejeZu - q * sg - pli * giroU * cg;

        let nx = duy * dvz - duz * dvy;
        let ny = -T0x * dvz;
        let nz = T0x * dvy;
        /* El módulo del producto vectorial ES el área de tela que representa
           este punto. Hace falta, y por eso se guarda antes de normalizar. */
        const area = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const inv = 1 / area;
        nx *= inv; ny *= inv; nz *= inv;

        /* Difusa por las dos caras: una tela es fina y algo de luz la
           atraviesa, así que el revés no es negro del todo. */
        const lam = nx * LX + ny * LY + nz * LZ;
        const dif = lam > 0 ? lam : -lam * 0.34;

        /* El brillo del filo. Cuanto más de canto se ve la tela, más luz
           devuelve: es lo que hace que la seda tenga lustre y el papel no. */
        const vinv = 1 / Math.sqrt(X * X + Y * Y + Z * Z);
        let mira = (nx * X + ny * Y + nz * Z) * vinv;
        if (mira < 0) mira = -mira;
        const borde = 1 - mira;
        const filo = borde * borde * borde;

        /* La lejanía se traga el extremo del fondo. Sin esto, el lado que se
           comprime se convierte en una barra blanca y la tela deja de tener
           principio y fin. */
        const lejos = Z - 1.5;
        const prof = lejos <= 0 ? 1 : 1 / (1 + lejos * lejos * 0.30);

        /* ── LO QUE HACE QUE ESTO PAREZCA UNA SUPERFICIE Y NO UNA NUBE ─────
           Sin esta línea la cara ancha de la tela sale NEGRA por mucho que le
           dé la luz, y sólo se enciende el filo. El motivo: al sumar puntos,
           lo que queda en cada píxel es cuántos puntos han caído ahí, y en la
           cara ancha caen pocos porque la tela está desplegada. Pero una
           superficie no se oscurece por estar de frente —una sábana blanca se
           ve igual de blanca de cerca que de lejos—: lo que no cambia es la
           luz POR UNIDAD DE PANTALLA, no por punto.
           Así que cada punto lleva el trozo de pantalla que le toca: su área
           de tela, por el escorzo, por la distancia al cuadrado. Al sumarlos,
           la geometría se cancela sola y lo que queda es la iluminación.
           Lo que ya NO sale gratis es el lustre del filo, y por eso está
           arriba `filo`, puesto a mano y a la fuerza que convenga. */
        const porPantalla = area * mira * iz * iz;

        let val = (0.028 + 0.95 * dif + 0.86 * filo)
          * porPantalla * prof * tOrilla[p]! * finU * ganancia;
        /* EL DADO. Un punto que aporta menos de `POLVO` a su píxel no se ve:
           miles de ellos sólo dan una niebla gris plana, que es justo lo que
           no se quiere en las zonas tenues. Así que por debajo de ese listón
           se sortea —se dibuja con probabilidad `val/POLVO` y valiendo
           `POLVO`—, con lo que la luz total sale exactamente la misma y lo
           tenue pasa a verse como lo que es: puntos sueltos y contables. */
        if (val < POLVO) {
          const prob = val * (1 / POLVO);
          if (prob < 0.004 || revuelve01(i * 2246822519 + j * 374761393) > prob) continue;
          val = POLVO;
        }

        /* Reparto bilineal: cada punto suma su luz a los cuatro píxeles que
           pisa. `Uint8ClampedArray` recorta sola cuando se apilan, que es lo
           que cierra la membrana donde la tela se ve de canto. */
        const xi = sx | 0, yi = sy | 0;
        const fx = sx - xi, fy = sy - yi;
        const gx = 1 - fx, gy = 1 - fy;
        const o = yi * ancho + xi;
        const o2 = o + ancho;
        const ay = val * gy, by = val * fy;

        luz[o] += ay * gx; luz[o + 1] += ay * fx;
        luz[o2] += by * gx; luz[o2 + 1] += by * fx;
      }
    }

    /* ═══ EL DIFUMINADO, Y POR QUÉ ES LA PIEZA QUE FALTABA ═══════════════
       Sin esto, la cuenta sale así: cada punto aporta unos doscientos niveles
       de gris —casi blanco— y cae alrededor de un punto por píxel. O sea que
       el píxel que recibe un punto se va a blanco y el de al lado se queda en
       negro: la imagen no es una tela, es un moteado de dos valores. De ahí
       salían las dos quejas a la vez, y las dos eran el mismo fallo:
         · de cerca parecía papel de lija, no seda;
         · y al moverse HERVÍA, porque basta que los puntos se corran medio
           píxel para que el moteado entero cambie de sitio. Medido: dos
           fotogramas seguidos no se parecían en nada, por mucho que se bajara
           la velocidad. No era la velocidad; era el muestreo.
       La salida no es meter cinco veces más puntos —eso no cabe en el tiempo
       de un fotograma— sino repartir cada punto por más sitio. Un difuminado
       separable de tres golpes, [1 2 1], deja a cada punto ocupando unos trece
       píxeles en vez de dos: donde hay tela, las huellas se solapan y cierran
       una membrana continua; donde hay polvo, cada punto queda como una mota
       blanda, que es como se ven las partículas desenfocadas de verdad.
       Y como el filtro conserva la energía, el brillo medio no se toca: lo
       único que se pierde son los picos de un solo píxel, que es exactamente
       lo que sobraba.
       Cuesta dos pasadas por los píxeles, pero la segunda se hace a la vez que
       el paso a gris, así que en realidad es una pasada y media. */

    /* Horizontal. */
    for (let y = 0; y < alto; y++) {
      const fila = y * ancho;
      let izq = 0;
      let aqui = luz[fila]!;
      for (let x = 0; x < ancho; x++) {
        const der = x + 1 < ancho ? luz[fila + x + 1]! : 0;
        paso1[fila + x] = (izq + aqui + aqui + der) * 0.25;
        izq = aqui; aqui = der;
      }
    }

    /* Vertical, y de paso a gris: el recorte va aquí, una vez por píxel, en
       vez de en cada escritura de cada punto. */
    for (let y = 0; y < alto; y++) {
      const fila = y * ancho;
      const arr = y > 0 ? fila - ancho : -1;
      const aba = y + 1 < alto ? fila + ancho : -1;
      for (let x = 0; x < ancho; x++) {
        const k = fila + x;
        const aqui = paso1[k]!;
        const g = ((arr < 0 ? 0 : paso1[arr + x]!) + aqui + aqui + (aba < 0 ? 0 : paso1[aba + x]!)) * 0.25;
        if (g <= 0) { lienzo32[k] = 0xff000000; continue; }
        const b = g >= 255 ? 255 : g | 0;
        lienzo32[k] = 0xff000000 | (b << 16) | (b << 8) | b;
      }
    }
    ctx!.putImageData(imagen, 0, 0);
  }

  /* ───────────────────────────── El motor ──────────────────────────────── */

  let reloj = 0;
  let vivo = true;
  let t0 = performance.now();

  let ultimo = -1e9;
  const paso = (ahora: number) => {
    if (!vivo) return;
    if (ahora - ultimo >= PERIODO) {
      ultimo = ahora;
      pinta((ahora - t0) / 1000);
    }
    reloj = requestAnimationFrame(paso);
  };

  const observador = new ResizeObserver(() => {
    mide();
    if (quieto) pinta(8.5);
  });
  observador.observe(lienzo);

  mide();
  if (quieto) {
    /* Un instante de la tela, no un recuadro vacío. */
    pinta(8.5);
  } else {
    reloj = requestAnimationFrame(paso);
  }

  /* Con la pestaña oculta no se dibuja: no se ve y gasta batería. */
  const alCambiarVisibilidad = () => {
    if (quieto) return;
    if (document.hidden) {
      cancelAnimationFrame(reloj);
    } else {
      t0 = performance.now() - 8500;
      reloj = requestAnimationFrame(paso);
    }
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  return () => {
    vivo = false;
    cancelAnimationFrame(reloj);
    observador.disconnect();
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  };
}
