-- ConectaComuna — migración Bogotá 2026
--
-- Recoge lo que la aplicación ya usaba en producción pero que nunca llegó al
-- schema: columnas del sello territorial, direcciones guardadas del cliente y
-- el conteo de reportes. También deja el sello y la verificación pública como
-- funciones controladas, para que no dependan de escribir la tabla a mano.
--
-- Es idempotente: se puede correr entera sobre la base viva y también sobre una
-- base recién creada con schema.sql.

-- ---------- 1. COLUMNAS QUE FALTABAN ----------
alter table public.businesses add column if not exists verification_by text;
alter table public.businesses add column if not exists verification_note text;
alter table public.businesses add column if not exists verification_date timestamptz;
alter table public.businesses add column if not exists report_count int not null default 0;

-- ---------- 2. EL ESTADO QUE YA PINTA LA INTERFAZ ----------
alter table public.businesses drop constraint if exists businesses_verification_status_check;
alter table public.businesses add constraint businesses_verification_status_check
  check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected', 'under_review'));

-- ---------- 3. DIRECCIONES GUARDADAS DEL CLIENTE ----------
create table if not exists public.direcciones_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  etiqueta text not null,
  direccion_texto text not null,
  barrio text,
  lat double precision not null,
  lng double precision not null,
  creado_en timestamptz not null default now()
);

create index if not exists direcciones_usuario_usuario_idx
  on public.direcciones_usuario (usuario_id);

alter table public.direcciones_usuario enable row level security;

drop policy if exists direcciones_select_propias on public.direcciones_usuario;
create policy direcciones_select_propias on public.direcciones_usuario
  for select using (auth.uid() = usuario_id);

drop policy if exists direcciones_insert_propias on public.direcciones_usuario;
create policy direcciones_insert_propias on public.direcciones_usuario
  for insert with check (auth.uid() = usuario_id);

drop policy if exists direcciones_update_propias on public.direcciones_usuario;
create policy direcciones_update_propias on public.direcciones_usuario
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists direcciones_delete_propias on public.direcciones_usuario;
create policy direcciones_delete_propias on public.direcciones_usuario
  for delete using (auth.uid() = usuario_id);

-- ---------- 4. BLINDAJE CON PERMISO PARA EL SELLO ----------
create or replace function public.protect_business_columns()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Si el update viene de triggers internos del sistema, permitirlo
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- otorgar_sello_territorial levanta esta bandera mientras escribe
  if current_setting('conecta.sello', true) = 'on' then
    return new;
  end if;

  if auth.role() in ('authenticated', 'anon') then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'No está permitido modificar el estado de verificación directamente';
    end if;

    if new.rating_avg is distinct from old.rating_avg or
       new.rating_count is distinct from old.rating_count or
       new.completed_orders is distinct from old.completed_orders then
      raise exception 'La reputación y los pedidos completados solo se calculan automáticamente por el sistema';
    end if;
  end if;

  return new;
end $$;

-- ---------- 5. SELLO DE VERIFICACIÓN EN TERRITORIO ----------
create or replace function public.otorgar_sello_territorial(p_negocio uuid, p_nota text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_nombre text;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para otorgar el sello';
  end if;

  select full_name into v_nombre from public.profiles where id = auth.uid();

  if not exists (
    select 1 from public.facilitadores_negocio fn
     where fn.negocio_id = p_negocio
       and fn.facilitador_id = auth.uid()
       and fn.estado_vinculacion = 'aprobado'
  ) then
    raise exception 'Solo un facilitador vinculado y aprobado puede otorgar el sello';
  end if;

  perform set_config('conecta.sello', 'on', true);

  update public.businesses
     set verification_status = 'verified',
         verification_by = coalesce(v_nombre, 'Facilitador Comunal'),
         verification_note = coalesce(nullif(btrim(p_nota), ''), 'Verificado en visita de campo por facilitador'),
         verification_date = now()
   where id = p_negocio;

  perform set_config('conecta.sello', 'off', true);
end $$;

create or replace function public.revocar_sello_territorial(p_negocio uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión para retirar el sello';
  end if;

  if not exists (
    select 1 from public.facilitadores_negocio fn
     where fn.negocio_id = p_negocio
       and fn.facilitador_id = auth.uid()
       and fn.estado_vinculacion = 'aprobado'
  ) then
    raise exception 'Solo un facilitador vinculado y aprobado puede retirar el sello';
  end if;

  perform set_config('conecta.sello', 'on', true);

  update public.businesses
     set verification_status = 'unverified',
         verification_by = null,
         verification_note = null,
         verification_date = null
   where id = p_negocio;

  perform set_config('conecta.sello', 'off', true);
end $$;

revoke all on function public.otorgar_sello_territorial(uuid, text) from public;
revoke all on function public.revocar_sello_territorial(uuid) from public;
grant execute on function public.otorgar_sello_territorial(uuid, text) to authenticated;
grant execute on function public.revocar_sello_territorial(uuid) to authenticated;

-- ---------- 6. REPORTES: RECONTAR Y PONER BAJO OBSERVACIÓN ----------
create or replace function public.refresh_business_reports()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid;
  v_pendientes int;
begin
  if tg_op = 'DELETE' then
    v_negocio := old.negocio_id;
  else
    v_negocio := new.negocio_id;
  end if;

  select count(*) into v_pendientes
    from public.reportes_comunitarios
   where negocio_id = v_negocio and estado = 'pendiente';

  update public.businesses
     set report_count = v_pendientes,
         verification_status = case
           when v_pendientes >= 2 and verification_status <> 'under_review' then 'under_review'
           when v_pendientes < 2 and verification_status = 'under_review' then 'unverified'
           else verification_status
         end
   where id = v_negocio;

  return null;
end $$;

drop trigger if exists reportes_refresh_business on public.reportes_comunitarios;
create trigger reportes_refresh_business
after insert or update of estado or delete on public.reportes_comunitarios
for each row execute function public.refresh_business_reports();

-- Los negocios que ya tenían reportes abiertos quedan con el conteo al día.
update public.businesses b
   set report_count = (
     select count(*) from public.reportes_comunitarios r
      where r.negocio_id = b.id and r.estado = 'pendiente'
   );

-- ---------- 7. VERIFICACIÓN PÚBLICA DEL TRATO SEGURO ----------
-- El QR lo abre cualquiera, sin sesión. Esta función devuelve solo lo que ya
-- viaja en el comprobante de WhatsApp: negocio, nombre del cliente y teléfono
-- enmascarado. La tabla orders sigue cerrada por RLS.
create or replace function public.verificar_pedido_publico(p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limpio text;
  v_pedido uuid;
  v_salida jsonb;
begin
  v_limpio := lower(btrim(coalesce(p_codigo, '')));
  v_limpio := regexp_replace(v_limpio, '^#?cc[-_]?', '', 'i');
  v_limpio := regexp_replace(v_limpio, '[^a-z0-9-]', '', 'g');

  -- El código visible son 8 caracteres del UUID. Menos que eso es enumeración.
  if char_length(replace(v_limpio, '-', '')) < 6 then
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

  select jsonb_build_object(
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
           'clausula_mediacion', 'Pacto respaldado por el Comité de Convivencia y Mediación Comunitaria de la JAC de la Comuna y ConectaComuna.'
         )
    into v_salida
    from public.orders o
    join public.businesses b on b.id = o.business_id
    join public.profiles p on p.id = o.client_id
   where o.id = v_pedido;

  return v_salida;
end $$;

grant execute on function public.verificar_pedido_publico(text) to anon, authenticated;

-- ---------- 8. VINCULACIÓN DEL FACILITADOR POR CÓDIGO ----------
-- El código de apadrinamiento lo entrega el dueño del negocio, así que sirve
-- como autorización. La política de la tabla solo deja insertar en 'pendiente',
-- por eso la vinculación directa pasa por esta función.
create or replace function public.vincular_facilitador_por_codigo(p_codigo text)
returns public.facilitadores_negocio
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid;
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

  select id into v_negocio
    from public.businesses
   where codigo_apadrinamiento = btrim(coalesce(p_codigo, ''))
   limit 1;

  if v_negocio is null then
    raise exception 'Código no válido. Verifica con el dueño del negocio.';
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
grant execute on function public.vincular_facilitador_por_codigo(text) to authenticated;

-- ---------- 9. AVISOS EN VIVO DE PEDIDOS ----------
-- En un proyecto nuevo la tabla no está publicada y los avisos de "pedido
-- nuevo" nunca llegan al panel. Se agrega solo si falta.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
exception
  when undefined_object then null;
end $$;
