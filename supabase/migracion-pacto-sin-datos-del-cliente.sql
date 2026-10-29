-- ConectaComuna — el facilitador acompaña al taller, no a sus clientes
--
-- `verificar_pedido_publico` trataba como parte del pacto al cliente, al dueño
-- del taller y también al facilitador aprobado. Con eso, quien apadrina un
-- negocio veía el nombre y la dirección de entrega de cualquier vecino que le
-- hubiera pactado un trabajo.
--
-- El cliente nunca aceptó eso. Pactó con el taller, no con quien lo acompaña,
-- y en la página de privacidad le decimos que sus datos solo los ven las
-- partes del acuerdo.
--
-- Además era incoherente con el resto del sistema: la política de `orders` no
-- le deja al facilitador listar un solo pedido, pero esta función le entregaba
-- el detalle completo de cualquiera cuyo código tuviera a mano.
--
-- A partir de aquí el facilitador ve lo mismo que cualquier vecino con el
-- código: que el pacto existe, con qué taller, por cuánto y en qué estado. Si
-- hay un conflicto que mediar, el comprobante lo comparte quien lo tiene.
--
-- Aplicar en la consola SQL de Supabase. Es idempotente.

create or replace function public.verificar_pedido_publico(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limpio text;
  v_pedido uuid;
  v_es_parte boolean := false;
  v_salida jsonb;
begin
  v_limpio := lower(btrim(coalesce(p_codigo, '')));
  v_limpio := regexp_replace(v_limpio, '^#?cc[-_]?', '', 'i');
  v_limpio := regexp_replace(v_limpio, '[^a-z0-9-]', '', 'g');

  -- El código visible son 8 caracteres del UUID. Menos que eso es enumeración.
  if char_length(replace(v_limpio, '-', '')) < 8 then
    return null;
  end if;

  if char_length(v_limpio) = 36 then
    select id into v_pedido from public.orders where id::text = v_limpio;
  else
    select id into v_pedido
      from public.orders
     where replace(id::text, '-', '') like replace(v_limpio, '-', '') || '%'
     order by created_at desc
     limit 1;
  end if;

  if v_pedido is null then
    return null;
  end if;

  -- Parte del pacto son dos personas: quien pidió y quien hace el trabajo.
  if auth.uid() is not null then
    select exists (
      select 1
        from public.orders o
        join public.businesses b on b.id = o.business_id
       where o.id = v_pedido
         and (o.client_id = auth.uid() or b.owner_id = auth.uid())
    ) into v_es_parte;
  end if;

  if v_es_parte then
    select jsonb_build_object(
             'nivel', 'participante',
             'codigo', 'CC-' || upper(left(o.id::text, 8)),
             'order_id', o.id,
             'status', o.status,
             'created_at', o.created_at,
             'scheduled_for', o.scheduled_for,
             'title', o.title,
             'description', o.description,
             'service_location_type', o.service_location_type,
             'delivery_address', o.delivery_address,
             'business', jsonb_build_object(
               'id', b.id,
               'name', b.name,
               'category', b.category,
               'phone', b.phone,
               'barrio', b.neighborhood,
               'is_verified', b.verification_status = 'verified'
             ),
             'client', jsonb_build_object(
               'name', p.full_name,
               'phone_masked', case when p.phone is not null then '...' || right(p.phone, 4) else null end
             ),
             'precio_total', coalesce(o.final_price, o.price_estimate, 0),
             'anticipo', coalesce(o.advance_payment, 0),
             'saldo_contra_entrega', greatest(0, coalesce(o.final_price, o.price_estimate, 0) - coalesce(o.advance_payment, 0)),
             'porcentaje_anticipo', case
               when coalesce(o.final_price, o.price_estimate, 0) > 0
                 then round(coalesce(o.advance_payment, 0) * 100.0 / coalesce(o.final_price, o.price_estimate, 0))::int
               else 0
             end,
             'clausula_mediacion', 'Pacto registrado en ConectaComuna. El anticipo no puede superar el 50% del precio acordado. Si algo sale mal, repórtalo en la ficha del negocio: el equipo de Conecta Comuna revisa el caso.'
           )
      into v_salida
      from public.orders o
      join public.businesses b on b.id = o.business_id
      join public.profiles p on p.id = o.client_id
     where o.id = v_pedido;
  else
    select jsonb_build_object(
             'nivel', 'publico',
             'codigo', 'CC-' || upper(left(o.id::text, 8)),
             'status', o.status,
             'created_at', o.created_at,
             'scheduled_for', o.scheduled_for,
             'title', o.title,
             'service_location_type', o.service_location_type,
             'business', jsonb_build_object(
               'id', b.id,
               'name', b.name,
               'category', b.category,
               'phone', b.phone,
               'barrio', b.neighborhood,
               'is_verified', b.verification_status = 'verified'
             ),
             'precio_total', coalesce(o.final_price, o.price_estimate, 0),
             'anticipo', coalesce(o.advance_payment, 0),
             'saldo_contra_entrega', greatest(0, coalesce(o.final_price, o.price_estimate, 0) - coalesce(o.advance_payment, 0)),
             'porcentaje_anticipo', case
               when coalesce(o.final_price, o.price_estimate, 0) > 0
                 then round(coalesce(o.advance_payment, 0) * 100.0 / coalesce(o.final_price, o.price_estimate, 0))::int
               else 0
             end,
             'clausula_mediacion', 'Pacto registrado en ConectaComuna. El anticipo no puede superar el 50% del precio acordado. Si algo sale mal, repórtalo en la ficha del negocio: el equipo de Conecta Comuna revisa el caso.'
           )
      into v_salida
      from public.orders o
      join public.businesses b on b.id = o.business_id
     where o.id = v_pedido;
  end if;

  return v_salida;
end $$;

revoke all on function public.verificar_pedido_publico(text) from public;
grant execute on function public.verificar_pedido_publico(text) to anon, authenticated;
