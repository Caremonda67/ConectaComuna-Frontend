-- ConectaComuna — Schema de referencia para el equipo backend.
-- FUENTE DE VERDAD: frontend/supabase/schema.sql
-- Contiene perfiles, negocios, pedidos, reseñas, facilitadores, reportes y triggers de integridad.

grant usage on schema public to anon, authenticated;

-- ---------- TIPOS ----------
create type account_type as enum ('client', 'business', 'facilitador');

create type order_status as enum
  ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- ---------- PERFILES DE USUARIO ----------
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy profiles_select_public on public.profiles
  for select using (true);

-- RLS filtra filas, no columnas: sin esto cualquiera con la clave anónima
-- (que es pública, viaja en el bundle) se lleva el listado de teléfonos.
revoke select on public.profiles from anon;
grant select (id, full_name, avatar_url) on public.profiles to anon;
grant select on public.profiles to authenticated;

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

create policy businesses_owner_write on public.businesses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- PEDIDOS (TRATO SEGURO COMUNAL) ----------
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
create or replace function public.refresh_business_rating() returns trigger
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

drop trigger if exists reviews_after_insert on public.reviews;
create trigger reviews_after_insert
after insert on public.reviews
for each row execute function public.refresh_business_rating();

-- Trigger: incrementa completed_orders al marcar un pedido como completado.
create or replace function public.bump_completed_orders() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    update public.businesses
    set completed_orders = completed_orders + 1
    where id = new.business_id;
  end if;
  return new;
end $$;

drop trigger if exists orders_bump_completed on public.orders;
create trigger orders_bump_completed
after update on public.orders
for each row execute function public.bump_completed_orders();

-- ---------- BLINDAJE DE REPUTACIÓN Y CAMPOS SENSIBLES ----------
-- Impide que usuarios anon/authenticated modifiquen directamente verificación o reputación.
create or replace function public.protect_business_columns()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Si el update viene de triggers internos del sistema, permitirlo
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
insert into storage.buckets (id, name, public) values ('business-photos', 'business-photos', true)
  on conflict (id) do nothing;

create policy business_photos_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy business_photos_read on storage.objects
  for select using (bucket_id = 'business-photos');

insert into storage.buckets (id, name, public) values ('order-photos', 'order-photos', true)
  on conflict (id) do nothing;

create policy order_photos_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy order_photos_read on storage.objects
  for select using (bucket_id = 'order-photos');

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

create policy facilitadores_select_propios on public.facilitadores_negocio
  for select using (auth.uid() = facilitador_id);

create policy facilitadores_select_dueños on public.facilitadores_negocio
  for select using (auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id));

create policy facilitadores_insert_solicitud on public.facilitadores_negocio
  for insert with check (auth.uid() = facilitador_id and estado_vinculacion = 'pendiente');

create policy facilitadores_update_dueño on public.facilitadores_negocio
  for update using (auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id));

create policy facilitadores_delete_dueño on public.facilitadores_negocio
  for delete using (auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id));

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
grant execute on function public.revocar_sello_territorial(uuid) to authenticated;

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
-- El QR lo abre cualquiera, sin sesión. Esta función devuelve solo lo que ya
-- viaja en el comprobante de WhatsApp: negocio, nombre del cliente y teléfono
-- enmascarado. La tabla orders sigue cerrada por RLS.
create or replace function public.verificar_pedido_publico(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limpio text;
  v_pedido uuid;
  v_salida jsonb;
begin
  v_limpio := lower(btrim(coalesce(p_codigo, '')));
  v_limpio := regexp_replace(v_limpio, '^#?cc[-_]?', '', 'i');
  v_limpio := regexp_replace(v_limpio, '[^a-z0-9-]', '', 'g');

  -- El código visible son 8 caracteres del UUID. Menos que eso es enumeración.
  if char_length(replace(v_limpio, '-', '')) < 6 then
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

  select jsonb_build_object(
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
           'clausula_mediacion', 'Pacto respaldado por el Comité de Convivencia y Mediación Comunitaria de la JAC de la Comuna y ConectaComuna.'
         )
    into v_salida
    from public.orders o
    join public.businesses b on b.id = o.business_id
    join public.profiles p on p.id = o.client_id
   where o.id = v_pedido;

  return v_salida;
end $$;

grant execute on function public.verificar_pedido_publico(text) to anon, authenticated;

-- ---------- 8. VINCULACIÓN DEL FACILITADOR POR CÓDIGO ----------
-- El código de apadrinamiento lo entrega el dueño del negocio, así que sirve
-- como autorización. La política de la tabla solo deja insertar en 'pendiente',
-- por eso la vinculación directa pasa por esta función.
create or replace function public.vincular_facilitador_por_codigo(p_codigo text)
returns public.facilitadores_negocio
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid;
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

  select id into v_negocio
    from public.businesses
   where codigo_apadrinamiento = btrim(coalesce(p_codigo, ''))
   limit 1;

  if v_negocio is null then
    raise exception 'Código no válido. Verifica con el dueño del negocio.';
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

  return v_fila;
end $$;

revoke all on function public.vincular_facilitador_por_codigo(text) from public;
grant execute on function public.vincular_facilitador_por_codigo(text) to authenticated;

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
