-- ConectaComuna — habilita el acceso del cliente vía PostgREST.
-- Ejecutar en la consola SQL de Supabase DESPUÉS de aplicar frontend/supabase/schema.sql.
-- Sin esto, PostgREST responde 401 "Only the service_role API key can be used".
-- El control fino de filas lo dan las políticas RLS (propias/owner), no estos grants.
--
-- CUIDADO con `profiles`. La versión anterior de este archivo hacía
--
--     grant select on public.profiles ... to anon;
--     grant all on public.profiles ... to authenticated;
--
-- y eso deshace `migracion-perfiles-privados-v2.sql`: devuelve el teléfono de
-- todo el mundo a cualquier visitante sin sesión y a cualquier usuario
-- conectado. Como este archivo está documentado como paso de instalación,
-- volver a correrlo reabría el agujero sin que nadie se diera cuenta. Por eso
-- `profiles` se concede por columnas, igual que en la migración, y el teléfono
-- se lee por `perfil_contacto`, que tiene sus propias reglas.

grant usage on schema public to anon, authenticated;

-- Lectura pública del directorio.
grant select on public.businesses, public.reviews to anon, authenticated;

-- De `profiles` solo lo que es público. El teléfono NO está aquí a propósito:
-- vive en `perfil_contacto` y solo lo ve quien tiene un motivo.
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, account_type, neighborhood)
  on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- El resto de las tablas del usuario conectado: las filas las filtra RLS.
grant select, insert, update, delete
  on public.orders, public.reviews, public.facilitadores_negocio,
     public.direcciones_usuario
  to authenticated;

grant select, insert, update, delete on public.businesses to authenticated;

-- service_role se salta RLS por definición; no necesita grants finos.
grant all on public.profiles, public.businesses, public.orders, public.reviews,
            public.facilitadores_negocio, public.direcciones_usuario
      to service_role;

-- Comprobación, para pegar después:
--   select grantee, string_agg(privilege_type || coalesce(':' || column_name, ''), ', ')
--     from information_schema.column_privileges
--    where table_name = 'profiles' and grantee in ('anon', 'authenticated')
--    group by grantee;
-- En `anon` no debe aparecer `phone`.
