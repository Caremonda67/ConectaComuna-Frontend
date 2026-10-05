# Conecta Comuna — Documentación Técnica del Backend

**Servicio:** API REST de Conecta Comuna  
**Entorno de ejecución:** Node.js v20+ (Módulos ESM)  
**Framework:** Express v4.19.2  
**Base de datos y Autenticación:** PostgreSQL en Supabase  
**Despliegue:** Render Web Service  

---

## 1. Arquitectura del Servicio

El backend está concebido como una capa intermedia entre las aplicaciones cliente y la base de datos relacional. Aunque el frontend puede comunicarse directamente con Supabase mediante Row Level Security (RLS) en flujos de lectura pública, esta API REST centraliza las operaciones sensibles, las validaciones de negocio complejas y la orquestación administrativa mediante credenciales seguras de servidor (`SUPABASE_SERVICE_ROLE_KEY`).

### Estructura del código fuente
```text
backend/
├── .env.example              # Plantilla de variables de entorno
├── package.json              # Configuración y dependencias ESM
├── README.md                 # Guía básica de instalación
├── schema.sql                # Definición DDL de tablas, tipos y triggers
└── src/
    ├── server.js             # Punto de entrada y montaje de rutas
    ├── config/
    │   ├── auth.js           # Middleware de extracción y validación de JWT
    │   └── supabase.js       # Inicialización del cliente Supabase Admin
    └── routes/
        ├── auth.js           # Registro y verificación de sesión
        ├── businesses.js     # Catálogo, consulta geográfica y edición
        ├── orders.js         # Creación y ciclo de vida de pedidos
        ├── reviews.js        # Calificaciones vinculadas a pedidos
        └── salud.js          # Monitor de salud del servicio (healthcheck)
```

---

## 2. Decisiones Técnicas de Arquitectura (ADRs)

### ADR-B01: Adopción de arquitectura híbrida (Express + Supabase BaaS)
- **Contexto:** Necesitábamos velocidad de desarrollo para el concurso sin sacrificar la seguridad de las reglas de negocio.
- **Decisión:** Usar Supabase para el almacenamiento de datos relacionales, autenticación y subida de archivos (Storage), mientras que Express expone una API REST tradicional para los flujos que requieren validación estricta de servidor.
- **Consecuencias:** Se reduce la carga de programar autenticación desde cero y se mantiene el control total sobre la lógica de negocio y las restricciones relacionales.

### ADR-B02: Validación de sesiones mediante `auth.getUser(token)`
- **Contexto:** Se requería verificar la autenticidad de los tokens Bearer JWT enviados por el cliente sin compartir claves secretas en el código.
- **Decisión:** El helper `usuarioDesdePeticion(req)` extrae la cabecera `Authorization`, recupera el token y lo valida directamente contra la API de Supabase Auth mediante el método nativo `claveSupabase.auth.getUser(token)`. Posteriormente, consulta la tabla `public.profiles` para obtener el tipo de cuenta (`account_type`) registrado en base de datos.
- **Consecuencias:** Si un token es revocado, expira o es manipulado, la petición se rechaza con código HTTP 401 sin consultar tablas adicionales.

### ADR-B03: Soporte para rol Facilitador y sincronización por triggers
- **Contexto:** Los adultos mayores y emprendedores con baja alfabetización digital no pueden gestionar su perfil de forma autónoma.
- **Decisión:** Incorporar el valor `'facilitador'` en el tipo enumerado `account_type` de Postgres y en la lista blanca de registro en `src/routes/auth.js`. La creación del perfil no se realiza manualmente en el endpoint: se delega a la función disparadora (trigger) `handle_new_user()` en PostgreSQL, la cual se ejecuta tras cada inserción en `auth.users`.
- **Consecuencias:** Se garantiza consistencia atómica entre la tabla interna de autenticación y la tabla pública de perfiles, evitando registros huérfanos.

### ADR-B04: Calificación condicionada a pedidos completados
- **Contexto:** En directorios abiertos es común que se publiquen reseñas falsas para inflar o perjudicar la reputación de los negocios.
- **Decisión:** El endpoint `POST /api/reviews` exige obligatoriamente un `order_id` válido. La base de datos y el controlador verifican que dicho pedido exista, pertenezca al cliente autenticado, corresponda al negocio evaluado y se encuentre en estado `'completed'`. Adicionalmente, una restricción de unicidad (`UNIQUE (order_id)`) impide calificar más de una vez un mismo pedido.
- **Consecuencias:** La calificación promedio (`rating_avg`) refleja transacciones reales comprobadas en la comunidad.

---

## 3. Catálogo de Endpoints (Referencia de API)

### 3.1 Módulo de Salud
#### `GET /api/salud`
- **Acceso:** Público.
- **Descripción:** Verifica que el servidor Express esté activo y respondiendo.
- **Respuesta 200 OK:**
  ```json
  {
    "estado": "ok",
    "servicio": "conecta-comuna-api"
  }
  ```

---

### 3.2 Módulo de Autenticación
#### `POST /api/auth/registro`
- **Acceso:** Público.
- **Descripción:** Registra una cuenta en Supabase Auth y asigna metadatos iniciales.
- **Cuerpo de la petición (JSON):**
  ```json
  {
    "email": "vecino@comuna.org",
    "password": "Password123!",
    "account_type": "business",
    "full_name": "Taller de Costura Doña Marta",
    "phone": "3001234567",
    "neighborhood": "San Javier"
  }
  ```
- **Respuesta 201 Created:**
  ```json
  {
    "id": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "email": "vecino@comuna.org",
    "account_type": "business"
  }
  ```
- **Errores posibles:**
  - `400 Bad Request`: `email` o `password` ausentes, o correo ya registrado.

#### `GET /api/auth/mi-cuenta`
- **Acceso:** Autenticado (Cabecera `Authorization: Bearer <token>`).
- **Descripción:** Devuelve la información del usuario en sesión y su tipo de cuenta.
- **Respuesta 200 OK:**
  ```json
  {
    "id": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "email": "vecino@comuna.org",
    "account_type": "business",
    "full_name": "Taller de Costura Doña Marta"
  }
  ```
- **Errores posibles:**
  - `401 Unauthorized`: Token ausente, vencido o inválido.

---

### 3.3 Módulo de Negocios
#### `GET /api/businesses`
- **Acceso:** Público.
- **Parámetros de consulta (Query params):**
  - `category` (opcional): Filtro por slug de categoría (ej. `costura`, `comida`).
  - `q` (opcional): Término de búsqueda por nombre o barrio.
- **Respuesta 200 OK:**
  ```json
  [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Panadería El Trébol",
      "description": "Pan fresco todos los días desde las 6 AM.",
      "category": "comida",
      "neighborhood": "El Salado",
      "photos": ["https://.../foto1.jpg"],
      "lat": 6.2518,
      "lng": -75.5636,
      "rating_avg": 4.8,
      "rating_count": 12,
      "is_active": true
    }
  ]
  ```

#### `GET /api/businesses/:id`
- **Acceso:** Público.
- **Descripción:** Detalle completo de un negocio con sus reseñas asociadas.
- **Respuesta 200 OK:**
  ```json
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "owner_id": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "name": "Panadería El Trébol",
    "description": "Panadería tradicional con opciones al por mayor.",
    "category": "comida",
    "phone": "3119876543",
    "whatsapp": "3119876543",
    "address": "Calle 40 # 105-12",
    "neighborhood": "El Salado",
    "lat": 6.2518,
    "lng": -75.5636,
    "photos": ["https://.../foto1.jpg"],
    "hours": [
      { "day": 1, "opens": "06:00", "closes": "20:00", "closed": false }
    ],
    "rating_avg": 4.8,
    "rating_count": 12,
    "is_active": true,
    "reviews": [
      {
        "id": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
        "rating": 5,
        "comment": "Excelente atención y entrega rápida.",
        "created_at": "2026-09-20T14:30:00Z",
        "client": {
          "full_name": "Carlos Restrepo",
          "avatar_url": null
        }
      }
    ]
  }
  ```
- **Errores posibles:**
  - `404 Not Found`: Negocio no existente.

#### `POST /api/businesses`
- **Acceso:** Autenticado (Rol `business`).
- **Descripción:** Crea un nuevo emprendimiento vinculado al usuario actual.
- **Cuerpo de la petición (JSON):**
  ```json
  {
    "name": "Confecciones Marta",
    "description": "Arreglo de prendas y uniformes escolares.",
    "category": "costura",
    "phone": "3001234567",
    "whatsapp": "3001234567",
    "address": "Carrera 92 # 34-10",
    "neighborhood": "San Javier",
    "lat": 6.2531,
    "lng": -75.5689,
    "photos": [],
    "hours": []
  }
  ```
- **Respuesta 201 Created:** Objeto JSON con el registro creado.
- **Errores posibles:**
  - `400 Bad Request`: Faltan campos obligatorios (`name`, `category`, `lat`, `lng`).
  - `401 Unauthorized`: Token no proporcionado.
  - `403 Forbidden`: El usuario no tiene rol `business`.

#### `PATCH /api/businesses/:id`
- **Acceso:** Autenticado (Dueño del negocio o facilitador autorizado).
- **Descripción:** Modifica parcialmente los datos del emprendimiento.
- **Cuerpo de la petición (JSON):** Uno o varios campos de la lista permitida (`name`, `description`, `phone`, `photos`, `hours`, etc.).
- **Respuesta 200 OK:** Registro actualizado.
- **Errores posibles:**
  - `403 Forbidden`: El usuario no es el dueño ni cuenta con autorización.
  - `404 Not Found`: Negocio no encontrado.

---

### 3.4 Módulo de Pedidos
#### `POST /api/orders`
- **Acceso:** Autenticado.
- **Descripción:** Registra una solicitud de pedido barrial.
- **Cuerpo de la petición (JSON):**
  ```json
  {
    "business_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "title": "2 docenas de empanadas",
    "description": "Para entregar el sábado a las 4 PM.",
    "scheduled_for": "2026-10-10T16:00:00Z",
    "price_estimate": 36000
  }
  ```
- **Respuesta 201 Created:** Objeto de la orden con estado inicial `'pending'`.
- **Errores posibles:**
  - `400 Bad Request`: `business_id` o `title` faltantes.
  - `403 Forbidden`: Intento de realizar un pedido al propio negocio.

#### `GET /api/orders`
- **Acceso:** Autenticado.
- **Descripción:** Devuelve la lista de pedidos asociados al usuario. Si la cuenta es de tipo `business`, lista los pedidos recibidos por su comercio; si es `client`, lista los pedidos emitidos.
- **Respuesta 200 OK:** Arreglo de órdenes con datos enriquecidos del cliente o negocio.

#### `PATCH /api/orders/:id/status`
- **Acceso:** Autenticado (Cliente o Dueño según transición de estado).
- **Descripción:** Actualiza el ciclo de vida del pedido (`pending` -> `accepted` -> `in_progress` -> `completed` o `cancelled`).

---

### 3.5 Módulo de Reseñas
#### `POST /api/reviews`
- **Acceso:** Autenticado (Cliente).
- **Cuerpo de la petición (JSON):**
  ```json
  {
    "order_id": "4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
    "business_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "rating": 5,
    "comment": "Puntuales y excelente sabor."
  }
  ```
- **Respuesta 201 Created:** Objeto de reseña guardado.
- **Errores posibles:**
  - `400 Bad Request`: `rating` fuera del rango 1-5 o reseña duplicada para la misma orden.
  - `403 Forbidden`: La orden no pertenece al cliente o no tiene estado `'completed'`.

---

## 4. Esquema de Base de Datos Relacional (PostgreSQL)

El esquema reside en Supabase y sigue convenciones `snake_case` con integridad referencial estricta:

```sql
-- Tipos enumerados
CREATE TYPE account_type AS ENUM ('client', 'business', 'facilitador');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- Tabla de perfiles sincronizada con auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  account_type account_type NOT NULL DEFAULT 'client',
  neighborhood TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de negocios
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  neighborhood TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  hours JSONB NOT NULL DEFAULT '[]',
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scheduled_for TIMESTAMPTZ,
  price_estimate NUMERIC(10,2),
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de reseñas vinculadas
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disparador para crear el perfil automáticamente tras el registro
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Vecino'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'neighborhood',
    COALESCE((new.raw_user_meta_data->>'account_type')::account_type, 'client')
  );
  RETURN new;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Variables de Entorno y Despliegue en Producción

El backend se encuentra configurado para ejecutarse en Render como un servicio web de Node.js.

### Archivo `.env` requerido:
```ini
PORT=4000
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
FRONTEND_URL=https://conecta-comuna.vercel.app
```

### Comandos de producción:
- **Build command:** `npm install`
- **Start command:** `node src/server.js`
- **Healthcheck path:** `/api/salud`
