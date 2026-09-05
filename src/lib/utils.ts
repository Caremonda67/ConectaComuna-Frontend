import { BADGE_ICONS } from '@/components/ui/icons'
import type { Badge, Business, Coordinates, OrderStatus } from '@/types'

/** Une clases condicionales sin dependencias extra (evitamos peso de clsx). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Distancia Haversine en km. Suficiente y barata para el radio de una comuna. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(km: number | null): string {
  if (km == null) return 'Distancia no disponible'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export function formatCurrency(value: number | null): string {
  if (value == null) return 'A convenir'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  in_progress: 'En proceso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
}

/**
 * Estados dentro de la paleta: el avance del trabajo se lee como una escala
 * de verde que se intensifica, y solo "cancelado" sale del sistema (rosa)
 * porque necesita leerse como excepción.
 */
export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-cream-200 text-ink-700 border border-ink-200',
  accepted: 'bg-brand-50 text-brand-700 border border-brand-100',
  in_progress: 'bg-brand-100 text-brand-800 border border-brand-200',
  completed: 'bg-brand-500 text-white border border-brand-600',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
}

/** Transiciones válidas de estado; la UI solo muestra acciones permitidas. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

/**
 * Reputación: rango + insignias derivadas de calificación y trabajos hechos.
 * Se calcula en cliente a partir de columnas agregadas (rating_avg,
 * rating_count, completed_orders) que el backend mantiene con triggers.
 */
export function getBadges(business: Business): Badge[] {
  const badges: Badge[] = []

  if (business.completed_orders >= 50) {
    badges.push({
      id: 'rank-gold',
      label: 'Maestro de la comuna',
      description: '50+ servicios finalizados',
      icon: BADGE_ICONS.trophy,
      tone: 'gold',
    })
  } else if (business.completed_orders >= 15) {
    badges.push({
      id: 'rank-silver',
      label: 'Reconocido',
      description: '15+ servicios finalizados',
      icon: BADGE_ICONS.silver,
      tone: 'silver',
    })
  } else if (business.completed_orders >= 3) {
    badges.push({
      id: 'rank-bronze',
      label: 'En crecimiento',
      description: '3+ servicios finalizados',
      icon: BADGE_ICONS.bronze,
      tone: 'bronze',
    })
  } else {
    badges.push({
      id: 'rank-new',
      label: 'Nuevo en la comuna',
      description: 'Apenas comienza, ¡dale una oportunidad!',
      icon: BADGE_ICONS.sprout,
      tone: 'info',
    })
  }

  if (business.rating_avg >= 4.7 && business.rating_count >= 5) {
    badges.push({
      id: 'top-rated',
      label: 'Excelente trato',
      description: `${business.rating_avg.toFixed(1)} estrellas promedio`,
      icon: BADGE_ICONS.star,
      tone: 'gold',
    })
  }

  if (business.photos.length >= 3) {
    badges.push({
      id: 'portfolio',
      label: 'Portafolio completo',
      description: 'Muestra su trabajo con fotos',
      icon: BADGE_ICONS.portfolio,
      tone: 'info',
    })
  }

  return badges
}

/** % de completitud del perfil: base de la "gestión asistida". */
export function profileCompletion(business: Business): {
  percent: number
  missing: string[]
} {
  const checks: Array<[boolean, string]> = [
    [business.name.trim().length > 2, 'Ponle un nombre claro a tu negocio'],
    [
      business.description.trim().length >= 40,
      'Describe tu servicio en al menos 40 caracteres',
    ],
    [Boolean(business.phone || business.whatsapp), 'Agrega un teléfono o WhatsApp'],
    [business.photos.length > 0, 'Sube al menos una foto de tu trabajo'],
    [business.photos.length >= 3, 'Sube 3 fotos para un portafolio convincente'],
    [Boolean(business.address), 'Indica tu dirección o punto de referencia'],
    [business.hours.some((h) => !h.closed), 'Define tus horarios de atención'],
  ]
  const done = checks.filter(([ok]) => ok).length
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([ok]) => !ok).map(([, msg]) => msg),
  }
}

export const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
