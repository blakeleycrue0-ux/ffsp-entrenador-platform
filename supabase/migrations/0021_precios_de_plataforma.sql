-- ════════════════════════════════════════════════════════════════════════════
-- 0021 · LOS PRECIOS DE LA PLATAFORMA: 0 / 9 / 29 / 59 € AL MES
-- ════════════════════════════════════════════════════════════════════════════
--
-- Playoff360 deja de ser una herramienta para el cuerpo técnico y pasa a ser
-- la gestión del club entero. Con eso cambia a quién se le cobra: antes era un
-- entrenador pagando de su bolsillo, y 5,99 € era un precio de bolsillo; ahora
-- es un club con presupuesto, cuotas y tesorería.
--
--     Gratis     0 €/mes        —              1 equipo
--     Pro        9 €/mes         90 €/año      2 equipos
--     Max       29 €/mes        290 €/año      5 equipos
--     Club      59 €/mes        590 €/año     12 equipos
--
-- EL ANUAL SON DIEZ MENSUALIDADES, los doce meses por el precio de diez. Es la
-- misma regla en los tres planes, así que se explica en una frase y no hay que
-- mirar una tabla para saber si compensa. El Club no tenía anual —la 0019 lo
-- dejó a `null` a propósito, porque nadie lo había decidido— y ahora sí lo
-- tiene, por la misma regla que los otros dos.
--
-- ── LOS LÍMITES DE EQUIPOS NO SE TOCAN ──────────────────────────────────────
--
-- Siguen en 1 / 2 / 5 / 12. La 0016 y la 0019 los razonaron uno por uno —entre
-- otras cosas, por qué el Club NO es «sin límite»: con doce caben las
-- categorías de un club de cantera, y sin límite una federación entera mete
-- ochenta equipos por el precio de uno—. Nada de eso cambia porque cambie la
-- cifra de la izquierda.
--
-- ── Y SE BORRAN LOS IDENTIFICADORES DE STRIPE. ESTO ES LO IMPORTANTE ────────
--
-- `plans.stripe_price_*` apuntaba a los precios de 5,99 y 12,99 que están
-- creados en Stripe. Si se cambia el importe de esta tabla y se dejan ahí, la
-- página enseña 9 € y la pasarela cobra 5,99 €: un precio en el escaparate y
-- otro en la caja. Eso no es un fallo de maquetación, es cobrar mal.
--
-- Así que se vacían. `Plan.contratable` se calcula precisamente como «tiene
-- algún identificador de Stripe», de modo que los tres planes de pago quedan
-- automáticamente como no contratables: se ven, se comparan, y el botón de
-- pagar no aparece hasta que alguien cree los precios nuevos en Stripe y los
-- pegue aquí. La interfaz ya sabe hacer eso; es el estado en el que estuvo
-- todo entre la 0012 y la 0014.
--
-- Nadie se queda a medias: en `subscriptions` no hay ni una suscripción activa
-- ni en prueba —comprobado antes de escribir esto, la única fila que existe
-- está en `canceled`—, así que no hay ningún club pagando un precio viejo al
-- que esto le cambie el recibo.
--
-- Lo que hay que crear en Stripe, en euros y recurrentes:
--
--     Pro    mensual    9,00 €      Pro    anual    90,00 €
--     Max    mensual   29,00 €      Max    anual   290,00 €
--     Club   mensual   59,00 €      Club   anual   590,00 €
--
-- y después un `update plans set stripe_price_monthly = …, stripe_price_yearly
-- = …` por plan, como hizo la 0014.
--
-- ADITIVA Y REVERSIBLE: sólo cambia valores de cuatro filas que ya existen. No
-- crea ni borra tablas, no toca `subscriptions` y no altera ninguna política.
-- ════════════════════════════════════════════════════════════════════════════

-- Gratis se queda como está, con sus dos ceros. `null` querría decir «todavía
-- no hay precio decidido», que es otra cosa y la interfaz la pinta distinto.
update plans set price_monthly =     0, price_yearly =      0 where tier = 'free';
update plans set price_monthly =   900, price_yearly =   9000 where tier = 'pro';
update plans set price_monthly =  2900, price_yearly =  29000 where tier = 'max';
update plans set price_monthly =  5900, price_yearly =  59000 where tier = 'club';

-- Los precios viejos de Stripe ya no corresponden a estos importes.
update plans
   set stripe_price_monthly = null,
       stripe_price_yearly  = null
 where tier <> 'free';
