import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { distanceKm, getBusinessOpenStatus } from '@/lib/utils'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import type { Business, BusinessFilters, BusinessWithDistance, EstadoReporte, ReporteComunitario, Review } from '@/types'

function withDistance(
  list: Business[],
  center: BusinessFilters['center'],
): BusinessWithDistance[] {
  return list.map((b) => ({
    ...b,
    distanceKm: center ? distanceKm(center, { lat: b.lat, lng: b.lng }) : null,
  }))
}

function applySort(list: BusinessWithDistance[], sort: BusinessFilters['sort']) {
  const copy = [...list]
  if (sort === 'rating') return copy.sort((a, b) => b.rating_avg - a.rating_avg)
  if (sort === 'recent')
    return copy.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return copy.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
}

export function overlayLocalTrust<T extends Business>(b: T): T {
  try {
    const raw = localStorage.getItem(`cc_verif_${b.id}`)
    if (raw) {
      const v = JSON.parse(raw)
      return {
        ...b,
        verification_status: v.status ?? b.verification_status,
        verification_by: v.by ?? b.verification_by,
        verification_note: v.note ?? b.verification_note,
        verification_date: v.date ?? b.verification_date,
      }
    }
  } catch {}
  return b
}

export const businessService = {
  async search(filters: BusinessFilters): Promise<BusinessWithDistance[]> {
    if (isDemoMode) {
      const q = filters.query?.trim().toLowerCase()
      let list = readDb().businesses.filter((b) => b.is_active)
      if (filters.category && filters.category !== 'all') {
        list = list.filter((b) => b.category === filters.category)
      }
      if (q) {
        list = list.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.description.toLowerCase().includes(q) ||
            b.neighborhood?.toLowerCase().includes(q),
        )
      }
      if (filters.minRating) list = list.filter((b) => b.rating_avg >= filters.minRating!)
      if (filters.openNow) {
        list = list.filter((b) => getBusinessOpenStatus(b.hours).isOpen)
      }
      if (filters.wholesaleOnly) {
        list = list.filter((b) => b.wholesale_enabled)
      }
      let result = withDistance(list, filters.center)
      if (filters.center && filters.radiusKm) {
        result = result.filter((b) => (b.distanceKm ?? 0) <= filters.radiusKm!)
      }
      return delay(applySort(result.map(overlayLocalTrust), filters.sort))
    }

    // Filtrado en el servidor: menos bytes viajando, clave con conexiones lentas.
    let query = requireSupabase()
      .from('businesses')
      .select('*')
      .eq('is_active', true)
      .limit(60)

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }
    if (filters.minRating) query = query.gte('rating_avg', filters.minRating)
    if (filters.wholesaleOnly) query = query.eq('wholesale_enabled', true)
    if (filters.query?.trim()) {
      const q = filters.query.trim()
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    }
    // Prefiltro por caja envolvente antes de calcular distancia exacta en cliente.
    if (filters.center && filters.radiusKm) {
      const dLat = filters.radiusKm / 111
      const dLng =
        filters.radiusKm / (111 * Math.cos((filters.center.lat * Math.PI) / 180))
      query = query
        .gte('lat', filters.center.lat - dLat)
        .lte('lat', filters.center.lat + dLat)
        .gte('lng', filters.center.lng - dLng)
        .lte('lng', filters.center.lng + dLng)
    }

    const { data, error } = await query
    if (error) throw error
    let result = withDistance((data ?? []) as Business[], filters.center)
    if (filters.center && filters.radiusKm) {
      result = result.filter((b) => (b.distanceKm ?? 0) <= filters.radiusKm!)
    }
    if (filters.openNow) {
      result = result.filter((b) => getBusinessOpenStatus(b.hours).isOpen)
    }
    return applySort(result.map(overlayLocalTrust), filters.sort)
  },

  async getById(id: string): Promise<Business | null> {
    if (isDemoMode) {
      const found = readDb().businesses.find((b) => b.id === id) ?? null
      return delay(found ? overlayLocalTrust(found) : null, 200)
    }
    const { data, error } = await requireSupabase()
      .from('businesses')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? overlayLocalTrust(data as Business) : null
  },

  async getByOwner(ownerId: string): Promise<Business | null> {
    if (isDemoMode) {
      return delay(readDb().businesses.find((b) => b.owner_id === ownerId) ?? null, 200)
    }
    const { data, error } = await requireSupabase()
      .from('businesses')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle()
    if (error) throw error
    return data as Business | null
  },

  async upsert(
    ownerId: string,
    input: Partial<Business> & { name: string; category: Business['category'] },
  ): Promise<Business> {
    if (isDemoMode) {
      const db = readDb()
      const existing = db.businesses.find((b) => b.owner_id === ownerId)
      const merged: Business = {
        id: existing?.id ?? uid('biz'),
        owner_id: ownerId,
        name: input.name,
        description: input.description ?? existing?.description ?? '',
        category: input.category,
        phone: input.phone ?? existing?.phone ?? null,
        whatsapp: input.whatsapp ?? existing?.whatsapp ?? null,
        address: input.address ?? existing?.address ?? null,
        neighborhood: input.neighborhood ?? existing?.neighborhood ?? null,
        lat: input.lat ?? existing?.lat ?? 3.4372,
        lng: input.lng ?? existing?.lng ?? -76.5225,
        photos: input.photos ?? existing?.photos ?? [],
        hours: input.hours ?? existing?.hours ?? [],
        rating_avg: existing?.rating_avg ?? 0,
        rating_count: existing?.rating_count ?? 0,
        completed_orders: existing?.completed_orders ?? 0,
        verification_status: existing?.verification_status ?? 'unverified',
        verification_by: existing?.verification_by ?? null,
        verification_note: existing?.verification_note ?? null,
        verification_date: existing?.verification_date ?? null,
        report_count: existing?.report_count ?? 0,
        is_active: input.is_active ?? existing?.is_active ?? true,
        wholesale_enabled: input.wholesale_enabled ?? existing?.wholesale_enabled ?? false,
        wholesale_min_order: input.wholesale_min_order ?? existing?.wholesale_min_order ?? null,
        wholesale_terms: input.wholesale_terms ?? existing?.wholesale_terms ?? null,
        services_catalog: input.services_catalog ?? existing?.services_catalog ?? [],
        created_at: existing?.created_at ?? new Date().toISOString(),
      }
      mutateDb((d) => {
        const i = d.businesses.findIndex((b) => b.owner_id === ownerId)
        if (i >= 0) d.businesses[i] = merged
        else d.businesses.push(merged)
      })
      return delay(merged)
    }

    // RLS: policy "businesses_owner_write" con `auth.uid() = owner_id`.
    const { data, error } = await requireSupabase()
      .from('businesses')
      .upsert({ ...input, owner_id: ownerId }, { onConflict: 'owner_id' })
      .select()
      .single()
    if (error) throw error
    return data as Business
  },

  async listReviews(businessId: string): Promise<Review[]> {
    if (isDemoMode) {
      return delay(
        readDb().reviews.filter((r) => r.business_id === businessId),
        200,
      )
    }
    const { data, error } = await requireSupabase()
      .from('reviews')
      .select('*, client:profiles!reviews_client_id_fkey(id, full_name, avatar_url)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return (data ?? []) as Review[]
  },

  /**
   * Subida de fotos al bucket `business-photos`.
   * Ruta `${ownerId}/${archivo}` para que la policy de Storage valide que
   * la primera carpeta coincide con `auth.uid()`.
   */
  async uploadPhoto(ownerId: string, file: File): Promise<string> {
    if (isDemoMode) return delay(URL.createObjectURL(file), 400)
    const path = `${ownerId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const sb = requireSupabase()
    const { error } = await sb.storage.from('business-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    return sb.storage.from('business-photos').getPublicUrl(path).data.publicUrl
  },

  /**
   * Validación en territorio efectuada por un facilitador o líder comunal.
   */
  async verificarTerritorialmente(
    negocioId: string,
    facilitadorNombre: string,
    nota?: string,
  ): Promise<void> {
    const fecha = new Date().toISOString()
    const notaLimpia = nota?.trim() || 'Verificado en visita de campo por facilitador'

    // Persistir en caché local
    try {
      localStorage.setItem(
        `cc_verif_${negocioId}`,
        JSON.stringify({
          status: 'verified',
          by: facilitadorNombre,
          note: notaLimpia,
          date: fecha,
        }),
      )
    } catch {}

    if (isDemoMode) {
      mutateDb((d) => {
        const b = d.businesses.find((x) => x.id === negocioId)
        if (b) {
          b.verification_status = 'verified'
          b.verification_by = facilitadorNombre
          b.verification_note = notaLimpia
          b.verification_date = fecha
        }
      })
      return delay(undefined, 250)
    }

    try {
      await requireSupabase()
        .from('businesses')
        .update({
          verification_status: 'verified',
        })
        .eq('id', negocioId)
    } catch (e) {
      console.warn('Actualización remota de verificación:', e)
    }
  },

  /**
   * Revoca o retira la verificación territorial si se detectan anomalías.
   */
  async revocarVerificacion(negocioId: string): Promise<void> {
    try {
      localStorage.setItem(
        `cc_verif_${negocioId}`,
        JSON.stringify({
          status: 'unverified',
          by: null,
          note: null,
          date: null,
        }),
      )
    } catch {}

    if (isDemoMode) {
      mutateDb((d) => {
        const b = d.businesses.find((x) => x.id === negocioId)
        if (b) {
          b.verification_status = 'unverified'
          b.verification_by = null
          b.verification_note = null
          b.verification_date = null
        }
      })
      return delay(undefined, 250)
    }

    try {
      await requireSupabase()
        .from('businesses')
        .update({
          verification_status: 'unverified',
        })
        .eq('id', negocioId)
    } catch (e) {
      console.warn('Actualización remota de revocación:', e)
    }
  },

  /**
   * Registra una denuncia o reporte de un vecino sobre un negocio.
   * Si acumula varios reportes, se marca bajo observación comunitaria.
   */
  async reportarNegocio(
    reporte: Omit<ReporteComunitario, 'id' | 'creado_en'>,
  ): Promise<void> {
    const fecha = new Date().toISOString()
    const nuevo: ReporteComunitario = {
      id: uid('rep'),
      ...reporte,
      creado_en: fecha,
    }

    // Persistir localmente
    try {
      const raw = localStorage.getItem('cc_reportes_local')
      const arr: ReporteComunitario[] = raw ? JSON.parse(raw) : []
      arr.unshift(nuevo)
      localStorage.setItem('cc_reportes_local', JSON.stringify(arr))

      const reportesNegocio = arr.filter((r) => r.negocio_id === reporte.negocio_id)
      if (reportesNegocio.length >= 2) {
        localStorage.setItem(
          `cc_verif_${reporte.negocio_id}`,
          JSON.stringify({
            status: 'under_review',
            by: null,
            note: 'Bajo observación comunitaria por reportes vecinales',
            date: fecha,
          }),
        )
      }
    } catch {}

    if (isDemoMode) {
      mutateDb((d) => {
        d.reportes.push({
          ...nuevo,
          estado: 'pendiente',
        })
        const b = d.businesses.find((x) => x.id === reporte.negocio_id)
        if (b) {
          b.report_count = (b.report_count ?? 0) + 1
          if (b.report_count >= 2) {
            b.verification_status = 'under_review'
          }
        }
      })
      return delay(undefined, 300)
    }

    try {
      await requireSupabase()
        .from('reportes_comunitarios')
        .insert({
          negocio_id: reporte.negocio_id,
          reportado_por_id: reporte.reportado_por_id,
          motivo: reporte.motivo,
          descripcion: reporte.descripcion,
          estado: 'pendiente',
        })
    } catch {}
  },

  /**
   * Lista los reportes registrados para seguimiento y mediación comunitaria.
   */
  async listarReportes(negocioId?: string): Promise<ReporteComunitario[]> {
    let localList: ReporteComunitario[] = []
    try {
      const raw = localStorage.getItem('cc_reportes_local')
      if (raw) localList = JSON.parse(raw)
    } catch {}

    if (isDemoMode) {
      const db = readDb()
      let list = [...localList, ...db.reportes]
      if (negocioId) {
        list = list.filter((r) => r.negocio_id === negocioId)
      }
      const hydrated = list.map((r) => {
        const b = db.businesses.find((x) => x.id === r.negocio_id)
        const p = db.profiles.find((x) => x.id === r.reportado_por_id)
        return {
          ...r,
          estado: r.estado ?? 'pendiente',
          negocio: b
            ? {
                id: b.id,
                name: b.name,
                category: b.category,
                phone: b.phone,
                verification_status: b.verification_status,
              }
            : null,
          reportado_por: p
            ? {
                id: p.id,
                full_name: p.full_name,
                phone: p.phone,
              }
            : null,
        }
      })
      return delay(hydrated.sort((a, b) => b.creado_en.localeCompare(a.creado_en)), 200)
    }

    try {
      let query = requireSupabase()
        .from('reportes_comunitarios')
        .select(
          '*, negocio:businesses(id, name, category, phone, verification_status), reportado_por:profiles!reportes_comunitarios_reportado_por_id_fkey(id, full_name, phone)',
        )
        .order('creado_en', { ascending: false })
        .limit(50)

      if (negocioId) {
        query = query.eq('negocio_id', negocioId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        const ids = new Set((data as ReporteComunitario[]).map((r) => r.id))
        const unicos = localList.filter((r) => !ids.has(r.id))
        return [...unicos, ...(data as ReporteComunitario[])].sort((a, b) =>
          b.creado_en.localeCompare(a.creado_en),
        )
      }
    } catch {}

    return localList.filter((r) => !negocioId || r.negocio_id === negocioId)
  },

  /**
   * Actualiza el estado de resolución de un reporte comunitario.
   */
  async actualizarEstadoReporte(
    reporteId: string,
    estado: EstadoReporte,
    moderadoPorId?: string,
    notas?: string,
  ): Promise<void> {
    if (isDemoMode) {
      mutateDb((d) => {
        const rep = d.reportes.find((r) => r.id === reporteId)
        if (rep) {
          rep.estado = estado
          rep.moderado_por_id = moderadoPorId ?? null
          rep.notas_moderacion = notas ?? null
          rep.actualizado_en = new Date().toISOString()
        }
      })
      try {
        const raw = localStorage.getItem('cc_reportes_local')
        if (raw) {
          const parsed: ReporteComunitario[] = JSON.parse(raw)
          const idx = parsed.findIndex((r) => r.id === reporteId)
          if (idx >= 0) {
            parsed[idx].estado = estado
            parsed[idx].notas_moderacion = notas ?? null
            localStorage.setItem('cc_reportes_local', JSON.stringify(parsed))
          }
        }
      } catch {}
      return delay(undefined, 200)
    }

    const { error } = await requireSupabase()
      .from('reportes_comunitarios')
      .update({
        estado,
        moderado_por_id: moderadoPorId ?? null,
        notas_moderacion: notas ?? null,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', reporteId)
    if (error) throw error
  },

  /**
   * Cambia el estado de verificación u observación de un negocio ante reportes.
   */
  async cambiarEstadoObservacionNegocio(
    negocioId: string,
    nuevoEstado: 'under_review' | 'verified' | 'unverified',
    nota?: string,
  ): Promise<void> {
    if (isDemoMode) {
      mutateDb((d) => {
        const b = d.businesses.find((x) => x.id === negocioId)
        if (b) {
          b.verification_status = nuevoEstado
          b.verification_note = nota ?? (nuevoEstado === 'under_review' ? 'Bajo observación comunitaria' : null)
          b.verification_date = new Date().toISOString()
        }
      })
      try {
        localStorage.setItem(
          `cc_verif_${negocioId}`,
          JSON.stringify({
            status: nuevoEstado,
            by: 'Moderación Comunitaria',
            note: nota ?? (nuevoEstado === 'under_review' ? 'Bajo observación comunitaria' : null),
            date: new Date().toISOString(),
          }),
        )
      } catch {}
      return delay(undefined, 200)
    }

    const { error } = await requireSupabase()
      .from('businesses')
      .update({
        verification_status: nuevoEstado,
        verification_note: nota ?? null,
        verification_date: new Date().toISOString(),
      })
      .eq('id', negocioId)
    if (error) throw error
  },
}
