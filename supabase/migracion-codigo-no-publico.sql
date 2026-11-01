-- El código de apadrinamiento se leía sin tener cuenta.
--
-- `businesses` es de lectura pública porque el directorio tiene que verse sin
-- sesión, pero el permiso se dio sobre la tabla entera, y ahí dentro vive
-- `codigo_apadrinamiento`. Comprobado contra producción con la clave anónima,
-- que además viaja dentro del bundle del frontend:
--
--   GET /rest/v1/businesses?select=name,codigo_apadrinamiento
--   → 200  Costuras Doña Marta: "174673"
--
-- Ese código ES la autorización para apadrinar un negocio. La idea es que el
-- dueño lo entregue en mano; si cualquiera puede leerlo, deja de probar nada.
-- La función `vincular_facilitador_por_codigo` exige además una cuenta de
-- facilitador, así que el daño estaba acotado, pero el secreto no era secreto.
--
-- Mismo criterio que con el teléfono en migracion-perfiles-privados-v2.sql:
-- se concede por columnas en vez de sobre la tabla.
--
-- Las 29 columnas de abajo son las que hoy devuelve la API en producción menos
-- las dos del código. Si se añade una columna nueva a `businesses`, hay que
-- añadirla aquí también o no se verá en el directorio público.
--
-- Aplicar en el editor SQL de Supabase. Se puede correr dos veces.

revoke select on public.businesses from anon;

grant select (
  id, owner_id, name, category, description, phone, whatsapp, address,
  neighborhood, lat, lng, photos, hours, rating_avg, rating_count,
  completed_orders, report_count, services_catalog, is_active, created_at,
  verification_status, verification_by, verification_date, verification_note,
  verification_score, verification_selfie_url,
  wholesale_enabled, wholesale_min_order, wholesale_terms
) on public.businesses to anon;

-- El dueño necesita leer su propio código para pasárselo al facilitador, y lo
-- hace con sesión iniciada; la política de fila ya limita qué negocios ve.
-- Por eso a `authenticated` no se le quita nada.

-- Comprobación, para pegar después de aplicar:
--
--   select column_name from information_schema.column_privileges
--    where table_name = 'businesses' and grantee = 'anon'
--      and privilege_type = 'SELECT' and column_name like 'codigo%';
--
-- No debe devolver ninguna fila.
