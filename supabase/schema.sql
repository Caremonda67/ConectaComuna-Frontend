-- =====================================================================
-- ConectaComuna · Esquema de referencia para el equipo de backend
-- Este archivo documenta el contrato que el frontend espera (tablas,
-- columnas y políticas RLS). Ajústalo si el backend ya definió otro.
-- =====================================================================

-- ---------- PERFILES ----------
create type account_type as enum ('client', 'business');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  account_type account_type not null default 'client',
  neighborhood text,
  created_at timestamptz not null default now()
);

-- El account_type se siembra desde el metadata del signUp, pero la fuente
-- de verdad es esta tabla (el usuario no puede alterar sus propias policies).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, neighborhood, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Vecino'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'neighborhood',
    coalesce((new.raw_user_meta_data->>'account_type')::account_type, 'client')
  );
  return new;
end $$;

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
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Índices para los filtros que hace el frontend (categoría + caja geográfica).
create index businesses_category_idx on public.businesses (category) where is_active;
create index businesses_geo_idx on public.businesses (lat, lng) where is_active;

alter table public.businesses enable row level security;

create policy businesses_select_public on public.businesses
  for select using (is_active or owner_id = auth.uid());

create policy businesses_owner_write on public.businesses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un negocio puede ser cliente de otro, pero no de sí mismo.
  constraint no_self_order check (true)
);

alter table public.orders enable row level security;

-- Solo ven el pedido su cliente y el dueño del negocio.
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

-- Solo se puede calificar un pedido propio y finalizado: la reputación
-- no se puede inflar creando reseñas sueltas.
create policy reviews_insert_client on public.reviews
  for insert with check (
    auth.uid() = client_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = auth.uid() and o.status = 'completed'
    )
  );

-- Agregados de reputación calculados en el servidor, nunca en el cliente.
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

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('business-photos', 'business-photos', true);

-- La ruta debe ser `<uid>/<archivo>`: cada quien escribe solo en su carpeta.
create policy business_photos_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy business_photos_read on storage.objects
  for select using (bucket_id = 'business-photos');
