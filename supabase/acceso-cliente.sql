-- ConectaComuna — habilita el acceso del cliente vía PostgREST.
-- Ejecutar en la consola SQL de Supabase DESPUÉS de aplicar frontend/supabase/schema.sql.
-- Sin esto, PostgREST responde 401 "Only the service_role API key can be used". 
-- El control fino de filas lo dan las políticas RLS (propias/owner), no estos grants.

grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.businesses, public.reviews to anon;

grant all on public.profiles, public.businesses, public.orders, public.reviews,
            public.facilitadores_negocio, public.direcciones_usuario
      to authenticated, service_role;