-- La nota de avance no se podía guardar.
--
-- El taller abría el modal, escribía "ya compré los materiales", daba a
-- Guardar, y la nota nunca llegaba. Comprobado contra el esquema:
--
-- El frontend guardaba la nota llamando a `cambiar_estado_pedido`, que **exige
-- una transición de estado**. Su tabla de permitidos no contempla quedarse en
-- el mismo estado:
--
--   when v_pedido.status = 'in_progress' and p_estado = 'completed' then ...
--   else false
--
-- Guardar una nota sin mover el pedido caía en el `else` y lanzaba «Ese cambio
-- de estado no está permitido». No era un fallo intermitente: era imposible.
--
-- En modo demostración sí funcionaba, porque esa rama escribe el campo directo
-- sin pasar por la función. Por eso pasó las pruebas locales. Es la misma
-- forma de error que el dictado por voz: lo que se prueba en el escritorio no
-- es lo que corre en producción.
--
-- La solución no es relajar `cambiar_estado_pedido`. Esa función guarda la
-- máquina de estados del pedido y abrirle una transición identidad la
-- debilitaría para todo lo demás. Dejar una nota es otra operación: no cambia
-- el estado, solo informa al cliente. Va en su propia función.
--
-- ORDEN DE DESPLIEGUE: esta migración **primero**, el frontend después. Aquí
-- se añade una función nueva, no se restringe nada, así que aplicarla sola no
-- rompe la versión que ya está en producción. Al revés sí: el frontend nuevo
-- llamaría a una función que todavía no existe.
--
-- Aplicar en la consola SQL de Supabase. Se puede correr dos veces.

create or replace function public.guardar_nota_avance(
  p_pedido uuid,
  p_nota text
)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_pedido public.orders;
  v_dueno uuid;
  v_limpia text;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para dejar una nota';
  end if;

  select * into v_pedido from public.orders where id = p_pedido for update;
  if not found then
    raise exception 'El pedido no existe';
  end if;

  -- La nota la deja el taller, no el cliente: es lo que el negocio le cuenta a
  -- quien encargó el trabajo. El cliente tiene la ficha de reportes para lo
  -- suyo.
  select owner_id into v_dueno from public.businesses where id = v_pedido.business_id;
  if v_dueno is distinct from auth.uid() then
    raise exception 'Solo el negocio puede dejar la nota de avance';
  end if;

  -- Tiene sentido mientras el trabajo está vivo. En un pedido cancelado no hay
  -- avance que contar, y en uno finalizado la nota ya no cambia nada: el
  -- comprobante quedó cerrado y debe seguir diciendo lo que decía.
  if v_pedido.status not in ('accepted', 'in_progress') then
    raise exception 'Solo se puede dejar nota mientras el trabajo está en curso';
  end if;

  v_limpia := nullif(btrim(coalesce(p_nota, '')), '');

  update public.orders
     set business_notes = v_limpia,
         updated_at = now()
   where id = p_pedido
  returning * into v_pedido;

  return v_pedido;
end $$;

revoke all on function public.guardar_nota_avance(uuid, text) from public;
revoke all on function public.guardar_nota_avance(uuid, text) from anon;
grant execute on function public.guardar_nota_avance(uuid, text) to authenticated;

-- Comprobación, para pegar después de aplicar:
--
--   select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'guardar_nota_avance';
--
-- Debe devolver una fila: guardar_nota_avance(uuid, text).
