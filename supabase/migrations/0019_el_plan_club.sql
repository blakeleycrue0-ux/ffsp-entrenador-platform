-- ════════════════════════════════════════════════════════════════════════════
-- 0019 · EL PLAN CLUB: doce equipos, 24,99 € al mes
-- ════════════════════════════════════════════════════════════════════════════
--
-- El cuarto escalón, y el que cierra la escalera por arriba:
--
--   Gratis  1 equipo    0 €        el entrenador que prueba
--   Pro     2 equipos   5,99 €     el que lleva dos categorías
--   Max     5 equipos  12,99 €     el club pequeño
--   Club   12 equipos  24,99 €     el club entero
--
-- HOY LA ÚNICA DIFERENCIA SON LOS EQUIPOS, y la pantalla lo dice con esas
-- palabras. No se le cuelgan funciones que no existen: pagos de cuotas,
-- matrículas e inscripciones están pensados pero no construidos, y el catálogo
-- de capacidades sólo enseña lo que está a `lista: true`. Cobrar por
-- adelantado algo que todavía no se puede usar es la forma más rápida de que
-- el primero que lo contrate pida la devolución.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SIN PRECIO ANUAL, Y ES A PROPÓSITO
-- ─────────────────────────────────────────────────────────────────────────────
--
-- El mensual lo decidió una persona: 24,99 €. El anual no. Siguiendo lo que
-- hacen los otros dos —diez mensualidades y pico— saldrían unos 249,99 €, pero
-- «saldría» no es «se ha decidido», y esta base de datos es la única fuente de
-- los importes que se enseñan. `price_yearly` se queda en nulo hasta que haya
-- una cifra de verdad; la pantalla sabe tratarlo —enseña el mensual y calla el
-- anual— porque es el mismo camino que ya recorren los planes sin precio.
--
-- TAMPOCO HAY PRECIOS DE STRIPE todavía, así que `contratable` sale falso y la
-- tarjeta se ve pero no se puede comprar. Eso es correcto: el plan existe y se
-- anuncia, y el día que se creen los productos en Stripe se rellenan las dos
-- columnas y se abre, sin tocar código.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUÉ DOCE Y NO «SIN LÍMITE»
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Un número que se puede contar es un número que se puede defender. «Sin
-- límite» invita a una federación entera a meter ochenta equipos por 24,99 €,
-- y el día que haya que decir que no, no hay dónde apoyarse. Doce cubre un
-- club de fútbol base de arriba abajo —prebenjamín a juvenil, en dos ramas— y
-- deja sitio para hablar con quien necesite más.
--
-- ADITIVA e idempotente. Una fila nueva en `plans`. No toca los otros tres
-- planes, ninguna suscripción ni ninguna política. Requiere 0018.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.plans (tier, name, max_teams, price_monthly, price_yearly, currency, trial_days)
values ('club', 'Club', 12, 2499, null, 'eur', 7)
on conflict (tier) do update
   set name          = excluded.name,
       max_teams     = excluded.max_teams,
       price_monthly = excluded.price_monthly,
       trial_days    = excluded.trial_days,
       updated_at    = now();
-- `price_yearly` NO está en el `do update` a propósito: si alguien lo rellena
-- a mano en el panel, volver a pasar esta migración no se lo borra.


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- 1) La escalera entera, en orden.
select tier,
       name,
       coalesce(max_teams::text, 'sin límite')                      as equipos,
       to_char(price_monthly / 100.0, 'FM999D00') || ' €/mes'       as mensual,
       coalesce(to_char(price_yearly / 100.0, 'FM999D00') || ' €/año',
                'sin precio anual')                                 as anual,
       (stripe_price_monthly is not null)                           as se_puede_contratar
from public.plans
order by case tier when 'free' then 1 when 'pro' then 2
                   when 'max' then 3 else 4 end;

-- 2) La escalera tiene que subir: más caro, más equipos. Si alguien cambia un
--    número y rompe eso, que cante aquí y no en la pantalla de pagar.
do $$
declare roto int;
begin
  select count(*) into roto
    from public.plans a
    join public.plans b on b.price_monthly > a.price_monthly
   where a.max_teams is not null
     and b.max_teams is not null
     and b.max_teams <= a.max_teams;
  if roto > 0 then
    raise exception 'Hay % par(es) de planes donde pagar más no da más equipos', roto;
  end if;
  raise notice 'Gratis 1 · Pro 2 · Max 5 · Club 12. La escalera sube.';
end $$;

-- 3) Y que Club no se pueda contratar todavía, que es lo correcto hasta que
--    existan sus productos en Stripe.
do $$
declare listo boolean;
begin
  select stripe_price_monthly is not null into listo from public.plans where tier = 'club';
  if listo then
    raise notice 'Club ya tiene precio de Stripe: se puede contratar.';
  else
    raise notice 'Club se ve pero no se puede contratar: falta crear el producto en Stripe.';
  end if;
end $$;
