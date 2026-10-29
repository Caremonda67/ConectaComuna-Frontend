-- El alta de usuario copiaba account_type desde el metadata del registro.
-- Un signUp que mandara "facilitador" dejaba una cuenta con ese rol sin que
-- nadie del equipo la hubiera creado. El trigger de update ya lo bloqueaba
-- (proteger_tipo_cuenta), pero el insert no pasaba por ahí.
--
-- Aplicar en el editor SQL de Supabase. Se puede correr dos veces.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Vecino'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'neighborhood',
    case
      when new.raw_user_meta_data->>'account_type' = 'business' then 'business'::account_type
      else 'client'::account_type
    end,
    coalesce((new.raw_user_meta_data->>'onboarding_completado')::boolean, false)
  );
  return new;
end $$;

-- Revisión de lo que ya está creado. Las cuentas de facilitador que existan hoy
-- se comparan a mano contra equipo_conecta y se corrigen desde el panel de Supabase.
--
-- select p.id, p.full_name, p.phone, p.created_at
--   from public.profiles p
--  where p.account_type = 'facilitador'
--  order by p.created_at;
