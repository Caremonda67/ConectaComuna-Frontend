/**
 * Frases y oficios que rotan verticalmente en el titular de la portada.
 * Caben en una sola línea en pantallas móviles de 375 px (máximo 25-30 caracteres)
 * y conectan con las categorías y oficios reales del directorio.
 */

export const OFICIOS = [
  'a la modista',
  'al cerrajero',
  'a la manicurista',
  'al carpintero',
  'al electricista',
  'al de las empanadas',
  'al que arregla motos',
  'al maestro de obra',
  'al técnico de celular',
  'a la que hornea rico',
  'al zapatero remendón',
  'al maestro plomero',
  'a la reina del blower',
  'al del taller de bicis',
  'a quien suelda rejas',
  'al que hace mandados',
  'al pintor de fachadas',
  'a la vecina repostera',
  'al que te saca de apuros',
  'al barbero de confianza',
  'al tapicero de muebles',
  'a quien cuida mascotas',
  'al de la comida casera',
  'a quien repara todo',
] as const

/**
 * Frases para usuarios navegando con rol de cliente.
 * Presentan necesidades cotidianas que activan la memoria del vecino.
 */
export const FRASES_CLIENTE = [
  '¿un arreglo en casa?',
  '¿una copia de llaves?',
  '¿reparar la pantalla?',
  '¿antojo de algo rico?',
  '¿un remiendo de ropa?',
  '¿un corte o blower?',
  '¿revisar una tubería?',
  '¿mantenimiento de moto?',
  '¿un mandado en el sector?',
  '¿quién cuide tu mascota?',
  '¿cerrar un Trato Seguro?',
  '¿pintar la fachada?',
  '¿arreglar la cremallera?',
  '¿reforzar una reja?',
  '¿tapizar ese mueble?',
  '¿pedicure o manicure?',
  '¿despinchar la cicla?',
  '¿una torta de cumple?',
  '¿arreglar el calzado?',
  '¿almuerzo casero hoy?',
  '¿quién te ayude en obra?',
  '¿revisar la instalación?',
  '¿un técnico de confianza?',
  '¿comprar ropa bonita?',
] as const

/**
 * Frases para usuarios navegando con rol de negocio o taller.
 * Conectadas con su oficio, pedidos y reputación en el barrio.
 */
export const FRASES_NEGOCIO = [
  'listo para nuevos pedidos',
  'tu vitrina está activa',
  'pacta con Trato Seguro',
  'tu oficio mueve al barrio',
  'pedidos directo al WhatsApp',
  'el barrio busca tu oficio',
  'comparte fotos de tu trabajo',
  'comparte tu catálogo hoy',
  'gana reputación con entregas',
  'sin comisiones intermedias',
  'organiza tus pedidos del día',
  'pacta anticipos con respaldo',
  'ofrece tu oficio con orgullo',
  'deja tu sello en cada labor',
  'crece junto a tu comunidad',
  'conectando con clientes cerca',
  'tu trabajo hecho con esmero',
  'publica tus nuevos precios',
  'tu palabra y tu oficio valen',
  'fortalece la economía local',
] as const

/**
 * Frases para usuarios con rol de facilitador comunitario.
 */
export const FRASES_FACILITADOR = [
  'apoyando a talleres locales',
  'la red comunitaria te acompaña',
  'acompañando a emprendedores',
  'fortaleciendo la confianza',
  'ayudando a digitalizar oficios',
  'cuidando el trabajo del barrio',
  'revisando perfiles y catálogos',
  'apoyo solidario en territorio',
] as const

/** Para lectores de pantalla: frase completa sin parloteo. */
export const TITULAR_ACCESIBLE =
  'Encuentra a la modista, al cerrajero o a quien repara todo de tu propio barrio.'
