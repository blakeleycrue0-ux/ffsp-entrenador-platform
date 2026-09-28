-- ════════════════════════════════════════════════════════════════════════════
-- 0009 · Código de acceso de PlayOff360 (PIN de cuatro cifras)
-- ════════════════════════════════════════════════════════════════════════════
--
-- QUÉ ES Y QUÉ NO ES.
-- Es un candado de conveniencia sobre una sesión que ya está iniciada: bloquea
-- la aplicación al volver a ella en un móvil que puede pasar de mano en mano.
-- NO SUSTITUYE A LA AUTENTICACIÓN. Quien no tenga sesión de Supabase Auth no
-- entra, con PIN o sin él; y quien tenga el testigo de sesión en la mano ya
-- puede llamar a la API sin pasar por ninguna pantalla. Por eso el PIN se
-- guarda por perfil y nunca concede permisos: los permisos siguen siendo los
-- de RLS.
--
-- EL PIN NO SE GUARDA. Ni en claro, ni cifrado de forma reversible. Se guarda
-- un verificador bcrypt (`crypt` + `gen_salt('bf', 10)`, de pgcrypto), que es
-- de ida y vuelta imposible: se puede comprobar un PIN, no recuperarlo. Con
-- cuatro cifras sólo hay diez mil combinaciones, así que el hash por sí solo
-- no basta —un atacante con la tabla las probaría todas— y de ahí las dos
-- defensas siguientes.
--
-- LA COMPROBACIÓN ES DEL SERVIDOR. El navegador nunca recibe el verificador:
-- la tabla no tiene NI UNA política de RLS, de modo que a través de PostgREST
-- no se puede leer ni escribir. Se entra sólo por funciones `security definer`
-- que actúan sobre `auth.uid()` y no aceptan un perfil ajeno como parámetro.
--
-- HAY LÍMITE DE INTENTOS Y ESPERA CRECIENTE. Cada cinco fallos se bloquea la
-- comprobación un rato, y el rato se dobla: 1, 2, 4, 8, 16 minutos, con tope
-- en 30. Diez mil combinaciones a cinco por minuto son más de un mes, y eso
-- sin contar que el contador no se reinicia solo: sólo lo reinicia un acierto.
--
-- Es ADITIVA: no borra tablas ni registros, no toca la autenticación
-- existente, no renombra nada. Idempotente. Requiere 0001.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.user_passcodes (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  -- Verificador bcrypt. Nunca el PIN.
  verifier        text        not null,
  -- Fallos acumulados desde el último acierto. No se reinicia con el tiempo.
  failed_attempts integer     not null default 0,
  -- Hasta cuándo no se admite otra comprobación.
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.user_passcodes is
  'Código de acceso de cuatro cifras, por perfil. Sólo el verificador bcrypt; '
  'nunca el PIN. Sin políticas RLS a propósito: se usa por funciones.';

/* Sin políticas. Con RLS activo y cero políticas, `authenticated` y `anon` no
   ven ni escriben nada por PostgREST; la clave de servicio sí, porque salta
   RLS, y vive en el servidor. */
alter table public.user_passcodes enable row level security;

revoke all on public.user_passcodes from anon, authenticated;

/* ───────────────────────────── Cómo se comprueba ─────────────────────────── */

/**
 * Cuánto se espera tras `n` fallos. Cada cinco fallos se dobla la espera,
 * empezando en un minuto y con tope en media hora.
 */
create or replace function public.passcode_cooldown(n integer)
returns interval
language sql
immutable
as $$
  select case
    when n < 5 or n % 5 <> 0 then null
    else make_interval(secs => least(60 * (2 ^ ((n / 5) - 1)), 1800))
  end;
$$;

/**
 * ¿Tiene esta cuenta código de acceso, y está esperando por fallos?
 * Devuelve sólo lo que la pantalla de bloqueo necesita saber, nunca el hash.
 */
create or replace function public.passcode_estado()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
stable
as $$
declare
  fila public.user_passcodes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = '42501';
  end if;

  select * into fila from public.user_passcodes where profile_id = auth.uid();

  if not found then
    return jsonb_build_object('tiene', false, 'bloqueado_hasta', null, 'restantes', null);
  end if;

  return jsonb_build_object(
    'tiene', true,
    'bloqueado_hasta', case when fila.locked_until > now() then fila.locked_until end,
    'restantes', 5 - (fila.failed_attempts % 5)
  );
end;
$$;

/**
 * Comprueba el PIN de quien llama.
 *
 * Devuelve `{ok}` y, cuando falla, por qué: `incorrecto`, `bloqueado` o
 * `sin_pin`. Nunca dice nada del verificador. Acertar reinicia el contador;
 * fallar lo sube y, cada cinco, abre una espera.
 */
create or replace function public.passcode_verificar(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fila     public.user_passcodes%rowtype;
  acierta  boolean;
  espera   interval;
begin
  if auth.uid() is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = '42501';
  end if;

  /* `for update` serializa los intentos: dos peticiones a la vez no pueden
     gastar el mismo intento dos veces y burlar el límite. */
  select * into fila from public.user_passcodes where profile_id = auth.uid() for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'sin_pin');
  end if;

  if fila.locked_until is not null and fila.locked_until > now() then
    return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'bloqueado_hasta', fila.locked_until);
  end if;

  acierta := (p_pin is not null and extensions.crypt(p_pin, fila.verifier) = fila.verifier);

  if acierta then
    update public.user_passcodes
       set failed_attempts = 0, locked_until = null, updated_at = now()
     where profile_id = auth.uid();
    return jsonb_build_object('ok', true);
  end if;

  fila.failed_attempts := fila.failed_attempts + 1;
  espera := public.passcode_cooldown(fila.failed_attempts);

  update public.user_passcodes
     set failed_attempts = fila.failed_attempts,
         locked_until    = case when espera is null then null else now() + espera end,
         updated_at      = now()
   where profile_id = auth.uid();

  if espera is not null then
    return jsonb_build_object(
      'ok', false, 'motivo', 'bloqueado', 'bloqueado_hasta', now() + espera
    );
  end if;

  return jsonb_build_object(
    'ok', false, 'motivo', 'incorrecto', 'restantes', 5 - (fila.failed_attempts % 5)
  );
end;
$$;

/* ───────────────────────────── Cómo se cambia ────────────────────────────── */

/**
 * Pone o cambia el código.
 *
 * Si ya había uno, hay que escribir el de antes: así, con el móvil abierto
 * delante, nadie cambia el candado sin conocerlo. El PIN llega como texto de
 * cuatro cifras y se valida aquí, no sólo en el navegador.
 */
create or replace function public.passcode_guardar(p_nuevo text, p_actual text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fila public.user_passcodes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = '42501';
  end if;

  if p_nuevo !~ '^[0-9]{4}$' then
    raise exception 'El código son cuatro cifras.' using errcode = '22023';
  end if;

  select * into fila from public.user_passcodes where profile_id = auth.uid() for update;

  if found then
    if fila.locked_until is not null and fila.locked_until > now() then
      return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'bloqueado_hasta', fila.locked_until);
    end if;
    if p_actual is null or extensions.crypt(p_actual, fila.verifier) <> fila.verifier then
      return jsonb_build_object('ok', false, 'motivo', 'incorrecto');
    end if;
  end if;

  insert into public.user_passcodes (profile_id, verifier, failed_attempts, locked_until, updated_at)
  values (auth.uid(), extensions.crypt(p_nuevo, extensions.gen_salt('bf', 10)), 0, null, now())
  on conflict (profile_id) do update
    set verifier = excluded.verifier, failed_attempts = 0, locked_until = null, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

/**
 * Quita el código. Hay que escribir el actual.
 *
 * Quien lo haya olvidado del todo tiene la salida de siempre: cerrar sesión y
 * volver a entrar con su correo y su contraseña, que es la autenticación de
 * verdad. Ahí la aplicación pide la contraseña a Supabase Auth —no a esta
 * función— y, una vez comprobada, llama a `passcode_restablecer`.
 */
create or replace function public.passcode_quitar(p_actual text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fila public.user_passcodes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = '42501';
  end if;

  select * into fila from public.user_passcodes where profile_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', true);
  end if;

  if fila.locked_until is not null and fila.locked_until > now() then
    return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'bloqueado_hasta', fila.locked_until);
  end if;

  if p_actual is null or extensions.crypt(p_actual, fila.verifier) <> fila.verifier then
    return jsonb_build_object('ok', false, 'motivo', 'incorrecto');
  end if;

  delete from public.user_passcodes where profile_id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;

/**
 * Borra el código sin pedirlo.
 *
 * SE DICE CLARO LO QUE ESTO ES Y LO QUE NO ES: el servidor no puede ver que el
 * navegador acaba de comprobar la contraseña, así que esta función se fía de
 * la sesión. No debilita nada, porque el PIN nunca ha protegido nada que la
 * sesión no diera ya: quien tenga el testigo puede llamar a la API sin pasar
 * por la pantalla de bloqueo. El candado es para el móvil abierto encima de la
 * mesa, no contra quien se ha llevado la sesión entera.
 *
 * La aplicación sólo la llama después de que Supabase Auth haya aceptado la
 * contraseña de la cuenta, que es donde la comprobación sí es real.
 */
create or replace function public.passcode_restablecer()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = '42501';
  end if;

  delete from public.user_passcodes where profile_id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;

/* ─────────────────────────────── Quién llama ─────────────────────────────── */
/*
 * `anon` no entra a ninguna: sin sesión no hay PIN que comprobar, y dejarlo
 * abierto sería regalar un sitio donde probar códigos.
 */

revoke all on function public.passcode_cooldown(integer)            from public, anon, authenticated;
revoke all on function public.passcode_estado()                     from public, anon, authenticated;
revoke all on function public.passcode_verificar(text)              from public, anon, authenticated;
revoke all on function public.passcode_guardar(text, text)          from public, anon, authenticated;
revoke all on function public.passcode_quitar(text)                 from public, anon, authenticated;
revoke all on function public.passcode_restablecer()                from public, anon, authenticated;

grant execute on function public.passcode_estado()            to authenticated;
grant execute on function public.passcode_verificar(text)     to authenticated;
grant execute on function public.passcode_guardar(text, text) to authenticated;
grant execute on function public.passcode_quitar(text)        to authenticated;
grant execute on function public.passcode_restablecer()       to authenticated;
