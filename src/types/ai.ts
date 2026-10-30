export type TipoRespuestaAi =
  | 'conversacion'
  | 'negocios'
  | 'servicio_catalogo'
  | 'acuerdo_trato_seguro'
  | 'navegacion'
  | 'confirmacion_accion'

export interface NegocioSugeridoAi {
  id: string
  nombre: string
  categoria: string
  barrio?: string | null
  whatsapp?: string | null
  distanciaMetros?: number | null
  verificado?: boolean
}

export interface ServicioSugeridoAi {
  titulo: string
  descripcion: string
  precioSugerido: number
  categoria: string
}

export type TipoAccionPendiente =
  | 'activar_negocio'
  | 'guardar_servicio'
  | 'vincular_facilitador'
  | 'crear_trato_seguro'

export interface AccionPendienteAi {
  tipo: TipoAccionPendiente
  titulo: string
  descripcion: string
  payload?: Record<string, unknown>
  botonConfirmar: string
  botonCancelar: string
}

export interface AcuerdoTratoSeguroAi {
  codigo: string
  servicio: string
  negocioNombre: string
  negocioId?: string
  precioEstimado: number
  anticipoMaximo: number
  saldoContraEntrega: number
  modalidad?: 'workshop' | 'home_delivery'
  /** Se llenan cuando la tarjeta sale de consultar un pacto ya registrado. */
  orderId?: string
  estado?: string
  esParticipante?: boolean
  esEjemplo?: boolean
}

interface UbicacionDetectadaAi {
  barrio: string
  lat: number
  lng: number
}

export interface RespuestaAi {
  mensaje: string
  tipo: TipoRespuestaAi
  negociosSugeridos?: NegocioSugeridoAi[]
  servicio?: ServicioSugeridoAi
  acuerdo?: AcuerdoTratoSeguroAi
  rutaNavegacion?: string
  sugerencias?: string[]
  accionPendiente?: AccionPendienteAi
  ubicacionDetectada?: UbicacionDetectadaAi
}

export interface PedidoActivoCopiloto {
  id: string
  codigo: string
  titulo: string
  estado: string
  monto: number
  anticipo?: number
  contraparte: string
  rol: 'cliente' | 'comerciante'
}

export interface ContextoUsuarioCopiloto {
  autenticado: boolean
  userId?: string | null
  nombre?: string | null
  email?: string | null
  tipoCuenta?: 'client' | 'business' | 'facilitador'
  rolActivo?: string
  telefono?: string | null
  barrio?: string | null
  negocioPropio?: {
    tieneNegocio: boolean
    id?: string | null
    nombre?: string | null
    categoria?: string | null
    serviciosCount?: number
    verificado?: boolean
  } | null
  pedidosActivos?: PedidoActivoCopiloto[]
  pantallaActual?: {
    ruta: string
    negocioId?: string | null
    negocioNombre?: string | null
  }
  ubicacion?: {
    barrio?: string | null
    lat?: number | null
    lng?: number | null
    esDefinida?: boolean
  }
}

export interface MensajeChat {
  id: string
  emisor: 'usuario' | 'asistente'
  texto: string
  fecha: Date
  respuestaEstructurada?: RespuestaAi
}
