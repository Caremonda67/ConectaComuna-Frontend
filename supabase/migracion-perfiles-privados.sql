-- ConectaComuna — cerrar la lectura anónima de datos personales
--
-- La política `profiles_select_public` es `using (true)`, así que cualquiera
-- con la clave anónima (que viaja dentro del bundle del frontend, es pública
-- por diseño) podía descargar el nombre y el teléfono de todas las personas
-- registradas con una sola petición:
--
--   curl "<url>/rest/v1/profiles?select=full_name,phone" -H "apikey: <anon>"
--
-- RLS filtra filas, no columnas. Para esto sirven los permisos por columna:
-- se le deja a `anon` lo que de verdad necesita pintar (el nombre y el avatar
-- de quien firma una reseña) y se le quita el resto. Las pantallas que sí
-- muestran teléfonos (pedidos, apadrinamiento, moderación) corren siempre con
-- sesión iniciada, donde las políticas de RLS siguen mandando.
--
-- Aplicar en la consola SQL de Supabase. Es idempotente.

revoke select on public.profiles from anon;

grant select (id, full_name, avatar_url) on public.profiles to anon;

-- `authenticated` conserva la tabla completa; quien decide qué fila ve cada
-- quien sigue siendo la política de RLS, no este permiso.
grant select on public.profiles to authenticated;

-- Comprobación rápida después de aplicar:
--   Debe devolver [] o error de permiso:
--     curl "<url>/rest/v1/profiles?select=phone&limit=1" -H "apikey: <anon>"
--   Debe seguir devolviendo filas (lo usa la lista de reseñas):
--     curl "<url>/rest/v1/profiles?select=id,full_name&limit=1" -H "apikey: <anon>"
