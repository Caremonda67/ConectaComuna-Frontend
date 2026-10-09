import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import type { Order, OrderStatus, Review } from '@/types'

const SELECT_WITH_RELATIONS =
  '*, business:businesses(id, name, category, photos, phone), client:profiles!orders_client_id_fkey(id, full_name, avatar_url, phone), review:reviews(id, rating, comment, created_at)'

function mapDbOrder(raw: any): Order {
  const rawReview = raw.review
  const review = Array.isArray(rawReview) ? (rawReview[0] ?? null) : (rawReview ?? null)
  return {
    ...raw,
    photos: raw.photos ?? [],
    review,
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function hydrate(order: Order): Order {
  const db = readDb()
  const business = db.businesses.find((b) => b.id === order.business_id)
  const client = db.profiles.find((p) => p.id === order.client_id)
  return {
    ...order,
    photos: order.photos ?? [],
    business: business
      ? {
          id: business.id,
          name: business.name,
          category: business.category,
          photos: business.photos,
          phone: business.phone,
        }
      : undefined,
    client: client
      ? { id: client.id, full_name: client.full_name, avatar_url: client.avatar_url, phone: client.phone }
      : undefined,
    review: db.reviews.find((r) => r.order_id === order.id) ?? null,
  }
}

export interface CreateOrderInput {
  businessId: string
  clientId: string
  title: string
  description: string
  scheduledFor?: string | null
  priceEstimate?: number | null
  photos?: File[]
  serviceLocationType?: 'workshop' | 'home_delivery'
  deliveryAddress?: string | null
}

export interface UpdateOrderStatusOptions {
  finalPrice?: number | null
  advancePayment?: number | null
  businessNotes?: string | null
  cancellationReason?: string | null
}

export const orderService = {
  /** Pedidos donde el usuario es el cliente. */
  async listAsClient(clientId: string): Promise<Order[]> {
    if (isDemoMode) {
      return delay(
        readDb()
          .orders.filter((o) => o.client_id === clientId)
          .map(hydrate)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      )
    }
    const { data, error } = await requireSupabase()
      .from('orders')
      .select(SELECT_WITH_RELATIONS)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return ((data ?? []) as any[]).map(mapDbOrder)
  },

  /** Pedidos recibidos por el negocio del usuario. */
  async listAsBusiness(businessId: string): Promise<Order[]> {
    if (isDemoMode) {
      return delay(
        readDb()
          .orders.filter((o) => o.business_id === businessId)
          .map(hydrate)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      )
    }
    const { data, error } = await requireSupabase()
      .from('orders')
      .select(SELECT_WITH_RELATIONS)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return ((data ?? []) as any[]).map(mapDbOrder)
  },

  /** Cantidad de pedidos pendientes por atender para el negocio. */
  async countPendingAsBusiness(businessId: string): Promise<number> {
    if (isDemoMode) {
      return readDb().orders.filter((o) => o.business_id === businessId && o.status === 'pending').length
    }
    const { count, error } = await requireSupabase()
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'pending')
    if (error) return 0
    return count ?? 0
  },

  /** Marca los pedidos del cliente como revisados al entrar a su panel. */
  markClientOrdersSeen(clientId: string): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`cc_seen_client_orders_${clientId}`, new Date().toISOString())
      window.dispatchEvent(new CustomEvent('conectacomuna:orders-seen'))
    } catch {}
  },

  /** Cantidad de pedidos con novedades no vistas para el cliente. */
  async countPendingAsClient(clientId: string): Promise<number> {
    const lastSeenStr = typeof window !== 'undefined'
      ? localStorage.getItem(`cc_seen_client_orders_${clientId}`)
      : null
    const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0

    if (isDemoMode) {
      const orders = readDb().orders.filter((o) => o.client_id === clientId)
      if (!lastSeenTime) {
        return orders.filter((o) => o.status === 'pending' || o.status === 'accepted').length
      }
      return orders.filter((o) => {
        const t = new Date(o.updated_at || o.created_at).getTime()
        return t > lastSeenTime && (o.status === 'pending' || o.status === 'accepted')
      }).length
    }

    const { data, error } = await requireSupabase()
      .from('orders')
      .select('id, status, created_at, updated_at')
      .eq('client_id', clientId)
      .in('status', ['pending', 'accepted', 'in_progress'])

    if (error || !data) return 0
    if (!lastSeenTime) return data.length

    return data.filter((o) => {
      const t = new Date((o as any).updated_at || (o as any).created_at).getTime()
      return t > lastSeenTime
    }).length
  },

  async create(input: CreateOrderInput): Promise<Order> {
    if (isDemoMode) {
      const now = new Date().toISOString()
      const photos = input.photos?.length
        ? await Promise.all(input.photos.slice(0, 3).map(fileToDataUrl))
        : []
      const order: Order = {
        id: uid('ord'),
        business_id: input.businessId,
        client_id: input.clientId,
        title: input.title,
        description: input.description,
        status: 'pending',
        scheduled_for: input.scheduledFor ?? null,
        price_estimate: input.priceEstimate ?? null,
        final_price: null,
        advance_payment: 0,
        service_location_type: input.serviceLocationType ?? 'workshop',
        delivery_address: input.deliveryAddress ?? null,
        business_notes: null,
        cancellation_reason: null,
        photos,
        created_at: now,
        updated_at: now,
      }
      mutateDb((d) => d.orders.unshift(order))
      return delay(hydrate(order))
    }
    // RLS: insert permitido solo si `auth.uid() = client_id`.
    const supabase = requireSupabase()
    const folder = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uid('ord')

    const photos: string[] = []
    if (input.photos?.length) {
      for (const file of input.photos.slice(0, 3)) {
        const path = `${input.clientId}/${folder}/${uid('img')}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('order-photos')
          .upload(path, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage
          .from('order-photos')
          .getPublicUrl(path)
        photos.push(urlData.publicUrl)
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        business_id: input.businessId,
        client_id: input.clientId,
        title: input.title,
        description: input.description,
        scheduled_for: input.scheduledFor ?? null,
        price_estimate: input.priceEstimate ?? null,
        service_location_type: input.serviceLocationType ?? 'workshop',
        delivery_address: input.deliveryAddress ?? null,
        photos,
        status: 'pending' satisfies OrderStatus,
      })
      .select(SELECT_WITH_RELATIONS)
      .single()
    if (error) throw error
    return mapDbOrder(data)
  },

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    options?: UpdateOrderStatusOptions,
  ): Promise<Order> {
    if (isDemoMode) {
      const db = mutateDb((d) => {
        const o = d.orders.find((x) => x.id === orderId)
        if (o) {
          o.status = status
          o.updated_at = new Date().toISOString()
          if (options?.finalPrice !== undefined) o.final_price = options.finalPrice
          if (options?.advancePayment !== undefined) o.advance_payment = options.advancePayment
          if (options?.businessNotes !== undefined) o.business_notes = options.businessNotes
          if (options?.cancellationReason !== undefined) o.cancellation_reason = options.cancellationReason
          if (status === 'completed') {
            const biz = d.businesses.find((b) => b.id === o.business_id)
            if (biz) biz.completed_orders += 1
          }
        }
      })
      return delay(hydrate(db.orders.find((o) => o.id === orderId)!))
    }

    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (options?.finalPrice !== undefined) payload.final_price = options.finalPrice
    if (options?.advancePayment !== undefined) payload.advance_payment = options.advancePayment
    if (options?.businessNotes !== undefined) payload.business_notes = options.businessNotes
    if (options?.cancellationReason !== undefined) payload.cancellation_reason = options.cancellationReason

    const { data, error } = await requireSupabase()
      .from('orders')
      .update(payload)
      .eq('id', orderId)
      .select(SELECT_WITH_RELATIONS)
      .single()
    if (error) throw error
    return mapDbOrder(data)
  },

  async createReview(input: {
    orderId: string
    businessId: string
    clientId: string
    rating: number
    comment: string | null
  }): Promise<Review> {
    if (isDemoMode) {
      const review: Review = {
        id: uid('rev'),
        order_id: input.orderId,
        business_id: input.businessId,
        client_id: input.clientId,
        rating: input.rating,
        comment: input.comment,
        created_at: new Date().toISOString(),
      }
      mutateDb((d) => {
        d.reviews.unshift(review)
        const biz = d.businesses.find((b) => b.id === input.businessId)
        if (biz) {
          const total = biz.rating_avg * biz.rating_count + input.rating
          biz.rating_count += 1
          biz.rating_avg = Number((total / biz.rating_count).toFixed(2))
        }
      })
      return delay(review)
    }
    // El promedio del negocio lo recalcula un trigger en Postgres:
    // así no confiamos en el cliente para un dato de reputación.
    const { data, error } = await requireSupabase()
      .from('reviews')
      .insert({
        order_id: input.orderId,
        business_id: input.businessId,
        client_id: input.clientId,
        rating: input.rating,
        comment: input.comment,
      })
      .select()
      .single()
    if (error) throw error
    return data as Review
  },
}
