-- Un facilitador acompaña oficios ajenos; no abre uno propio.
--
-- Hasta ahora la única política de escritura sobre `businesses` era
-- `businesses_owner_write`, que deja insertar a cualquiera que se ponga a sí
-- mismo como dueño. La interfaz además lo empujaba: el enlace "Publicar
-- servicio" llevaba al facilitador a un formulario de "Crear mi negocio" en
-- blanco. Eso ya está corregido en el frontend, pero la interfaz se puede
-- saltar con una petición directa, así que la regla tiene que vivir aquí.
--
-- Aplicar en el editor SQL de Supabase. Se puede correr dos veces.

-- 1. Nadie con rol de facilitador puede crear un negocio a su nombre.
drop policy if exists businesses_owner_write on public.businesses;

create policy businesses_owner_insert on public.businesses
  for insert with check (
    auth.uid() = owner_id
    and not exists (
      select 1
        from public.profiles p
       where p.id = auth.uid()
         and p.account_type = 'facilitador'
    )
  );

-- Editar y borrar siguen siendo del dueño. Al facilitador aprobado se le abre
-- la edición en la política de abajo, que es la que sostiene el apadrinamiento.
create policy businesses_owner_update on public.businesses
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy businesses_owner_delete on public.businesses
  for delete using (auth.uid() = owner_id);

-- 2. El facilitador aprobado sí edita los negocios que le dieron acceso.
--    Esto es lo que hace útil su rol, y no estaba escrito como política.
drop policy if exists businesses_facilitador_update on public.businesses;

create policy businesses_facilitador_update on public.businesses
  for update using (
    exists (
      select 1
        from public.facilitadores_negocio fn
       where fn.negocio_id = businesses.id
         and fn.facilitador_id = auth.uid()
         and fn.estado_vinculacion = 'aprobado'
    )
  ) with check (
    exists (
      select 1
        from public.facilitadores_negocio fn
       where fn.negocio_id = businesses.id
         and fn.facilitador_id = auth.uid()
         and fn.estado_vinculacion = 'aprobado'
    )
  );

-- Comprobación rápida, para pegar en el editor SQL después de aplicar:
--   select polname, cmd from pg_policies where tablename = 'businesses';
-- Deben aparecer: businesses_select_public, businesses_owner_insert,
-- businesses_owner_update, businesses_owner_delete, businesses_facilitador_update.
