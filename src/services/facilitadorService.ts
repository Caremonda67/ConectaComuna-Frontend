import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import { businessService } from './businessService'
import type { Business, FacilitadorNegocio } from '@/types'

const SELECT_RELACIONES =
  "*, negocio:businesses!facilitadores_negocio_negocio_id_fkey(id, name, category, photos), facilitador:profiles!facilitadores_negocio_facilitador_id_fkey(id, full_name, phone)"

export const facilitadorService = {
  /**
   * Negocios vinculados al facilitador (aprobados o en espera), con su estado.
   */
  async getNegociosVinculados(facilitadorId: string): Promise<Array<{ vinculacion: FacilitadorNegocio; negocio: Business }>> {
    if (isDemoMode) {
      const vinculaciones = readDb().vinculaciones.filter((v) => v.facilitador_id === facilitadorId)
      const result: Array<{ vinculacion: FacilitadorNegocio; negocio: Business }> = []
      for (const v of vinculaciones) {
        const negocio = await businessService.getById(v.negocio_id)
        if (negocio) result.push({ vinculacion: v, negocio })
      }
      return delay(result, 300)
    }
    // RLS: policy 'facilitadores_select_propios' permite ver solo tus vinculaciones.
    const { data, error } = await requireSupabase()
      .from('facilitadores_negocio')
      .select(SELECT_RELACIONES)
      .eq('facilitador_id', facilitadorId)
    if (error) throw error
    const filas = (data ?? []) as Array<Record<string, unknown>>
    return filas
      .filter((f) => Boolean(f.negocio))
      .map((f) => ({ vinculacion: f as unknown as FacilitadorNegocio, negocio: f.negocio as Business }))
  },

  /**
   * Solicitudes de apadrinamiento pendientes para un negocio.
   * La usa el dueno para aprobar o rechazar.
   */
  async getSolicitudesPendientes(negocioId: string): Promise<FacilitadorNegocio[]> {
    if (isDemoMode) {
      const db = readDb()
      return delay(
        db.vinculaciones
          .filter((v) => v.negocio_id === negocioId && v.estado_vinculacion === 'pendiente')
          .map((v) => ({
            ...v,
            facilitador: db.profiles.find((p) => p.id === v.facilitador_id) ?? null,
          })),
        300,
      )
    }
    // RLS: policy 'facilitadores_select_duenos' permite ver solicitudes hacia tu negocio.
    const { data, error } = await requireSupabase()
      .from('facilitadores_negocio')
      .select('*, facilitador:profiles!facilitadores_negocio_facilitador_id_fkey(full_name, phone)')
      .eq('negocio_id', negocioId)
      .eq('estado_vinculacion', 'pendiente')
    if (error) throw error
    return (data ?? []) as unknown as FacilitadorNegocio[]
  },

  /**
   * El facilitador pide administrar un negocio (queda en 'pendiente').
   */
  async solicitarVinculacion(facilitadorId: string, negocioId: string): Promise<FacilitadorNegocio> {
    if (isDemoMode) {
      const existente = readDb().vinculaciones.find((v) => v.facilitador_id === facilitadorId && v.negocio_id === negocioId)
      if (existente) throw new Error('Ya existe una vinculacion con este negocio.')

      const nueva: FacilitadorNegocio = {
        id: uid('fac'),
        negocio_id: negocioId,
        facilitador_id: facilitadorId,
        estado_vinculacion: 'pendiente',
        creado_en: new Date().toISOString(),
      }
      mutateDb((d) => d.vinculaciones.push(nueva))
      return delay(nueva, 300)
    }
    // RLS: policy 'facilitadores_insert_solicitud' permite insertar solo en 'pendiente'.
    const { data, error } = await requireSupabase()
      .from('facilitadores_negocio')
      .insert({
        facilitador_id: facilitadorId,
        negocio_id: negocioId,
        estado_vinculacion: 'pendiente',
      })
      .select()
      .single()
    if (error) throw error
    return data as FacilitadorNegocio
  },

  /**
   * El dueno aprueba o rechaza una solicitud de apadrinamiento.
   */
  async responderSolicitud(vinculacionId: string, estado: 'aprobado' | 'rechazado'): Promise<void> {
    if (isDemoMode) {
      mutateDb((d) => {
        const v = d.vinculaciones.find((x) => x.id === vinculacionId)
        if (v) v.estado_vinculacion = estado
      })
      return delay(undefined, 300)
    }
    // RLS: policy 'facilitadores_update_dueno' permite solo al dueno actualizar.
    const { error } = await requireSupabase()
      .from('facilitadores_negocio')
      .update({ estado_vinculacion: estado })
      .eq('id', vinculacionId)
    if (error) throw error
  },

  /**
   * Historial de solicitudes del negocio (respondidas o no), para el dueno.
   */
  async getVinculacionesDelNegocio(negocioId: string): Promise<FacilitadorNegocio[]> {
    if (isDemoMode) {
      const db = readDb()
      return delay(
        db.vinculaciones
          .filter((v) => v.negocio_id === negocioId)
          .map((v) => ({
            ...v,
            facilitador: db.profiles.find((p) => p.id === v.facilitador_id) ?? null,
          })),
        300,
      )
    }
    const { data, error } = await requireSupabase()
      .from('facilitadores_negocio')
      .select('*, facilitador:profiles!facilitadores_negocio_facilitador_id_fkey(full_name, phone)')
      .eq('negocio_id', negocioId)
      .order('creado_en', { ascending: false })
    if (error) throw error
    return (data ?? []) as unknown as FacilitadorNegocio[]
  },

  /**
   * Genera un codigo de 6 digitos para que el emprendedor lo comparta con su facilitador.
   */
  async generarCodigo(negocioId: string): Promise<string> {
    const codigo = String(Math.floor(100000 + Math.random() * 900000))
    if (isDemoMode) {
      mutateDb((d) => {
        const b = d.businesses.find((x: Business) => x.id === negocioId)
        if (b) b.codigo_apadrinamiento = codigo
      })
      return delay(codigo, 200)
    }
    const { error } = await requireSupabase()
      .from('businesses')
      .update({ codigo_apadrinamiento: codigo })
      .eq('id', negocioId)
    if (error) throw error
    return codigo
  },

  /**
   * El facilitador ingresa el codigo y queda vinculado directamente como aprobado.
   */
  async vincularConCodigo(facilitadorId: string, codigo: string): Promise<FacilitadorNegocio> {
    if (isDemoMode) {
      const negocio = readDb().businesses.find((b: Business) => b.codigo_apadrinamiento === codigo)
      if (!negocio) throw new Error('Código no válido. Verifica con el dueño del negocio.')
      const existente = readDb().vinculaciones.find(
        (v) => v.facilitador_id === facilitadorId && v.negocio_id === negocio.id,
      )
      if (existente) throw new Error('Ya tienes una vinculación con este negocio.')
      const nueva: FacilitadorNegocio = {
        id: uid('fac'),
        negocio_id: negocio.id,
        facilitador_id: facilitadorId,
        estado_vinculacion: 'aprobado',
        creado_en: new Date().toISOString(),
      }
      mutateDb((d) => d.vinculaciones.push(nueva))
      return delay(nueva, 300)
    }
    // Buscar el negocio por codigo
    const { data: negocios, error: busqError } = await requireSupabase()
      .from('businesses')
      .select('id')
      .eq('codigo_apadrinamiento', codigo)
      .limit(1)
    if (busqError) throw busqError
    if (!negocios || negocios.length === 0) throw new Error('Código no válido. Verifica con el dueño del negocio.')

    const negocioId = negocios[0].id
    const { data, error } = await requireSupabase()
      .from('facilitadores_negocio')
      .insert({
        facilitador_id: facilitadorId,
        negocio_id: negocioId,
        estado_vinculacion: 'aprobado',
      })
      .select()
      .single()
    if (error) throw error
    return data as FacilitadorNegocio
  },
}