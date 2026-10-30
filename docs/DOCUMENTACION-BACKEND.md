# Documentación técnica del backend

Última revisión: 29 de octubre de 2026.

## Qué es este servicio

Una API de Express con tres rutas. No es el backend del CRUD: el frontend habla con Supabase directamente y las tablas se protegen con RLS. Este servicio existe para lo que la base no puede hacer sin dejar una llave a la vista:

1. **Hablar con Gemini** sin que la clave viaje en el bundle del navegador.
2. **Resolver el QR del pacto** sin abrir la tabla de pedidos a cualquiera.
3. **Decir que está vivo**, que es lo que consulta Render cada poco.

Todo lo demás (perfiles, negocios, pedidos, reseñas, reportes, direcciones) va por PostgREST con las políticas de `supabase/schema.sql`. Esa es la decisión, no una etapa intermedia.

## Estructura

```text
src/
  server.js              arranque, CORS, límites, 404 y manejo de errores
  config/
    supabase.js          cliente con la llave de servicio
    limites.js           techos por IP (general y del asistente)
  middleware/
    errores.js           envolver() para rutas async y el 500 en JSON
  routes/
    salud.js             GET /api/salud
    orders.js            GET /api/orders/verificar/:codigo
    ai.js                POST /api/ai/chat
```

## Las tres rutas

| Método | Ruta | Qué hace | Quién la usa |
|---|---|---|---|
| GET | `/api/salud` | `{ estado: "ok" }`. Queda fuera del límite por IP | Render (health check) y el despertador del propio servicio |
| GET | `/api/orders/verificar/:codigo` | Llama a `verificar_pedido_publico` y devuelve el pacto con el nivel de detalle que decide la base: `participante` si quien mira es parte, `publico` si no | La página del QR y el asistente |
| POST | `/api/ai/chat` | Motor de respaldo del asistente: intenciones, negocios reales, códigos de pacto. Si hay `GEMINI_API_KEY` y la consulta es abierta, llama a Gemini en cascada | El chat del asistente |

Los pactos de ejemplo (`CC-DEMO2026`, `CC-ORD-1`, `CC-ORD-2`) los resuelve el propio `orders.js` antes de consultar la base, y salen marcados con `ejemplo: true`.

## Lo que no está aquí

El CRUD vive en PostgREST. Eso significa que **ninguna de las tres rutas pide token**: son públicas a propósito y lo único que las separa de los datos es lo que la base decide por función. Los permisos de escritura están en las políticas de RLS y en las funciones `security definer`, no en Express.

Hubo cuatro routers más (`auth`, `businesses`, `reviews`, `reports`, 434 líneas) que nadie llamaba: el frontend ya hacía esas operaciones contra Supabase. Se retiraron el 29 de octubre porque mantenían dos versiones de las mismas reglas, y en el caso de reportes la de Express contradecía a la de la base. La moderación de reportes la hace el equipo desde `/panel/equipo`, con `es_equipo_conecta()` como única puerta.

## Decisiones

**ADR-01. API delgada sobre Supabase.** El navegador escribe directo en Postgres. La alternativa, mandar todo por Express, obligaba a duplicar cada regla en dos sitios y a mantener dos clientes. Se paga con que la llave anónima viaja en el bundle, y eso se compensa con RLS y con permisos por columna.

**ADR-02. La llave de servicio nunca sale del servidor.** `SUPABASE_SERVICE_ROLE_KEY` solo existe en Render. Se usa para resolver funciones y para el motor del asistente. Las rutas que la usaban con lógica propia se retiraron justamente por eso: cada una era una puerta con la llave maestra.

**ADR-03. Los roles no se asignan desde la API.** El tipo de cuenta se siembra en `profiles` con el trigger `handle_new_user`, que solo admite `client` y `business`. Las cuentas de facilitador se crean a mano en `equipo_conecta`.

**ADR-04. Un pacto se verifica con una función, no con un endpoint que lea la tabla.** `verificar_pedido_publico` devuelve menos datos cuando quien pregunta no es parte: sin nombre, sin dirección y sin UUID. El nivel lo decide `auth.uid()` dentro de Postgres.

## Variables de entorno

```bash
PORT=4000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
FRONTEND_URL=https://tu-frontend.vercel.app
```

`GEMINI_API_KEY` es opcional: sin ella el asistente responde con el motor local, que usa los mismos negocios de la base.

## Despliegue

Render, plan gratuito, con `render.yaml` en la raíz del repositorio. `autoDeploy` toma `main`, así que un merge despliega sin tocar el panel. El servicio se duerme a los 15 minutos sin tráfico; el propio proceso se pinguea cada 10 minutos cuando `RENDER_EXTERNAL_URL` está presente.

## Cómo probarla

```bash
curl https://conectacomuna-backend-1fl5.onrender.com/api/salud
curl https://conectacomuna-backend-1fl5.onrender.com/api/orders/verificar/CC-DEMO2026
curl -X POST https://conectacomuna-backend-1fl5.onrender.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"busco un cerrajero","historial":[]}'
```

Pruebas del código puro: `npm test` (distancia entre coordenadas y lectura del JSON que devuelve el modelo).
