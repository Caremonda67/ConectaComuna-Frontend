-- El teléfono dejó de ser legible en profiles cuando se cerró la privacidad.
-- Esta tabla lo devuelve solo a quien tiene un motivo para verlo: la propia
-- persona, la contraparte de un pedido y el negocio con su facilitador aprobado.
--
-- profiles.phone sigue siendo la fuente; esta tabla es el espejo que se puede
-- leer con reglas. Aplicar DESPUÉS de desplegar el frontend que la usa, como
-- dice REGLA-ORDEN-DESPLIEGUE.md.

create table if not exists public.perfil_contacto (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  actualizado_en timestamptz not null default now()
);

alter table public.perfil_contacto enable row level security;

insert into public.perfil_contacto (profile_id, phone)
select id, phone from public.profiles where phone is not null
on conflict (profile_id) do update set phone = excluded.phone, actualizado_en = now();

create or replace function public.espejar_contacto()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.phone is null then
    delete from public.perfil_contacto where profile_id = new.id;
  else
    insert into public.perfil_contacto (profile_id, phone)
    values (new.id, new.phone)
    on conflict (profile_id) do update set phone = excluded.phone, actualizado_en = now();
  end if;
  return new;
end $$;

drop trigger if exists profiles_espejo_contacto on public.profiles;
create trigger profiles_espejo_contacto
after insert or update of phone on public.profiles
for each row execute function public.espejar_contacto();

drop policy if exists contacto_propio on public.perfil_contacto;
create policy contacto_propio on public.perfil_contacto
  for select using (profile_id = auth.uid());

-- Las dos partes de un pedido se ven entre sí; el negocio y su facilitador
-- aprobado también. Nadie más.
drop policy if exists contacto_contraparte on public.perfil_contacto;
create policy contacto_contraparte on public.perfil_contacto
  for select using (
    exists (
      select 1
        from public.orders o
        join public.businesses b on b.id = o.business_id
       where (o.client_id = auth.uid() and b.owner_id = perfil_contacto.profile_id)
          or (b.owner_id = auth.uid() and o.client_id = perfil_contacto.profile_id)
    )
    or exists (
      select 1
        from public.facilitadores_negocio fn
        join public.businesses b on b.id = fn.negocio_id
       where fn.estado_vinculacion = 'aprobado'
         and ((fn.facilitador_id = auth.uid() and b.owner_id = perfil_contacto.profile_id)
           or (b.owner_id = auth.uid() and fn.facilitador_id = perfil_contacto.profile_id))
    )
  );

drop policy if exists contacto_escritura_propia on public.perfil_contacto;
create policy contacto_escritura_propia on public.perfil_contacto
  for insert with check (profile_id = auth.uid());

drop policy if exists contacto_actualizacion_propia on public.perfil_contacto;
create policy contacto_actualizacion_propia on public.perfil_contacto
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

grant select, insert, update on public.perfil_contacto to authenticated;
