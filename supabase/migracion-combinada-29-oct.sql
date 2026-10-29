-- ConectaComuna — dos correcciones de confianza y privacidad
-- Pegar completo en la consola SQL de Supabase. Es idempotente.

-- =====================================================================
-- PARTE 1 — Que nadie se verifique a si mismo
-- =====================================================================

-- ---------- 1. NO APADRINARSE A SÍ MISMO ----------
create or replace function public.vincular_facilitador_por_codigo(p_codigo text)
returns public.facilitadores_negocio
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid;
  v_dueno uuid;
  v_fila public.facilitadores_negocio;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para vincularte a un negocio';
  end if;

  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and account_type = 'facilitador'
  ) then
    raise exception 'Solo una cuenta de facilitador puede apadrinar negocios';
  end if;

  select id, owner_id into v_negocio, v_dueno
    from public.businesses
   where codigo_apadrinamiento = btrim(coalesce(p_codigo, ''))
   limit 1;

  if v_negocio is null then
    raise exception 'Código no válido. Verifica con el dueño del negocio.';
  end if;

  -- Quien responde por un negocio ante la comunidad tiene que ser otra
  -- persona. Si no, el sello no dice nada.
  if v_dueno = auth.uid() then
    raise exception 'No puedes apadrinar tu propio negocio. El sello lo otorga otro vecino.';
  end if;

  select * into v_fila
    from public.facilitadores_negocio
   where negocio_id = v_negocio and facilitador_id = auth.uid();

  if found and v_fila.estado_vinculacion = 'aprobado' then
    raise exception 'Ya tienes una vinculación activa con este negocio.';
  end if;

  if found then
    update public.facilitadores_negocio
       set estado_vinculacion = 'aprobado'
     where id = v_fila.id
    returning * into v_fila;
  else
    insert into public.facilitadores_negocio (negocio_id, facilitador_id, estado_vinculacion)
    values (v_negocio, auth.uid(), 'aprobado')
    returning * into v_fila;
  end if;

  return v_fila;
end $$;

revoke all on function public.vincular_facilitador_por_codigo(text) from public;
revoke all on function public.vincular_facilitador_por_codigo(text) from anon;
grant execute on function public.vincular_facilitador_por_codigo(text) to authenticated;

-- ---------- 2. LA MISMA REGLA EN LA BASE, NO SOLO EN LA PUERTA ----------
-- Si alguien ya se vinculó a sí mismo antes de este cambio, la restricción
-- evita que el sello salga igual.
create or replace function public.facilitador_no_es_dueno()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.businesses b
     where b.id = new.negocio_id
       and b.owner_id = new.facilitador_id
  ) then
    raise exception 'El facilitador de un negocio no puede ser su propio dueño';
  end if;
  return new;
end $$;

drop trigger if exists facilitadores_no_autoapadrinar on public.facilitadores_negocio;
create trigger facilitadores_no_autoapadrinar
before insert or update on public.facilitadores_negocio
for each row execute function public.facilitador_no_es_dueno();

-- ---------- 3. REVISAR SI YA HAY ALGUNO ----------
-- Esta consulta no cambia nada: solo muestra los vínculos donde el facilitador
-- es el propio dueño, por si alguno quedó de antes. Si devuelve filas, hay que
-- decidir qué hacer con esos sellos a mano.
do $$
declare
  v_cuantos int;
begin
  select count(*) into v_cuantos
    from public.facilitadores_negocio fn
    join public.businesses b on b.id = fn.negocio_id
   where b.owner_id = fn.facilitador_id;

  if v_cuantos > 0 then
    raise notice 'Atención: hay % vínculo(s) donde el facilitador es el dueño del negocio. Revísalos a mano.', v_cuantos;
  else
    raise notice 'Sin vínculos de autoapadrinamiento. Todo limpio.';
  end if;
end $$;

-- =====================================================================
-- PARTE 2 — El facilitador acompana al taller, no a sus clientes
-- =====================================================================

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
