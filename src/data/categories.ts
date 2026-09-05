import { CATEGORY_ICONS, type LucideIcon } from '@/components/ui/icons'
import type { Category } from '@/types'

export const CATEGORIES: Category[] = [
  { slug: 'costura', name: 'Costura y arreglos', icon: CATEGORY_ICONS.costura },
  { slug: 'manicure', name: 'Manicure y pedicure', icon: CATEGORY_ICONS.manicure },
  { slug: 'cerrajeria', name: 'Cerrajería y guardas', icon: CATEGORY_ICONS.cerrajeria },
  { slug: 'ropa', name: 'Venta de ropa', icon: CATEGORY_ICONS.ropa },
  { slug: 'ambulante', name: 'Venta ambulante', icon: CATEGORY_ICONS.ambulante },
  { slug: 'belleza', name: 'Belleza y peluquería', icon: CATEGORY_ICONS.belleza },
  { slug: 'comida', name: 'Comida casera', icon: CATEGORY_ICONS.comida },
  { slug: 'domicilios', name: 'Domicilios y mandados', icon: CATEGORY_ICONS.domicilios },
  { slug: 'tecnologia', name: 'Reparación tecnológica', icon: CATEGORY_ICONS.tecnologia },
  { slug: 'construccion', name: 'Obra y mantenimiento', icon: CATEGORY_ICONS.construccion },
  { slug: 'otros', name: 'Otros oficios', icon: CATEGORY_ICONS.otros },
]

export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.slug, c]))

export function categoryLabel(slug: string): string {
  return CATEGORY_MAP.get(slug as Category['slug'])?.name ?? 'Otros oficios'
}

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_MAP.get(slug as Category['slug'])?.icon ?? CATEGORY_ICONS.otros
}
