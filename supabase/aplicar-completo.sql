-- ConectaComuna — Setup completo para la consola SQL de Supabase.
-- 1) Crear tablas, RLS, triggers y storage.
-- 2) Habilitar acceso del cliente (anon/authenticated) vía PostgREST.
-- Pega TODO este archivo en Supabase Dashboard -> SQL Editor -> Run.

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
  verification_score numeric(3,2),
  verification_selfie_url text,
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
    if new.verification_status is distinct from old.verification_status or
       new.verification_score is distinct from old.verification_score or
       new.verification_selfie_url is distinct from old.verification_selfie_url then
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
    new.verification_score := null;
    new.verification_selfie_url := null;
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