export type TipoRespuestaAi =
  | 'conversacion'
  | 'negocios'
  | 'servicio_catalogo'
  | 'acuerdo_trato_seguro'
  | 'navegacion'

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

export interface RespuestaAi {
  mensaje: string
  tipo: TipoRespuestaAi
  negociosSugeridos?: NegocioSugeridoAi[]
  servicio?: ServicioSugeridoAi
  rutaNavegacion?: string
  sugerencias?: string[]
}

export interface MensajeChat {
  id: string
  emisor: 'usuario' | 'asistente'
  texto: string
  fecha: Date
  respuestaEstructurada?: RespuestaAi
}
