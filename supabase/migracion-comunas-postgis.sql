-- =====================================================================
-- COMUNAS DE CALI CON POSTGIS
-- 3 de noviembre de 2026
--
-- Le da a cada negocio el número de comuna donde está, calculado desde el
-- punto que su dueño marcó en el mapa. Es la base del mapa del panel de
-- equipo (ver vault/PANEL-ADMINISTRADOR.md).
--
-- POR QUÉ DESDE LA COORDENADA Y NO DESDE EL BARRIO
-- `neighborhood` es texto libre y ya viene sucio: «El Vallado» y «Vallado»
-- conviven en los datos sembrados. Peor, los atajos de src/lib/lugares.ts
-- están desviados hasta 2-3 km y varios caen en una comuna que no es la suya.
-- `lat`/`lng` en cambio son `not null` y las puso el dueño en el mapa.
--
-- POR QUÉ UNA COLUMNA Y NO UN CÁLCULO AL CONSULTAR
-- La geometría se toca una vez por negocio guardado. La consulta del panel
-- queda en un `group by` sobre un entero indexado, sin geometría en el camino
-- de lectura.
--
-- REQUISITO: la extensión postgis, instalada en el esquema `extensions`:
--   create extension if not exists postgis with schema extensions;
--
-- ORDEN: primero este archivo, después datos/comunas-insert.sql (los 22
-- polígonos, generados por datos/generar-sql.py), y al final el bloque de
-- relleno que está al pie de este mismo archivo.
--
-- Es una migración puramente aditiva: una tabla, una columna, un índice, dos
-- funciones y un trigger. No cambia ninguna política ni quita ningún permiso.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

-- ---------- 1. LOS POLÍGONOS ----------
create table if not exists public.comunas_cali (
  comuna int primary key check (comuna between 1 and 22),
  osm_id bigint,
  geom extensions.geography(multipolygon, 4326) not null,
  actualizado_en timestamptz not null default now()
);

create index if not exists comunas_cali_geom_idx
  on public.comunas_cali using gist (geom);

comment on table public.comunas_cali is
  'Límites de las 22 comunas de Cali. Fuente: OpenStreetMap (ODbL). '
  'Reemplazar por la capa del DAPM cuando datos.cali.gov.co vuelva a estar en pie.';

-- RLS activa y A PROPÓSITO sin ninguna política de lectura: nadie lee esta
-- tabla por PostgREST. El navegador no necesita los polígonos de precisión
-- completa (171 KB) — dibuja el mapa con una silueta simplificada de 3,8 KB
-- que viaja en el bundle. Aquí solo entran las funciones `security definer`.
alter table public.comunas_cali enable row level security;

-- ---------- 2. EN QUÉ COMUNA CAE UN PUNTO ----------
-- `st_covers` y no `st_contains`: un negocio sobre la línea que separa dos
-- comunas —una esquina, una avenida limítrofe— tiene que quedar en una, no
-- quedarse sin ninguna.
--
-- `security definer` porque comunas_cali no es legible para nadie; el
-- search_path incluye `extensions` porque PostGIS no vive en `public`.
create or replace function public.comuna_de_punto(
  p_lat double precision,
  p_lng double precision
) returns int
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.comuna
    from public.comunas_cali c
   where st_covers(c.geom, st_setsrid(st_point(p_lng, p_lat), 4326)::geography)
   limit 1;
$$;

revoke all on function public.comuna_de_punto(double precision, double precision) from public;
-- Los dueños de negocio la necesitan: el trigger de abajo corre con sus
-- permisos al guardar una ficha.
grant execute on function public.comuna_de_punto(double precision, double precision) to authenticated;

-- ---------- 3. LA COLUMNA Y SU TRIGGER ----------
alter table public.businesses add column if not exists comuna int;

comment on column public.businesses.comuna is
  'Comuna de Cali calculada desde lat/lng. NULL = fuera de Cali o sin resolver.';

create index if not exists businesses_comuna_idx
  on public.businesses (comuna) where is_active;

-- El trigger NUNCA puede impedir que se guarde una ficha. Un negocio de
-- Bogotá, una coordenada rara o un fallo de PostGIS dejan `comuna` en NULL y
-- el panel los cuenta aparte como «sin clasificar». Perder un número del mapa
-- es molesto; no poder publicar un negocio sería un fallo grave.
create or replace function public.businesses_set_comuna()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  begin
    new.comuna := public.comuna_de_punto(new.lat, new.lng);
  exception when others then
    new.comuna := null;
  end;
  return new;
end;
$$;

drop trigger if exists businesses_set_comuna_trg on public.businesses;
create trigger businesses_set_comuna_trg
  before insert or update of lat, lng on public.businesses
  for each row execute function public.businesses_set_comuna();

-- =====================================================================
-- CORRER DESPUÉS de datos/comunas-insert.sql
-- =====================================================================
-- Rellena los negocios que ya existían. También sirve para recalcular todo si
-- algún día se reemplazan los polígonos por los oficiales del DAPM.
--
--   update public.businesses
--      set comuna = public.comuna_de_punto(lat, lng)
--    where comuna is distinct from public.comuna_de_punto(lat, lng);
--
-- Y para comprobar que quedó bien:
--
--   select coalesce(comuna::text, 'sin clasificar') as comuna, count(*)
--     from public.businesses where is_active
--    group by 1 order by 1;
