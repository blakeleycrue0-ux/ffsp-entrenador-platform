-- ════════════════════════════════════════════════════════════════════════════
-- 0025 · DINERO CON RASTRO: QUIÉN TOCÓ QUÉ, Y PAGOS A MEDIAS
-- ════════════════════════════════════════════════════════════════════════════
--
-- La 0024 montó las cuotas y se dejó fuera lo que convierte una lista en una
-- contabilidad. Dicho sin rodeos, lo que fallaba:
--
--   · `recorded_by` existía en la tabla y NO SE ESCRIBÍA EN NINGÚN SITIO. Un
--     club con tres administradores no podía saber quién marcó un cobro.
--   · Un administrador podía cambiar el importe de un recibo ya emitido, o
--     marcarlo pagado y volverlo atrás, sin dejar ni una huella. Para una
--     lista de la compra da igual; para varios miles de euros al año es la
--     diferencia entre una contabilidad y una hoja suelta.
--   · O se pagaba entero o no se pagaba. En un club de base se paga a medias
--     constantemente —«te doy 20 ahora y el resto el viernes»— y eso no se
--     podía apuntar: o mentías marcándolo pagado, o mentías dejándolo a cero.
--
-- ── 1. EL RASTRO LO ESCRIBE LA BASE, NO LA PANTALLA ────────────────────────
--
-- `fee_events` se rellena desde un disparador sobre `fee_charges`. Eso es lo
-- que lo hace fiable: no depende de que el programa se acuerde de registrar,
-- ni de que lo haga la versión del móvil que tenga cada uno, ni de que nadie
-- llame a la API por su cuenta. Se escribe un recibo, queda apuntado.
--
-- Y ES DE SÓLO AÑADIR. Hay política de lectura y de inserción, y NO hay de
-- modificación ni de borrado: en Postgres, lo que no tiene política no se
-- puede hacer, ni siquiera siendo administrador del club. Un registro que su
-- propio dueño puede reescribir no sirve para lo único que sirve un registro.
--
-- GUARDA UNA COPIA DEL NOMBRE de quien lo hizo. Si esa persona deja el club y
-- se borra su perfil, el rastro tiene que seguir diciendo quién fue; con sólo
-- la clave ajena se quedaría en «alguien».
--
-- ── 2. `recorded_by` LO PONE EL SERVIDOR ───────────────────────────────────
--
-- Otro disparador lo fija a `auth.uid()` en cada escritura, pase lo que pase.
-- Si lo pusiera el navegador, bastaría con mandar otro identificador para
-- firmar un cobro con el nombre de un compañero.
--
-- ── 3. PAGOS A MEDIAS, SIN UN ESTADO NUEVO ─────────────────────────────────
--
-- Se añade `paid_cents`: cuánto se lleva cobrado de ese recibo. «A medias» no
-- es un estado que alguien ponga, es `0 < paid_cents < amount_cents`, igual
-- que «vencido» es una fecha. Un estado más sería una cosa más que puede
-- contradecir a los números.
--
-- Y la restricción obliga a que lo cobrado cuadre con el estado: un recibo
-- «pagado» tiene cobrado el total, y uno que no está pagado no puede tener
-- cobrado más que el total. Sin esto, las cuentas del resumen y las de las
-- filas dirían cosas distintas.
--
-- ADITIVA: una tabla nueva, una columna nueva con valor por defecto y dos
-- disparadores. No borra nada ni cambia ninguna política existente.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Cuánto se lleva cobrado ─────────────────────────────────────────────────

alter table fee_charges
  add column if not exists paid_cents integer not null default 0;

comment on column fee_charges.paid_cents is
  'Cobrado hasta ahora. Un pago a medias es 0 < paid_cents < amount_cents; no hay estado «parcial» porque se deduce.';

-- Los recibos que ya estaban pagados llevan cobrado su importe entero: antes
-- de esta columna, «pagado» sólo podía querer decir eso.
update fee_charges set paid_cents = amount_cents where status = 'pagado' and paid_cents = 0;

alter table fee_charges drop constraint if exists fee_charges_cobrado_cuadra;
alter table fee_charges add constraint fee_charges_cobrado_cuadra check (
  paid_cents >= 0
  and paid_cents <= amount_cents
  and (status <> 'pagado' or paid_cents = amount_cents)
);

-- ── El rastro ───────────────────────────────────────────────────────────────

create table if not exists fee_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  -- `set null` y no `cascade`: borrar un recibo no puede borrar la prueba de
  -- que existió. Por eso debajo se copia a quién era y de cuánto.
  charge_id uuid references fee_charges(id) on delete set null,
  player_id uuid,
  concept text,
  kind text not null check (kind in ('emitido', 'cobro', 'estado', 'importe', 'borrado')),
  amount_cents integer,
  paid_cents integer,
  antes jsonb,
  despues jsonb,
  actor uuid references profiles(id) on delete set null,
  -- Copiado a propósito: si el perfil se borra, el rastro sigue con nombre.
  actor_name text,
  at timestamptz not null default now()
);

comment on table fee_events is
  'Rastro de todo lo que le pasa a un recibo. Lo escribe un disparador, y no tiene política de modificación ni de borrado: sólo se añade.';

create index if not exists fee_events_club_idx on fee_events (club_id, at desc);
create index if not exists fee_events_charge_idx on fee_events (charge_id, at desc);

alter table fee_events enable row level security;

-- Leer, los administradores del club. Escribir, sólo el disparador (que va
-- con `security definer`), pero se deja la inserción por si alguna vez hace
-- falta anotar algo a mano desde el servidor.
create policy fee_events_select on fee_events
  for select using (is_club_admin(club_id));
create policy fee_events_insert on fee_events
  for insert with check (is_club_admin(club_id));
-- NO HAY `for update` NI `for delete`, Y ES EL PUNTO DE TODO ESTO.

-- ── Quién lo hizo, decidido en el servidor ──────────────────────────────────

create or replace function fee_charges_firma()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Pase lo que pase mande el cliente. Si lo eligiera el navegador, se
  -- podría firmar un cobro con el nombre de otro.
  new.recorded_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists fee_charges_firma_trg on fee_charges;
create trigger fee_charges_firma_trg
  before insert or update on fee_charges
  for each row execute function fee_charges_firma();

-- ── El rastro, escrito por la base ──────────────────────────────────────────

create or replace function fee_charges_rastro()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  quien uuid := auth.uid();
  como  text;
  fila  fee_charges%rowtype := coalesce(new, old);
begin
  if tg_op = 'INSERT' then
    como := 'emitido';
  elsif tg_op = 'DELETE' then
    como := 'borrado';
  elsif new.paid_cents is distinct from old.paid_cents then
    como := 'cobro';
  elsif new.amount_cents is distinct from old.amount_cents then
    como := 'importe';
  elsif new.status is distinct from old.status then
    como := 'estado';
  else
    -- Una nota, o un guardado que no cambia nada: no se apunta. Un registro
    -- lleno de líneas vacías deja de leerse, y entonces no sirve.
    return coalesce(new, old);
  end if;

  insert into fee_events (
    club_id, charge_id, player_id, concept, kind,
    amount_cents, paid_cents, antes, despues, actor, actor_name
  ) values (
    fila.club_id,
    case when tg_op = 'DELETE' then null else fila.id end,
    fila.player_id,
    fila.concept,
    como,
    fila.amount_cents,
    fila.paid_cents,
    case when tg_op = 'INSERT' then null else
      jsonb_build_object('status', old.status, 'amount_cents', old.amount_cents, 'paid_cents', old.paid_cents) end,
    case when tg_op = 'DELETE' then null else
      jsonb_build_object('status', new.status, 'amount_cents', new.amount_cents, 'paid_cents', new.paid_cents) end,
    quien,
    (select full_name from profiles where id = quien)
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists fee_charges_rastro_trg on fee_charges;
create trigger fee_charges_rastro_trg
  after insert or update or delete on fee_charges
  for each row execute function fee_charges_rastro();
