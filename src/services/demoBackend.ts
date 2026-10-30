/**
 * Backend simulado para el MODO DEMO.
 * Persiste en localStorage para que la experiencia (pedidos, reseñas, perfil)
 * se sienta real mientras el backend del otro repositorio está en construcción.
 * Toda mutación aquí replica exactamente la firma de los servicios Supabase.
 */
import { demoBusinesses, demoDirecciones, demoOrders, demoProfiles, demoReviews, demoVinculaciones } from '@/data/demoData'
import type { Business, DireccionUsuario, FacilitadorNegocio, Order, Profile, ReporteComunitario, ReporteRespuesta, Review } from '@/types'

const KEY = 'conectacomuna.demo.v1'

interface DemoDb {
  profiles: Profile[]
  businesses: Business[]
  orders: Order[]
  reviews: Review[]
  vinculaciones: FacilitadorNegocio[]
  direcciones: DireccionUsuario[]
  reportes: ReporteComunitario[]
  respuestas: ReporteRespuesta[]
  sessionUserId: string | null
}

/**
 * La reputación se calcula, no se escribe. Es lo mismo que hacen los triggers
 * `bump_completed_orders` y `refresh_business_rating` en Postgres: así el
 * contador de la ficha siempre cuadra con los pedidos y las reseñas que la
 * propia pantalla lista, y nadie tiene que mantener dos números a la vez.
 */
function calcularReputacion(businesses: Business[], orders: Order[], reviews: Review[]): Business[] {
  return businesses.map((b) => {
    const completados = orders.filter((o) => o.business_id === b.id && o.status === 'completed').length
    const suyas = reviews.filter((r) => r.business_id === b.id)
    const promedio = suyas.length
      ? Math.round((suyas.reduce((acc, r) => acc + r.rating, 0) / suyas.length) * 100) / 100
      : 0
    return { ...b, completed_orders: completados, rating_count: suyas.length, rating_avg: promedio }
  })
}

function seed(): DemoDb {
  const orders = structuredClone(demoOrders)
  const reviews = structuredClone(demoReviews)

  return {
    profiles: structuredClone(demoProfiles),
    businesses: calcularReputacion(structuredClone(demoBusinesses), orders, reviews),
    orders,
    reviews,
    vinculaciones: structuredClone(demoVinculaciones),
    direcciones: structuredClone(demoDirecciones),
    reportes: [],
    respuestas: [],
    sessionUserId: null,
  }
}

export function readDb(): DemoDb {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const fresh = seed()
      localStorage.setItem(KEY, JSON.stringify(fresh))
      return fresh
    }
    const parsed = JSON.parse(raw) as Partial<DemoDb>
    // Mezcla con un seed: si una sesión anterior guardó la base con un esquema
    // más viejo (p.ej. sin `direcciones` o `reportes`), los campos nuevos se rellenan con
    // sus valores iniciales en lugar de romper en `undefined`.
    const merged: DemoDb = {
      ...seed(),
      ...parsed,
      direcciones: parsed.direcciones ?? seed().direcciones,
      reportes: parsed.reportes ?? [],
      respuestas: parsed.respuestas ?? [],
    }
    localStorage.setItem(KEY, JSON.stringify(merged))
    return merged
  } catch {
    return seed()
  }
}

function writeDb(db: DemoDb): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* modo incógnito o cuota llena: la sesión sigue en memoria */
  }
}

export function mutateDb(fn: (db: DemoDb) => void): DemoDb {
  const db = readDb()
  fn(db)
  writeDb(db)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('conectacomuna:db-updated'))
  }
  return db
}


/** Latencia simulada: nos obliga a construir bien los estados de carga. */
export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}
