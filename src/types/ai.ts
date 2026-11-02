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

/**
 * Lo que el copiloto puede HACER, no solo contar.
 *
 * Toda acción pasa por la misma puerta: el modelo propone, la tarjeta de
 * confirmación muestra exactamente qué va a cambiar, y la persona acepta. La
 * validación de verdad vive en la base —el tope del 50% del anticipo es un
 * `CHECK` de Postgres, no una instrucción del prompt—, así que el modelo no
 * puede saltársela ni equivocándose.
 */
export type TipoAccionPendiente =
  | 'activar_negocio'
  | 'generar_codigo_apadrinamiento'
  | 'cambiar_precio_servicio'
  | 'aceptar_pedido'
  | 'nota_avance_pedido'
  | 'actualizar_horario'
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
    /**
     * Cifras del negocio, para que el copiloto pueda responder «¿cuántos
     * trabajos llevo?» en vez de decir que ninguno.
     *
     * Antes no llegaban, y el asistente solo veía los pedidos **activos**
     * (pendiente, aceptado, en curso): preguntarle por los finalizados daba
     * siempre cero, aunque los hubiera.
     */
    pedidosFinalizados?: number
    calificacion?: number
    resenas?: number
    /**
     * El catálogo con identificadores, no solo cuántos hay.
     *
     * Sin esto el copiloto no puede cambiar un precio: sabría que la persona
     * tiene 3 servicios, pero no cuáles ni cómo nombrarlos para actuar sobre
     * uno. Una acción sin identificador es una acción que adivina.
     */
    servicios?: Array<{ id: string; nombre: string; precio: number | null }>
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
