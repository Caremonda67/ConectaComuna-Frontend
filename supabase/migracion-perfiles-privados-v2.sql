-- Hasta hoy cualquier usuario con sesión podía leer nombre, teléfono y barrio
-- de todo el mundo: profiles_select_public deja pasar todas las filas y a
-- 'authenticated' se le había dado select completo. A 'anon' se le cerró en
-- agosto; a las cuentas con sesión, no.
--
-- RLS filtra filas, no columnas, así que el arreglo va por permisos de columna:
-- las cinco que la app necesita para pintar nombres siguen legibles, y el
-- teléfono solo sale por la función del perfil propio.
--
-- Aplicar en el editor SQL de Supabase. Se puede correr dos veces.
-- Orden: primero este archivo, después el despliegue del frontend.

revoke select on public.profiles from authenticated;
revoke select on public.profiles from anon;

grant select (id, full_name, avatar_url, account_type, neighborhood)
  on public.profiles to anon, authenticated;

-- El perfil completo, incluido el teléfono, solo para la fila propia.
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

-- Comprobación rápida, para correr a mano después de aplicar:
--   select has_column_privilege('authenticated', 'public.profiles', 'phone', 'select');  -- false
--   select has_column_privilege('authenticated', 'public.profiles', 'full_name', 'select'); -- true
