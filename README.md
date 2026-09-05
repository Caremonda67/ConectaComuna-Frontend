# ConectaComuna · Frontend

Aplicación web que conecta a los habitantes de una comuna de Cali con los oficios y
servicios informales del barrio (costura, manicure, cerrajería, venta de ropa, ventas
ambulantes, etc.).

Este repositorio contiene **solo el frontend**. El backend (Supabase + API) vive en un
repositorio aparte; aquí está toda la capa de integración lista para conectarse.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción
```

Sin variables de entorno la app arranca en **modo demo** con datos locales
(`localStorage`), para no bloquear el desarrollo del frontend. Para conectar el backend
real basta copiar `.env.example` a `.env` y llenar:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

No hay que tocar ni un componente: los servicios detectan las credenciales y cambian de
adaptador automáticamente.

En modo demo puedes entrar con `user-cliente@demo.co` o `user-negocio@demo.co` y
cualquier contraseña.

## Estructura

```
src/
  components/
    business/   Tarjeta de negocio y barra de filtros
    layout/     Layout con navegación inferior y guarda de rutas
    map/        Mapa Leaflet + envoltorio lazy
    orders/     Tarjeta de pedido con transiciones de estado y reseña
    ui/         Botón, campos, skeletons, estados vacíos/error, estrellas, insignias
  context/      AuthContext (sesión, perfil, negocio, rol activo)
  data/         Catálogo de categorías y datos demo
  hooks/        useAuth, useAsync, useGeolocation
  lib/          env, cliente Supabase, utilidades (distancia, formato, reputación)
  pages/        Home, Explorar, Mapa, Detalle, auth/, client/, business/
  services/     authService, profileService, businessService, orderService, demoBackend
  types/        Tipos del dominio (espejo del esquema Postgres)
supabase/
  schema.sql    Tablas, políticas RLS, triggers y bucket de Storage esperados
```

## Contrato con el backend

`supabase/schema.sql` documenta lo que el frontend espera. Puntos clave:

- **`profiles`** guarda el `account_type`. No confiamos en `user_metadata` porque el
  usuario puede modificarlo; el metadata solo siembra la fila vía trigger
  `handle_new_user()`.
- **Rol dual.** Una cuenta `business` puede contratar servicios de otros negocios. El
  rol activo es estado de UI (`AuthContext`), no un permiso: la RLS de `orders` valida
  que quien inserta sea el `client_id` y que no se pida servicio a sí mismo.
- **Reputación calculada en el servidor.** `rating_avg`, `rating_count` y
  `completed_orders` se mantienen con triggers. Si se calcularan en el cliente, cualquiera
  podría inflar su reputación.
- **Reseñas verificadas.** La policy de `reviews` exige que exista un pedido propio en
  estado `completed`.
- **Storage.** Las fotos van a `business-photos/<uid>/<archivo>`; la policy valida que la
  primera carpeta sea el `auth.uid()`.

Si el backend define nombres distintos, el único archivo a ajustar es el servicio
correspondiente en `src/services/`.

## Sistema de diseño

La paleta viene del diseño entregado y vive como tokens `@theme` en `src/index.css`,
no como valores sueltos repartidos por los componentes. Cambiar un token repinta la app.

| Token | Valor | Uso |
| --- | --- | --- |
| `cream-50` | `#F9F8F2` | Fondo de la aplicación |
| `ink-900` | `#1A1A1A` | Texto principal |
| `brand-100` | `#CFE8C6` | Acentos, chips, insignias, fondos suaves |
| `brand-500` | `#6FB257` | Acción primaria (botones, enlaces, estrellas) |

`brand-500` es un verde medio **derivado** de `#CFE8C6`. El verde claro original sobre
crema no alcanza el contraste AA (4.5:1) para texto ni para botones sólidos, así que se
oscureció para las acciones y se reservó `brand-100` para superficies y acentos, que es
donde el diseño lo usa. La escala `ink-*` son neutros cálidos (no grises azulados) para
que armonicen con el crema.

Convenciones visuales:

- **Superficies**: clases `.card` y `.card-soft` (borde fino de 1px, sin sombra). El
  diseño no usa elevación, así que las sombras se eliminaron por completo.
- **Botones**: `rounded-full`. La variante destructiva es *outline*, no roja sólida, para
  no introducir un color fuera de paleta en una acción frecuente.
- **Inputs**: `rounded-[10px]` con borde `ink-200` y foco en `brand-500`.
- **Rojo/rosa**: solo en `ErrorState` y estados de pedido cancelado. Es el único color
  fuera de paleta y se mantiene porque señalar un error con verde sería ambiguo.
- **Iconografía**: `lucide-react`, trazo de 1.5–2px, sin emojis. Todos los iconos se
  declaran en un único módulo, `src/components/ui/icons.ts` (`CATEGORY_ICONS`,
  `BADGE_ICONS`, `UI_ICONS`), así que cambiar el set entero es tocar un archivo. Los
  componentes importan de ahí, no de `lucide-react`. Los logos de marca del pie de página
  son SVG en línea porque lucide no los incluye por licencia.

Sobre los pines del mapa: Leaflet exige una cadena de HTML, no un elemento de React. En
`BusinessMap` se lee el `iconNode` que lucide expone como prop (la descripción declarativa
de los trazados) y se serializa a SVG a mano, cacheado por categoría. Renderizar el icono
con React no sirve —`flushSync` se ignora dentro de un render en curso y el pin sale
vacío— e importar `react-dom/server` solo para esto añadía ~190 KB al bundle, inaceptable
para los usuarios de conexión lenta a los que apunta el proyecto.

## Decisiones técnicas

**Capa de servicios como frontera.** Todo acceso a datos pasa por `src/services/`. Los
componentes no conocen Supabase. Esto permitió el modo demo, facilita las pruebas y
protege de cambios de esquema.

**Filtrado en el servidor.** `businessService.search` traduce los filtros a la query de
Supabase (incluida una caja envolvente lat/lng antes del cálculo Haversine exacto) para no
bajar registros de más en conexiones lentas.

**Filtros en la URL.** La búsqueda usa `useSearchParams`: se puede compartir por WhatsApp
y el botón "atrás" del celular se comporta como el usuario espera.

**Sin estado global pesado.** Solo la sesión necesita ser global (Context). El resto son
datos de servidor manejados con `useAsync`. Zustand y TanStack Query están instalados por
si crecen las necesidades de caché, pero no se cargan innecesariamente.

## Librerías y por qué

| Librería | Motivo |
| --- | --- |
| `react-router-dom` | Rutas con code splitting y guardas |
| `react-hook-form` | Formularios sin re-render por tecla: clave en gama baja |
| `zod` + `@hookform/resolvers` | Validación declarativa reutilizable (celular colombiano, mínimos de descripción) |
| `leaflet` + `react-leaflet` | Mapas sin API key ni costo, con OpenStreetMap |
| `@supabase/supabase-js` | Auth, Postgres y Storage en un solo cliente |
| `tailwindcss` | Estilos utilitarios sin CSS muerto en el bundle |
| `zustand`, `@tanstack/react-query` | Disponibles para estado global/caché si el proyecto lo requiere |

## Rendimiento (conexiones lentas, gama baja)

- **Code splitting por ruta.** El primer render solo baja Home + layout.
- **Leaflet bajo demanda.** ~150 KB que solo descarga quien abre el mapa (`LazyMap`).
- **Chunks separados** para React, Supabase y el mapa: el navegador cachea los vendors
  entre despliegues.
- **`preferCanvas`** en Leaflet: menos nodos DOM al renderizar pines.
- **Imágenes** con `loading="lazy"`, `decoding="async"` y dimensiones fijas (evita CLS).
- **Fuentes del sistema**: cero descargas de tipografías.
- **`preconnect`** a los tiles de OpenStreetMap para ahorrar el handshake TLS.
- **Skeletons con la altura real** del contenido, para no provocar saltos de layout.

## Accesibilidad

- Enlace "Saltar al contenido" y navegación por landmarks (`header`, `main`, `nav`).
- Todos los campos con `<label>` real, `aria-describedby` y errores con `role="alert"`.
- Objetivos táctiles de mínimo 44 px (`min-h-11`).
- Iconos decorativos con `aria-hidden`; el significado siempre está en texto.
- Estrellas de calificación con equivalente textual para lectores de pantalla.
- `aria-pressed` en filtros y en el conmutador de rol; `aria-live` en el conteo de
  resultados.
- Respeto por `prefers-reduced-motion`.
- Foco visible garantizado en todo elemento interactivo.

## Estados de carga, error y vacíos

Cada vista cubre los cuatro casos: cargando (skeleton), error (`ErrorState` con
reintento), vacío (`EmptyState` con la acción sugerida) y con datos. El backend demo
simula latencia justamente para que estos estados no queden sin probar.

## Despliegue en Vercel

`vercel.json` reescribe todas las rutas a `index.html` (necesario para el router del
lado del cliente). Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en las
variables de entorno del proyecto de Vercel.
