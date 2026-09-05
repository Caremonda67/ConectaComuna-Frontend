import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import type { Order, OrderStatus, Review } from '@/types'

const SELECT_WITH_RELATIONS =
  '*, business:businesses(id, name, category, photos), client:profiles!orders_client_id_fkey(id, full_name, avatar_url)'

function hydrate(order: Order): Order {
  const db = readDb()
  const business = db.businesses.find((b) => b.id === order.business_id)
  const client = db.profiles.find((p) => p.id === order.client_id)
  return {
    ...order,
    business: business
      ? {
          id: business.id,
          name: business.name,
          category: business.category,
          photos: business.photos,
        }
      : undefined,
    client: client
      ? { id: client.id, full_name: client.full_name, avatar_url: client.avatar_url }
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
    return (data ?? []) as unknown as Order[]
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
    return (data ?? []) as unknown as Order[]
  },

  async create(input: CreateOrderInput): Promise<Order> {
    if (isDemoMode) {
      const now = new Date().toISOString()
      const order: Order = {
        id: uid('ord'),
        business_id: input.businessId,
        client_id: input.clientId,
        title: input.title,
        description: input.description,
        status: 'pending',
        scheduled_for: input.scheduledFor ?? null,
        price_estimate: input.priceEstimate ?? null,
        created_at: now,
        updated_at: now,
      }
      mutateDb((d) => d.orders.unshift(order))
      return delay(hydrate(order))
    }
    // RLS: insert permitido solo si `auth.uid() = client_id`.
    const { data, error } = await requireSupabase()
      .from('orders')
      .insert({
        business_id: input.businessId,
        client_id: input.clientId,
        title: input.title,
        description: input.description,
        scheduled_for: input.scheduledFor ?? null,
        price_estimate: input.priceEstimate ?? null,
        status: 'pending' satisfies OrderStatus,
      })
      .select(SELECT_WITH_RELATIONS)
      .single()
    if (error) throw error
    return data as unknown as Order
  },

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    if (isDemoMode) {
      const db = mutateDb((d) => {
        const o = d.orders.find((x) => x.id === orderId)
        if (o) {
          o.status = status
          o.updated_at = new Date().toISOString()
          if (status === 'completed') {
            const biz = d.businesses.find((b) => b.id === o.business_id)
            if (biz) biz.completed_orders += 1
          }
        }
      })
      return delay(hydrate(db.orders.find((o) => o.id === orderId)!))
    }
    const { data, error } = await requireSupabase()
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select(SELECT_WITH_RELATIONS)
      .single()
    if (error) throw error
    return data as unknown as Order
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
