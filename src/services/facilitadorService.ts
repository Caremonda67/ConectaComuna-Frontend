import { isDemoMode } from '@/lib/env'
import { delay, uid } from './demoBackend'
import type { Business, FacilitadorNegocio } from '@/types'
import { businessService } from './businessService'

// Mock de vinculaciones en memoria para el modo demo
let mockVinculaciones: FacilitadorNegocio[] = []

export const facilitadorService = {
  /**
   * Obtiene todos los negocios a los que un facilitador ha solicitado o tiene acceso.
   */
  async getNegociosVinculados(facilitadorId: string): Promise<Array<{ vinculacion: FacilitadorNegocio, negocio: Business }>> {
    if (isDemoMode) {
      const vinculaciones = mockVinculaciones.filter(v => v.facilitador_id === facilitadorId)
      const result = []
      for (const v of vinculaciones) {
        const negocio = await businessService.getById(v.negocio_id)
        if (negocio) result.push({ vinculacion: v, negocio })
      }
      return delay(result, 300)
    }
    // Implementación real con Supabase...
    return []
  },

  /**
   * Obtiene las solicitudes de facilitadores para un negocio específico.
   * Útil para que el dueño apruebe o rechace.
   */
  async getSolicitudesPendientes(negocioId: string): Promise<FacilitadorNegocio[]> {
    if (isDemoMode) {
      return delay(mockVinculaciones.filter(v => v.negocio_id === negocioId && v.estado_vinculacion === 'pendiente'), 300)
    }
    // Implementación real con Supabase...
    return []
  },

  /**
   * Crea una solicitud de vinculación (facilitador -> negocio).
   */
  async solicitarVinculacion(facilitadorId: string, negocioId: string): Promise<FacilitadorNegocio> {
    if (isDemoMode) {
      const existente = mockVinculaciones.find(v => v.facilitador_id === facilitadorId && v.negocio_id === negocioId)
      if (existente) throw new Error('Ya existe una vinculación con este negocio.')
      
      const nueva: FacilitadorNegocio = {
        id: uid('fac'),
        negocio_id: negocioId,
        facilitador_id: facilitadorId,
        estado_vinculacion: 'pendiente',
        creado_en: new Date().toISOString()
      }
      mockVinculaciones.push(nueva)
      return delay(nueva, 300)
    }
    // Implementación real con Supabase...
    throw new Error('Not implemented yet')
  },

  /**
   * El dueño del negocio aprueba o rechaza una solicitud.
   */
  async responderSolicitud(vinculacionId: string, estado: 'aprobado' | 'rechazado'): Promise<void> {
    if (isDemoMode) {
      const i = mockVinculaciones.findIndex(v => v.id === vinculacionId)
      if (i >= 0) {
        mockVinculaciones[i].estado_vinculacion = estado
      }
      return delay(undefined, 300)
    }
    // Implementación real con Supabase...
  }
}
