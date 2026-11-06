-- =====================================================================
-- BÚSQUEDA POR CERCANÍA CON POSTGIS
-- 5 de noviembre de 2026
--
-- EL FALLO QUE ARREGLA, que no es de rendimiento sino de respuesta incorrecta.
--
-- Hoy `businessService.search` prefiltra en el servidor por caja envolvente
-- con `.limit(60)` y calcula la distancia exacta en el navegador. El límite se
-- aplica ANTES de que exista la distancia: Postgres devuelve 60 filas
-- cualesquiera de la caja y el cliente ordena esas 60. Con 20 negocios no pasa
-- nada; con 300 en la comuna, «el cerrajero más cercano» puede quedarse fuera
-- de las 60 que llegaron y la aplicación muestra con toda seguridad uno que no
-- es el más cercano. No se arregla subiendo el límite: se arregla ordenando
-- por distancia en la base.
--
-- Esto es además lo que cierra el límite que teníamos declarado en
-- vault/DIFERENCIADOR-Y-ADOPCION.md: «a escala de ciudad la búsqueda pide
-- PostGIS con índices GiST». Ya no es una proyección.
--
-- NO ES `security definer`, Y ESO ES DELIBERADO.
-- El directorio es público y la RLS de `businesses` ya dice quién ve qué
-- (`is_active or owner_id = auth.uid()`). Una función con derechos del
-- invocante deja que esa política siga haciendo su trabajo; una `security
-- definer` la saltaría y tendríamos que reimplementar la regla a mano, que es
-- justo como se cuelan los fallos. `codigo_apadrinamiento` no se devuelve.
--
-- Requiere: postgis en el esquema `extensions` y migracion-comunas-postgis.sql.
-- Aditiva: una columna, un índice, un trigger ampliado y una función.
-- =====================================================================

-- ---------- 1. EL PUNTO DE CADA NEGOCIO ----------
-- Columna normal mantenida por trigger, no `generated always as`: el cast de
-- geometry a geography dentro de una columna generada depende de que Postgres
-- la considere inmutable, y no vale la pena apostar a eso a ocho días de la
-- final cuando ya hay un trigger que se dispara exactamente cuando toca.
alter table public.businesses
  add column if not exists punto extensions.geography(point, 4326);

comment on column public.businesses.punto is
  'lat/lng como punto geográfico, para buscar por cercanía con índice GiST. '
  'Derivado: lo escribe businesses_set_comuna(), nadie lo escribe a mano.';

create index if not exists businesses_punto_idx
  on public.businesses using gist (punto) where is_active;

-- ---------- 2. EL TRIGGER QUE YA EXISTÍA, AMPLIADO ----------
-- Mismo trigger `businesses_set_comuna_trg` de migracion-comunas-postgis.sql:
-- se dispara en insert y al cambiar lat/lng, que es cuando hay que recalcular
-- las dos cosas. Sigue sin lanzar excepción nunca: una ficha tiene que poder
-- guardarse aunque la geometría falle.
create or replace function public.businesses_set_comuna()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  begin
    new.comuna := public.comuna_de_punto(new.lat, new.lng);
    new.punto := st_setsrid(st_point(new.lng, new.lat), 4326)::geography;
  exception when others then
    new.comuna := null;
    new.punto := null;
  end;
  return new;
end;
$$;

-- ---------- 3. LA BÚSQUEDA ----------
-- `st_dwithin` acota por radio usando el índice; `<->` ordena por distancia
-- real, también con el índice. Las dos cosas juntas son lo que el prefiltro
-- por caja no podía dar.
create or replace function public.buscar_negocios_cerca(
  p_lat double precision,
  p_lng double precision,
  p_radio_km double precision default 5,
  p_limite int default 40,
  p_categoria text default null
)
returns table (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  category text,
  phone text,
  whatsapp text,
  address text,
  neighborhood text,
  comuna int,
  lat double precision,
  lng double precision,
  photos text[],
  hours jsonb,
  rating_avg numeric,
  rating_count int,
  completed_orders int,
  report_count int,
  services_catalog jsonb,
  is_active boolean,
  created_at timestamptz,
  verification_status text,
  wholesale_enabled boolean,
  wholesale_min_order text,
  wholesale_terms text,
  distancia_km double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with centro as (
    select st_setsrid(st_point(p_lng, p_lat), 4326)::geography as g
  )
  select
    b.id, b.owner_id, b.name, b.description, b.category,
    b.phone, b.whatsapp, b.address, b.neighborhood, b.comuna,
    b.lat, b.lng, b.photos, b.hours,
    b.rating_avg, b.rating_count, b.completed_orders, b.report_count,
    b.services_catalog, b.is_active, b.created_at, b.verification_status,
    b.wholesale_enabled, b.wholesale_min_order, b.wholesale_terms,
    round((st_distance(b.punto, c.g) / 1000)::numeric, 3)::double precision
  from public.businesses b, centro c
  where b.is_active
    and b.punto is not null
    and st_dwithin(b.punto, c.g, greatest(p_radio_km, 0) * 1000)
    and (p_categoria is null or b.category = p_categoria)
  order by b.punto <-> c.g
  limit greatest(least(p_limite, 200), 1);
$$;

-- Pública a propósito: el directorio se ve sin iniciar sesión, igual que hoy.
grant execute on function public.buscar_negocios_cerca(
  double precision, double precision, double precision, int, text
) to anon, authenticated;

-- =====================================================================
-- CORRER DESPUÉS, UNA VEZ
-- =====================================================================
-- Rellena el punto de los negocios que ya existen. El trigger solo actúa
-- cuando se guarda una ficha.
--
--   update public.businesses
--      set punto = extensions.st_setsrid(
--            extensions.st_point(lng, lat), 4326)::extensions.geography
--    where punto is null;
--
-- Comprobación: tiene que devolver los negocios ordenados de más cerca a más
-- lejos desde el centro de El Vallado.
--
--   select name, neighborhood, comuna, distancia_km
--     from public.buscar_negocios_cerca(3.4062, -76.4994, 20);
--
-- Y que el índice se esté usando (debe aparecer un Index Scan sobre
-- businesses_punto_idx, no un Seq Scan):
--
--   explain analyze
--   select * from public.buscar_negocios_cerca(3.4062, -76.4994, 5);
