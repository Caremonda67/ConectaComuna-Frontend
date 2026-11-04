-- =====================================================================
-- PANEL DE EQUIPO: LAS MÉTRICAS
-- 3 de noviembre de 2026
--
-- Las cifras que ve la mesa del equipo en /panel/equipo. Pedido por el
-- instructor: usuarios y negocios registrados, usuarios tomando servicios,
-- por semana, mes y año; PQR y reseñas negativas; negocios por comuna.
--
-- LA DECISIÓN DE FONDO: ESTAS FUNCIONES DEVUELVEN CONTEOS, NUNCA FILAS.
-- La tentación fácil era abrirle `orders` y `profiles` al equipo con una
-- política de RLS. Eso habría hecho del panel el único sitio de la aplicación
-- donde los datos privados quedan expuestos, justo después de construir
-- `verificar_pedido_publico` y los permisos por columna para que no lo
-- estuvieran. El administrador ve «37 clientes tomaron servicios en octubre»;
-- no puede leer un solo pedido, ni un teléfono, ni una dirección.
--
-- LOS TRES GUARDIAS DE CADA FUNCIÓN, y ninguno sobra:
--   1. `es_equipo_conecta()` — `security definer` IGNORA la RLS. Sin esto,
--      cualquier autenticado llama la función y se lleva los conteos.
--   2. Lista blanca de la granularidad — `p_gran` entra a un `date_trunc`.
--   3. `revoke ... from public` — para que `anon` ni la vea.
--
-- Requiere: migracion-bogota.sql (equipo_conecta, es_equipo_conecta) y
-- migracion-comunas-postgis.sql (businesses.comuna).
--
-- Aditiva: solo crea funciones. No toca ninguna tabla, política ni permiso.
-- =====================================================================

-- ---------- 1. LOS NÚMEROS DE ARRIBA ----------
-- Fotografía de hoy, no de un periodo. «Negocios» es el histórico y
-- «negocios_activos» los que están publicados: son cosas distintas y el panel
-- las rotula distinto, porque confundirlas es como se infla un número sin
-- querer.
create or replace function public.panel_resumen()
returns table (
  usuarios int,
  negocios int,
  negocios_activos int,
  negocios_verificados int,
  facilitadores_activos int,
  pedidos int,
  pedidos_completados int,
  con_trato_seguro int,
  clientes_unicos int,
  pqr_abiertas int,
  resenas_negativas int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_equipo_conecta() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::int from public.profiles),
    (select count(*)::int from public.businesses),
    (select count(*)::int from public.businesses where is_active),
    (select count(*)::int from public.businesses where verification_status = 'verified'),
    -- Facilitadores con al menos un sello puesto, no cuentas creadas. La
    -- unidad de adopción es el facilitador activo: una cuenta que nunca salió
    -- a verificar a nadie no mueve el proyecto.
    (select count(distinct verification_by)::int from public.businesses
      where verification_status = 'verified' and verification_by is not null),
    (select count(*)::int from public.orders),
    (select count(*)::int from public.orders where status = 'completed'),
    (select count(*)::int from public.orders where coalesce(advance_payment, 0) > 0),
    -- Personas distintas que han pedido alguna vez. No es el número de
    -- pedidos: en un barrio la misma vecina vuelve al mismo taller.
    (select count(distinct client_id)::int from public.orders),
    (select count(*)::int from public.reportes_comunitarios where estado = 'pendiente'),
    (select count(*)::int from public.reviews where rating <= 2);
end;
$$;

revoke all on function public.panel_resumen() from public;
grant execute on function public.panel_resumen() to authenticated;

-- ---------- 2. LA SERIE POR PERIODO ----------
-- ALTAS del periodo, no acumulados.
--
-- `clientes_activos` cuenta clientes DISTINTOS, no pedidos: tres pedidos de la
-- misma persona son una persona. Es la métrica que pidió el instructor como
-- «usuarios tomando servicios».
--
-- Solo salen los periodos con actividad. Con los datos de hoy, rellenar los
-- huecos con ceros daría una gráfica casi toda plana que parece un fallo.
create or replace function public.panel_serie(p_gran text, p_limite int default 12)
returns table (
  periodo date,
  usuarios int,
  negocios int,
  clientes_activos int,
  pedidos int,
  pedidos_completados int,
  con_trato_seguro int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_equipo_conecta() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  if p_gran not in ('week', 'month', 'year') then
    raise exception 'granularidad invalida: %', p_gran using errcode = '22023';
  end if;
  if p_limite is null or p_limite < 1 or p_limite > 60 then
    raise exception 'limite fuera de rango' using errcode = '22023';
  end if;

  return query
  with u as (
    select date_trunc(p_gran, created_at)::date as p, count(*)::int as n
      from public.profiles group by 1
  ), n as (
    select date_trunc(p_gran, created_at)::date as p, count(*)::int as n
      from public.businesses group by 1
  ), o as (
    select date_trunc(p_gran, created_at)::date as p,
           count(*)::int as total,
           count(distinct client_id)::int as clientes,
           count(*) filter (where status = 'completed')::int as completados,
           count(*) filter (where coalesce(advance_payment, 0) > 0)::int as anticipos
      from public.orders group by 1
  ), periodos as (
    select p from u union select p from n union select p from o
  )
  select
    pe.p,
    coalesce(u.n, 0),
    coalesce(n.n, 0),
    coalesce(o.clientes, 0),
    coalesce(o.total, 0),
    coalesce(o.completados, 0),
    coalesce(o.anticipos, 0)
  from periodos pe
  left join u on u.p = pe.p
  left join n on n.p = pe.p
  left join o on o.p = pe.p
  order by pe.p desc
  limit p_limite;
end;
$$;

revoke all on function public.panel_serie(text, int) from public;
grant execute on function public.panel_serie(text, int) to authenticated;

-- ---------- 3. NEGOCIOS POR COMUNA ----------
-- Devuelve LAS 22 COMUNAS, incluidas las que están en cero, más una fila con
-- `comuna is null` para los que no cayeron en ninguna.
--
-- Las dos cosas a propósito. Una comuna sin negocios no es un hueco del mapa:
-- es exactamente donde hace falta un facilitador, que es la unidad de adopción
-- del proyecto. Y esconder los «sin clasificar» haría que los números del mapa
-- no sumaran el total, que es peor que enseñar el hueco.
create or replace function public.panel_por_comuna()
returns table (comuna int, negocios int, verificados int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_equipo_conecta() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  return query
  select
    c.n,
    count(b.id)::int,
    count(b.id) filter (where b.verification_status = 'verified')::int
  from generate_series(1, 22) as c(n)
  left join public.businesses b on b.comuna = c.n and b.is_active
  group by c.n

  union all

  select
    null::int,
    count(*)::int,
    count(*) filter (where verification_status = 'verified')::int
  from public.businesses
  where is_active and comuna is null;
end;
$$;

revoke all on function public.panel_por_comuna() from public;
grant execute on function public.panel_por_comuna() to authenticated;

-- ---------- 4. RESEÑAS NEGATIVAS ----------
-- Una o dos estrellas. Para que el equipo vea dónde hay un problema antes de
-- que llegue como PQR.
--
-- Devuelve el negocio y el texto, NO quién la escribió. Las reseñas ya son
-- públicas (`reviews_select_public`), así que el texto no expone nada nuevo;
-- el nombre del cliente sí sería información que el panel no necesita para
-- hacer su trabajo.
create or replace function public.panel_resenas_negativas(p_limite int default 20)
returns table (
  review_id uuid,
  negocio_id uuid,
  negocio text,
  rating int,
  comentario text,
  creada_en timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_equipo_conecta() then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  if p_limite is null or p_limite < 1 or p_limite > 100 then
    raise exception 'limite fuera de rango' using errcode = '22023';
  end if;

  return query
  select r.id, b.id, b.name, r.rating, r.comment, r.created_at
    from public.reviews r
    join public.businesses b on b.id = r.business_id
   where r.rating <= 2
   order by r.created_at desc
   limit p_limite;
end;
$$;

revoke all on function public.panel_resenas_negativas(int) from public;
grant execute on function public.panel_resenas_negativas(int) to authenticated;

-- =====================================================================
-- COMPROBACIÓN
-- =====================================================================
-- Corriendo esto desde el editor SQL se ve el resultado porque el editor es
-- superusuario. La prueba de verdad es desde la aplicación: una cuenta que NO
-- esté en equipo_conecta tiene que recibir 42501.
--
--   select * from public.panel_resumen();
--   select * from public.panel_serie('month', 6);
--   select * from public.panel_por_comuna() where negocios > 0;
--   select * from public.panel_resenas_negativas();
