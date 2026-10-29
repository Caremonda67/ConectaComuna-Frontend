import { requireSupabase } from '@/lib/supabase'
import { isDemoMode, env } from '@/lib/env'
import { apiFetch } from '@/lib/apiClient'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import type { Order, OrderStatus, Review, PactoVerificado } from '@/types'

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

/** Códigos de muestra que se usan en ferias y en el video de presentación. */
const CODIGOS_DE_MUESTRA = [
  'demo2026',
  'demo',
  'demo-2026-acuerdo-comunal',
  'ord-1',
  'ord-1-demostracion',
  'ord-2',
  'ord-2-demostracion',
]

function esCodigoDeMuestra(codigo: string): boolean {
  return (
    CODIGOS_DE_MUESTRA.includes(codigo) ||
    codigo.startsWith('93e416f2') ||
    codigo.startsWith('e9894d7d')
  )
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

    const payload = {
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
    }

    const { data, error } = await supabase
      .from('orders')
      .insert(payload)
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

  /** Consulta pública y verificable de un acuerdo de Trato Seguro por código o ID */
  async getVerifiableByCode(code: string): Promise<PactoVerificado | null> {
    const raw = (code || '').trim()
    if (!raw) return null
    const clean = raw.replace(/^#?CC[-_]?/i, '').toLowerCase()

    // 1. La función pública de la base contesta sin sesión y sin depender de
    // que el backend de Render esté despierto.
    if (!isDemoMode) {
      const { data, error } = await requireSupabase().rpc('verificar_pedido_publico', {
        p_codigo: raw,
      })

      if (!error) {
        if (data) return data as PactoVerificado

        // La base contestó y no encontró nada. Los códigos de muestra de más
        // abajo se resuelven sin red; el resto no merece despertar el backend.
        if (!esCodigoDeMuestra(clean)) return null
      } else if (env.apiUrl) {
        // Solo si la función todavía no está aplicada se prueba la API
        try {
          const fromApi = await apiFetch<PactoVerificado>(
            `/api/orders/verificar/${encodeURIComponent(clean)}`,
          )
          if (fromApi?.order_id) return fromApi
        } catch (apiErr) {
          console.warn('API Express no respondió para verificación directa:', apiErr)
        }
      }
    }

    // 3. Último recurso: la sesión abierta puede leer el pedido por RLS
    try {
      const supabase = requireSupabase()
      let orderData: any = null

      if (clean.length === 36 && clean.includes('-')) {
        const { data } = await supabase
          .from('orders')
          .select(SELECT_WITH_RELATIONS)
          .eq('id', clean)
          .maybeSingle()
        orderData = data
      }

      if (orderData) {
        const mapped = mapDbOrder(orderData)
        const precio = mapped.final_price ?? mapped.price_estimate ?? 0
        const anticipo = mapped.advance_payment ?? 0
        const saldo = Math.max(0, precio - anticipo)
        const tel = mapped.client?.phone
        const phoneMasked = tel ? `...${tel.slice(-4)}` : null

        return {
          codigo: `CC-${mapped.id.slice(0, 8).toUpperCase()}`,
          order_id: mapped.id,
          status: mapped.status,
          created_at: mapped.created_at,
          scheduled_for: mapped.scheduled_for,
          title: mapped.title,
          description: mapped.description,
          service_location_type: mapped.service_location_type,
          delivery_address: mapped.delivery_address,
          business: {
            id: mapped.business?.id ?? mapped.business_id,
            name: mapped.business?.name ?? 'Taller Comunal',
            category: mapped.business?.category ?? 'Oficio',
            phone: mapped.business?.phone ?? null,
            barrio: (mapped.business as any)?.neighborhood ?? 'Comuna',
            is_verified: (mapped.business as any)?.verification_status === 'verified',
          },
          client: {
            name: mapped.client?.full_name ?? 'Vecino de la Comuna',
            phone_masked: phoneMasked,
          },
          precio_total: precio,
          anticipo,
          saldo_contra_entrega: saldo,
          porcentaje_anticipo: precio > 0 ? Math.round((anticipo / precio) * 100) : 0,
          clausula_mediacion:
            'Pacto respaldado por el Comité de Convivencia y Mediación Comunitaria de la JAC de la Comuna y ConectaComuna.',
        }
      }
    } catch {
      // Fallback a base local
    }

    // 3. Fallback en base de datos local en memoria/almacenamiento
    try {
      const db = readDb()
      const found = db.orders.find(
        (o) =>
          o.id.toLowerCase() === clean ||
          o.id.toLowerCase().startsWith(clean) ||
          `cc-${o.id.toLowerCase()}` === raw.toLowerCase(),
      )
      if (found) {
        const hydrated = hydrate(found)
        const precio = hydrated.final_price ?? hydrated.price_estimate ?? 0
        const anticipo = hydrated.advance_payment ?? 0
        const saldo = Math.max(0, precio - anticipo)
        const tel = hydrated.client?.phone
        const phoneMasked = tel ? `...${tel.slice(-4)}` : null

        return delay({
          codigo: `CC-${hydrated.id.slice(0, 8).toUpperCase()}`,
          order_id: hydrated.id,
          status: hydrated.status,
          created_at: hydrated.created_at,
          scheduled_for: hydrated.scheduled_for,
          title: hydrated.title,
          description: hydrated.description,
          service_location_type: hydrated.service_location_type,
          delivery_address: hydrated.delivery_address,
          business: {
            id: hydrated.business?.id ?? hydrated.business_id,
            name: hydrated.business?.name ?? 'Taller Comunal',
            category: hydrated.business?.category ?? 'Oficio',
            phone: hydrated.business?.phone ?? null,
            barrio: 'Antonio Nariño, Cali',
            is_verified: true,
          },
          client: {
            name: hydrated.client?.full_name ?? 'Vecino de la Comuna',
            phone_masked: phoneMasked,
          },
          precio_total: precio,
          anticipo,
          saldo_contra_entrega: saldo,
          porcentaje_anticipo: precio > 0 ? Math.round((anticipo / precio) * 100) : 0,
          clausula_mediacion:
            'Pacto respaldado por el Comité de Convivencia y Mediación Comunitaria de la JAC de la Comuna y ConectaComuna.',
        })
      }
    } catch {
      // Error leyendo db local
    }

    // 4. Semillas estáticas de demostración para jurados (disponibles en cualquier dispositivo sin caché)
    if (clean === 'demo2026' || clean === 'demo' || clean === 'demo-2026-acuerdo-comunal') {
      return {
        codigo: 'CC-DEMO2026',
        order_id: 'demo-2026-acuerdo-comunal',
        status: 'in_progress',
        created_at: '2026-10-25T10:30:00Z',
        scheduled_for: '2026-10-28T16:00:00Z',
        title: 'Restauración de comedor de madera y cambio de tapizado',
        description: 'Lijado fino, barniz mate impermeable y retapizado en lino antifluidos para 4 sillas de comedor.',
        service_location_type: 'workshop',
        delivery_address: 'Calle 44 # 39B-18, Taller La Esperanza',
        business: {
          id: 'biz-demo-ebanisteria',
          name: 'Ebanistería y Restauración Don Carlos',
          category: 'arreglos',
          phone: '3187654321',
          barrio: 'Antonio Nariño, Comuna 16, Cali',
          is_verified: true,
        },
        client: { name: 'Esperanza Gómez (Vecina)', phone_masked: '...6543' },
        precio_total: 160000,
        anticipo: 80000,
        saldo_contra_entrega: 80000,
        porcentaje_anticipo: 50,
        clausula_mediacion:
          'Pacto protegido bajo el Trato Seguro Comunal con mediación en equidad de la Junta de Acción Comunal (JAC) conforme a la Ley 2166 de 2021.',
      }
    }

    if (clean === 'ord-1' || clean === 'ord-1-demostracion') {
      return {
        codigo: 'CC-ORD-1',
        order_id: 'ord-1-demostracion',
        status: 'pending',
        created_at: '2026-10-25T14:00:00Z',
        scheduled_for: '2026-10-27T14:00:00Z',
        title: 'Manicure semipermanente y cuidado de uñas',
        description: 'Servicio a domicilio en Antonio Nariño.',
        service_location_type: 'home_delivery',
        delivery_address: 'Carrera 40 # 42-15',
        business: {
          id: 'biz-1',
          name: 'Uñas & Belleza Comunal',
          category: 'belleza',
          phone: '3123456789',
          barrio: 'Antonio Nariño, Cali',
          is_verified: true,
        },
        client: { name: 'Vecino de la Comuna', phone_masked: '...4567' },
        precio_total: 45000,
        anticipo: 20000,
        saldo_contra_entrega: 25000,
        porcentaje_anticipo: 44,
        clausula_mediacion:
          'Pacto respaldado por el Comité de Convivencia y Mediación Comunitaria de la JAC de la Comuna y ConectaComuna.',
      }
    }

    if (clean === 'ord-2' || clean === 'ord-2-demostracion') {
      return {
        codigo: 'CC-ORD-2',
        order_id: 'ord-2-demostracion',
        status: 'completed',
        created_at: '2026-10-20T14:00:00Z',
        scheduled_for: null,
        title: 'Arreglo de bastas de 3 pantalones',
        description: 'Ajuste de 5 cm de basta.',
        service_location_type: 'workshop',
        delivery_address: null,
        business: {
          id: 'biz-2',
          name: 'Costuras Doña Marta',
          category: 'costura',
          phone: '3009876543',
          barrio: 'Antonio Nariño, Cali',
          is_verified: true,
        },
        client: { name: 'Vecino de la Comuna', phone_masked: '...2211' },
        precio_total: 30000,
        anticipo: 15000,
        saldo_contra_entrega: 15000,
        porcentaje_anticipo: 50,
        clausula_mediacion:
          'Pacto respaldado por el Comité de Convivencia y Mediación Comunitaria de la JAC de la Comuna y ConectaComuna.',
      }
    }

    if (clean === '93e416f2' || clean.startsWith('93e416f2')) {
      return {
        codigo: 'CC-93E416F2',
        order_id: '93e416f2-d1a1-4a9c-803a-f4275742fea9',
        status: 'accepted',
        created_at: '2026-10-26T03:19:35Z',
        scheduled_for: null,
        title: 'Reparación de mesa de comedor y 4 sillas',
        description: 'Ajustar patas flojas y lijar la superficie con acabado en barniz mate.',
        service_location_type: 'workshop',
        delivery_address: null,
        business: {
          id: 'd31a0639-c782-4b99-b821-801d8cb18d3e',
          name: 'Carpintería y Muebles Don Jaime',
          category: 'carpinteria',
          phone: '3157778899',
          barrio: 'Antonio Nariño',
          is_verified: true,
        },
        client: { name: 'Carmen Alicia Vecina', phone_masked: '...2211' },
        precio_total: 60000,
        anticipo: 0,
        saldo_contra_entrega: 60000,
        porcentaje_anticipo: 0,
        clausula_mediacion:
          'Pacto respaldado por el Comité de Convivencia y Mediación Comunitaria de la JAC de la Comuna y ConectaComuna.',
      }
    }

    if (clean === 'e9894d7d' || clean.startsWith('e9894d7d')) {
      return {
        codigo: 'CC-E9894D7D',
        order_id: 'e9894d7d-ff11-4076-a9d7-d486b985a22c',
        status: 'completed',
        created_at: '2026-10-05T06:32:59Z',
        scheduled_for: null,
        title: 'Confección de 3 manteles y 2 cortinas',
        description: 'Telas de lino ya compradas. Medidas: manteles de 2 metros y cortinas de 2.50 de alto.',
        service_location_type: 'home_delivery',
        delivery_address: 'Carrera 45 # 12-34, Apto 201 (El Poblado)',
        business: {
          id: '482d4311-3bb7-4e87-9076-7781f63751df',
          name: 'Costuras Doña Marta',
          category: 'costura',
          phone: '3009876543',
          barrio: 'Antonio Nariño',
          is_verified: true,
        },
        client: { name: 'Luisa Martínez', phone_masked: '...4567' },
        precio_total: 45000,
        anticipo: 20000,
        saldo_contra_entrega: 25000,
        porcentaje_anticipo: 44,
        clausula_mediacion:
          'Pacto respaldado por el Comité de Convivencia y Mediación Comunitaria de la JAC de la Comuna y ConectaComuna.',
      }
    }

    return null
  },
}
