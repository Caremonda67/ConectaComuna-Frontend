# Conecta Comuna — Documentación Técnica del Frontend

**Aplicación:** Single Page Application (SPA) Conecta Comuna  
**Entorno y Compilación:** React 19.2 + TypeScript 5.9 + Vite 8.2  
**Estilos y Maquetación:** Tailwind CSS v3.4  
**Enrutamiento:** React Router DOM v7  
**Cartografía y Biometría:** Leaflet v1.9 + face-api.js  
**Despliegue:** Vercel  

---

## 1. Arquitectura de la Aplicación Cliente

La aplicación está diseñada bajo el paradigma de componentes desacoplados, fuertemente tipados y optimizados para dispositivos móviles con pantallas pequeñas y conexiones intermitentes.

### Estructura de carpetas
```text
frontend/src/
├── main.tsx                  # Inicialización y renderizado en DOM
├── router.tsx                # Configuración declarativa de rutas
├── index.css                 # Importación de Tailwind y fuentes
├── types/
│   └── index.ts              # Tipos del dominio (Business, Profile, Order, etc.)
├── lib/
│   ├── env.ts                # Variables de entorno y selector de modo demo
│   ├── supabase.ts           # Cliente Supabase tipado y manejo de sesión
│   ├── ubicacion.ts          # Coordenadas, distancias y geocodificación
│   └── utils.ts              # Formateadores de fecha, moneda y horarios
├── context/
│   └── AuthContext.tsx       # Proveedor global de sesión, perfil y rol activo
├── hooks/
│   ├── useAuth.ts            # Consumo de sesión y acciones de cuenta
│   ├── useGeolocation.ts     # Acceso al GPS del dispositivo con fallbacks
│   └── useNeighborhoodLocator.ts # Identificación automática del barrio
├── services/
│   ├── authService.ts        # Métodos de login, registro y cierre de sesión
│   ├── businessService.ts    # Búsqueda, filtros, fotos y edición de comercio
│   ├── demoBackend.ts        # Almacenamiento local simulado para modo offline
│   ├── demoDataService.ts    # Semillas de demostración con negocios barriales
│   ├── direccionesService.ts # Gestión de direcciones guardadas del cliente
│   ├── facilitadorService.ts # Códigos de vinculación y gestión asistida
│   └── ordersService.ts      # Envío y seguimiento de pedidos
├── components/
│   ├── auth/                 # FacialVerification, SocialAuthButtons, ProtectedRoute
│   ├── map/                  # LazyMap, BusinessMap, UbicacionPicker
│   ├── navigation/           # NavBar, BottomNav, RoleSwitch
│   └── ui/                   # Button, Field, Badges, Modal, iconos SVG
└── pages/
    ├── HomePage.tsx          # Portada comunitaria con accesos directos
    ├── ExplorePage.tsx       # Buscador con filtros por oficio y cercanía
    ├── BusinessDetailPage.tsx# Perfil del negocio, productos y botón WhatsApp
    ├── MapPage.tsx           # Vista cartográfica general de la comuna
    ├── HowItWorksPage.tsx    # Guía explicativa para vecinos y facilitadores
    ├── TratoSeguroPage.tsx   # Pacto de confianza comunal y 5 acuerdos de seguridad
    ├── OnboardingPage.tsx    # Asistente inicial tras el primer ingreso
    ├── FacilitatorDashboard.tsx # Panel de apadrinamiento comunitario
    ├── auth/                 # LoginPage, RegisterPage
    ├── business/             # DashboardPage, BusinessProfileEditor
    ├── client/               # ClientOrdersPage, ClientAddressesPage
    └── legal/                # TermsPage (Ley 1480 Art 53), PrivacyPage (Ley 1581)
```

---

## 2. Decisiones Técnicas de Arquitectura (ADRs)

### ADR-F01: Cumplimiento estricto del compilador de React 19
- **Contexto:** En versiones anteriores se detectaron advertencias de linter (`react(set-state-in-effect)`) al actualizar estados de formularios de forma síncrona dentro de `useEffect`, lo cual provocaba renderizados en cascada e impedía que el nuevo compilador de React 19 memorizara componentes automáticamente.
- **Decisión:** Refactorizamos los componentes de edición (como `BusinessProfileEditor`) extrayendo el formulario a un componente hijo `BusinessProfileEditorForm` controlado por clave declarativa (`key={activeBusiness?.id ?? 'nuevo'}`).
- **Consecuencias:** Cuando el negocio activo cambia o termina de cargarse desde el servidor, React destruye y remonta el formulario con su estado inicial en `useState`, eliminando todos los efectos secundarios síncronos. La base de código alcanza 0 advertencias en `oxlint`.

### ADR-F02: Modo Dual (Conexión Supabase + Respaldo Local `demoBackend`)
- **Contexto:** En ferias de emprendimiento o presentaciones ante jurados, las redes móviles pueden ser inestables o no disponer de conexión a internet.
- **Decisión:** Implementamos una bandera en `src/lib/env.ts` (`isDemoMode`). Si las credenciales de Supabase no están presentes o se activa el modo de prueba, los servicios redirigen las lecturas y escrituras hacia `demoBackend.ts`, el cual simula la persistencia en `localStorage` con retardos asíncronos idénticos a los de una red real.
- **Consecuencias:** La plataforma nunca se bloquea ni muestra pantallas en blanco ante fallos de conexión externa.

### ADR-F03: Cartografía ligera con carga diferida (`LazyMap`)
- **Contexto:** Las librerías de mapas pesadas pueden duplicar el peso del paquete JavaScript y congelar teléfonos de gama baja al abrir la portada.
- **Decisión:** Usar Leaflet junto a los mosaicos libres de OpenStreetMap, encapsulando la inicialización del mapa dentro de `LazyMap.tsx` mediante `React.lazy` y `Suspense`. Los polígonos y pines solo se cargan cuando el usuario ingresa a la pestaña del mapa o abre el selector de dirección.
- **Consecuencias:** El bundle inicial se reduce en más de 160 kB, acelerando la carga inicial en redes móviles 3G o 4G débiles.

### ADR-F04: Biometría local en navegador con `face-api.js`
- **Contexto:** Como identificamos en la encuesta con el emprendedor Alex David, "la confianza de los clientes" es la mayor barrera para vender. Se requería un mecanismo de verificación de identidad sin enviar fotografías biométricas a servidores externos por motivos de privacidad y costo.
- **Decisión:** Ejecutar `face-api.js` directamente en el navegador del cliente mediante modelos ligeros alojados en `/public/models/`. La prueba de vida (liveness) calcula en tiempo real la relación de aspecto de los ojos (Eye Aspect Ratio - EAR) en el canvas local para confirmar un parpadeo voluntario antes de otorgar el sello de verificación de nivel 1.
- **Consecuencias:** Cero transferencia de datos biométricos sensibles a la nube, funcionamiento sin costos de API externa y validación de identidad en menos de 3 segundos.

### ADR-F05: Enfoque mobile-first y accesibilidad barrial
- **Contexto:** Los datos de campo evidenciaron que el 50% de los emprendedores tiene dificultades con las aplicaciones complejas.
- **Decisión:** Establecer una altura mínima de 44px en todos los botones y campos interactivos, utilizar tipografía de alto contraste (paleta `ink` sobre fondo `cream`), evitar menús ocultos de varios niveles y proporcionar botones directos con el icono oficial de WhatsApp para coordinar pedidos con un solo toque.

---

## 3. Mapa de Rutas y Navegación

El enrutamiento está centralizado en `src/router.tsx` mediante `createBrowserRouter`:

| Ruta | Componente | Acceso | Propósito |
|---|---|---|---|
| `/` | `HomePage` | Público | Portada con oficios destacados, barra de búsqueda y accesos rápidos. |
| `/explorar` | `ExplorePage` | Público | Listado completo de negocios con filtro por categoría, calificación y radio. |
| `/negocio/:id` | `BusinessDetailPage` | Público | Ficha completa del emprendedor, fotos, productos, horarios y botón WhatsApp. |
| `/mapa` | `MapPage` | Público | Mapa interactivo con la ubicación aproximada de los comercios del sector. |
| `/como-funciona` | `HowItWorksPage` | Público | Guía ilustrada sobre el proyecto, los facilitadores y la seguridad. |
| `/login` | `LoginPage` | Público | Inicio de sesión con correo/contraseña o acceso social. |
| `/registro` | `RegisterPage` | Público | Formulario de registro seleccionando rol (`client`, `business`, `facilitador`). |
| `/onboarding` | `OnboardingPage` | Autenticado | Asistente de configuración de perfil y datos barriales. |
| `/panel` | `DashboardPage` | Autenticado | Panel administrativo del emprendedor (pedidos recibidos, catálogo propio). |
| `/negocio/editar` | `BusinessProfileEditor` | Emprendedor / Facilitador | Formulario para editar información, fotos, horarios y coordenadas del negocio. |
| `/facilitador/panel` | `FacilitatorDashboard` | Facilitador | Gestión de emprendedores apadrinados y vinculación con código de 6 dígitos. |
| `/pedidos` | `ClientOrdersPage` | Cliente | Historial de pedidos realizados por el vecino y acceso a calificación. |
| `/direcciones` | `ClientAddressesPage` | Cliente | Libreta de direcciones guardadas para completar pedidos de entrega sin volver a escribir los datos cada vez. |

---

## 4. Sistema de Diseño y Tokens Visuales

El diseño visual se apoya en Tailwind CSS y respeta la identidad cálida de los barrios populares colombianos:

### Paleta cromática oficial (`tailwind.config.ts`)
- **`brand` (Terracota y teja artesanal):**
  - `brand-500`: `#ea580c` (Color principal para botones de acción y llamadas clave).
  - `brand-600`: `#c2410c` (Estado hover y bordes de acento).
  - `brand-50`: `#fff7ed` (Fondos sutiles de selección).
- **`ink` (Tinta y legibilidad de texto):**
  - `ink-900`: `#0f172a` (Títulos principales y texto de máxima importancia).
  - `ink-600`: `#475569` (Subtítulos, descripciones secundarias y notas de ayuda).
  - `ink-200`: `#e2e8f0` (Bordes de tarjetas y separadores).
- **`cream` (Fondo cálido comunitario):**
  - `cream-50`: `#fafaf9` (Fondo general de la pantalla para evitar el blanco frío de hospital).
  - `cream-100`: `#f5f5f4` (Fondo de tarjetas y bloques informativos).
- **Estados:**
  - Verde esmeralda (`emerald-600`): Indicador de "Abierto ahora" y "Sello Verificado".
  - Ámbar (`amber-600`): Indicador de pedidos pendientes.
  - Rosa suave (`rose-600`): Mensajes de error y alertas de validación.

### Iconografía y micro-interacciones
- Se utiliza un sprite SVG optimizado (`/public/icons.svg`) junto a componentes seleccionados de `lucide-react`.
- El componente `RoleSwitch.tsx` permite al usuario con cuenta de negocio alternar entre la vista de vendedor y la vista de comprador sin tener que cerrar sesión.

---

## 5. Gestión del Estado y Servicios Desacoplados

### `AuthContext.tsx`
El contexto de autenticación administra de forma centralizada:
- `user`: Datos del usuario autenticado en Supabase.
- `profile`: Registro de la tabla `profiles` (nombre completo, teléfono, barrio, `account_type`).
- `business`: Emprendimiento perteneciente al usuario (si aplica).
- `activeRole`: Rol actual en pantalla (`client`, `business` o `facilitador`), facilitando la experiencia dual.
- `refresh()`: Función para reconsultar y actualizar el estado tras modificaciones en el perfil.

### Capa de Servicios
Toda la lógica de comunicación HTTP o consultas a base de datos se mantiene fuera de los componentes visuales:
- **`businessService.search(filters)`:** Construye consultas con ordenamiento por calificación, novedad o distancia euclidiana en kilómetros.
- **`facilitadorService.vincularNegocio(codigo)`:** Conecta a un facilitador con un negocio mediante código de verificación presencial.
- **`ordersService.create(order)`:** Genera solicitudes de pedido con estado inicial pendiente.

---

## 6. Pruebas de Calidad, Rendimiento y Despliegue

### Resultados de la auditoría técnica
- **Linter (`oxlint src`):** **0 advertencias, 0 errores** en los 60 archivos del proyecto. Se eliminaron antipatrones de `set-state-in-effect`.
- **Compilador TypeScript (`tsc -b`):** **0 errores**. Todos los contratos de props y retornos de funciones cuentan con tipado estricto.
- **Compilación de producción (`vite build`):**
  - Tiempo de construcción: **4.4 segundos**.
  - Fragmentación de dependencias (vendor chunking): Los módulos pesados (`react`, `supabase`, `map`) se dividen en archivos separados que el navegador almacena en caché de forma independiente, garantizando tiempos de carga inferiores a 1.5 segundos en visitas recurrentes.

### Configuración para Vercel (`vercel.json`)
La aplicación incluye reglas de reescritura para gestionar el enrutamiento del lado del cliente (SPA):
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
Esto asegura que rutas profundas como `/negocio/7c9e6679` se resuelvan correctamente al recargar la página.
