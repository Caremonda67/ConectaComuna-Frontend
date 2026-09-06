/**
 * Tipos del dominio de ConectaComuna.
 * Espejo del esquema Postgres de Supabase (ver supabase/schema.sql).
 * Cuando el repo de backend genere tipos con `supabase gen types typescript`,
 * estos se pueden reemplazar por los generados sin tocar la UI.
 */
import type { LucideIcon } from 'lucide-react'

export type AccountType = 'client' | 'business' | 'facilitador'

/** Rol activo en sesión. Un usuario "business" puede actuar como cliente (rol dual). */
export type ActiveRole = 'client' | 'business'

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type CategorySlug =
  | 'costura'
  | 'manicure'
  | 'cerrajeria'
  | 'ropa'
  | 'ambulante'
  | 'belleza'
  | 'comida'
  | 'domicilios'
  | 'tecnologia'
  | 'construccion'
  | 'otros'

export interface Category {
  slug: CategorySlug
  name: string
  icon: LucideIcon
}

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  account_type: AccountType
  neighborhood: string | null
  created_at: string
}

export interface BusinessHours {
  /** 0 = domingo ... 6 = sábado */
  day: number
  opens: string | null
  closes: string | null
  closed: boolean
}

export interface Business {
  id: string
  owner_id: string
  name: string
  description: string
  category: CategorySlug
  phone: string | null
  whatsapp: string | null
  address: string | null
  neighborhood: string | null
  lat: number
  lng: number
  photos: string[]
  hours: BusinessHours[]
  rating_avg: number
  rating_count: number
  completed_orders: number
  verification_status: 'unverified' | 'pending_review' | 'verified' | 'rejected'
  verification_score?: number | null
  verification_selfie_url?: string | null
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  business_id: string
  client_id: string
  title: string
  description: string
  status: OrderStatus
  scheduled_for: string | null
  price_estimate: number | null
  created_at: string
  updated_at: string
  /** Relaciones embebidas por Supabase (select con joins). */
  business?: Pick<Business, 'id' | 'name' | 'category' | 'photos'>
  client?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  review?: Review | null
}

export interface Review {
  id: string
  order_id: string
  business_id: string
  client_id: string
  rating: number
  comment: string | null
  created_at: string
  client?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface Badge {
  id: string
  label: string
  description: string
  icon: LucideIcon
  tone: 'bronze' | 'silver' | 'gold' | 'info'
}

export interface Coordinates {
  lat: number
  lng: number
}

/** Filtros de la búsqueda/exploración. */
export interface BusinessFilters {
  query?: string
  category?: CategorySlug | 'all'
  minRating?: number
  /** Radio en km desde `center`. */
  radiusKm?: number
  center?: Coordinates | null
  sort?: 'distance' | 'rating' | 'recent'
}

export interface BusinessWithDistance extends Business {
  distanceKm: number | null
}

export type FacilitadorStatus = 'pendiente' | 'aprobado' | 'rechazado'

export interface FacilitadorNegocio {
  id: string
  negocio_id: string
  facilitador_id: string
  estado_vinculacion: FacilitadorStatus
  creado_en: string
}
