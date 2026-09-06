import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { distanceKm } from '@/lib/utils'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import type { Business, BusinessFilters, BusinessWithDistance, Review } from '@/types'

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
      let result = withDistance(list, filters.center)
      if (filters.center && filters.radiusKm) {
        result = result.filter((b) => (b.distanceKm ?? 0) <= filters.radiusKm!)
      }
      return delay(applySort(result, filters.sort))
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
    return applySort(result, filters.sort)
  },

  async getById(id: string): Promise<Business | null> {
    if (isDemoMode) {
      return delay(readDb().businesses.find((b) => b.id === id) ?? null, 200)
    }
    const { data, error } = await requireSupabase()
      .from('businesses')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as Business | null
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
        verification_score: existing?.verification_score ?? null,
        verification_selfie_url: existing?.verification_selfie_url ?? null,
        is_active: input.is_active ?? existing?.is_active ?? true,
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
}
