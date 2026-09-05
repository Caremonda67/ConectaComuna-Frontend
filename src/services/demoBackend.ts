/**
 * Backend simulado para el MODO DEMO.
 * Persiste en localStorage para que la experiencia (pedidos, reseñas, perfil)
 * se sienta real mientras el backend del otro repositorio está en construcción.
 * Toda mutación aquí replica exactamente la firma de los servicios Supabase.
 */
import { demoBusinesses, demoOrders, demoProfiles, demoReviews } from '@/data/demoData'
import type { Business, Order, Profile, Review } from '@/types'

const KEY = 'conectacomuna.demo.v1'

interface DemoDb {
  profiles: Profile[]
  businesses: Business[]
  orders: Order[]
  reviews: Review[]
  sessionUserId: string | null
}

function seed(): DemoDb {
  return {
    profiles: structuredClone(demoProfiles),
    businesses: structuredClone(demoBusinesses),
    orders: structuredClone(demoOrders),
    reviews: structuredClone(demoReviews),
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
    return JSON.parse(raw) as DemoDb
  } catch {
    return seed()
  }
}

export function writeDb(db: DemoDb): void {
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
  return db
}

export function resetDb(): void {
  localStorage.removeItem(KEY)
}

/** Latencia simulada: nos obliga a construir bien los estados de carga. */
export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}
