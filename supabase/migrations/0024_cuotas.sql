-- ════════════════════════════════════════════════════════════════════════════
-- 0024 · CUOTAS: LO QUE PAGA CADA FAMILIA Y QUIÉN VA AL DÍA
-- ════════════════════════════════════════════════════════════════════════════
--
-- Un club de base cobra una cuota y lleva la cuenta en una hoja de cálculo o
-- en la cabeza de una persona. Eso es lo que esto sustituye, y nada más: no
-- es una pasarela de pago, no mueve dinero y no se conecta con el banco. El
-- dinero lo cobra el club como lo cobre —efectivo, transferencia, Bizum— y
-- aquí se APUNTA. Por eso todos los importes los escribe una persona.
--
-- Dos tablas, y la separación importa:
--
--   `fee_plans`    la cuota en abstracto: «Cuota mensual 2026/27, 35 €, todo
--                  el club». Es la regla.
--   `fee_charges`  un recibo concreto: «Ainhoa, octubre, 35 €, pagado el 3
--                  en efectivo». Es el hecho.
--
-- Con una sola tabla habría que recalcular quién debe qué cada vez que
-- alguien cambia el precio, y cambiar el precio en enero reescribiría lo que
-- se cobró en octubre. Un recibo emitido es un hecho pasado: lleva su propio
-- importe copiado y no se entera de que la cuota subió.
--
-- ── «VENCIDO» NO SE GUARDA ─────────────────────────────────────────────────
--
-- Hay tres estados —pendiente, pagado y exento— y ya está. Que un recibo esté
-- vencido es `due_date < hoy and status = 'pendiente'`, que se sabe mirando;
-- guardarlo obligaría a un proceso que pasara cada noche cambiando filas, y
-- el día que ese proceso fallara la pantalla mentiría sin que nadie lo
-- notara. Lo que se puede deducir no se almacena.
--
-- ── SÓLO LOS ADMINISTRADORES DEL CLUB, Y TAMBIÉN PARA LEER ─────────────────
--
-- Esto es información económica de familias con hijos menores: quién debe
-- dinero y desde cuándo. Un segundo entrenador no necesita saberlo para
-- entrenar, así que no lo ve. La política lo impone en el servidor, no la
-- pantalla: esconder una pestaña no es autorización.
--
-- Lo impone `is_club_admin`, la misma función que ya decide quién crea
-- equipos. Un club siempre tiene administrador —quien lo crea lo es—, así
-- que nadie se queda sin poder cobrar.
--
-- ── NO SE BORRA UN RECIBO AL BORRAR LA CUOTA ───────────────────────────────
--
-- `fee_plan_id` va con `on delete set null`: si alguien retira la cuota del
-- año pasado, los recibos de ese año siguen ahí con su concepto y su importe
-- copiados. Lo que se cobró, se cobró, y el historial de un club es
-- justamente lo que no puede evaporarse. Lo que sí desaparece con su dueño es
-- el recibo de un jugador borrado: ahí ya no hay a quién cobrar.
--
-- ADITIVA: dos tablas nuevas. No toca ninguna tabla existente ni ninguna
-- política existente.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists fee_plans (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  -- Nulo = la cuota es de todo el club. Con equipo, sólo de ese equipo.
  team_id uuid references teams(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount_cents integer not null check (amount_cents >= 0),
  period text not null check (period in ('mensual', 'trimestral', 'anual', 'unica')),
  -- El día del mes en que vence. Nulo en las de pago único.
  due_day smallint check (due_day between 1 and 28),
  season text,
  active boolean not null default true,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table fee_plans is
  'La cuota en abstracto: cuánto, cada cuánto y a quién. Los recibos van en fee_charges.';
comment on column fee_plans.due_day is
  'Hasta 28 a propósito: un vencimiento el 30 no existe en febrero.';

create table if not exists fee_charges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  -- Se queda a nulo si se retira la cuota: el recibo sobrevive con su copia.
  fee_plan_id uuid references fee_plans(id) on delete set null,
  player_id uuid not null references players(id) on delete cascade,
  -- Copiados del plan al emitirlo. Un recibo no cambia porque suba la cuota.
  concept text not null check (length(trim(concept)) > 0),
  amount_cents integer not null check (amount_cents >= 0),
  -- '2026-10' en las mensuales, '2026/27' en las anuales. Texto porque lo que
  -- significa un periodo depende de la cuota, y un rango de fechas aquí sería
  -- una precisión que nadie usa.
  period_label text not null,
  due_date date,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagado', 'exento')),
  paid_at timestamptz,
  method text check (method in ('efectivo', 'transferencia', 'bizum', 'domiciliado', 'otro')),
  note text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Un recibo por jugador y periodo de cada cuota. Es lo que impide que al
  -- pulsar dos veces «emitir octubre» salgan dos recibos del mismo mes.
  unique (fee_plan_id, player_id, period_label),

  -- La fecha de cobro y el estado no pueden contradecirse. Sin esto, una
  -- pantalla podría dejar un recibo «pendiente» con fecha de pago puesta y
  -- las cuentas del club dirían dos cosas distintas según dónde se miren.
  constraint fee_charges_pago_coherente check (
    (status = 'pagado' and paid_at is not null)
    or (status <> 'pagado' and paid_at is null)
  )
);

comment on table fee_charges is
  'Un recibo: a quién, cuánto, de qué periodo y si está pagado. Nadie mueve dinero aquí; se apunta lo que se cobró fuera.';

create index if not exists fee_plans_club_idx on fee_plans (club_id) where active;
create index if not exists fee_charges_club_idx on fee_charges (club_id, period_label);
create index if not exists fee_charges_player_idx on fee_charges (player_id);
-- Para la pregunta que más se hace: quién debe algo.
create index if not exists fee_charges_pendientes_idx
  on fee_charges (club_id, due_date) where status = 'pendiente';

alter table fee_plans enable row level security;
alter table fee_charges enable row level security;

create policy fee_plans_admin on fee_plans
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

create policy fee_charges_admin on fee_charges
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));
