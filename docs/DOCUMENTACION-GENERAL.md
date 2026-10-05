# Conecta Comuna — Documentación General del Sistema

**Proyecto:** Conecta Comuna · Directorio digital barrial para micro-emprendedores  
**Concurso:** Fedesoft 2026 · Categoría Inclusión y Bienestar  
**Metodología:** SCRUM (5 Sprints · 1 de septiembre al 3 de octubre de 2026)  
**Equipo:** 5 integrantes (3 Frontend + 2 Backend)  

---

## 1. Visión del Proyecto y Contexto Social

Conecta Comuna es una plataforma web desarrollada para conectar a los micro-emprendedores de la comuna (vendedores de comida, artesanos, talleres de confección, cerrajería, servicios de belleza y oficios tradicionales) con clientes y compradores de su propio sector. 

Durante el trabajo de campo detectamos que muchas plataformas de comercio electrónico y aplicaciones de entrega imponen barreras de entrada altas:
1. Comisiones por venta que reducen el margen de ganancia de pequeños talleres.
2. Interfaces complejas que exigen experiencia digital avanzada.
3. Métodos de pago bancarizados obligatorios en sectores donde predomina el efectivo.

Conecta Comuna resuelve esta brecha ofreciendo un canal directo de visibilidad barrial, contacto directo por WhatsApp sin intermediarios, pedidos locales organizados y acompañamiento técnico a través de líderes comunitarios (Facilitadores).

---

## 2. Investigación de Campo y Validación de Necesidades (Fase 0)

Siguiendo la metodología de desarrollo orientada a problemas reales, durante el Sprint 0 (del 3 al 7 de septiembre de 2026) realizamos una jornada de encuestas y entrevistas directas con micro-emprendedores en territorio.

### Datos recolectados en campo

| Marca temporal | Nombre del emprendedor | Edad | Actividad | Tiempo activo | ¿Interés en entregas cercanas? | ¿Aprovecharía opción de escalar? | ¿Dificultad con tecnología? | Mayor obstáculo para vender | Apoyo tecnológico solicitado |
|---|---|---|---|---|---|---|---|---|---|
| 2026-09-03 | Miles Andrés Lemus Banguera | 19 | Servicio | 1 año | Sí | Sí | No | Crear contenido para publicidad | Marketing y difusión |
| 2026-09-04 | Luis Jose Armando Espinosa Tombe | 46 | Producto | > 2 años | Sí | Sí | Sí | Variabilidad e inconstancia de clientes | Conectar con más compradores |
| 2026-09-04 | Ana Julieth Buila | 23 | Servicio (Peinados) | 1 año | Sí | Sí | Sí | Conseguir clientes en el barrio | Acercarse a clientes para ofrecer servicios |
| 2026-09-07 | Alex David Anchico Micolta | 19 | Servicio | 1 año | Sí | Sí | No | Confianza de los clientes | Aplicación para captar clientela |

### Análisis metodológico y deducciones lógicas

Aunque la muestra inicial consta de 4 casos de estudio en profundidad, la distribución demográfica y de oficios refleja fielmente la realidad del sector informal:

1. **Aceptación unánime del comercio de proximidad (100%):**  
   Los 4 emprendedores encuestados confirmaron su disposición a recibir pedidos y coordinar entregas con vecinos cercanos, validando directamente el desarrollo del buscador por barrio, el cálculo de distancia y el selector de ubicación geográfica.

2. **Deseo de crecimiento y venta a escala (100%):**  
   Todos manifestaron interés en ampliar su producción si contaran con los canales adecuados. Esta respuesta fundamentó la inclusión del atributo "Venta al por mayor" (`vende_por_mayor`) en el perfil de cada negocio.

3. **Brecha digital generacional y de experiencia (50%):**  
   La mitad de los entrevistados (Luis Jose, 46 años, y Ana Julieth, 23 años) afirmó explícitamente que se le dificulta el uso de la tecnología. Esto demostró que una interfaz web convencional no es suficiente: de aquí nació el **rol del Facilitador Comunitario**, que permite a un familiar o líder comunal registrar y administrar el catálogo del emprendedor mediante un código de apadrinamiento seguro.

4. **El problema de la confianza vecinal:**  
   Alex David (19 años) señaló que su mayor barrera es "la confianza de los clientes". Para responder a esta necesidad, diseñamos un esquema de tres niveles de confianza:
   - Nivel 1: Verificación de identidad con prueba de vida local en el navegador (`face-api.js`).
   - Nivel 2: Sello de Verificación en Territorio otorgado presencialmente por líderes comunales.
   - Nivel 3: Calificaciones y reseñas comunitarias asociadas a pedidos completados.

5. **Difusión y publicidad simplificada:**  
   Miles Andrés y Ana Julieth indicaron que les cuesta crear contenido y acercarse a nuevos compradores. La plataforma resuelve esto centralizando la oferta por categorías claras (ej. "belleza", "confección", "comida"), permitiendo que el cliente encuentre el oficio en tres toques sin necesidad de que el vendedor maneje campañas complejas de redes sociales.

---

## 3. Metodología de Desarrollo: SCRUM

El proyecto se ejecutó en 5 ciclos de trabajo de una semana cada uno:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CRONOGRAMA DE SPRINTS (1 de septiembre - 3 de octubre de 2026)              │
├───────────────┬──────────────────────────────────────────┬──────────────────┤
│ Sprint        │ Foco principal                           │ Estado           │
├───────────────┼──────────────────────────────────────────┼──────────────────┤
│ Sprint 0      │ Investigación Fase 0, diseño relacional, │ Completado       │
│ (1 - 7 sept)  │ contratos de API y setup de repositorios │                  │
├───────────────┼──────────────────────────────────────────┼──────────────────┤
│ Sprint 1      │ Autenticación, perfiles y diferenciación │ Completado       │
│ (8 - 14 sept) │ de roles (cliente, negocio, facilitador) │                  │
├───────────────┼──────────────────────────────────────────┼──────────────────┤
│ Sprint 2      │ Gestión de productos, horarios, fotos y  │ Completado       │
│ (15 - 21 sept)│ catálogo público con filtros             │                  │
├───────────────┼──────────────────────────────────────────┼──────────────────┤
│ Sprint 3      │ Geolocalización con Leaflet, búsqueda    │ Completado       │
│ (22 - 28 sept)│ barrial y enlace directo a WhatsApp      │                  │
├───────────────┼──────────────────────────────────────────┼──────────────────┤
│ Sprint 4      │ Sistema de reseñas, sellos de territorio,│ Completado       │
│ (29 s - 3 oct)│ pruebas con datos reales y documentación │                  │
└───────────────┴──────────────────────────────────────────┴──────────────────┘
```

### Organización del equipo
- **Coordinador y Backend Principal:** Arquitectura de endpoints, diseño de esquemas en PostgreSQL y políticas RLS.
- **Backend de Soporte:** Gestión de triggers, configuración de Supabase y pruebas de integración.
- **Frontend Lead:** Arquitectura de vistas en React 19, enrutador y gestión del estado de autenticación.
- **Frontend UI/UX:** Maquetación con Tailwind CSS, accesibilidad móvil y diseño de tarjetas.
- **Frontend Integrador:** Integración de Leaflet, selector de mapas y biometría local con `face-api.js`.

---

## 4. Arquitectura General del Sistema

El sistema implementa una arquitectura desacoplada de dos capas apoyada en servicios en la nube:

```
┌───────────────────────────────────────────────────────────┐
│ CAPA DE PRESENTACIÓN (Frontend SPA)                       │
│ React 19 + TypeScript + Vite + Tailwind CSS               │
│ - Desplegado en Vercel                                    │
│ - Interfaz responsive adaptada a celulares de gama media  │
│ - Carga diferida de mapas (LazyMap)                       │
│ - Almacenamiento local de respaldo (demoBackend)          │
└─────────────────────────────┬─────────────────────────────┘
                              │
               Peticiones HTTP con Bearer JWT
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ CAPA DE SERVICIOS (Backend REST API)                      │
│ Node.js v20+ con Express (módulos ESM)                    │
│ - Desplegado en Render                                    │
│ - Endpoints de autenticación, negocios, pedidos y reseñas │
│ - Validación de identidad mediante cliente Supabase Admin │
└─────────────────────────────┬─────────────────────────────┘
                              │
               Conexión SDK @supabase/supabase-js
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ BASE DE DATOS Y SERVICIOS EN LA NUBE (Supabase BaaS)      │
│ - PostgreSQL con Row Level Security (RLS)                 │
│ - Supabase Auth (gestión de sesiones y tokens JWT)        │
│ - Supabase Storage (almacenamiento de fotos de negocios)  │
│ - Triggers pl/pgsql para creación automática de perfiles  │
└───────────────────────────────────────────────────────────┘
```

---

## 5. Matriz de Roles y Capacidades

| Capacidad | Cliente | Emprendedor | Facilitador | Administrador |
|---|:---:|:---:|:---:|:---:|
| Explorar catálogo y filtrar por categoría | Sí | Sí | Sí | Sí |
| Buscar negocios por cercanía o barrio | Sí | Sí | Sí | Sí |
| Contactar al emprendedor vía WhatsApp | Sí | Sí | Sí | Sí |
| Iniciar solicitud de pedido desde la web | Sí | No (a sí mismo) | Sí | Sí |
| Crear y calificar reseñas (con pedido completado) | Sí | No (a sí mismo) | Sí | No |
| Crear y gestionar perfil de negocio propio | No | Sí | No | Sí |
| Publicar productos, fotos, horarios y precios | No | Sí | Sí (apadrinado) | Sí |
| Vincular emprendedores mediante código de apadrinamiento | No | No | Sí | Sí |
| Editar catálogo de emprendedores apadrinados | No | No | Sí | Sí |
| Realizar prueba de vida facial (liveness) | Sí | Sí | Sí | Sí |
| Otorgar Sello de Verificación en Territorio | No | No | Sí | Sí |
| Moderar contenido y suspender cuentas | No | No | No | Sí |

---

## 6. Guía de Puesta en Marcha Rápida (Evaluadores y Jurados)

### Prerrequisitos
- Node.js versión 20.x o superior.
- Git instalado.

### 1. Ejecución del Frontend
```bash
cd frontend
npm install
npm run dev
```
La aplicación quedará disponible en `http://localhost:5173`.

> **Nota para evaluadores:** La aplicación detecta automáticamente si las variables de entorno de Supabase están configuradas. En caso de no contar con conexión a la nube, activa el modo de demostración local con datos precargados para permitir la navegación completa sin configuraciones adicionales.

### 2. Ejecución del Backend
```bash
cd backend
npm install
npm run dev
```
La API quedará escuchando en `http://localhost:4000`. Endpoint de comprobación: `http://localhost:4000/api/salud`.

---

## 7. Cumplimiento de Criterios de Evaluación

- **Metodología (15 pts):** Planificación SCRUM documentada, backlog de historias de usuario con criterios de aceptación y 5 sprints ejecutados en tiempo y forma.
- **Uso de Herramientas (15 pts):** Control de versiones en GitHub con ramas limpias, Vite, TypeScript estricto, PostgreSQL con RLS y Tailwind CSS.
- **Diseño y Experiencia de Usuario (25 pts):** Enfoque centrado en la accesibilidad barrial: contraste visual superior a WCAG AA, áreas táctiles amplias (mínimo 44px), flujo de apadrinamiento asistido y modo de operación sin bloqueo por red.
- **Solución y Resultados (15 pts):** Aplicación funcional de punta a punta que aborda los dolores reales expresados por los emprendedores encuestados en territorio.
