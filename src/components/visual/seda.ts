/**
 * La seda.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ SE VE. Una tela enorme, hecha de puntos diminutos, que atraviesa el
 * encuadre. Entra por fuera y sale por fuera: no se ve entera nunca, y esa es
 * la idea —lo que no cabe en el cuadro es lo que la hace grande—. Se pliega, se
 * retuerce, se pone de canto y vuelve a abrirse, y lo hace DESPACIO PERO A LA
 * VISTA: si te quedas mirando un pliegue cinco segundos, su curvatura ha
 * cambiado.
 *
 * NO ES UN MAPA DE ALTURAS. Una cota `z = h(x,y)` sobre un suelo da siempre lo
 * mismo —montaña, terreno, ecualizador— porque tiene línea del horizonte: hay
 * suelo, y el suelo se ve. Esto es una SUPERFICIE PARAMÉTRICA: una cinta con un
 * eje que la recorre y una anchura que gira alrededor de ese eje.
 *
 *     P(u, v) = C(u) + v·W·E₁(u) + pliegue(u, v)·E₂(u)
 *
 * El giro φ(u) es lo que lo cambia todo. Donde deja la anchura mirando a la
 * cámara, la tela se ve de frente y ancha; donde la deja apuntando al fondo, se
 * ve DE CANTO, y ahí los puntos se apilan en un filo de dos píxeles y el filo
 * se pone blanco. Es lo que hace una sábana al aire. No hay horizonte porque no
 * hay suelo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TRES COSAS QUE SE HICIERON MAL ANTES Y NO HAY QUE REPETIR
 *
 * 1 · EL LIENZO IBA POR DEBAJO DE LA PANTALLA. Se bajaba a propósito, para
 *     tener más puntos por píxel, y se dejaba que el navegador lo estirara.
 *     Tapaba el grano y arruinaba lo demás: en una pantalla Retina se veía una
 *     imagen pequeña ampliada. Ahora el lienzo va a la resolución del
 *     dispositivo —`dpr` hasta 2— y se dibuja en píxeles CSS vía
 *     `setTransform`, que es lo que mantiene los puntos nítidos.
 *
 * 2 · SE TAPABA EL GRANO CON UN DIFUMINADO. Mal sitio para resolverlo: lo que
 *     da la superficie suave es la DENSIDAD y la LUZ, no el desenfoque. Aquí ya
 *     no hay ningún filtro: cada punto es un cuadradito de medio píxel con el
 *     borde limpio, y donde la tela se pliega los puntos se solapan y cierran
 *     la membrana solos.
 *
 * 3 · SE BAJÓ TANTO LA VELOCIDAD QUE PARECÍA UNA FOTO. Perseguir «que no se
 *     note» llevó a un píxel por segundo, o sea a nada, y quien lo miraba
 *     concluía —con razón— que la animación estaba rota. El objetivo no es que
 *     no se note: es que no moleste.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CÓMO SE DIBUJA, Y POR QUÉ ASÍ
 *
 * Pocos puntos y nítidos, en vez de muchos y emborronados. Cada uno es un disco
 * de entre medio y un píxel y pico de radio, con el borde resuelto por
 * cobertura —qué parte de cada píxel cae dentro del disco—, que es el
 * antialiasing que viene del TAMAÑO REAL del punto y no de un desenfoque
 * posterior.
 *
 * La imagen se monta a mano sobre `ImageData`, sumando. Parece el camino
 * aburrido y es, con diferencia, el rápido: medido en banco, pintar los mismos
 * treinta mil puntos con `fillRect` y composición aditiva cuesta SETENTA
 * milisegundos por fotograma, y montando la imagen a mano, SIETE. La
 * composición `lighter` desactiva los caminos rápidos del lienzo y cada punto
 * pasa a ser una operación de mezcla completa. Además, sumar a mano no depende
 * de que haya aceleración por hardware, así que cuesta lo mismo en un portátil
 * con gráfica que en un móvil en modo de bajo consumo.
 *
 * `Uint8ClampedArray` recorta sola al sumar: donde los puntos se apilan, la
 * suma satura y aparece la membrana casi blanca. No hay que pintarla.
 *
 * (Por eso aquí no hay `setTransform` con el factor de pantalla: `putImageData`
 * no pasa por la matriz del contexto. El requisito —que los puntos se dibujen a
 * la resolución del dispositivo— se cumple donde importa: el almacén del lienzo
 * va a `css × dpr` y TODA la geometría se calcula en píxeles de dispositivo.)
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

/* La profundidad. Un extremo cerca y otro lejos: de ahí salen los dos tamaños
   del mismo trozo de tela. */
const Z_MEDIO = 2.46;
const Z_PENDIENTE = 1.02;

/* ── El giro de la sección ──────────────────────────────────────────────────
   Tres términos, no uno. Con un solo giro lineal la tela es un tubo: se abre,
   se cierra y se acabó, y se le ve la forma de objeto único. Las dos ondas
   encima, a frecuencias que no son múltiplos una de otra, hacen que el mismo
   trozo de cinta se abra y se cierre varias veces a lo largo, cada vez en otro
   sitio y de otra manera: varios pliegues anchos en lugar de uno. */
const GIRO_BASE = 0.62;
const GIRO_LINEAL = 1.72;
const GIRO_ONDA = 0.52;
const GIRO_ONDA_K = 2.15;
const GIRO_ONDA2 = 0.31;
const GIRO_ONDA2_K = 3.67;

/* Los pliegues que cruzan la anchura y viajan a lo largo. La segunda onda es
   más apretada y más baja: da el pliegue dentro del pliegue en vez de una sola
   panza. La tercera, aún más apretada, rompe la simetría de las dos primeras. */
const P1 = 0.355, P1_V = 1.52, P1_U = 1.08;
const P2 = 0.138, P2_V = 3.40, P2_U = 2.35;
const P3 = 0.062, P3_V = 5.90, P3_U = 1.63;

/* El serpenteo del eje. */
const EY1 = 0.300, EY1_K = 1.62;
const EY2 = 0.156, EY2_K = 2.84;
const EZ1 = 0.330, EZ1_K = 1.11;

/* Dónde está centrada la tela de arriba abajo, antes de proyectar. */
const Y_BASE = 0.115;

/* ── LAS VELOCIDADES, EN RADIANES POR SEGUNDO ───────────────────────────────
   Esto se ha equivocado en los dos sentidos y conviene dejarlo escrito.

   Primero fueron demasiado rápidas: período de ochenta y ocho segundos, que
   suena lentísimo, pero con una amplitud que mueve la tela de lado a lado. Una
   doscientosava parte de ese ciclo ya desplazaba cada punto tres píxeles y
   medio en cuatro décimas. «Período largo» no es «movimiento lento».

   Después, corrigiendo, se pasaron de lentas: un píxel por segundo. A esa
   velocidad la tela no respira, está parada.

   Lo que se mide ahora —`pruebas/portada.mjs`— es el desplazamiento de la forma
   en píxeles de pantalla por segundo, y el sitio está entre cuatro y ocho: se
   ve moverse sin que distraiga, y cinco segundos mirando un pliegue bastan para
   ver que la curvatura ha cambiado. */
const V_GIRO = 0.0455;
const V_GIRO2 = 0.0702;
const V_P1 = 0.0574;
const V_P2 = 0.0808;
const V_P3 = 0.1123;
const V_EY1 = 0.0424;
const V_EY2 = 0.0691;
const V_EZ1 = 0.0505;

/* La luz: de arriba, un poco a la izquierda y un poco hacia la cámara. */
const LX = -0.3123, LY = 0.7808, LZ = -0.5405;

/** Cuántas retículas desplazadas se barajan para que no se vea la malla. */
const RETICULAS = 16;

/** Lo más que `Z` puede alejarse del eje dentro de una columna. Es una cota de
 *  verdad: si se queda corta, se borran trozos de tela que sí se veían. */
const LIMITE_Z = ANCHO + P1 + P2 + P3 + 0.02;

/* ───────────────────────────── Revoltijos ───────────────────────────────── */

/** Un entero revuelto, para desordenar sin sortear nada en tiempo de ejecución. */
function revuelve(n: number): number {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
const revuelve01 = (n: number) => revuelve(n) / 4294967296;

/* ═════════════════════════════════════════════════════════════════════════ */

export function arrancaSeda(
  lienzo: HTMLCanvasElement,
  { intensidad = 1, densidad = 1, quieto = false }: OpcionesSeda = {},
): () => void {
  const ctx = lienzo.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  /* Todo lo de dibujar va en PÍXELES CSS. El lienzo tiene por detrás los
     píxeles del dispositivo y `setTransform` hace la conversión: eso es lo que
     mantiene los puntos nítidos en una pantalla Retina sin arrastrar el factor
     por cada cuenta. */
  let ancho = 0, alto = 0, dpr = 0;
  /* El tamaño en píxeles de dispositivo, que es donde se dibuja de verdad. */
  let pw = 0, ph = 0;

  let nu = 0, nv = 0;
  let colU = new Float32Array(0);
  let colRet = new Uint8Array(0);

  /* Tablas en `v`, una tanda por retícula: la fila `j` de la retícula `k` está
     en `k*nv + j`. */
  let tV = new Float32Array(0);
  let tP1s = new Float32Array(0), tP1c = new Float32Array(0);
  let tP2s = new Float32Array(0), tP2c = new Float32Array(0);
  let tP3s = new Float32Array(0), tP3c = new Float32Array(0);
  let tOrilla = new Float32Array(0);

  let imagen: ImageData | null = null;
  let pix: Uint8ClampedArray | null = null;
  let limpio: Uint32Array | null = null;
  let lienzo32: Uint32Array | null = null;

  let foco = 0, cx = 0, cy = 0, ganancia = 0;
  /* Cuántos puntos se dibujan de verdad. Sólo baja si el fotograma se alarga. */
  let objetivo = 0;
  let activos = 0;

  function mide() {
    /* ── RESOLUCIÓN DE DISPOSITIVO, SIN ATAJOS ─────────────────────────────
       Se tapa a 2 porque por encima se paga el cuádruple de píxeles sin ganar
       nitidez que nadie pueda ver; pero NO se baja de ahí. La versión anterior
       dibujaba a dos tercios y dejaba que el navegador estirara: tapa el grano
       y, a cambio, en un móvil se ve una imagen pequeña ampliada. */
    const siguiente = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(lienzo.clientWidth));
    const h = Math.max(1, Math.round(lienzo.clientHeight));
    if (w === ancho && h === alto && siguiente === dpr) return;
    ancho = w; alto = h; dpr = siguiente;

    pw = Math.round(w * dpr);
    ph = Math.round(h * dpr);
    lienzo.width = pw;
    lienzo.height = ph;
    /* El tamaño en CSS lo pone la hoja de estilos, al 100 % de su hueco, y NO
       se fija aquí en píxeles. Fijarlo haría que el lienzo dejara de seguir a
       su contenedor: el observador mira el lienzo, y un lienzo con ancho fijo
       ya no cambia de ancho, así que girar el móvil o cambiar la ventana lo
       dejaría del tamaño anterior. Lo que importa —que el almacén vaya a
       resolución de dispositivo y no se estire nada— lo dan las dos líneas de
       arriba. */

    imagen = ctx!.createImageData(pw, ph);
    pix = imagen.data;
    lienzo32 = new Uint32Array(imagen.data.buffer);
    limpio = new Uint32Array(pw * ph).fill(0xff000000); // negro opaco

    /* ── EL ENCUADRE ───────────────────────────────────────────────────────
       El foco va con el ALTO. Atado al ancho, en un monitor apaisado la tela se
       comía el cuadro entero y no quedaba un palmo de negro: lo que ocupa de
       arriba abajo es `foco × anchura ÷ distancia`, así que una ventana el
       doble de ancha daba una tela el doble de alta. El ancho sólo pone tope,
       para una ventana estrecha y muy alta. Lo que cambia con el ancho es
       cuánto trozo de tela se ve a lo largo, que es lo que pasaría al asomarse
       a una sábana por una ventana más ancha. */
    /* En píxeles de DISPOSITIVO: es donde se escribe. */
    foco = Math.min(pw * 0.92, ph * 0.46);
    cx = pw * 0.46;
    cy = ph * 0.345;

    /* ── CUÁNTOS PUNTOS ────────────────────────────────────────────────────
       Pocos y nítidos, pero no tan pocos que la tela deje de ser una tela. Con
       nueve mil, que es lo que parecía razonable sobre el papel, lo que sale no
       es una membrana: es confeti. Lo que cierra la superficie no es el tamaño
       del punto sino cuántos caen donde la tela se pliega, y por debajo de
       cierto número ahí no hay nada que se cierre.
       Van con el área en píxeles de dispositivo, con tope: así un móvil y un
       monitor se ven igual de poblados en vez de que el grande salga vacío.

       El tope no es por memoria sino por tiempo, y el reparto importa: lo que
       cuesta un punto es la superficie que tapa, no el punto. Por eso el radio
       máximo bajó de 1,2 a 0,95 píxeles CSS —casi la mitad de área por punto— y
       con lo ahorrado caben bastantes más puntos, que es lo que cierra la
       membrana. Más puntos pequeños antes que menos puntos gordos. */
    objetivo = Math.round(Math.min(40000, Math.max(18000, pw * ph * 0.030)) * densidad);
    activos = objetivo;

    /* Muchas columnas y pocas filas. Los puntos de una columna comparten `u`,
       así que caen sobre una curva: si las columnas quedan separadas se ven las
       curvas y la tela parece peinada. Con las columnas muy juntas y pocos
       puntos en cada una, no hay curva que seguir. */
    nu = Math.max(220, Math.round(Math.sqrt(objetivo * 33)));
    nv = Math.max(12, Math.round(objetivo / nu));
    const total = nu * nv;

    colU = new Float32Array(nu);
    colRet = new Uint8Array(nu);
    for (let i = 0; i < nu; i++) {
      colU[i] = ((i + 0.5 + (revuelve01(i * 2654435761) - 0.5)) / nu) * 2 - 1;
      colRet[i] = revuelve(i * 40503 + 7) % RETICULAS;
    }

    const n = RETICULAS * nv;
    tV = new Float32Array(n);
    tP1s = new Float32Array(n); tP1c = new Float32Array(n);
    tP2s = new Float32Array(n); tP2c = new Float32Array(n);
    tP3s = new Float32Array(n); tP3c = new Float32Array(n);
    tOrilla = new Float32Array(n);
    for (let k = 0; k < RETICULAS; k++) {
      const sesgo = (k + 0.5) / RETICULAS - 0.5;
      for (let j = 0; j < nv; j++) {
        const temblor = revuelve01(k * 9176 + j * 31337) - 0.5;
        const v = ((j + 0.5 + sesgo + temblor) / nv) * 2 - 1;
        const p = k * nv + j;
        tV[p] = v * ANCHO;
        tP1s[p] = Math.sin(P1_V * v); tP1c[p] = Math.cos(P1_V * v);
        tP2s[p] = Math.sin(P2_V * v); tP2c[p] = Math.cos(P2_V * v);
        tP3s[p] = Math.sin(P3_V * v); tP3c[p] = Math.cos(P3_V * v);
        /* Las orillas largas no terminan en un corte: se deshacen. Una tela con
           el borde recto es una cinta, y una cinta no pesa.
           Casi la mitad del ancho, no un cuarto: donde la tela se pone de canto,
           esa franja se comprime en pantalla y lo que sobre el tejido es un
           desvanecido largo sale en el cuadro como una raya vertical, o sea un
           borde del objeto, que es justo lo que no puede verse. */
        const d = Math.min(1, Math.max(0, 1 - Math.abs(v)) / 0.46);
        tOrilla[p] = d * d * (3 - 2 * d);
      }
    }

    /* ── EL BRILLO ────────────────────────────────────────────────────────
       Cada punto lleva la luz que le corresponde POR UNIDAD DE PANTALLA (ver
       `porPantalla` más abajo) y luego se reparte entre los píxeles que ocupa.
       Al sumarse, toda la geometría se cancela y el valor de un píxel acaba
       siendo, exactamente, `iluminación × ESCALA × 255`. Es decir: la imagen no
       cambia de brillo al cambiar de ventana, ni de densidad, ni de resolución
       de pantalla. Lo que cambia con la densidad es el GRANO, que es lo que se
       quiere poder tocar sin reajustar la luz cada vez. */
    const ESCALA = 3.1;
    ganancia = intensidad * 255 * ESCALA * 4 * foco * foco / total;
  }

  function pinta(t: number): number {
    if (!pix || !lienzo32 || !limpio || !imagen) return 0;
    /* El borrado, a velocidad de `memset`: una copia de un búfer de negro
       opaco ya hecho, en vez de recorrer los píxeles de cuatro en cuatro. */
    lienzo32.set(limpio);

    const gT = V_GIRO * t, g2T = V_GIRO2 * t;
    const ey1T = V_EY1 * t, ey2T = V_EY2 * t, ez1T = V_EZ1 * t;
    const p1T = V_P1 * t, p2T = V_P2 * t, p3T = V_P3 * t;

    const anchoMenos = pw - 1, altoMenos = ph - 1;
    /* Los radios se piden en píxeles CSS —entre 0,4 y 1,2— y aquí se dibuja en
       píxeles de dispositivo, así que van multiplicados por `dpr`: eso es lo
       que hace que en una pantalla Retina el punto siga midiendo lo mismo a la
       vista y tenga el doble de píxeles para resolver su borde. */
    const rMin = 0.40 * dpr, rMax = 0.95 * dpr;
    let n = 0;
    const tope = activos;

    for (let i = 0; i < nu && n < tope; i++) {
      const u = colU[i]!;

      const fg = GIRO_ONDA_K * u + gT, fg2 = GIRO_ONDA2_K * u + g2T;
      const giro = GIRO_BASE + GIRO_LINEAL * u
        + GIRO_ONDA * Math.sin(fg) + GIRO_ONDA2 * Math.sin(fg2);
      const giroU = GIRO_LINEAL
        + GIRO_ONDA * GIRO_ONDA_K * Math.cos(fg)
        + GIRO_ONDA2 * GIRO_ONDA2_K * Math.cos(fg2);
      const cg = Math.cos(giro), sg = Math.sin(giro);

      const ejeY = Y_BASE + EY1 * Math.sin(EY1_K * u + ey1T) + EY2 * Math.sin(EY2_K * u + ey2T);
      const ejeYu = EY1 * EY1_K * Math.cos(EY1_K * u + ey1T) + EY2 * EY2_K * Math.cos(EY2_K * u + ey2T);
      const ejeZ = Z_MEDIO + Z_PENDIENTE * u + EZ1 * Math.sin(EZ1_K * u + ez1T);
      const ejeZu = Z_PENDIENTE + EZ1 * EZ1_K * Math.cos(EZ1_K * u + ez1T);

      const X = u * LARGO;

      /* La columna entera, descartada de una vez: `X` no cambia dentro de una
         columna y `Z` sólo se mueve lo que den anchura y pliegue, así que los
         dos extremos de la columna en pantalla salen de dos divisiones. */
      const bordeA = cx + foco * X / Math.max(0.42, ejeZ - LIMITE_Z);
      const bordeB = cx + foco * X / (ejeZ + LIMITE_Z);
      if (bordeA < bordeB ? (bordeB < 0 || bordeA > anchoMenos) : (bordeA < 0 || bordeB > anchoMenos)) continue;

      /* Los extremos a lo largo también se deshacen: una tela que se acaba en
         seco dentro del cuadro deja de ser enorme, se le ve el final. */
      const d = (1 - Math.abs(u)) * 5;
      const finU = d >= 1 ? 1 : d <= 0 ? 0 : d * d * (3 - 2 * d);
      if (finU <= 0) continue;

      /* Las fases de los pliegues, partidas para que dentro no haya senos. */
      const f1 = P1_U * u + p1T, f2 = P2_U * u + p2T, f3 = P3_U * u + p3T;
      const a1c = Math.cos(f1), a1s = Math.sin(f1);
      const a2c = Math.cos(f2), a2s = Math.sin(f2);
      const a3c = Math.cos(f3), a3s = Math.sin(f3);

      const base = colRet[i]! * nv;

      for (let j = 0; j < nv; j++) {
        const p = base + j;
        const vw = tV[p]!;

        /* sin(a·v + θ) y cos(a·v + θ), sin llamar a ninguna de las dos. */
        const s1 = tP1s[p]!, c1 = tP1c[p]!;
        const s2 = tP2s[p]!, c2 = tP2c[p]!;
        const s3 = tP3s[p]!, c3 = tP3c[p]!;
        const sen1 = s1 * a1c + c1 * a1s, cos1 = c1 * a1c - s1 * a1s;
        const sen2 = s2 * a2c + c2 * a2s, cos2 = c2 * a2c - s2 * a2s;
        const sen3 = s3 * a3c + c3 * a3s, cos3 = c3 * a3c - s3 * a3s;

        const pli = P1 * sen1 + P2 * sen2 + P3 * sen3;
        const pliV = P1 * P1_V * cos1 + P2 * P2_V * cos2 + P3 * P3_V * cos3;
        const pliU = P1 * P1_U * cos1 + P2 * P2_U * cos2 + P3 * P3_U * cos3;

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
        let ny = -LARGO * dvz;
        let nz = LARGO * dvy;
        /* El módulo del producto vectorial ES el área de tela que representa
           este punto: hace falta, y por eso se guarda antes de normalizar. */
        const area = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const inv = 1 / area;
        nx *= inv; ny *= inv; nz *= inv;

        /* ── LA LUZ, QUE ES LO QUE HACE QUE EL MOVIMIENTO SE VEA ───────────
           No basta con mover los puntos: si el brillo no cambia al girar la
           superficie, el ojo no lee una tela doblándose, lee una textura
           deslizándose. Difusa por las dos caras —una tela es fina y algo de
           luz la atraviesa, así que el revés no es negro del todo— más el
           lustre del filo: cuanto más de canto se ve, más luz devuelve, que es
           lo que tiene la seda y no tiene el papel. */
        const lam = nx * LX + ny * LY + nz * LZ;
        const dif = lam > 0 ? lam : -lam * 0.34;

        const vinv = 1 / Math.sqrt(X * X + Y * Y + Z * Z);
        let mira = (nx * X + ny * Y + nz * Z) * vinv;
        if (mira < 0) mira = -mira;
        const borde = 1 - mira;
        const filo = borde * borde * borde;

        /* La lejanía se traga el extremo del fondo: sin esto, el lado que se
           comprime se vuelve una barra blanca y la tela tiene principio y fin. */
        const lejos = Z - 1.5;
        const prof = lejos <= 0 ? 1 : 1 / (1 + lejos * lejos * 0.30);

        /* ── LO QUE HACE QUE ESTO PAREZCA UNA SUPERFICIE Y NO UNA NUBE ─────
           Sin esta línea la cara ancha sale NEGRA por mucha luz que le dé y
           sólo se enciende el filo. Al sumar puntos, lo que queda en un píxel
           es cuántos han caído ahí, y en la cara ancha caen pocos porque la
           tela está desplegada. Pero una superficie no se oscurece por estar de
           frente —una sábana blanca se ve igual de blanca de cerca que de
           lejos—: lo que no cambia es la luz POR UNIDAD DE PANTALLA. Así que
           cada punto lleva el trozo de pantalla que le toca: su área de tela,
           por el escorzo, por la distancia al cuadrado. */
        const porPantalla = area * mira * iz * iz;

        /* El tamaño del punto va con la cercanía, dentro de los límites en que
           sigue siendo un punto y no una mancha. */
        let radio = rMin + (rMax - rMin) * (Z_MEDIO * iz - 0.70) / 0.94;
        if (radio < rMin) radio = rMin;
        else if (radio > rMax) radio = rMax;

        /* El brillo se reparte entre lo que el punto ocupa: si no, los puntos
           grandes serían además más luminosos y la cercanía contaría dos veces. */
        const luz = (0.028 + 0.95 * dif + 0.86 * filo)
          * porPantalla * prof * tOrilla[p]! * finU * ganancia
          / (radio * radio * 3.1416);

        if (luz <= 0.05) continue;
        n++;

        /* ── EL DISCO, POR COBERTURA ──────────────────────────────────────
           El borde no se suaviza con un desenfoque: se calcula. Para cada
           píxel que el disco toca, cuánto de ese píxel queda dentro —uno si
           está entero, cero si está fuera, y lo que toque en el filo—. Eso es
           un punto redondo de borde limpio al tamaño que tiene, que es
           distinto de un punto borroso.
           Antes esto eran `fillRect`, y se notaba: cuadraditos. */
        const fuera = radio + 0.5;
        const dentro = fuera > 1 ? fuera - 1 : 0;
        /* Los dos radios al cuadrado: el `sqrt` sólo hace falta en el aro del
           borde. Dentro la cobertura es uno y fuera es cero, y las dos cosas se
           deciden comparando cuadrados, que es gratis. Con el `sqrt` en todos
           los píxeles, a 1440 el fotograma se iba a veintinueve milisegundos. */
        const r2fuera = fuera * fuera;
        const r2dentro = dentro * dentro;

        const x0 = Math.max(0, Math.ceil(sx - fuera));
        const x1 = Math.min(anchoMenos, Math.floor(sx + fuera));
        const y0 = Math.max(0, Math.ceil(sy - fuera));
        const y1 = Math.min(altoMenos, Math.floor(sy + fuera));

        for (let yy = y0; yy <= y1; yy++) {
          const dy = yy + 0.5 - sy;
          const dy2 = dy * dy;
          let o = (yy * pw + x0) * 4;
          for (let xx = x0; xx <= x1; xx++, o += 4) {
            const dx = xx + 0.5 - sx;
            const d2 = dx * dx + dy2;
            if (d2 >= r2fuera) continue;
            const v = d2 <= r2dentro ? luz : luz * (fuera - Math.sqrt(d2));
            pix[o] += v; pix[o + 1] += v; pix[o + 2] += v;
          }
        }

        if (n >= tope) break;
      }
    }

    ctx!.putImageData(imagen, 0, 0);
    return n;
  }

  /* ───────────────────────────── El motor ──────────────────────────────── */

  let reloj = 0;
  let vivo = true;
  /* El tiempo de la animación se ACUMULA, no se saca de `performance.now()`
     menos un origen: con la pestaña oculta el reloj del sistema sigue corriendo
     y la tela daría un salto al volver. Así vuelve donde estaba. */
  let tela = 8.5;
  let anterior = 0;
  let coste = 10;

  const paso = (ahora: number) => {
    if (!vivo) return;
    const dt = anterior === 0 ? 0.016 : Math.min(0.25, (ahora - anterior) / 1000);
    anterior = ahora;
    tela += dt;

    const t0 = performance.now();
    pinta(tela);
    /* Media móvil del coste. Si el fotograma se alarga se dibujan MENOS PUNTOS;
       nunca se baja la resolución, que es lo que lo dejaba borroso. */
    coste += (performance.now() - t0 - coste) * 0.1;
    if (coste > 11 && activos > objetivo * 0.4) activos = Math.round(activos * 0.92);
    else if (coste < 6.5 && activos < objetivo) activos = Math.min(objetivo, Math.round(activos * 1.04) + 32);

    reloj = requestAnimationFrame(paso);
  };

  const observador = new ResizeObserver(() => {
    mide();
    if (quieto) pinta(tela);
  });
  observador.observe(lienzo);

  mide();
  if (quieto) {
    /* Un instante de la tela, no un recuadro vacío. */
    pinta(tela);
  } else {
    reloj = requestAnimationFrame(paso);
  }

  /* Con la pestaña oculta no se dibuja: no se ve y gasta batería. Al volver se
     reanuda donde se quedó, sin salto. */
  const alCambiarVisibilidad = () => {
    if (quieto) return;
    if (document.hidden) {
      cancelAnimationFrame(reloj);
      reloj = 0;
    } else if (!reloj) {
      anterior = 0;
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
