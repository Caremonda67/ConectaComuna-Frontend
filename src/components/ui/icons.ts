import type { LucideIcon } from 'lucide-react'
import {
  Award,
  BadgeCheck,
  Bike,
  Blocks,
  Calendar,
  Camera,
  ClipboardList,
  Compass,
  Handshake,
  Home,
  Images,
  Inbox,
  KeyRound,
  MapPin,
  Medal,
  MessageSquare,
  Scissors,
  Search,
  Shirt,
  ShoppingCart,
  Sparkles,
  Spool,
  Sprout,
  Star,
  Store,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react'

/**
 * Punto único de definición de iconos.
 *
 * Los componentes importan desde aquí y no desde `lucide-react` directamente.
 * Así el set de iconos se puede sustituir por completo tocando un solo archivo,
 * y evitamos que cada vista elija un icono distinto para el mismo concepto.
 */
export type { LucideIcon }

/** Iconos por categoría de oficio. */
export const CATEGORY_ICONS = {
  costura: Spool,
  manicure: Sparkles,
  cerrajeria: KeyRound,
  ropa: Shirt,
  ambulante: ShoppingCart,
  belleza: Scissors,
  comida: UtensilsCrossed,
  domicilios: Bike,
  tecnologia: Wrench,
  construccion: Blocks,
  otros: Store,
} as const satisfies Record<string, LucideIcon>

/** Iconos de insignias de reputación. */
export const BADGE_ICONS = {
  trophy: Award,
  silver: Medal,
  bronze: BadgeCheck,
  sprout: Sprout,
  star: Star,
  portfolio: Camera,
} as const satisfies Record<string, LucideIcon>

/** Iconos de navegación e interfaz general. */
export const UI_ICONS = {
  home: Home,
  search: Search,
  map: MapPin,
  dashboard: ClipboardList,
  compass: Compass,
  handshake: Handshake,
  calendar: Calendar,
  star: Star,
  message: MessageSquare,
  inbox: Inbox,
  gallery: Images,
  store: Store,
  tools: Wrench,
  person: BadgeCheck,
} as const satisfies Record<string, LucideIcon>
