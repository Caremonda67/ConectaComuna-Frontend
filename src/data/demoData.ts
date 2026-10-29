import type { Business, BusinessHours, FacilitadorNegocio, Order, Profile, Review } from '@/types'

const defaultHours = (): BusinessHours[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    opens: day === 0 ? null : '08:00',
    closes: day === 0 ? null : '18:00',
    closed: day === 0,
  }))

export const demoProfiles: Profile[] = [
  {
    id: 'user-cliente',
    full_name: 'Luisa Martínez',
    phone: '3001234567',
    avatar_url: null,
    account_type: 'client',
    neighborhood: 'El Rodeo',
    onboarding_completado: true,
    created_at: '2025-01-10T10:00:00Z',
  },
  {
    id: 'user-facilitador',
    full_name: 'Ana Ruiz',
    phone: '3201112233',
    avatar_url: null,
    account_type: 'facilitador',
    neighborhood: 'Antonio Nariño',
    onboarding_completado: true,
    created_at: '2025-02-01T09:30:00Z',
  },
  {
    id: 'user-negocio',
    full_name: 'Doña Marta Ocampo',
    phone: '3009876543',
    avatar_url: null,
    account_type: 'business',
    neighborhood: 'Antonio Nariño',
    onboarding_completado: true,
    created_at: '2024-11-02T10:00:00Z',
  },
  {
    id: 'user-unas',
    full_name: 'Kelly Jiménez',
    phone: '3145558899',
    avatar_url: null,
    account_type: 'business',
    neighborhood: 'El Rodeo',
    onboarding_completado: true,
    created_at: '2025-02-15T10:00:00Z',
  },
]

export const demoBusinesses: Business[] = [
  {
    id: 'biz-1',
    owner_id: 'user-negocio',
    name: 'Costuras Doña Marta',
    description:
      'Arreglo de ropa, bastas, cierres y confección a la medida. Más de 20 años cosiendo en el barrio, entrega en 24 horas.',
    category: 'costura',
    phone: '3009876543',
    whatsapp: '3009876543',
    address: 'Calle 48 #40-12',
    neighborhood: 'Antonio Nariño',
    lat: 3.4381,
    lng: -76.5241,
    photos: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=60',
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&q=60',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=60',
    ],
    hours: defaultHours(),
    rating_avg: 4.8,
    rating_count: 24,
    completed_orders: 61,
    verification_status: 'unverified',
    is_active: true,
    wholesale_enabled: true,
    wholesale_min_order: '3 prendas o arreglos',
    wholesale_terms: 'Tarifa preferencial para confección de uniformes de colegios y dotaciones.',
    services_catalog: [
      { id: 'srv-1', name: 'Basta / Ruedo de pantalón', price: 10000, description: 'Ajuste de largo a máquina o a mano según tela' },
      { id: 'srv-2', name: 'Cambio de cremallera o cierre', price: 15000, description: 'Incluye cremallera estándar y costura reforzada' },
      { id: 'srv-3', name: 'Entallado de camisa o blusa', price: 18000, description: 'Ajuste de mangas, costados y pinzas' },
    ],
    created_at: '2024-11-02T10:00:00Z',
  },
  {
    id: 'biz-2',
    owner_id: 'user-unas',
    name: 'Uñas de Kelly',
    description:
      'Manicure, pedicure, semipermanente y decoración. Atiendo a domicilio en la comuna sin costo adicional.',
    category: 'manicure',
    phone: '3145558899',
    whatsapp: '3145558899',
    address: 'Carrera 39 #47-08',
    neighborhood: 'El Rodeo',
    lat: 3.4342,
    lng: -76.5198,
    photos: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=60',
      'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=600&q=60',
    ],
    hours: defaultHours(),
    rating_avg: 4.6,
    rating_count: 12,
    completed_orders: 18,
    verification_status: 'unverified',
    is_active: true,
    services_catalog: [
      { id: 'srv-21', name: 'Manicure tradicional', price: 15000, description: 'Limpieza, limado, exfoliación y esmaltado' },
      { id: 'srv-22', name: 'Pedicure completo', price: 22000, description: 'Tratamiento de cutícula, durezas y esmaltado' },
      { id: 'srv-23', name: 'Semipermanente con diseño', price: 35000, description: 'Duración garantizada hasta 21 días' },
    ],
    created_at: '2025-02-15T10:00:00Z',
  },
  {
    id: 'biz-3',
    owner_id: 'user-cerrajero',
    name: 'Cerrajería El Rayo',
    description:
      'Cambio de guardas, apertura de puertas y copias de llaves. Servicio de urgencia 24 horas en la comuna.',
    category: 'cerrajeria',
    phone: '3172224466',
    whatsapp: null,
    address: 'Calle 52 #42-30',
    neighborhood: 'Nueva Floresta',
    lat: 3.4415,
    lng: -76.5266,
    photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=60'],
    hours: defaultHours().map((h) => ({ ...h, closed: false, opens: '00:00', closes: '23:59' })),
    rating_avg: 4.2,
    rating_count: 7,
    completed_orders: 9,
    verification_status: 'unverified',
    is_active: true,
    services_catalog: [
      { id: 'srv-31', name: 'Duplicado de llave tradicional', price: 5000, description: 'Copia inmediata en latón garantizada' },
      { id: 'srv-32', name: 'Apertura de puerta residencial', price: 40000, description: 'Servicio a domicilio en la comuna sin romper chapa' },
      { id: 'srv-33', name: 'Instalación de cerrojo de seguridad', price: 55000, description: 'Mano de obra para perforación y anclaje' },
    ],
    created_at: '2025-04-01T10:00:00Z',
  },
  {
    id: 'biz-4',
    owner_id: 'user-ropa',
    name: 'Ropa Americana Wendy',
    description:
      'Ropa americana por unidad y por bulto. Nuevos surtidos cada semana, se aceptan pedidos por WhatsApp.',
    category: 'ropa',
    phone: '3183334455',
    whatsapp: '3183334455',
    address: 'Carrera 41 #50-15',
    neighborhood: 'Antonio Nariño',
    lat: 3.4398,
    lng: -76.5182,
    photos: [
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=60',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=60',
    ],
    hours: defaultHours(),
    rating_avg: 4.9,
    rating_count: 31,
    completed_orders: 44,
    verification_status: 'unverified',
    is_active: true,
    wholesale_enabled: true,
    wholesale_min_order: '12 prendas o $100.000',
    wholesale_terms: 'Descuento del 30% a comerciantes del barrio en pacas surtidas.',
    services_catalog: [
      { id: 'srv-41', name: 'Lote de 12 camisetas surtidas', price: 90000, description: 'Tallas variadas para reventa' },
      { id: 'srv-42', name: 'Prenda individual seleccionada', price: 12000, description: 'Ropa americana de primera calidad' },
    ],
    created_at: '2024-08-20T10:00:00Z',
  },
  {
    id: 'biz-5',
    owner_id: 'user-cholado',
    name: 'Cholados Don Fabio',
    description:
      'Cholados, salpicón y raspado. Me ubico frente al parque los fines de semana y hago pedidos para eventos.',
    category: 'ambulante',
    phone: '3116667788',
    whatsapp: '3116667788',
    address: 'Parque principal, zona norte',
    neighborhood: 'El Rodeo',
    lat: 3.4321,
    lng: -76.5254,
    photos: [],
    hours: defaultHours(),
    rating_avg: 4.4,
    rating_count: 5,
    completed_orders: 6,
    verification_status: 'unverified',
    is_active: true,
    created_at: '2025-06-05T10:00:00Z',
  },
  {
    id: 'biz-6',
    owner_id: 'user-tec',
    name: 'TecnoFix Celulares',
    description:
      'Cambio de pantallas, baterías y liberación de equipos. Diagnóstico gratis y garantía de 3 meses.',
    category: 'tecnologia',
    phone: '3129990011',
    whatsapp: '3129990011',
    address: 'Calle 46 #38-90',
    neighborhood: 'Nueva Floresta',
    lat: 3.4359,
    lng: -76.5301,
    photos: ['https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&q=60'],
    hours: defaultHours(),
    rating_avg: 4.1,
    rating_count: 16,
    completed_orders: 22,
    verification_status: 'unverified',
    is_active: true,
    created_at: '2025-03-12T10:00:00Z',
  },
  {
    id: 'biz-7',
    owner_id: 'user-barber',
    name: 'Suanfer Barber Studio',
    description:
      'Servicio de barbería y peluquería con servicios orientados a la apariencia masculina. Cortes clásicos, degradados y perfilado de barba.',
    category: 'belleza',
    phone: '3157778899',
    whatsapp: '3157778899',
    address: 'Carrera 40C #49-57',
    neighborhood: 'Vallado',
    lat: 3.414,
    lng: -76.505,
    photos: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=60',
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=60',
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=60',
    ],
    hours: defaultHours(),
    rating_avg: 4.7,
    rating_count: 19,
    completed_orders: 28,
    verification_status: 'unverified',
    is_active: true,
    services_catalog: [
      { id: 'srv-barber-1', name: 'Corte clásico o degradado', price: 18000, description: 'Corte con tijera y máquina' },
      { id: 'srv-barber-2', name: 'Perfilado de barba', price: 12000, description: 'Arreglo con toalla caliente y navaja' },
      { id: 'srv-barber-3', name: 'Combo Corte + Barba', price: 26000, description: 'Servicio completo de barbería' },
    ],
    created_at: '2025-05-10T10:00:00Z',
  },
]

/**
 * Trabajos ya cerrados de los primeros meses del piloto. Existen para que el
 * contador de servicios y las insignias tengan de dónde salir: antes eran un
 * número escrito a mano en la ficha del negocio que los pedidos no respaldaban.
 */
const TRABAJOS_CERRADOS: Array<{ negocio: string; trabajos: string[]; precio: number; cuantos: number }> = [
  { negocio: 'biz-1', trabajos: ['Ruedo de pantalón', 'Cambio de cierre', 'Entallado de blusa', 'Dobladillo de cortinas'], precio: 18000, cuantos: 16 },
  { negocio: 'biz-2', trabajos: ['Manicure semipermanente', 'Pedicure completo', 'Decoración de uñas'], precio: 42000, cuantos: 9 },
  { negocio: 'biz-4', trabajos: ['Bulto de ropa americana', 'Surtido de camisetas'], precio: 95000, cuantos: 6 },
  { negocio: 'biz-6', trabajos: ['Cambio de pantalla', 'Cambio de batería', 'Liberación de equipo'], precio: 85000, cuantos: 5 },
  { negocio: 'biz-3', trabajos: ['Apertura de puerta', 'Cambio de guarda', 'Copia de llave'], precio: 35000, cuantos: 4 },
  { negocio: 'biz-5', trabajos: ['Pedido de cholados para evento'], precio: 60000, cuantos: 3 },
  { negocio: 'biz-7', trabajos: ['Corte y perfilado de barba'], precio: 22000, cuantos: 2 },
]

/** Reparte los trabajos cerrados hacia atrás en el tiempo, uno cada pocos días. */
function historialDelPiloto(): Order[] {
  const inicio = new Date('2026-09-05T15:00:00Z').getTime()
  const unDia = 24 * 60 * 60 * 1000
  const pedidos: Order[] = []

  TRABAJOS_CERRADOS.forEach(({ negocio, trabajos, precio, cuantos }) => {
    for (let i = 0; i < cuantos; i += 1) {
      const fecha = new Date(inicio - (i * 3 + 1) * unDia).toISOString()
      const entrega = new Date(inicio - i * 3 * unDia).toISOString()
      pedidos.push({
        id: `${negocio}-hist-${i + 1}`,
        business_id: negocio,
        client_id: i % 2 === 0 ? 'user-cliente' : 'user-otro',
        title: trabajos[i % trabajos.length],
        description: 'Trabajo acordado y entregado en el barrio.',
        status: 'completed',
        scheduled_for: null,
        price_estimate: precio,
        final_price: precio,
        photos: [],
        created_at: fecha,
        updated_at: entrega,
      })
    }
  })

  return pedidos
}

export const demoOrders: Order[] = [
  ...historialDelPiloto(),
  {
    id: 'ord-1',
    business_id: 'biz-2',
    client_id: 'user-cliente',
    title: 'Manicure semipermanente',
    description: 'Para el sábado en la mañana, en mi casa si es posible.',
    status: 'pending',
    scheduled_for: '2026-09-12T09:00:00Z',
    price_estimate: 45000,
    photos: [],
    created_at: '2026-09-01T14:00:00Z',
    updated_at: '2026-09-01T14:00:00Z',
  },
  {
    id: 'ord-2',
    business_id: 'biz-1',
    client_id: 'user-cliente',
    title: 'Arreglo de bastas de 3 pantalones',
    description: 'Necesito subir 5 cm cada uno.',
    status: 'completed',
    scheduled_for: null,
    price_estimate: 30000,
    photos: [],
    created_at: '2026-07-20T14:00:00Z',
    updated_at: '2026-07-23T16:00:00Z',
  },
  {
    id: 'ord-3',
    business_id: 'biz-1',
    client_id: 'user-otro',
    title: 'Confección de uniforme escolar',
    description: 'Dos jardineras talla 10.',
    status: 'in_progress',
    scheduled_for: '2026-09-10T10:00:00Z',
    price_estimate: 120000,
    photos: [],
    created_at: '2026-08-28T09:00:00Z',
    updated_at: '2026-09-02T09:00:00Z',
  },
]

/**
 * Opiniones de los trabajos que ya se cerraron. Cada una cuelga de un pedido
 * del historial, igual que exige la plataforma: sin pedido completado no hay
 * reseña. Antes las estrellas eran un promedio escrito a mano en la ficha,
 * sin una sola opinión detrás.
 */
const OPINIONES: Array<{ negocio: string; nota: number; texto: string }> = [
  { negocio: 'biz-1', nota: 5, texto: 'Quedó impecable y me lo entregó al día siguiente.' },
  { negocio: 'biz-1', nota: 5, texto: 'Doña Marta cose muy bien y cobra lo justo.' },
  { negocio: 'biz-1', nota: 4, texto: 'Buen trabajo, se demoró un día más de lo acordado.' },
  { negocio: 'biz-1', nota: 5, texto: 'Le llevé tres pantalones y quedaron como nuevos.' },
  { negocio: 'biz-1', nota: 5, texto: 'Muy amable, me explicó qué se podía arreglar y qué no.' },
  { negocio: 'biz-2', nota: 5, texto: 'Kelly es muy detallista, me duraron tres semanas.' },
  { negocio: 'biz-2', nota: 4, texto: 'Buen trabajo, el local es pequeño pero limpio.' },
  { negocio: 'biz-2', nota: 5, texto: 'Vino a la casa y quedó todo lindo.' },
  { negocio: 'biz-3', nota: 5, texto: 'Me abrió la puerta en veinte minutos un domingo.' },
  { negocio: 'biz-3', nota: 4, texto: 'Resolvió rápido, el precio me pareció correcto.' },
  { negocio: 'biz-4', nota: 5, texto: 'La ropa llegó como en las fotos, bien surtida.' },
  { negocio: 'biz-4', nota: 4, texto: 'Buen bulto, aunque pedí tallas y llegaron mezcladas.' },
  { negocio: 'biz-5', nota: 5, texto: 'Los cholados del evento quedaron deliciosos.' },
  { negocio: 'biz-6', nota: 4, texto: 'Cambió la pantalla el mismo día, funciona bien.' },
  { negocio: 'biz-6', nota: 5, texto: 'Me salvó el celular, pensé que ya no servía.' },
  { negocio: 'biz-7', nota: 5, texto: 'Buen corte y conversación, volveré.' },
]

/** Cuelga cada opinión de uno de los trabajos cerrados de ese negocio. */
function opinionesDelPiloto(): Review[] {
  const usados: Record<string, number> = {}

  return OPINIONES.map((op, i) => {
    const n = (usados[op.negocio] ?? 0) + 1
    usados[op.negocio] = n
    const esLuisa = i % 2 === 0
    return {
      id: `rev-${i + 1}`,
      order_id: `${op.negocio}-hist-${n}`,
      business_id: op.negocio,
      client_id: esLuisa ? 'user-cliente' : 'user-otro',
      rating: op.nota,
      comment: op.texto,
      created_at: new Date(Date.parse('2026-09-06T12:00:00Z') - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
      client: esLuisa
        ? { id: 'user-cliente', full_name: 'Luisa Martínez', avatar_url: null }
        : { id: 'user-otro', full_name: 'Jorge Benítez', avatar_url: null },
    }
  })
}

export const demoReviews: Review[] = [
  ...opinionesDelPiloto(),
  {
    id: 'rev-ord2',
    order_id: 'ord-2',
    business_id: 'biz-1',
    client_id: 'user-cliente',
    rating: 5,
    comment: 'Quedaron perfectos y me los entregó al día siguiente.',
    created_at: '2026-07-24T10:00:00Z',
    client: { id: 'user-cliente', full_name: 'Luisa Martínez', avatar_url: null },
  },
]
export const demoVinculaciones: FacilitadorNegocio[] = [
  {
    id: 'fac-1',
    negocio_id: 'biz-1',
    facilitador_id: 'user-facilitador',
    estado_vinculacion: 'aprobado',
    creado_en: '2026-09-01T12:00:00Z',
  },
]

export const demoDirecciones = []
