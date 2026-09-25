-- ════════════════════════════════════════════════════════════════════════════
-- 0006 · Planes, suscripciones y el límite de equipos
-- ════════════════════════════════════════════════════════════════════════════
--
-- Dos planes: `free`, con un equipo, y `pro`, sin límite. Siete días de prueba
-- de `pro` antes del primer cobro.
--
-- EL LÍMITE SE IMPONE AQUÍ, no en la interfaz. Si lo decidiera el navegador,
-- cualquiera crearía equipos de más cambiando una variable: esconder el botón
-- de «crear equipo» no es autorización. La política de inserción cuenta los
-- equipos que ya tiene el club y los compara con lo que permite su plan.
--
-- NADIE PUEDE ESCRIBIR SU PROPIA SUSCRIPCIÓN. `subscriptions` tiene lectura
-- para el club y ni una sola política de escritura, de modo que sólo puede
-- tocarla la clave de servicio, que vive en el servidor y jamás en el
-- navegador. Quien recibe el aviso de Stripe es un webhook nuestro; el cliente
-- nunca dice de qué plan es.
--
-- LOS PRECIOS NO ESTÁN AQUÍ Y NO SE INVENTAN. Las columnas de importe nacen
-- vacías. Hasta que el club decida cuánto cuesta, la aplicación enseña el plan
-- sin precio y no deja pagar, en vez de enseñar una cifra falsa.
--
-- Los límites son DATOS, no código: cambiar «un equipo» por otro número es
-- una fila, no un despliegue.
--
-- Es ADITIVA: no borra tablas ni registros. Idempotente. Requiere 0001–0005.
-- ════════════════════════════════════════════════════════════════════════════

do $$ begin
  create type plan_tier as enum ('free', 'pro');
exception when duplicate_object then null; end $$;

/* Estados tal como los nombra Stripe, más `none` para quien nunca ha pagado.
   Se guardan en crudo para poder cuadrarlos con el panel de Stripe sin
   traducir nada por el camino. */
do $$ begin
  create type subscription_status as enum (
    'none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
  );
exception when duplicate_object then null; end $$;


-- ── Los planes ──────────────────────────────────────────────────────────────

create table if not exists public.plans (
  tier              plan_tier primary key,
  name              text not null,
  /** Equipos permitidos. NULL significa sin límite. */
  max_teams         int,
  /** Importe en céntimos. NULL mientras no esté decidido. */
  price_monthly     int,
  price_yearly      int,
  currency          text not null default 'eur',
  /** Identificadores de Stripe. Se rellenan al crear los precios allí. */
  stripe_price_monthly text,
  stripe_price_yearly  text,
  /** Días de prueba antes del primer cobro. 0 = sin prueba. */
  trial_days        int not null default 0,
  updated_at        timestamptz not null default now()
);

insert into public.plans (tier, name, max_teams, trial_days)
values ('free', 'Gratis', 1, 0),
       ('pro',  'Pro',    null, 7)
on conflict (tier) do update
  set name       = excluded.name,
      max_teams  = excluded.max_teams,
      trial_days = excluded.trial_days;


-- ── La suscripción de cada club ─────────────────────────────────────────────

create table if not exists public.subscriptions (
  club_id                uuid primary key references public.clubs(id) on delete cascade,
  tier                   plan_tier not null default 'free',
  status                 subscription_status not null default 'none',
  /** Cuándo termina la prueba. Pasada esta fecha, `trialing` ya no vale. */
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_cliente_idx on public.subscriptions(stripe_customer_id);


-- ── Qué plan tiene de verdad un club, ahora mismo ───────────────────────────

/**
 * El plan EFECTIVO, que no es lo mismo que el contratado: una suscripción
 * impagada o cancelada vuelve a `free`, y una prueba caducada también. Así el
 * límite se aplica solo con el paso del tiempo, sin tareas programadas.
 */
create or replace function public.club_tier(target uuid)
returns plan_tier language sql security definer stable set search_path = public as $$
  select coalesce(
    (select case
       when s.status = 'active' then s.tier
       when s.status = 'trialing' and coalesce(s.trial_ends_at, now()) > now() then s.tier
       else 'free'::plan_tier
     end
     from public.subscriptions s
     where s.club_id = target),
    'free'::plan_tier);
$$;

/** Cuántos equipos permite el plan de ese club. NULL = sin límite. */
create or replace function public.club_team_limit(target uuid)
returns int language sql security definer stable set search_path = public as $$
  select p.max_teams from public.plans p where p.tier = public.club_tier(target);
$$;

/**
 * ¿Le cabe un equipo más? Cuenta los que ya tiene: durante un INSERT la cuenta
 * se hace sobre la instantánea previa, que es justamente lo que queremos.
 */
create or replace function public.puede_crear_equipo(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.club_team_limit(target) is null
      or (select count(*) from public.teams where club_id = target)
         < public.club_team_limit(target);
$$;


-- ── La política que lo impone ───────────────────────────────────────────────

drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated
  with check (
    club_id is not null
    and public.is_club_admin(club_id)
    and public.puede_crear_equipo(club_id)
  );

/* Editar y borrar no se tocan: quien se pase del límite al bajar de plan
   conserva sus equipos y puede seguir trabajando con ellos. No se borra nada
   por dejar de pagar; simplemente no se crean más. */


-- ── Acceso ──────────────────────────────────────────────────────────────────

alter table public.plans         enable row level security;
alter table public.subscriptions enable row level security;

/* Los planes son públicos: la página de precios los enseña sin sesión. */
drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans for select to anon, authenticated using (true);

/* Cada club ve la suya y nada más. */
drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (public.has_club_access(club_id));

/* Y NINGUNA política de escritura, a propósito: sólo la clave de servicio, que
   usa el webhook de Stripe en el servidor, puede crear o cambiar una
   suscripción. Si esto tuviera un `insert`, cualquiera se regalaría el plan
   Pro desde la consola del navegador. */

revoke all on function public.club_tier(uuid)          from public, anon;
revoke all on function public.club_team_limit(uuid)    from public, anon;
revoke all on function public.puede_crear_equipo(uuid) from public, anon;
grant execute on function public.club_tier(uuid)          to authenticated;
grant execute on function public.club_team_limit(uuid)    to authenticated;
grant execute on function public.puede_crear_equipo(uuid) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- `free` debe permitir 1 equipo y `pro` ninguno en concreto (sin límite).
-- Los importes salen vacíos a propósito: no hay precio decidido todavía.

select tier, name, coalesce(max_teams::text, 'sin límite') as equipos,
       coalesce(price_monthly::text, '(sin decidir)') as mensual,
       coalesce(price_yearly::text,  '(sin decidir)') as anual,
       trial_days as dias_de_prueba
from public.plans
order by tier;
