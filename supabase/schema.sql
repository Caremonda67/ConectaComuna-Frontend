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
  neighborhood text,
  avatar_url text,
  account_type account_type not null default 'client',
  onboarding_completado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trigger: al crear usuario en Auth, siembra su fila en profiles automáticamente.
create function public.handle_new_user() returns trigger
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
  codigo_apadrinamiento varchar(6),
  created_at timestamptz not null default now()
);

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
  updated_at timestamptz not null default now()
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

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('business-photos', 'business-photos', true);

create policy business_photos_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'business-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy business_photos_read on storage.objects
  for select using (bucket_id = 'business-photos');

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

-- NOTA: La política original 'businesses_owner_write' permitía 'for all'. 
-- Deberíamos asegurar que DELETE sigue siendo solo para el owner.
-- Supabase acumula las políticas con OR. Como la del facilitador es solo FOR UPDATE,
-- el DELETE seguirá bloqueado para el facilitador por omisión.

-- Direcciones guardadas por los usuarios (como los domicilios en apps de domicilios).
create table public.direcciones_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  etiqueta text not null default 'Casa',
  direccion_texto text not null,
  barrio text,
  lat numeric not null,
  lng numeric not null,
  creado_en timestamptz not null default now()
);

alter table public.direcciones_usuario enable row level security;

create policy direcciones_select_propias on public.direcciones_usuario
  for select using (auth.uid() = usuario_id);

create policy direcciones_insert_propias on public.direcciones_usuario
  for insert with check (auth.uid() = usuario_id);

create policy direcciones_update_propias on public.direcciones_usuario
  for update using (auth.uid() = usuario_id);

create policy direcciones_delete_propias on public.direcciones_usuario
  for delete using (auth.uid() = usuario_id);

-- ---------- PRODUCTOS / SERVICIOS ----------
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.businesses(id) on delete cascade,
  nombre text not null,
  descripcion text not null default '',
  precio integer not null default 0,
  foto_url text,
  disponible boolean not null default true,
  creado_en timestamptz not null default now()
);

create index productos_negocio_idx on public.productos(negocio_id) where disponible;

alter table public.productos enable row level security;

-- Lectura pblica de productos
create policy productos_read_public on public.productos
  for select using (true);

-- Insercin: Dueo del negocio o Facilitador aprobado
create policy productos_insert on public.productos
  for insert with check (
    auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id)
    or exists (
      select 1 from public.facilitadores_negocio f
      where f.facilitador_id = auth.uid()
        and f.negocio_id = productos.negocio_id
        and f.estado_vinculacion = 'aprobado'
    )
  );

-- Actualizacin: Dueo del negocio o Facilitador aprobado
create policy productos_update on public.productos
  for update using (
    auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id)
    or exists (
      select 1 from public.facilitadores_negocio f
      where f.facilitador_id = auth.uid()
        and f.negocio_id = productos.negocio_id
        and f.estado_vinculacion = 'aprobado'
    )
  );

-- Eliminacin: Slo el dueo del negocio
create policy productos_delete on public.productos
  for delete using (
    auth.uid() = (select owner_id from public.businesses b where b.id = negocio_id)
  );
