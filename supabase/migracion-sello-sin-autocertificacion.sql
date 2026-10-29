-- ConectaComuna — que nadie se verifique a sí mismo
--
-- El dueño de un negocio genera su código de apadrinamiento y se lo entrega a
-- quien quiera que lo acompañe. Hasta aquí todo bien: es consentimiento
-- explícito. El problema es que nada comprobaba que ese "quien quiera" no
-- fuera él mismo con una segunda cuenta marcada como facilitador.
--
-- Con eso, cualquiera podía otorgarse el sello "Verificado en territorio",
-- que es la señal de confianza más fuerte que muestra la plataforma. La
-- pregunta que lo destapa es una sola: ¿quién verifica al que verifica?
--
-- Esto cierra el caso descarado. El de la persona que le pide el favor a un
-- primo no se cierra con código: se cierra mostrando quién firmó el sello,
-- que es lo que hace la otra mitad de este cambio.
--
-- Aplicar en la consola SQL de Supabase. Es idempotente.

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
