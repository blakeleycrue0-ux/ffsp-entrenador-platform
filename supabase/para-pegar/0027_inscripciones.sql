create table if not exists enrollment_forms (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,

  team_id uuid references teams(id) on delete set null,

  fee_plan_id uuid references fee_plans(id) on delete set null,

  title text not null check (length(trim(title)) between 3 and 120),
  intro text check (length(intro) <= 2000),
  season text,

  token text not null unique default encode(gen_random_bytes(16), 'hex'),

  status text not null default 'borrador'
    check (status in ('borrador', 'abierta', 'cerrada')),

  opens_at timestamptz,
  closes_at timestamptz,

  max_submissions integer check (max_submissions is null or max_submissions > 0),

  campos jsonb not null default '[]'::jsonb check (jsonb_typeof(campos) = 'array'),
  documentos jsonb not null default '[]'::jsonb check (jsonb_typeof(documentos) = 'array'),

  consentimientos jsonb not null default '[]'::jsonb
    check (jsonb_typeof(consentimientos) = 'array'),

  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  published_by uuid references profiles(id) on delete set null,
  published_at timestamptz,

  constraint enrollment_forms_ventana check (
    opens_at is null or closes_at is null or closes_at > opens_at
  ),
  constraint enrollment_forms_publicado_firmado check (
    status = 'borrador' or published_at is not null
  )
);

comment on table enrollment_forms is
  'La campaña de inscripción: el enlace que se reparte a las familias. Publicarla es un acto firmado; en borrador el enlace no abre.';
comment on column enrollment_forms.token is
  'Por donde entra el público. 128 bits aleatorios. Quien lo tenga ve el formulario, así que no es un secreto compartido: es una dirección difícil de adivinar.';
comment on column enrollment_forms.campos is
  'Preguntas sueltas del club. Lo que es igual en todos los clubes es columna en enrollments, no una clave de aquí.';

create index if not exists enrollment_forms_club_idx
  on enrollment_forms (club_id, created_at desc);
create index if not exists enrollment_forms_abiertas_idx
  on enrollment_forms (token) where status = 'abierta';

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references enrollment_forms(id) on delete cascade,

  club_id uuid not null references clubs(id) on delete cascade,

  codigo text not null unique,

  status text not null default 'recibida'
    check (status in ('recibida', 'aprobada', 'rechazada')),

  player_name text not null check (length(trim(player_name)) between 2 and 120),
  player_birth_date date,
  player_doc text,
  player_sex text check (player_sex is null or player_sex in ('F', 'M', 'X')),

  guardian_name text not null check (length(trim(guardian_name)) between 2 and 120),
  guardian_doc text,
  guardian_email text not null check (guardian_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  guardian_phone text,
  guardian_relation text,

  address text,
  postal_code text,
  city text,

  respuestas jsonb not null default '{}'::jsonb
    check (jsonb_typeof(respuestas) = 'object'),

  consentimientos jsonb not null default '{}'::jsonb
    check (jsonb_typeof(consentimientos) = 'object'),

  player_id uuid references players(id) on delete set null,

  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (length(review_note) <= 1000),

  ip_hash text,
  created_at timestamptz not null default now(),

  constraint enrollments_revision_coherente check (
    (status = 'recibida' and reviewed_at is null)
    or (status <> 'recibida' and reviewed_at is not null)
  ),

  constraint enrollments_jugador_coherente check (
    (status = 'aprobada') or player_id is null
  )
);

comment on table enrollments is
  'Una inscripción rellenada desde el enlace público. Contiene datos de un menor: ninguna política la abre a nadie que no administre el club.';
comment on column enrollments.codigo is
  'Justificante para la familia. Sin 0/O ni 1/I porque se dice por teléfono.';
comment on column enrollments.ip_hash is
  'Hash con sal de la IP, calculado en el servidor, para contar envíos del mismo sitio. Evita guardarla en claro; con acceso a la base no es anonimato fuerte.';

create index if not exists enrollments_form_idx on enrollments (form_id, created_at desc);
create index if not exists enrollments_club_idx on enrollments (club_id, status, created_at desc);
create index if not exists enrollments_pendientes_idx
  on enrollments (club_id, created_at) where status = 'recibida';

create table if not exists enrollment_documents (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,

  kind text not null,

  storage_path text not null unique,
  filename text not null,
  mime text not null,
  size_bytes integer not null check (size_bytes > 0),
  uploaded_at timestamptz not null default now()
);

comment on table enrollment_documents is
  'Qué archivos acompañan a una inscripción. El archivo vive en el cubo privado inscripciones; aquí sólo está su ficha.';

create index if not exists enrollment_documents_enrollment_idx
  on enrollment_documents (enrollment_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inscripciones', 'inscripciones', false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table enrollment_forms enable row level security;
alter table enrollments enable row level security;
alter table enrollment_documents enable row level security;

drop policy if exists enrollment_forms_admin on enrollment_forms;
create policy enrollment_forms_admin on enrollment_forms
  for all to authenticated
  using (is_club_admin(club_id)) with check (is_club_admin(club_id));

drop policy if exists enrollments_admin on enrollments;
create policy enrollments_admin on enrollments
  for all to authenticated
  using (is_club_admin(club_id)) with check (is_club_admin(club_id));

drop policy if exists enrollment_documents_admin on enrollment_documents;
create policy enrollment_documents_admin on enrollment_documents
  for all to authenticated
  using (is_club_admin(club_id)) with check (is_club_admin(club_id));

create or replace function enrollment_forms_firma()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.updated_at := now();

  /* Pasar de borrador a abierta se firma aquí y no en el cliente: así no hay
     manera de publicar un formulario sin que conste quién lo hizo. */
  /* CUALQUIER SALIDA DE BORRADOR SE FIRMA, no sólo publicar. El `check` de la
     tabla exige `published_at` en cuanto el estado deja de ser borrador, así
     que cerrar un borrador directamente —sin haberlo abierto nunca— reventaba
     con un error de restricción que no explicaba nada. */
  if new.status <> 'borrador' and coalesce(old.status, 'borrador') = 'borrador' then
    new.published_at := coalesce(new.published_at, now());
    new.published_by := coalesce(new.published_by, auth.uid());
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists enrollment_forms_firma_trg on enrollment_forms;
create trigger enrollment_forms_firma_trg
  before insert or update on enrollment_forms
  for each row execute function enrollment_forms_firma();

create or replace function formulario_de_inscripcion(p_token text)
returns table (
  abierto boolean,
  motivo text,
  titulo text,
  intro text,
  temporada text,
  club_nombre text,
  club_escudo text,
  campos jsonb,
  documentos jsonb,
  consentimientos jsonb
)
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  f record;
  enviadas integer;
begin
  select ef.*, c.name as cname, c.crest_url as ccrest
    into f
    from enrollment_forms ef
    join clubs c on c.id = ef.club_id
   where ef.token = p_token;

  if not found then
    return query select false, 'Este enlace no existe.'::text,
      null::text, null::text, null::text, null::text, null::text,
      null::jsonb, null::jsonb, null::jsonb;
    return;
  end if;

  /* A partir de aquí el formulario existe, así que ya se puede decir de qué
     club es: eso es lo que distingue «me han dado mal el enlace» de «llego
     tarde», y la familia necesita saberlo. */
  if f.status <> 'abierta' then
    return query select false,
      case when f.status = 'borrador'
        then 'Este formulario todavía no está abierto.'
        else 'Este formulario ya está cerrado.' end::text,
      f.title, f.intro, f.season, f.cname, f.ccrest, null::jsonb, null::jsonb, null::jsonb;
    return;
  end if;

  if f.opens_at is not null and now() < f.opens_at then
    return query select false,
      ('Las inscripciones abren el ' || to_char(f.opens_at at time zone 'Europe/Madrid', 'DD/MM/YYYY') || '.')::text,
      f.title, f.intro, f.season, f.cname, f.ccrest, null::jsonb, null::jsonb, null::jsonb;
    return;
  end if;

  if f.closes_at is not null and now() > f.closes_at then
    return query select false,
      ('El plazo terminó el ' || to_char(f.closes_at at time zone 'Europe/Madrid', 'DD/MM/YYYY') || '.')::text,
      f.title, f.intro, f.season, f.cname, f.ccrest, null::jsonb, null::jsonb, null::jsonb;
    return;
  end if;

  if f.max_submissions is not null then
    select count(*) into enviadas from enrollments e
      where e.form_id = f.id and e.status <> 'rechazada';
    if enviadas >= f.max_submissions then
      return query select false, 'Se han cubierto todas las plazas.'::text,
        f.title, f.intro, f.season, f.cname, f.ccrest, null::jsonb, null::jsonb, null::jsonb;
      return;
    end if;
  end if;

  return query select true, null::text,
    f.title, f.intro, f.season, f.cname, f.ccrest,
    f.campos, f.documentos, f.consentimientos;
end;
$$;

revoke all on function formulario_de_inscripcion(text) from public;
grant execute on function formulario_de_inscripcion(text) to anon, authenticated;

create or replace function enviar_inscripcion(
  p_token text,
  p_datos jsonb
)

returns table (inscripcion_id uuid, justificante text)
language plpgsql
security definer

set search_path to 'public', 'extensions'
as $$
declare
  f record;
  enviadas integer;
  campo jsonb;
  cons jsonb;
  nuevo_codigo text;
  nuevo_id uuid;
  recientes integer;
  cabeceras json;
  ip text;
  huella text;
begin
  select * into f from enrollment_forms where token = p_token;
  if not found or f.status <> 'abierta' then
    raise exception 'Este formulario no está abierto.' using errcode = 'P0001';
  end if;
  if f.opens_at is not null and now() < f.opens_at then
    raise exception 'Las inscripciones todavía no están abiertas.' using errcode = 'P0001';
  end if;
  if f.closes_at is not null and now() > f.closes_at then
    raise exception 'El plazo de inscripción ya ha terminado.' using errcode = 'P0001';
  end if;

  if f.max_submissions is not null then
    select count(*) into enviadas from enrollments e
      where e.form_id = f.id and e.status <> 'rechazada';
    if enviadas >= f.max_submissions then
      raise exception 'Se han cubierto todas las plazas.' using errcode = 'P0001';
    end if;
  end if;

  /* FRENO AL ENVÍO AUTOMÁTICO. Diez desde la misma huella en una hora es
     muchísimo para una familia y poquísimo para un script. No bloquea a un
     colegio entero detrás del mismo router: cuenta por formulario, no en
     general.

     LA HUELLA SALE DE LA CABECERA, no de un parámetro: la pone la
     infraestructura y el cliente no la escribe. Si no hubiera cabecera
     —al llamar a la función desde el propio SQL, por ejemplo— se queda nula
     y no se aplica el límite, que es lo correcto: no hay de dónde contar. */
  /* EL CÁLCULO VA EN SU PROPIO BLOQUE, Y FALLA ABIERTO. `digest` lo trae
     pgcrypto, que en Supabase vive en el esquema `extensions` y en un
     Postgres normal en `public`; los dos están en el `search_path` de arriba.
     Si aun así no se encontrara, la excepción subiría y tiraría el envío
     ENTERO: una familia no podría inscribirse por un problema del contador de
     abusos. Eso es mucho peor que no contar, así que si algo de aquí falla se
     anota el motivo y se sigue sin límite.

     El `raise` del propio límite se vuelve a lanzar: ése sí tiene que cortar. */
  begin
    cabeceras := nullif(current_setting('request.headers', true), '')::json;
    ip := nullif(split_part(coalesce(cabeceras->>'x-forwarded-for', ''), ',', 1), '');
    if ip is not null then
      huella := encode(digest(ip || '|' || f.id::text, 'sha256'), 'hex');
      select count(*) into recientes from enrollments e
        where e.form_id = f.id and e.ip_hash = huella
          and e.created_at > now() - interval '1 hour';
      if recientes >= 10 then
        raise exception 'Demasiados envíos desde este dispositivo. Prueba más tarde.'
          using errcode = 'P0001';
      end if;
    end if;
  exception
    when sqlstate 'P0001' then raise;
    when others then
      raise warning 'No se ha podido aplicar el límite de envíos: %', sqlerrm;
      huella := null;
  end;

  /* Los obligatorios del propio club. Lo de arriba son los fijos, que ya los
     exige la tabla con sus `not null` y sus `check`. */
  for campo in select * from jsonb_array_elements(f.campos) loop
    if coalesce((campo->>'obligatorio')::boolean, false)
       and coalesce(trim(p_datos->'respuestas'->>(campo->>'id')), '') = '' then
      raise exception 'Falta un dato obligatorio: %', coalesce(campo->>'label', campo->>'id')
        using errcode = 'P0001';
    end if;
  end loop;

  /* Y los consentimientos. Sin base legal no se guarda nada de un menor, así
     que esto no es una casilla de adorno: es la condición para insertar. */
  for cons in select * from jsonb_array_elements(f.consentimientos) loop
    if coalesce((cons->>'obligatorio')::boolean, true)
       and (p_datos->'consentimientos'->>(cons->>'id')) is null then
      raise exception 'Hay que aceptar: %', coalesce(cons->>'label', cons->>'id')
        using errcode = 'P0001';
    end if;
  end loop;

  /* El justificante. Base32 de Crockford sin las letras que se confunden al
     dictarlo. Se reintenta porque el choque, aunque improbable, existe. */
  loop
    /* `select ... into` y no `:=`: una asignación de plpgsql no admite `from`,
       y `string_agg` necesita filas de donde agregar. */
    select 'INS-' || string_agg(
             substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), ''
           )
      into nuevo_codigo
      from generate_series(1, 8);
    exit when not exists (select 1 from enrollments en where en.codigo = nuevo_codigo);
  end loop;

  insert into enrollments (
    form_id, club_id, codigo,
    player_name, player_birth_date, player_doc, player_sex,
    guardian_name, guardian_doc, guardian_email, guardian_phone, guardian_relation,
    address, postal_code, city,
    respuestas, consentimientos, ip_hash
  ) values (
    f.id, f.club_id, nuevo_codigo,
    trim(p_datos->>'player_name'),
    nullif(p_datos->>'player_birth_date', '')::date,
    nullif(trim(p_datos->>'player_doc'), ''),
    nullif(p_datos->>'player_sex', ''),
    trim(p_datos->>'guardian_name'),
    nullif(trim(p_datos->>'guardian_doc'), ''),
    lower(trim(p_datos->>'guardian_email')),
    nullif(trim(p_datos->>'guardian_phone'), ''),
    nullif(trim(p_datos->>'guardian_relation'), ''),
    nullif(trim(p_datos->>'address'), ''),
    nullif(trim(p_datos->>'postal_code'), ''),
    nullif(trim(p_datos->>'city'), ''),
    coalesce(p_datos->'respuestas', '{}'::jsonb),
    coalesce(p_datos->'consentimientos', '{}'::jsonb),
    huella
  )
  returning enrollments.id into nuevo_id;

  /* AVISO AL CLUB. Sin esto, una inscripción se queda esperando a que alguien
     entre a mirar por casualidad. Se escribe con la misma tabla que usa el
     resto de la aplicación y se tolera el fallo: si no hay a quién avisar, la
     inscripción ya está guardada y eso es lo que importa. */
  begin
    insert into notifications (profile_id, icon, title, detail, link)
    select cm.profile_id, 'tarea',
      'Nueva inscripción',
      trim(p_datos->>'player_name') || ' se ha inscrito en «' || f.title || '». Está sin revisar.',
      '/app/inscripciones'
    from club_members cm
    where cm.club_id = f.club_id and cm.role = 'admin';
  exception when others then null;
  end;

  return query select nuevo_id, nuevo_codigo;
end;
$$;

revoke all on function enviar_inscripcion(text, jsonb) from public;
grant execute on function enviar_inscripcion(text, jsonb) to anon, authenticated;

create or replace function aprobar_inscripcion(
  p_enrollment uuid,
  p_team uuid default null,
  p_nota text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  e record;
  f record;
  equipo uuid;
  nuevo_jugador uuid;
  periodo text;
begin
  select * into e from enrollments where id = p_enrollment;
  if not found then
    raise exception 'Esa inscripción no existe.' using errcode = 'P0001';
  end if;

  if not is_club_admin(e.club_id) then
    raise exception 'No administras este club.' using errcode = '42501';
  end if;

  if e.status <> 'recibida' then
    raise exception 'Esta inscripción ya está %.', e.status using errcode = 'P0001';
  end if;

  select * into f from enrollment_forms where id = e.form_id;

  equipo := coalesce(p_team, f.team_id);
  if equipo is null then
    raise exception 'Hay que decir en qué equipo entra.' using errcode = 'P0001';
  end if;
  /* El equipo tiene que ser de ESTE club. Si no, aprobar una inscripción
     serviría para colar un jugador en el club de otro. */
  if not exists (select 1 from teams t where t.id = equipo and t.club_id = e.club_id) then
    raise exception 'Ese equipo no es de este club.' using errcode = 'P0001';
  end if;

  insert into players (team_id, name, birth_date, email, phone, guardians, notes)
  values (
    equipo,
    e.player_name,
    e.player_birth_date,
    e.guardian_email,
    e.guardian_phone,
    jsonb_build_array(jsonb_build_object(
      'name', e.guardian_name,
      'relation', coalesce(e.guardian_relation, 'Tutor/a'),
      'phone', e.guardian_phone,
      'email', e.guardian_email
    )),
    'Alta por inscripción ' || e.codigo || '.'
  )
  returning id into nuevo_jugador;

  update enrollments set
    status = 'aprobada',
    player_id = nuevo_jugador,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = p_nota
  where id = p_enrollment;

  /* EL RECIBO, SI HAY CUOTA. Se emite el del periodo en curso y sólo ese: los
     siguientes los emite la pantalla de cuotas cuando llega el mes, que es
     como funciona hoy. Emitir doce de golpe le enseñaría a la familia una
     deuda de todo el año el primer día. */
  if f.fee_plan_id is not null then
    select case fp.period
      when 'mensual'    then to_char(now() at time zone 'Europe/Madrid', 'YYYY-MM')
      when 'trimestral' then to_char(now() at time zone 'Europe/Madrid', 'YYYY') || '-T'
                             || to_char(now() at time zone 'Europe/Madrid', 'Q')
      when 'anual'      then to_char(now() at time zone 'Europe/Madrid', 'YYYY')
      else 'inscripcion'
    end into periodo
    from fee_plans fp where fp.id = f.fee_plan_id;

    insert into fee_charges (
      club_id, fee_plan_id, player_id, concept, amount_cents, period_label, due_date
    )
    select e.club_id, fp.id, nuevo_jugador, fp.name, fp.amount_cents, periodo,
      case when fp.due_day is null then null
        else make_date(
          extract(year from now() at time zone 'Europe/Madrid')::int,
          extract(month from now() at time zone 'Europe/Madrid')::int,
          fp.due_day)
      end
    from fee_plans fp where fp.id = f.fee_plan_id
    on conflict (fee_plan_id, player_id, period_label) do nothing;
  end if;

  return nuevo_jugador;
end;
$$;

revoke all on function aprobar_inscripcion(uuid, uuid, text) from public;
grant execute on function aprobar_inscripcion(uuid, uuid, text) to authenticated;

create or replace function rechazar_inscripcion(p_enrollment uuid, p_nota text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  e record;
begin
  select * into e from enrollments where id = p_enrollment;
  if not found then
    raise exception 'Esa inscripción no existe.' using errcode = 'P0001';
  end if;
  if not is_club_admin(e.club_id) then
    raise exception 'No administras este club.' using errcode = '42501';
  end if;
  if e.status <> 'recibida' then
    raise exception 'Esta inscripción ya está %.', e.status using errcode = 'P0001';
  end if;
  if coalesce(trim(p_nota), '') = '' then
    raise exception 'Hay que escribir el motivo.' using errcode = 'P0001';
  end if;

  update enrollments set
    status = 'rechazada', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_nota
  where id = p_enrollment;
end;
$$;

revoke all on function rechazar_inscripcion(uuid, text) from public;
grant execute on function rechazar_inscripcion(uuid, text) to authenticated;

alter table clubs add column if not exists stripe_account_id text;
alter table clubs add column if not exists stripe_account_status text
  default 'ninguna'
  check (stripe_account_status is null
    or stripe_account_status in ('ninguna', 'pendiente', 'activa', 'restringida'));
alter table clubs add column if not exists cobro_online boolean not null default false;
alter table clubs add column if not exists platform_fee_bps integer not null default 0
  check (platform_fee_bps between 0 and 1000);

comment on column clubs.stripe_account_id is
  'La cuenta conectada del club en Stripe. El dinero de las cuotas va ahí, no a nosotros.';
comment on column clubs.cobro_online is
  'Apagado hasta que la cuenta del club esté activa en Stripe. Mientras esté en false, las cuotas sólo se marcan a mano.';
comment on column clubs.platform_fee_bps is
  'Comisión de la plataforma en puntos básicos (100 = 1 %). Cero por defecto: el importe entero va al club. El tope de 1000 (10 %) es un seguro contra un dedo torpe, no una tarifa.';

alter table fee_charges add column if not exists stripe_payment_intent text;
alter table fee_charges add column if not exists platform_fee_cents integer;
alter table fee_charges add column if not exists stripe_fee_cents integer;

comment on column fee_charges.platform_fee_cents is
  'Lo que se quedó la plataforma de ESTE recibo, tal como lo dijo Stripe. No se calcula al leer: se guarda lo que pasó.';

create unique index if not exists fee_charges_intent_idx
  on fee_charges (stripe_payment_intent) where stripe_payment_intent is not null;
