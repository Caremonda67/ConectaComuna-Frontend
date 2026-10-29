-- ConectaComuna — que los contadores digan la verdad
--
-- `completed_orders`, `rating_avg` y `rating_count` los mantienen triggers a
-- partir de los pedidos y las reseñas reales. Pero las filas que sembramos al
-- principio traían valores escritos a mano para que la demostración se viera
-- viva, y esos valores nunca se corrigieron.
--
-- Costuras Doña Marta muestra 64 servicios finalizados y 4 reseñas. Un jurado
-- que divida pregunta de dónde salen los otros 60, y la respuesta honesta es
-- que no salen de ninguna parte. Si el número de la portada es de adorno, el
-- resto del tablero pierde credibilidad: justo al lado hay un sello firmado y
-- verificable, y el contraste lo deja peor.
--
-- Esto recalcula las tres cifras desde las filas que de verdad existen. No
-- inventa nada ni borra nada: solo deja de afirmar lo que no se puede probar.
--
-- La trayectoria anterior a la plataforma no se pierde: vive en la descripción
-- del negocio, donde es lo que es, algo que la persona declara ("más de 20
-- años cosiendo en el barrio"), no algo que la plataforma certifica.
--
-- Aplicar en la consola SQL de Supabase. Es idempotente: correrlo dos veces
-- da el mismo resultado.

-- ---------- 1. SERVICIOS FINALIZADOS ----------
update public.businesses b
   set completed_orders = (
     select count(*)
       from public.orders o
      where o.business_id = b.id
        and o.status = 'completed'
   );

-- ---------- 2. RESEÑAS ----------
update public.businesses b
   set rating_count = coalesce((
         select count(*)
           from public.reviews r
          where r.business_id = b.id
       ), 0),
       rating_avg = coalesce((
         select round(avg(r.rating)::numeric, 2)
           from public.reviews r
          where r.business_id = b.id
       ), 0);

-- ---------- 3. CÓMO QUEDÓ ----------
-- Las dos últimas columnas tienen que coincidir. Si no coinciden, algo más
-- está escribiendo esos contadores.
select b.name,
       b.completed_orders,
       b.rating_count,
       b.rating_avg,
       (select count(*) from public.orders o
         where o.business_id = b.id and o.status = 'completed') as pedidos_reales
  from public.businesses b
 order by b.completed_orders desc, b.name;
