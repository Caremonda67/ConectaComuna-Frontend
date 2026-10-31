-- ConectaComuna — Schema de referencia para el equipo backend.
-- FUENTE DE VERDAD: frontend/supabase/schema.sql
-- Este archivo es una copia sincronizada. Si hay conflicto, prevalece el del frontend.
-- Aplicar en Supabase: copiar el contenido de frontend/supabase/schema.sql en la consola SQL.

-- ---------- PERFILES DE USUARIO ----------
create type account_type as enum ('client', 'business', 'facilitador');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  account_type account_type not null default 'client',
  neighborhood text,
  onboarding_completado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trigger: al crear usuario en Auth, siembra su fila en profiles automáticamente.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Vecino'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'neighborhood',
    coalesce((new.raw_user_meta_data->>'account_type')::account_type, 'client'),
    coalesce((new.raw_user_meta_data->>'onboarding_completado')::boolean, false)
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy profiles_select_public on public.profiles
  for select using (true);

-- RLS filtra filas, no columnas: sin esto cualquiera con la clave anónima
-- (que es pública, viaja en el bundle) se lleva el listado de teléfonos.
revoke select on public.profiles from anon;
-- Se dejan legibles solo las columnas que la app necesita para pintar un
-- nombre. El perfil completo, con teléfono, sale por mi_perfil().
revoke select on public.profiles from authenticated;
grant select (id, full_name, avatar_url, account_type, neighborhood) on public.profiles to anon, authenticated;

create or replace function public.mi_perfil()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid()
$$;

revoke all on function public.mi_perfil() from public;
revoke all on function public.mi_perfil() from anon;
grant execute on function public.mi_perfil() to authenticated;

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- NEGOCIOS ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null,
  phone text,
  whatsapp text,
  address text,
  neighborhood text,
  lat double precision not null,
  lng double precision not null,
  photos text[] not null default '{}',
  hours jsonb not null default '[]',
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  completed_orders int not null default 0,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected')),
  wholesale_enabled boolean not null default false,
  wholesale_min_order text,
  wholesale_terms text,
  services_catalog jsonb not null default '[]',
  codigo_apadrinamiento varchar(6),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index businesses_category_idx on public.businesses (category) where is_active;
create index businesses_geo_idx on public.businesses (lat, lng) where is_active;

alter table public.businesses enable row level security;

create policy businesses_select_public on public.businesses
  for select using (is_active or owner_id = auth.uid());

-- Partida en tres (antes era una sola `for all` llamada
-- businesses_owner_write) para poder excluir al facilitador solo del insert:
-- acompana oficios ajenos, no abre uno propio.
create policy businesses_owner_insert on public.businesses
  for insert with check (
    auth.uid() = owner_id
    and not exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.account_type = 'facilitador'
    )
  );

create policy businesses_owner_update on public.businesses
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy businesses_owner_delete on public.businesses
  for delete using (auth.uid() = owner_id);

-- ---------- PEDIDOS ----------
create type order_status as enum
  ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  status order_status not null default 'pending',
  scheduled_for timestamptz,
  price_estimate numeric(12,2),
  final_price numeric(12,2),
  advance_payment numeric(12,2) default 0,
  service_location_type text default 'workshop',
  delivery_address text,
  business_notes text,
  cancellation_reason text,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_advance_max_50 check (
    advance_payment is null or advance_payment <= 0
    or (final_price is not null and advance_payment <= round(final_price * 0.5, 2))
    or (final_price is null and price_estimate is not null and advance_payment <= round(price_estimate * 0.5, 2))
    or (final_price is null and price_estimate is null)
  )
);

alter table public.orders enable row level security;

create policy orders_select_involved on public.orders
  for select using (
    auth.uid() = client_id
    or auth.uid() = (select owner_id from public.businesses b where b.id = business_id)
  );

create policy orders_insert_client on public.orders
  for insert with check (
    auth.uid() = client_id
    and auth.uid() <> (select owner_id from public.businesses b where b.id = business_id)
  );

create policy orders_update_involved on public.orders
  for update using (
    auth.uid() = client_id
    or auth.uid() = (select owner_id from public.businesses b where b.id = business_id)
  );

-- ---------- RESEÑAS ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy reviews_select_public on public.reviews for select using (true);

create policy reviews_insert_client on public.reviews
  for insert with check (
    auth.uid() = client_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = auth.uid() and o.status = 'completed'
    )
  );

-- Trigger: recalcula rating_avg y rating_count al insertar una reseña.
create function public.refresh_business_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.businesses b
  set rating_avg = sub.avg_rating, rating_count = sub.total
  from (
    select business_id, round(avg(rating)::numeric, 2) as avg_rating, count(*) as total
    from public.reviews where business_id = new.business_id group by business_id
  ) sub
  where b.id = sub.business_id;
  return new;
end $$;

create trigger reviews_after_insert
after insert on public.reviews
for each row execute function public.refresh_business_rating();

-- Trigger: incrementa completed_orders al marcar un pedido como completado.
create function public.bump_completed_orders() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.businesses set completed_orders = completed_orders + 1
    where id = new.business_id;
  end if;
  return new;
end $$;

create trigger orders_after_update
after update on public.orders
for each row execute function public.bump_completed_orders();

-- Trigger: evita que un usuario altere directamente la verificación o reputación de su negocio
create or replace function public.protect_business_columns()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if auth.role() in ('authenticated', 'anon') then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'No está permitido modificar el estado de verificación directamente';
    end if;

    if new.rating_avg is distinct from old.rating_avg or
       new.rating_count is distinct from old.rating_count or
       new.completed_orders is distinct from old.completed_orders then
      raise exception 'La reputación y los pedidos completados solo se calculan automáticamente por el sistema';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists businesses_protect_columns on public.businesses;
create trigger businesses_protect_columns
  before update on public.businesses
  for each row execute function public.protect_business_columns();

-- Trigger: al insertar un negocio, asegurar que los valores de reputación inicien limpios
create or replace function public.sanitize_new_business()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() in ('authenticated', 'anon') then
    new.verification_status := 'unverified';
    new.rating_avg := 0;
    new.rating_count := 0;
    new.completed_orders := 0;
  end if;
  return new;
end $$;

drop trigger if exists businesses_sanitize_insert on public.businesses;
create trigger businesses_sanitize_insert
  before insert on public.businesses
  for each row execute function public.sanitize_new_business();

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('business-photos', 'business-photos', true) on conflict (id) do nothing;

create policy business_photos_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy business_photos_read on storage.objects
  for select using (bucket_id = 'business-photos');

create policy order_photos_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy order_photos_read on storage.objects
  for select using (bucket_id = 'order-photos');

-- Añadir el rol 'facilitador'
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'facilitador';

-- ---------- FACILITADORES (CO-ADMINISTRADORES) ----------
create table public.facilitadores_negocio (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.businesses(id) on delete cascade,
  facilitador_id uuid not null references public.profiles(id) on delete cascade,
  estado_vinculacion text not null default 'pendiente' check (estado_vinculacion in ('pendiente', 'aprobado', 'rechazado')),
  creado_en timestamptz not null default now(),
  constraint un_solo_facilitador_por_negocio unique(negocio_id, facilitador_id)
);

alter table public.facilitadores_negocio enable row level security;

-- Los facilitadores pueden ver sus propias vinculaciones
create policy facilitadores_select_propios on public.facilitadores_negocio
  for select using (auth.uid() = facilitador_id);

-- Los dueños de negocios pueden ver las vinculaciones hacia sus negocios
create policy facilitadores_select_dueños on public.facilitadores_negocio
  for select using (auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id));

-- Los facilitadores pueden solicitar vinculación (insertar en pendiente)
create policy facilitadores_insert_solicitud on public.facilitadores_negocio
  for insert with check (auth.uid() = facilitador_id and estado_vinculacion = 'pendiente');

-- Solo el dueño del negocio puede actualizar el estado (aprobar o rechazar)
create policy facilitadores_update_dueño on public.facilitadores_negocio
  for update using (auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id));

-- Los dueños de negocios pueden eliminar una vinculación
create policy facilitadores_delete_dueño on public.facilitadores_negocio
  for delete using (auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id));

-- Actualizar política de UPDATE de businesses para permitir a los facilitadores aprobados
create policy businesses_facilitator_update on public.businesses
  for update using (
    exists (
      select 1 from public.facilitadores_negocio fn
      where fn.negocio_id = id
      and fn.facilitador_id = auth.uid()
      and fn.estado_vinculacion = 'aprobado'
    )
  ) with check (
    exists (
      select 1 from public.facilitadores_negocio fn
      where fn.negocio_id = id
      and fn.facilitador_id = auth.uid()
      and fn.estado_vinculacion = 'aprobado'
    )
  );

-- El borrado es solo del dueno: `businesses_owner_delete` es la unica politica
-- `for delete`, y la del facilitador es `for update`. Postgres suma las
-- politicas con OR, asi que al facilitador no le alcanza ninguna para borrar.

-- ---------- REPORTES COMUNITARIOS ----------
create table if not exists public.reportes_comunitarios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.businesses(id) on delete cascade,
  reportado_por_id uuid not null references public.profiles(id) on delete cascade,
  motivo text not null check (motivo in ('direccion_falsa', 'anticipo_incumplido', 'precios_enganosos', 'suplantacion', 'otro')),
  descripcion text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'revisado', 'descartado')),
  moderado_por_id uuid references public.profiles(id) on delete set null,
  notas_moderacion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.reportes_comunitarios enable row level security;

create policy reportes_insert_auth on public.reportes_comunitarios
  for insert with check (auth.uid() = reportado_por_id);

create policy reportes_select_facilitador on public.reportes_comunitarios
  for select using (
    auth.uid() = reportado_por_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.account_type = 'facilitador'
    )
  );

create policy reportes_update_facilitador on public.reportes_comunitarios
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.account_type = 'facilitador'
    )
  );

-- ConectaComuna — migración Bogotá 2026
--
-- Recoge lo que la aplicación ya usaba en producción pero que nunca llegó al
-- schema: columnas del sello territorial, direcciones guardadas del cliente y
-- el conteo de reportes. También deja el sello y la verificación pública como
-- funciones controladas, para que no dependan de escribir la tabla a mano.
--
-- Es idempotente: se puede correr entera sobre la base viva y también sobre una
-- base recién creada con schema.sql.

-- ---------- 1. COLUMNAS QUE FALTABAN ----------
alter table public.businesses add column if not exists verification_by text;
alter table public.businesses add column if not exists verification_note text;
alter table public.businesses add column if not exists verification_date timestamptz;
alter table public.businesses add column if not exists report_count int not null default 0;

-- ---------- 2. EL ESTADO QUE YA PINTA LA INTERFAZ ----------
alter table public.businesses drop constraint if exists businesses_verification_status_check;
alter table public.businesses add constraint businesses_verification_status_check
  check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected', 'under_review'));

-- ---------- 3. DIRECCIONES GUARDADAS DEL CLIENTE ----------
create table if not exists public.direcciones_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  etiqueta text not null,
  direccion_texto text not null,
  barrio text,
  lat double precision not null,
  lng double precision not null,
  creado_en timestamptz not null default now()
);

create index if not exists direcciones_usuario_usuario_idx
  on public.direcciones_usuario (usuario_id);

alter table public.direcciones_usuario enable row level security;

drop policy if exists direcciones_select_propias on public.direcciones_usuario;
create policy direcciones_select_propias on public.direcciones_usuario
  for select using (auth.uid() = usuario_id);

drop policy if exists direcciones_insert_propias on public.direcciones_usuario;
create policy direcciones_insert_propias on public.direcciones_usuario
  for insert with check (auth.uid() = usuario_id);

drop policy if exists direcciones_update_propias on public.direcciones_usuario;
create policy direcciones_update_propias on public.direcciones_usuario
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists direcciones_delete_propias on public.direcciones_usuario;
create policy direcciones_delete_propias on public.direcciones_usuario
  for delete using (auth.uid() = usuario_id);

-- ---------- 4. BLINDAJE CON PERMISO PARA EL SELLO ----------
create or replace function public.protect_business_columns()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Si el update viene de triggers internos del sistema, permitirlo
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- otorgar_sello_territorial levanta esta bandera mientras escribe
  if current_setting('conecta.sello', true) = 'on' then
    return new;
  end if;

  if auth.role() in ('authenticated', 'anon') then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'No está permitido modificar el estado de verificación directamente';
    end if;

    if new.rating_avg is distinct from old.rating_avg or
       new.rating_count is distinct from old.rating_count or
       new.completed_orders is distinct from old.completed_orders then
      raise exception 'La reputación y los pedidos completados solo se calculan automáticamente por el sistema';
    end if;
  end if;

  return new;
end $$;

-- ---------- 5. SELLO DE VERIFICACIÓN EN TERRITORIO ----------
create or replace function public.otorgar_sello_territorial(p_negocio uuid, p_nota text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_nombre text;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para otorgar el sello';
  end if;

  select full_name into v_nombre from public.profiles where id = auth.uid();

  if not exists (
    select 1 from public.facilitadores_negocio fn
     where fn.negocio_id = p_negocio
       and fn.facilitador_id = auth.uid()
       and fn.estado_vinculacion = 'aprobado'
  ) then
    raise exception 'Solo un facilitador vinculado y aprobado puede otorgar el sello';
  end if;

  perform set_config('conecta.sello', 'on', true);

  update public.businesses
     set verification_status = 'verified',
         verification_by = coalesce(v_nombre, 'Facilitador Comunal'),
         verification_note = coalesce(nullif(btrim(p_nota), ''), 'Verificado en visita de campo por facilitador'),
         verification_date = now()
   where id = p_negocio;

  perform set_config('conecta.sello', 'off', true);
end $$;

create or replace function public.revocar_sello_territorial(p_negocio uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para retirar el sello';
  end if;

  if not exists (
    select 1 from public.facilitadores_negocio fn
     where fn.negocio_id = p_negocio
       and fn.facilitador_id = auth.uid()
       and fn.estado_vinculacion = 'aprobado'
  ) then
    raise exception 'Solo un facilitador vinculado y aprobado puede retirar el sello';
  end if;

  perform set_config('conecta.sello', 'on', true);

  update public.businesses
     set verification_status = 'unverified',
         verification_by = null,
         verification_note = null,
         verification_date = null
   where id = p_negocio;

  perform set_config('conecta.sello', 'off', true);
end $$;

revoke all on function public.otorgar_sello_territorial(uuid, text) from public;
revoke all on function public.revocar_sello_territorial(uuid) from public;
grant execute on function public.otorgar_sello_territorial(uuid, text) to authenticated;
revoke all on function public.otorgar_sello_territorial(uuid, text) from anon;
grant execute on function public.revocar_sello_territorial(uuid) to authenticated;
revoke all on function public.revocar_sello_territorial(uuid) from anon;

-- ---------- 6. REPORTES: RECONTAR Y PONER BAJO OBSERVACIÓN ----------
create or replace function public.refresh_business_reports()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid;
  v_pendientes int;
begin
  if tg_op = 'DELETE' then
    v_negocio := old.negocio_id;
  else
    v_negocio := new.negocio_id;
  end if;

  select count(*) into v_pendientes
    from public.reportes_comunitarios
   where negocio_id = v_negocio and estado = 'pendiente';

  update public.businesses
     set report_count = v_pendientes,
         verification_status = case
           when v_pendientes >= 2 and verification_status <> 'under_review' then 'under_review'
           when v_pendientes < 2 and verification_status = 'under_review' then 'unverified'
           else verification_status
         end
   where id = v_negocio;

  return null;
end $$;

drop trigger if exists reportes_refresh_business on public.reportes_comunitarios;
create trigger reportes_refresh_business
after insert or update of estado or delete on public.reportes_comunitarios
for each row execute function public.refresh_business_reports();

-- Los negocios que ya tenían reportes abiertos quedan con el conteo al día.
update public.businesses b
   set report_count = (
     select count(*) from public.reportes_comunitarios r
      where r.negocio_id = b.id and r.estado = 'pendiente'
   );

-- ---------- 7. VERIFICACIÓN PÚBLICA DEL TRATO SEGURO ----------
-- La función quedó con niveles de detalle en la sección 11. La primera versión
-- mostraba el nombre y la dirección del cliente a cualquiera que tuviera el
-- código, así que se reemplazó más abajo en este mismo archivo.

-- ---------- 8. VINCULACIÓN DEL FACILITADOR POR CÓDIGO ----------
-- La función vive más abajo, junto a `generar_codigo_apadrinamiento`, porque
-- necesita la fecha de vencimiento del código. Aquí había una primera versión
-- sin esa comprobación ni la de auto-apadrinamiento: se quitó para que el
-- archivo no describa dos reglas distintas para la misma puerta.

-- ---------- 9. AVISOS EN VIVO DE PEDIDOS ----------
-- En un proyecto nuevo la tabla no está publicada y los avisos de "pedido
-- nuevo" nunca llegan al panel. Se agrega solo si falta.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
exception
  when undefined_object then null;
end $$;

-- =====================================================================
-- CIERRE PREVIO A LA FINAL (29 de octubre)
-- =====================================================================

-- ---------- 10. EQUIPO DE CONECTA COMUNA ----------
-- El rol Administrador se retiró del producto, pero alguien tiene que
-- moderar los reportes. No es un rol de cara al usuario: es una lista corta
-- con las cuentas de las tres personas que sostienen el proyecto.
create table if not exists public.equipo_conecta (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  nombre text not null default '',
  creado_en timestamptz not null default now()
);

alter table public.equipo_conecta enable row level security;

create or replace function public.es_equipo_conecta()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.equipo_conecta where profile_id = auth.uid()
  );
$$;

revoke all on function public.es_equipo_conecta() from public;
grant execute on function public.es_equipo_conecta() to authenticated;
revoke all on function public.es_equipo_conecta() from anon;

drop policy if exists equipo_select_propio on public.equipo_conecta;
create policy equipo_select_propio on public.equipo_conecta
  for select using (profile_id = auth.uid() or public.es_equipo_conecta());

-- Agregar aquí las tres cuentas del equipo (Luis, Sergio y Sebastián).
-- Se puede sacar el id con: select p.id, u.email from public.profiles p
-- join auth.users u on u.id = p.id;
-- insert into public.equipo_conecta (profile_id, nombre)
-- values ('uuid-de-luis', 'Luis'), ('uuid-de-sergio', 'Sergio'),
--        ('uuid-de-sebastian', 'Sebastián')
-- on conflict (profile_id) do nothing;

-- ---------- 11. VERIFICACIÓN PÚBLICA POR NIVELES ----------
-- Antes, cualquiera con el código veía el nombre completo y la dirección del
-- cliente. Ahora la función distingue tres casos: las dos partes del pedido
-- (o el facilitador vinculado) ven todo; el resto ve que el pacto existe, con
-- qué negocio y por cuánto, sin datos personales.
create or replace function public.verificar_pedido_publico(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limpio text;
  v_pedido uuid;
  v_es_parte boolean := false;
  v_salida jsonb;
begin
  v_limpio := lower(btrim(coalesce(p_codigo, '')));
  v_limpio := regexp_replace(v_limpio, '^#?cc[-_]?', '', 'i');
  v_limpio := regexp_replace(v_limpio, '[^a-z0-9-]', '', 'g');

  -- El código visible son 8 caracteres del UUID. Menos que eso es enumeración.
  if char_length(replace(v_limpio, '-', '')) < 8 then
    return null;
  end if;

  if char_length(v_limpio) = 36 then
    select id into v_pedido from public.orders where id::text = v_limpio;
  else
    select id into v_pedido
      from public.orders
     where replace(id::text, '-', '') like replace(v_limpio, '-', '') || '%'
     order by created_at desc
     limit 1;
  end if;

  if v_pedido is null then
    return null;
  end if;

  if auth.uid() is not null then
    select exists (
      select 1
        from public.orders o
        join public.businesses b on b.id = o.business_id
       where o.id = v_pedido
         and (
           o.client_id = auth.uid()
           or b.owner_id = auth.uid()
           or exists (
             select 1 from public.facilitadores_negocio fn
              where fn.negocio_id = o.business_id
                and fn.facilitador_id = auth.uid()
                and fn.estado_vinculacion = 'aprobado'
           )
         )
    ) into v_es_parte;
  end if;

  if v_es_parte then
    select jsonb_build_object(
             'nivel', 'participante',
             'codigo', 'CC-' || upper(left(o.id::text, 8)),
             'order_id', o.id,
             'status', o.status,
             'created_at', o.created_at,
             'scheduled_for', o.scheduled_for,
             'title', o.title,
             'description', o.description,
             'service_location_type', o.service_location_type,
             'delivery_address', o.delivery_address,
             'business', jsonb_build_object(
               'id', b.id,
               'name', b.name,
               'category', b.category,
               'phone', b.phone,
               'barrio', b.neighborhood,
               'is_verified', b.verification_status = 'verified'
             ),
             'client', jsonb_build_object(
               'name', p.full_name,
               'phone_masked', case when p.phone is not null then '...' || right(p.phone, 4) else null end
             ),
             'precio_total', coalesce(o.final_price, o.price_estimate, 0),
             'anticipo', coalesce(o.advance_payment, 0),
             'saldo_contra_entrega', greatest(0, coalesce(o.final_price, o.price_estimate, 0) - coalesce(o.advance_payment, 0)),
             'porcentaje_anticipo', case
               when coalesce(o.final_price, o.price_estimate, 0) > 0
                 then round(coalesce(o.advance_payment, 0) * 100.0 / coalesce(o.final_price, o.price_estimate, 0))::int
               else 0
             end,
             'clausula_mediacion', 'Pacto registrado en ConectaComuna. El anticipo no puede superar el 50% del precio acordado. Si algo sale mal, repórtalo en la ficha del negocio: el equipo de Conecta Comuna revisa el caso.'
           )
      into v_salida
      from public.orders o
      join public.businesses b on b.id = o.business_id
      join public.profiles p on p.id = o.client_id
     where o.id = v_pedido;
  else
    select jsonb_build_object(
             'nivel', 'publico',
             'codigo', 'CC-' || upper(left(o.id::text, 8)),
             'status', o.status,
             'created_at', o.created_at,
             'scheduled_for', o.scheduled_for,
             'title', o.title,
             'service_location_type', o.service_location_type,
             'business', jsonb_build_object(
               'id', b.id,
               'name', b.name,
               'category', b.category,
               'phone', b.phone,
               'barrio', b.neighborhood,
               'is_verified', b.verification_status = 'verified'
             ),
             'precio_total', coalesce(o.final_price, o.price_estimate, 0),
             'anticipo', coalesce(o.advance_payment, 0),
             'saldo_contra_entrega', greatest(0, coalesce(o.final_price, o.price_estimate, 0) - coalesce(o.advance_payment, 0)),
             'porcentaje_anticipo', case
               when coalesce(o.final_price, o.price_estimate, 0) > 0
                 then round(coalesce(o.advance_payment, 0) * 100.0 / coalesce(o.final_price, o.price_estimate, 0))::int
               else 0
             end,
             'clausula_mediacion', 'Pacto registrado en ConectaComuna. El anticipo no puede superar el 50% del precio acordado. Si algo sale mal, repórtalo en la ficha del negocio: el equipo de Conecta Comuna revisa el caso.'
           )
      into v_salida
      from public.orders o
      join public.businesses b on b.id = o.business_id
     where o.id = v_pedido;
  end if;

  return v_salida;
end $$;

revoke all on function public.verificar_pedido_publico(text) from public;
grant execute on function public.verificar_pedido_publico(text) to anon, authenticated;

-- ---------- 12. EL PEDIDO SOLO CAMBIA POR LA FUNCIÓN ----------
-- La política anterior dejaba escribir cualquier columna: precio, anticipo,
-- dirección y hasta el negocio. La máquina de estados vivía solo en el
-- navegador. Ahora la base decide quién puede mover qué.
drop policy if exists orders_update_involved on public.orders;

drop policy if exists orders_insert_client on public.orders;
create policy orders_insert_client on public.orders
  for insert with check (
    auth.uid() = client_id
    and status = 'pending'
    and final_price is null
    and coalesce(advance_payment, 0) = 0
    and auth.uid() <> (select owner_id from public.businesses b where b.id = business_id)
  );

create or replace function public.cambiar_estado_pedido(
  p_pedido uuid,
  p_estado order_status,
  p_precio_final numeric default null,
  p_anticipo numeric default null,
  p_notas text default null,
  p_motivo text default null
)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_pedido public.orders;
  v_dueno uuid;
  v_es_cliente boolean;
  v_es_negocio boolean;
  v_permitido boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para mover un pedido';
  end if;

  select * into v_pedido from public.orders where id = p_pedido for update;
  if not found then
    raise exception 'El pedido no existe';
  end if;

  select owner_id into v_dueno from public.businesses where id = v_pedido.business_id;
  v_es_cliente := v_pedido.client_id = auth.uid();
  v_es_negocio := v_dueno = auth.uid();

  if not (v_es_cliente or v_es_negocio) then
    raise exception 'No participas en este pedido';
  end if;

  v_permitido := case
    when v_pedido.status = 'pending'     and p_estado = 'accepted'    then v_es_negocio
    when v_pedido.status = 'pending'     and p_estado = 'cancelled'   then true
    when v_pedido.status = 'accepted'    and p_estado = 'in_progress' then v_es_negocio
    when v_pedido.status = 'accepted'    and p_estado = 'cancelled'   then true
    when v_pedido.status = 'in_progress' and p_estado = 'completed'   then v_es_negocio
    when v_pedido.status = 'in_progress' and p_estado = 'cancelled'   then true
    else false
  end;

  if not v_permitido then
    raise exception 'Ese cambio de estado no está permitido';
  end if;

  if p_estado = 'accepted' then
    if p_precio_final is null or p_precio_final <= 0 then
      raise exception 'Falta el precio acordado';
    end if;
    if coalesce(p_anticipo, 0) > round(p_precio_final * 0.5, 2) then
      raise exception 'El anticipo no puede pasar del 50%% del precio';
    end if;
  end if;

  if p_estado = 'cancelled' and char_length(btrim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Cuéntanos por qué se cancela el pedido';
  end if;

  perform set_config('conecta.pedido', 'on', true);

  update public.orders
     set status = p_estado,
         final_price = case when p_estado = 'accepted' then p_precio_final else final_price end,
         advance_payment = case when p_estado = 'accepted' then coalesce(p_anticipo, 0) else advance_payment end,
         business_notes = coalesce(p_notas, business_notes),
         cancellation_reason = case when p_estado = 'cancelled' then btrim(p_motivo) else cancellation_reason end,
         updated_at = now()
   where id = p_pedido
  returning * into v_pedido;

  perform set_config('conecta.pedido', 'off', true);

  return v_pedido;
end $$;

revoke all on function public.cambiar_estado_pedido(uuid, order_status, numeric, numeric, text, text) from public;
grant execute on function public.cambiar_estado_pedido(uuid, order_status, numeric, numeric, text, text) to authenticated;
revoke all on function public.cambiar_estado_pedido(uuid, order_status, numeric, numeric, text, text) from anon;

-- El contador de trabajos hechos suma una sola vez por pedido. El trigger
-- viejo se llamaba distinto en la base viva, así que se retiran los dos.
drop trigger if exists orders_after_update on public.orders;
drop trigger if exists orders_bump_completed on public.orders;

create or replace function public.bump_completed_orders()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status = 'in_progress' then
    update public.businesses
       set completed_orders = completed_orders + 1
     where id = new.business_id;
  end if;
  return new;
end $$;

create trigger orders_bump_completed
after update on public.orders
for each row execute function public.bump_completed_orders();

-- ---------- 13. EL TIPO DE CUENTA NO SE REGALA ----------
-- Cualquier usuario podía hacer `update profiles set account_type='facilitador'`
-- y con eso ver todos los reportes y otorgar el sello. Solo el equipo asigna
-- ese tipo. Al registrarse, el metadata se ignora si pide facilitador.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Vecino'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'neighborhood',
    case
      when new.raw_user_meta_data->>'account_type' = 'facilitador' then 'client'::account_type
      else coalesce((new.raw_user_meta_data->>'account_type')::account_type, 'client')
    end,
    coalesce((new.raw_user_meta_data->>'onboarding_completado')::boolean, false)
  );
  return new;
end $$;

create or replace function public.proteger_tipo_cuenta()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() in ('authenticated', 'anon') and not public.es_equipo_conecta() then
    if new.account_type = 'facilitador' and old.account_type is distinct from 'facilitador' then
      raise exception 'Las cuentas de facilitador las asigna el equipo de Conecta Comuna';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_proteger_tipo on public.profiles;
create trigger profiles_proteger_tipo
before update on public.profiles
for each row execute function public.proteger_tipo_cuenta();

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id and account_type <> 'facilitador');

-- ---------- 14. REPORTES: EL EQUIPO MEDIA, EL FACILITADOR RESPONDE ----------
-- Antes, cualquier facilitador veía los reportes de toda la comuna y podía
-- resolverlos. Ahora solo ve los de los negocios que apadrina, y la decisión
-- la toma el equipo. Las dos partes pueden dejar su versión.
create table if not exists public.reporte_respuestas (
  id uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references public.reportes_comunitarios(id) on delete cascade,
  autor_id uuid not null references public.profiles(id) on delete cascade,
  mensaje text not null,
  creado_en timestamptz not null default now(),
  constraint reporte_respuesta_largo check (char_length(btrim(mensaje)) between 5 and 1000)
);

alter table public.reporte_respuestas enable row level security;

create or replace function public.puede_ver_reporte(p_reporte uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.reportes_comunitarios r
      join public.businesses b on b.id = r.negocio_id
     where r.id = p_reporte
       and (
         r.reportado_por_id = auth.uid()
         or b.owner_id = auth.uid()
         or public.es_equipo_conecta()
         or exists (
           select 1 from public.facilitadores_negocio fn
            where fn.negocio_id = r.negocio_id
              and fn.facilitador_id = auth.uid()
              and fn.estado_vinculacion = 'aprobado'
         )
       )
  );
$$;

revoke all on function public.puede_ver_reporte(uuid) from public;
grant execute on function public.puede_ver_reporte(uuid) to authenticated;
revoke all on function public.puede_ver_reporte(uuid) from anon;

drop policy if exists reportes_select_facilitador on public.reportes_comunitarios;
drop policy if exists reportes_update_facilitador on public.reportes_comunitarios;
drop policy if exists reportes_insert_auth on public.reportes_comunitarios;

create policy reportes_insert_auth on public.reportes_comunitarios
  for insert with check (auth.uid() = reportado_por_id);

-- Un reporte por negocio cada 30 días. Va en un trigger y no en la política
-- porque una subconsulta a la misma tabla dentro de su propia política entra
-- en recursión infinita.
create or replace function public.limitar_reporte_duplicado()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.reportes_comunitarios r
     where r.negocio_id = new.negocio_id
       and r.reportado_por_id = new.reportado_por_id
       and r.creado_en > now() - interval '30 days'
  ) then
    raise exception 'Ya reportaste este negocio hace poco. Si hay algo nuevo, cuéntalo en la respuesta del reporte.';
  end if;
  return new;
end $$;

drop trigger if exists reportes_limite on public.reportes_comunitarios;
create trigger reportes_limite
before insert on public.reportes_comunitarios
for each row execute function public.limitar_reporte_duplicado();

drop policy if exists reportes_select_involucrados on public.reportes_comunitarios;
create policy reportes_select_involucrados on public.reportes_comunitarios
  for select using (
    puede_ver_reporte(id)
  );

drop policy if exists reportes_update_equipo on public.reportes_comunitarios;
create policy reportes_update_equipo on public.reportes_comunitarios
  for update using (public.es_equipo_conecta())
  with check (public.es_equipo_conecta());

-- Quién decidió y cuándo queda anotado por la base, no por el navegador.
create or replace function public.sellar_reporte()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.actualizado_en := now();
  if new.estado is distinct from old.estado then
    new.moderado_por_id := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists reportes_sello on public.reportes_comunitarios;
create trigger reportes_sello
before update on public.reportes_comunitarios
for each row execute function public.sellar_reporte();

revoke all on function public.sellar_reporte() from anon, authenticated;

drop policy if exists respuestas_select on public.reporte_respuestas;
create policy respuestas_select on public.reporte_respuestas
  for select using (public.puede_ver_reporte(reporte_id));

drop policy if exists respuestas_insert on public.reporte_respuestas;
create policy respuestas_insert on public.reporte_respuestas
  for insert with check (autor_id = auth.uid() and public.puede_ver_reporte(reporte_id));

-- El negocio queda bajo observación cuando el equipo confirma dos reportes,
-- no cuando dos vecinos escriben. Así una campaña de reportes no esconde a
-- nadie, y al descartarlos vuelve el sello si lo tenía.
create or replace function public.refresh_business_reports()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid;
  v_confirmados int;
begin
  if tg_op = 'DELETE' then
    v_negocio := old.negocio_id;
  else
    v_negocio := new.negocio_id;
  end if;

  select count(*) into v_confirmados
    from public.reportes_comunitarios
   where negocio_id = v_negocio and estado = 'revisado';

  update public.businesses
     set report_count = v_confirmados,
         verification_status = case
           when v_confirmados >= 2 and verification_status <> 'under_review' then 'under_review'
           when v_confirmados < 2 and verification_status = 'under_review' then
             case when verification_date is not null then 'verified' else 'unverified' end
           else verification_status
         end
   where id = v_negocio;

  return null;
end $$;

drop trigger if exists reportes_after_change on public.reportes_comunitarios;
drop trigger if exists reportes_refresh_business on public.reportes_comunitarios;
create trigger reportes_refresh_business
after insert or update of estado or delete on public.reportes_comunitarios
for each row execute function public.refresh_business_reports();

-- ---------- 15. CÓDIGO DE APADRINAMIENTO CON VENCIMIENTO ----------
alter table public.businesses
  add column if not exists codigo_apadrinamiento_expira_en timestamptz;

-- En la base viva el código quedó como varchar(6). Los nuevos son de 8.
alter table public.businesses
  alter column codigo_apadrinamiento type text;

create or replace function public.generar_codigo_apadrinamiento(p_negocio uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_codigo text;
begin
  if not exists (
    select 1 from public.businesses where id = p_negocio and owner_id = auth.uid()
  ) then
    raise exception 'Solo el dueño del negocio puede generar el código';
  end if;

  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  update public.businesses
     set codigo_apadrinamiento = v_codigo,
         codigo_apadrinamiento_expira_en = now() + interval '24 hours'
   where id = p_negocio;

  return v_codigo;
end $$;

revoke all on function public.generar_codigo_apadrinamiento(uuid) from public;
grant execute on function public.generar_codigo_apadrinamiento(uuid) to authenticated;
revoke all on function public.generar_codigo_apadrinamiento(uuid) from anon;

create or replace function public.vincular_facilitador_por_codigo(p_codigo text)
returns public.facilitadores_negocio
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid;
  v_dueno uuid;
  v_expira timestamptz;
  v_fila public.facilitadores_negocio;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para vincularte a un negocio';
  end if;

  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and account_type = 'facilitador'
  ) then
    raise exception 'Solo una cuenta de facilitador puede apadrinar negocios';
  end if;

  select id, owner_id, codigo_apadrinamiento_expira_en into v_negocio, v_dueno, v_expira
    from public.businesses
   where codigo_apadrinamiento = upper(btrim(coalesce(p_codigo, '')))
   limit 1;

  if v_negocio is null then
    raise exception 'Código no válido. Verifica con el dueño del negocio.';
  end if;

  if v_expira is null or v_expira < now() then
    raise exception 'Ese código venció. Pídele al dueño que genere uno nuevo.';
  end if;

  if v_dueno = auth.uid() then
    raise exception 'No puedes apadrinar tu propio negocio. El sello lo otorga otro vecino.';
  end if;

  select * into v_fila
    from public.facilitadores_negocio
   where negocio_id = v_negocio and facilitador_id = auth.uid();

  if found and v_fila.estado_vinculacion = 'aprobado' then
    raise exception 'Ya tienes una vinculación activa con este negocio.';
  end if;

  if found then
    update public.facilitadores_negocio
       set estado_vinculacion = 'aprobado'
     where id = v_fila.id
    returning * into v_fila;
  else
    insert into public.facilitadores_negocio (negocio_id, facilitador_id, estado_vinculacion)
    values (v_negocio, auth.uid(), 'aprobado')
    returning * into v_fila;
  end if;

  -- El código se gasta: uno nuevo por cada vinculación.
  update public.businesses
     set codigo_apadrinamiento = null,
         codigo_apadrinamiento_expira_en = null
   where id = v_negocio;

  return v_fila;
end $$;

revoke all on function public.vincular_facilitador_por_codigo(text) from public;
grant execute on function public.vincular_facilitador_por_codigo(text) to authenticated;
revoke all on function public.vincular_facilitador_por_codigo(text) from anon;

-- La misma regla sobre la tabla, no solo en la puerta: si alguien llega por
-- otro camino, el dueño sigue sin poder apadrinarse a sí mismo. Un sello que
-- uno se otorga no le dice nada a nadie.
create or replace function public.facilitador_no_es_dueno()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.businesses b
     where b.id = new.negocio_id
       and b.owner_id = new.facilitador_id
  ) then
    raise exception 'El facilitador de un negocio no puede ser su propio dueño';
  end if;
  return new;
end $$;

drop trigger if exists facilitadores_no_autoapadrinar on public.facilitadores_negocio;
create trigger facilitadores_no_autoapadrinar
before insert or update on public.facilitadores_negocio
for each row execute function public.facilitador_no_es_dueno();

-- ---------- 16. EL COMPROBANTE NO SE BORRA CON EL NEGOCIO ----------
alter table public.orders drop constraint if exists orders_business_id_fkey;
alter table public.orders
  add constraint orders_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete restrict;

-- ---------- 17. LAS FOTOS DE PEDIDOS NO SE LISTAN ----------
-- El bucket sigue siendo público para que las URLs guardadas en el pedido
-- sigan abriendo, pero nadie puede recorrer el listado ni leer carpetas ajenas.
drop policy if exists order_photos_read on storage.objects;
create policy order_photos_read on storage.objects
  for select to authenticated using (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permisos base para cuando el esquema se instala en un Postgres limpio.
-- Un proyecto nuevo de Supabase ya los trae; uno que se reconstruye a mano,
-- no, y entonces todo responde 'permission denied for schema public'.
-- Van al final para cubrir todas las tablas, y los permisos de profiles se
-- vuelven a cerrar justo después: un 'grant all' abriría el teléfono de todos.
-- ---------- CONTACTO CON REGLAS ----------
-- El telefono salio de `profiles` cuando se cerro la privacidad. Esta tabla es
-- el espejo que si se puede leer con reglas: la propia persona, la contraparte
-- de un pedido, y el negocio con su facilitador aprobado. Llego con
-- migracion-contacto-perfiles.sql y se incorpora aqui para que reconstruir
-- desde este archivo de una base igual a la que esta en produccion.

create table if not exists public.perfil_contacto (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  actualizado_en timestamptz not null default now()
);

alter table public.perfil_contacto enable row level security;

insert into public.perfil_contacto (profile_id, phone)
select id, phone from public.profiles where phone is not null
on conflict (profile_id) do update set phone = excluded.phone, actualizado_en = now();

create or replace function public.espejar_contacto()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.phone is null then
    delete from public.perfil_contacto where profile_id = new.id;
  else
    insert into public.perfil_contacto (profile_id, phone)
    values (new.id, new.phone)
    on conflict (profile_id) do update set phone = excluded.phone, actualizado_en = now();
  end if;
  return new;
end $$;

drop trigger if exists profiles_espejo_contacto on public.profiles;
create trigger profiles_espejo_contacto
after insert or update of phone on public.profiles
for each row execute function public.espejar_contacto();

drop policy if exists contacto_propio on public.perfil_contacto;
create policy contacto_propio on public.perfil_contacto
  for select using (profile_id = auth.uid());

-- Las dos partes de un pedido se ven entre sí; el negocio y su facilitador
-- aprobado también. Nadie más.
drop policy if exists contacto_contraparte on public.perfil_contacto;
create policy contacto_contraparte on public.perfil_contacto
  for select using (
    exists (
      select 1
        from public.orders o
        join public.businesses b on b.id = o.business_id
       where (o.client_id = auth.uid() and b.owner_id = perfil_contacto.profile_id)
          or (b.owner_id = auth.uid() and o.client_id = perfil_contacto.profile_id)
    )
    or exists (
      select 1
        from public.facilitadores_negocio fn
        join public.businesses b on b.id = fn.negocio_id
       where fn.estado_vinculacion = 'aprobado'
         and ((fn.facilitador_id = auth.uid() and b.owner_id = perfil_contacto.profile_id)
           or (b.owner_id = auth.uid() and fn.facilitador_id = perfil_contacto.profile_id))
    )
  );

drop policy if exists contacto_escritura_propia on public.perfil_contacto;
create policy contacto_escritura_propia on public.perfil_contacto
  for insert with check (profile_id = auth.uid());

drop policy if exists contacto_actualizacion_propia on public.perfil_contacto;
create policy contacto_actualizacion_propia on public.perfil_contacto
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

grant select, insert, update on public.perfil_contacto to authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, account_type, neighborhood) on public.profiles to anon, authenticated;
