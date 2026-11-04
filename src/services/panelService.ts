import { isDemoMode } from '@/lib/env'
import { requireSupabase } from '@/lib/supabase'
import { comunaDePunto } from '@/lib/comunas'
import {
  type ConteoComuna,
  type Granularidad,
  type PuntoSerie,
  type ResumenPanel,
  negociosPorComuna,
  resumenPanel,
  seriePanel,
} from '@/lib/metricasPanel'
import { delay, readDb } from './demoBackend'
import type { Business } from '@/types'

/**
 * Las cifras del panel de equipo.
 *
 * En producción las calcula Postgres con funciones `security definer` que
 * devuelven **conteos y nunca filas** (ver `migracion-panel-equipo.sql`): el
 * panel no puede leer un pedido, ni un teléfono, ni una dirección. En modo
 * demostración las calcula `metricasPanel.ts` sobre localStorage, con las
 * mismas definiciones.
 *
 * Que el modo demostración funcione no es comodidad: es lo que permite probar
 * la aritmética sin base de datos, y es el plan B si falla el internet de la
 * sede el día de la final.
 */

export interface ResenaNegativa {
  reviewId: string
  negocioId: string
  negocio: string
  rating: number
  comentario: string | null
  creadaEn: string
}

/**
 * En demostración la comuna no la pone ningún trigger, así que se resuelve
 * aquí desde el punto del negocio. En producción ya viene en la columna.
 */
function conComuna(businesses: Business[]): Business[] {
  return businesses.map((b) => ({
    ...b,
    comuna: b.comuna ?? comunaDePunto(b.lat, b.lng),
  }))
}

function datosDemo() {
  const db = readDb()
  return {
    profiles: db.profiles,
    businesses: conComuna(db.businesses),
    orders: db.orders,
    reviews: db.reviews,
    reportes: db.reportes,
  }
}

export const panelService = {
  async resumen(): Promise<ResumenPanel> {
    if (isDemoMode) return delay(resumenPanel(datosDemo()))

    const { data, error } = await requireSupabase().rpc('panel_resumen').single()
    if (error) throw new Error(error.message || 'No se pudo cargar el resumen')
    const f = data as Record<string, number>
    return {
      usuarios: f.usuarios,
      negocios: f.negocios,
      negociosActivos: f.negocios_activos,
      negociosVerificados: f.negocios_verificados,
      facilitadoresActivos: f.facilitadores_activos,
      pedidos: f.pedidos,
      pedidosCompletados: f.pedidos_completados,
      conTratoSeguro: f.con_trato_seguro,
      clientesUnicos: f.clientes_unicos,
      pqrAbiertas: f.pqr_abiertas,
      resenasNegativas: f.resenas_negativas,
    }
  },

  async serie(granularidad: Granularidad, limite = 12): Promise<PuntoSerie[]> {
    if (isDemoMode) return delay(seriePanel(datosDemo(), granularidad, limite))

    const { data, error } = await requireSupabase().rpc('panel_serie', {
      p_gran: granularidad,
      p_limite: limite,
    })
    if (error) throw new Error(error.message || 'No se pudo cargar la serie')
    // La función devuelve del más reciente al más viejo para poder limitar;
    // la pantalla los pinta de izquierda a derecha en el tiempo.
    return ((data ?? []) as Record<string, string | number>[])
      .map((f) => ({
        periodo: String(f.periodo),
        usuarios: Number(f.usuarios),
        negocios: Number(f.negocios),
        clientesActivos: Number(f.clientes_activos),
        pedidos: Number(f.pedidos),
        pedidosCompletados: Number(f.pedidos_completados),
        conTratoSeguro: Number(f.con_trato_seguro),
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
  },

  async porComuna(): Promise<ConteoComuna[]> {
    if (isDemoMode) return delay(negociosPorComuna(datosDemo().businesses))

    const { data, error } = await requireSupabase().rpc('panel_por_comuna')
    if (error) throw new Error(error.message || 'No se pudo cargar el mapa')
    return ((data ?? []) as Record<string, number | null>[]).map((f) => ({
      comuna: f.comuna == null ? null : Number(f.comuna),
      negocios: Number(f.negocios),
      verificados: Number(f.verificados),
    }))
  },

  async resenasNegativas(limite = 20): Promise<ResenaNegativa[]> {
    if (isDemoMode) {
      const { reviews, businesses } = datosDemo()
      const porId = new Map(businesses.map((b) => [b.id, b.name]))
      return delay(
        reviews
          .filter((r) => r.rating <= 2)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, limite)
          .map((r) => ({
            reviewId: r.id,
            negocioId: r.business_id,
            negocio: porId.get(r.business_id) ?? 'Negocio retirado',
            rating: r.rating,
            comentario: r.comment ?? null,
            creadaEn: r.created_at,
          })),
      )
    }

    const { data, error } = await requireSupabase().rpc('panel_resenas_negativas', {
      p_limite: limite,
    })
    if (error) throw new Error(error.message || 'No se pudieron cargar las reseñas')
    return ((data ?? []) as Record<string, string | number | null>[]).map((f) => ({
      reviewId: String(f.review_id),
      negocioId: String(f.negocio_id),
      negocio: String(f.negocio),
      rating: Number(f.rating),
      comentario: (f.comentario as string | null) ?? null,
      creadaEn: String(f.creada_en),
    }))
  },
}
