import { requireSupabase } from '@/lib/supabase'
import { isDemoMode, env } from '@/lib/env'
import { apiFetch } from '@/lib/apiClient'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import { hayTablaDeContacto } from './contactoDisponible'
import type { Order, OrderStatus, Review, PactoVerificado } from '@/types'

const SELECT_WITH_RELATIONS =
  '*, business:businesses(id, name, category, photos, phone), client:profiles!orders_client_id_fkey(id, full_name, avatar_url, contacto:perfil_contacto(phone)), review:reviews(id, rating, comment, created_at)'

const SELECT_SIN_CONTACTO =
  '*, business:businesses(id, name, category, photos, phone), client:profiles!orders_client_id_fkey(id, full_name, avatar_url), review:reviews(id, rating, comment, created_at)'

/** La detección vive en contactoDisponible: la comparten varios servicios. */
async function columnasDePedido(): Promise<string> {
  return (await hayTablaDeContacto()) ? SELECT_WITH_RELATIONS : SELECT_SIN_CONTACTO
}

function mapDbOrder(raw: any): Order {
  const rawReview = raw.review
  const review = Array.isArray(rawReview) ? (rawReview[0] ?? null) : (rawReview ?? null)

  // El teléfono del cliente vive en perfil_contacto, que la base solo entrega a
  // las partes del pedido. Se aplana aquí para que la tarjeta no sepa de eso.
  const client = raw.client
    ? { ...raw.client, phone: raw.client.contacto?.phone ?? null }
    : null

  return {
    ...raw,
    client,
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

const CLAUSULA_MEDIACION =
  'Pacto registrado en ConectaComuna. El anticipo no puede superar el 50% del precio acordado. Si algo sale mal, repórtalo en la ficha del negocio: el equipo de Conecta Comuna revisa el caso.'

/**
 * Pactos de ejemplo para ferias y ensayos. Van marcados para que la página
 * avise que no son acuerdos reales, y no llevan nombre ni dirección de nadie.
 */
const EJEMPLOS: Record<string, PactoVerificado> = {
  demo2026: {
    nivel: 'publico',
    ejemplo: true,
    codigo: 'CC-DEMO2026',
    status: 'in_progress',
    created_at: '2026-10-25T10:30:00Z',
    scheduled_for: '2026-10-28T16:00:00Z',
    title: 'Restauración de comedor de madera y cambio de tapizado',
    description:
      'Lijado fino, barniz mate impermeable y retapizado en lino antifluidos para 4 sillas de comedor.',
    service_location_type: 'workshop',
    business: {
      id: 'biz-demo-ebanisteria',
      name: 'Ebanistería y Restauración Don Carlos',
      category: 'arreglos',
      phone: '3000000000',
      barrio: 'Antonio Nariño',
      is_verified: true,
    },
    precio_total: 160000,
    anticipo: 80000,
    saldo_contra_entrega: 80000,
    porcentaje_anticipo: 50,
    clausula_mediacion: CLAUSULA_MEDIACION,
  },
  'ord-1': {
    nivel: 'publico',
    ejemplo: true,
    codigo: 'CC-ORD-1',
    status: 'pending',
    created_at: '2026-10-25T14:00:00Z',
    scheduled_for: '2026-10-27T14:00:00Z',
    title: 'Manicure semipermanente y cuidado de uñas',
    description: 'Servicio a domicilio en Antonio Nariño.',
    service_location_type: 'home_delivery',
    business: {
      id: 'biz-1',
      name: 'Uñas & Belleza Comunal',
      category: 'belleza',
      phone: '3000000000',
      barrio: 'Antonio Nariño',
      is_verified: true,
    },
    precio_total: 45000,
    anticipo: 20000,
    saldo_contra_entrega: 25000,
    porcentaje_anticipo: 44,
    clausula_mediacion: CLAUSULA_MEDIACION,
  },
  'ord-2': {
    nivel: 'publico',
    ejemplo: true,
    codigo: 'CC-ORD-2',
    status: 'completed',
    created_at: '2026-10-20T14:00:00Z',
    scheduled_for: null,
    title: 'Arreglo de bastas de 3 pantalones',
    description: 'Ajuste de 5 cm de basta.',
    service_location_type: 'workshop',
    business: {
      id: 'biz-2',
      name: 'Costuras Doña Marta',
      category: 'costura',
      phone: '3000000000',
      barrio: 'Antonio Nariño',
      is_verified: true,
    },
    precio_total: 30000,
    anticipo: 15000,
    saldo_contra_entrega: 15000,
    porcentaje_anticipo: 50,
    clausula_mediacion: CLAUSULA_MEDIACION,
  },
}

// Las direcciones de los códigos cortos llegan como "ord-1-demostracion".
const ALIAS_EJEMPLOS: Record<string, string> = {
  demo: 'demo2026',
  'demo-2026-acuerdo-comunal': 'demo2026',
  'ord-1-demostracion': 'ord-1',
  'ord-2-demostracion': 'ord-2',
}

function ejemploPorCodigo(codigo: string): PactoVerificado | null {
  return EJEMPLOS[codigo] ?? EJEMPLOS[ALIAS_EJEMPLOS[codigo]] ?? null
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

/**
 * Parte del pacto son dos personas: quien pidió el trabajo y quien lo hace.
 * Nadie más ve el nombre ni la dirección del vecino, tampoco el facilitador
 * que apadrina al taller: el cliente pactó con el taller, no con él. Mismo
 * criterio que `verificar_pedido_publico` en la base.
 */
function participaEnPacto(order: Order): boolean {
  const db = readDb()
  const quien = db.sessionUserId
  if (!quien) return false
  if (order.client_id === quien) return true
  const negocio = db.businesses.find((b) => b.id === order.business_id)
  return negocio?.owner_id === quien
}

function pactoDesdePedido(order: Order): PactoVerificado {
  const precio = order.final_price ?? order.price_estimate ?? 0
  const anticipo = order.advance_payment ?? 0
  const esParte = participaEnPacto(order)
  const telefono = esParte ? order.client?.phone : undefined

  return {
    nivel: esParte ? 'participante' : 'publico',
    codigo: `CC-${order.id.slice(0, 8).toUpperCase()}`,
    order_id: order.id,
    status: order.status,
    created_at: order.created_at,
    scheduled_for: order.scheduled_for,
    title: order.title,
    description: esParte ? order.description : undefined,
    service_location_type: order.service_location_type,
    delivery_address: esParte ? order.delivery_address : undefined,
    business: {
      id: order.business?.id ?? order.business_id,
      name: order.business?.name ?? 'Taller comunal',
      category: order.business?.category ?? 'Oficio',
      phone: order.business?.phone ?? null,
      barrio: null,
      is_verified: false,
    },
    client: esParte
      ? {
          name: order.client?.full_name ?? 'Vecino de la comuna',
          phone_masked: telefono ? `...${telefono.slice(-4)}` : null,
        }
      : undefined,
    precio_total: precio,
    anticipo,
    saldo_contra_entrega: Math.max(0, precio - anticipo),
    porcentaje_anticipo: precio > 0 ? Math.round((anticipo / precio) * 100) : 0,
    clausula_mediacion: CLAUSULA_MEDIACION,
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
      .select(await columnasDePedido())
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
      .select(await columnasDePedido())
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
      .select(await columnasDePedido())
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

    const { error } = await requireSupabase().rpc('cambiar_estado_pedido', {
      p_pedido: orderId,
      p_estado: status,
      p_precio_final: options?.finalPrice ?? null,
      p_anticipo: options?.advancePayment ?? null,
      p_notas: options?.businessNotes ?? null,
      p_motivo: options?.cancellationReason ?? null,
    })
    if (error) throw new Error(error.message)

    // La función devuelve la fila sin relaciones; el panel necesita el negocio
    // y el cliente para pintar la tarjeta.
    const { data, error: errorLectura } = await requireSupabase()
      .from('orders')
      .select(await columnasDePedido())
      .eq('id', orderId)
      .single()
    if (errorLectura) throw errorLectura
    return mapDbOrder(data)
  },

  /** Pedido completo para abrir el comprobante dentro del chat. */
  async getForReceipt(orderId: string): Promise<Order | null> {
    if (isDemoMode) {
      const encontrado = readDb().orders.find((o) => o.id === orderId)
      return encontrado ? delay(hydrate(encontrado)) : null
    }
    const { data, error } = await requireSupabase()
      .from('orders')
      .select(await columnasDePedido())
      .eq('id', orderId)
      .maybeSingle()
    if (error) throw error
    return data ? mapDbOrder(data) : null
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

  /**
   * Consulta verificable de un pacto por código o ID. La función de la base
   * decide el nivel: las partes del pedido reciben todo, el resto solo ve que
   * el pacto existe, con qué negocio y por cuánto.
   */
  async getVerifiableByCode(code: string): Promise<PactoVerificado | null> {
    const raw = (code || '').trim()
    if (!raw) return null

    const limpio = raw.replace(/^#?CC[-_]?/i, '').toLowerCase()
    const ejemplo = ejemploPorCodigo(limpio)

    if (!isDemoMode) {
      // El QR lo resuelve Postgres, sin depender de que Render esté despierto.
      const { data, error } = await requireSupabase().rpc('verificar_pedido_publico', {
        p_codigo: raw,
      })

      if (!error) {
        if (data) return data as PactoVerificado
        // La base contestó y no hay nada con ese código. Los ejemplos se
        // resuelven más abajo, sin red.
        if (!ejemplo) return null
      } else if (env.apiUrl) {
        // Solo si la función todavía no está aplicada se prueba la API.
        try {
          const fromApi = await apiFetch<PactoVerificado>(
            `/api/orders/verificar/${encodeURIComponent(limpio)}`,
          )
          if (fromApi?.codigo) return fromApi
        } catch (apiErr) {
          console.warn('La API de respaldo no respondió para la verificación:', apiErr)
        }
      }
    }

    if (ejemplo) return ejemplo

    // En modo demostración los pedidos viven en el navegador.
    if (isDemoMode) {
      const encontrado = readDb().orders.find(
        (o) =>
          o.id.toLowerCase() === limpio ||
          o.id.toLowerCase().startsWith(limpio) ||
          `cc-${o.id.toLowerCase()}` === raw.toLowerCase(),
      )
      if (encontrado) return delay(pactoDesdePedido(hydrate(encontrado)))
    }

    return null
  },
}
