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
}

export interface ContextoUsuarioCopiloto {
  autenticado: boolean
  userId?: string | null
  nombre?: string | null
  email?: string | null
  tipoCuenta?: 'client' | 'business' | 'facilitador' | 'admin'
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
  pantallaActual?: {
    ruta: string
    negocioId?: string | null
    negocioNombre?: string | null
  }
  ubicacion?: {
    barrio: string
    lat: number
    lng: number
  }
}

export interface MensajeChat {
  id: string
  emisor: 'usuario' | 'asistente'
  texto: string
  fecha: Date
  respuestaEstructurada?: RespuestaAi
}
