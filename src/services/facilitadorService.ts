import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import { businessService } from './businessService'
import type { Business, FacilitadorNegocio } from '@/types'

const SELECT_RELACIONES =
  "*, negocio:businesses!facilitadores_negocio_negocio_id_fkey(id, name, category, photos, verification_status), facilitador:profiles!facilitadores_negocio_facilitador_id_fkey(id, full_name)"

/**
 * El embed trae el contacto en su propia rama; la interfaz espera el teléfono
 * dentro del facilitador. Se aplana aquí para no ensuciar las pantallas.
 */
function conContacto(filas: unknown[]): FacilitadorNegocio[] {
  return (filas as Array<Record<string, any>>).map((fila) => {
    const facilitador = fila.facilitador as Record<string, unknown> | null
    if (!facilitador) return fila as unknown as FacilitadorNegocio
    const contacto = facilitador.contacto as { phone?: string | null } | null
    return {
      ...fila,
      facilitador: { ...facilitador, phone: contacto?.phone ?? null },
    } as unknown as FacilitadorNegocio
  })
}

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
      .map((f) => ({
        vinculacion: f as unknown as FacilitadorNegocio,
        negocio: f.negocio as Business,
      }))
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
      .select('*, facilitador:profiles!facilitadores_negocio_facilitador_id_fkey(full_name, contacto:perfil_contacto(phone))')
      .eq('negocio_id', negocioId)
      .eq('estado_vinculacion', 'pendiente')
    if (error) throw error
    return conContacto(data ?? [])
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
      .select('*, facilitador:profiles!facilitadores_negocio_facilitador_id_fkey(full_name, contacto:perfil_contacto(phone))')
      .eq('negocio_id', negocioId)
      .order('creado_en', { ascending: false })
    if (error) throw error
    return conContacto(data ?? [])
  },

  /**
   * Genera un código de un solo uso para que el dueño se lo pase a su
   * facilitador. La base arma los 8 caracteres, les pone vencimiento de 24
   * horas y borra el anterior.
   */
  async generarCodigo(negocioId: string): Promise<string> {
    if (isDemoMode) {
      const codigo = Array.from({ length: 8 }, () =>
        'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)],
      ).join('')
      const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      mutateDb((d) => {
        const b = d.businesses.find((x: Business) => x.id === negocioId)
        if (b) {
          b.codigo_apadrinamiento = codigo
          b.codigo_apadrinamiento_expira_en = expiraEn
        }
      })
      return delay(codigo, 200)
    }
    const { data, error } = await requireSupabase().rpc('generar_codigo_apadrinamiento', {
      p_negocio: negocioId,
    })
    if (error) throw new Error(error.message)
    return data as string
  },

  /**
   * El facilitador ingresa el codigo y queda vinculado directamente como aprobado.
   */
  async vincularConCodigo(facilitadorId: string, codigo: string): Promise<FacilitadorNegocio> {
    if (isDemoMode) {
      const limpio = codigo.trim().toUpperCase()
      const negocio = readDb().businesses.find(
        (b: Business) => b.codigo_apadrinamiento?.trim().toUpperCase() === limpio,
      )
      if (!negocio) throw new Error('Código no válido. Verifica con el dueño del negocio.')

      if (
        negocio.codigo_apadrinamiento_expira_en &&
        new Date(negocio.codigo_apadrinamiento_expira_en).getTime() < Date.now()
      ) {
        throw new Error('Ese código venció. Pídele al dueño que genere uno nuevo.')
      }

      const existente = readDb().vinculaciones.find(
        (v) => v.facilitador_id === facilitadorId && v.negocio_id === negocio.id,
      )
      if (existente && existente.estado_vinculacion === 'aprobado') {
        throw new Error('Ya tienes una vinculación activa con este negocio.')
      }

      const nueva: FacilitadorNegocio = {
        id: existente?.id ?? uid('fac'),
        negocio_id: negocio.id,
        facilitador_id: facilitadorId,
        estado_vinculacion: 'aprobado',
        creado_en: existente?.creado_en ?? new Date().toISOString(),
      }
      mutateDb((d) => {
        if (existente) {
          const idx = d.vinculaciones.findIndex((v) => v.id === existente.id)
          if (idx >= 0) d.vinculaciones[idx].estado_vinculacion = 'aprobado'
        } else {
          d.vinculaciones.push(nueva)
        }
        // El código se gasta: se borra igual que en PostgreSQL
        const b = d.businesses.find((x: Business) => x.id === negocio.id)
        if (b) {
          b.codigo_apadrinamiento = null
          b.codigo_apadrinamiento_expira_en = null
        }
      })
      return delay(nueva, 300)
    }
    // El código lo entrega el dueño, así que vale como autorización: la función
    // de la base busca el negocio, revisa si ya hay vinculación y la deja
    // aprobada. Hacerlo desde el cliente choca con las políticas de la tabla.
    const { data, error } = await requireSupabase().rpc('vincular_facilitador_por_codigo', {
      p_codigo: codigo.trim(),
    })
    if (error) throw new Error(error.message)
    return data as FacilitadorNegocio
  },
}
