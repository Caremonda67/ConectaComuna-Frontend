import { CATEGORY_ICONS, type LucideIcon } from '@/components/ui/icons'
import type { Category } from '@/types'

export const CATEGORIES: Category[] = [
  {
    slug: 'costura',
    name: 'Costura y arreglos',
    icon: CATEGORY_ICONS.costura,
    style: {
      iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white',
      hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-700',
      hoverBg: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
      hoverText: 'group-hover:text-indigo-900 dark:group-hover:text-indigo-200',
    },
  },
  {
    slug: 'manicure',
    name: 'Manicure y pedicure',
    icon: CATEGORY_ICONS.manicure,
    style: {
      iconBg: 'bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300 group-hover:bg-pink-600 group-hover:text-white',
      hoverBorder: 'hover:border-pink-300 dark:hover:border-pink-700',
      hoverBg: 'hover:bg-pink-50/50 dark:hover:bg-pink-950/20',
      hoverText: 'group-hover:text-pink-900 dark:group-hover:text-pink-200',
    },
  },
  {
    slug: 'cerrajeria',
    name: 'Cerrajería y guardas',
    icon: CATEGORY_ICONS.cerrajeria,
    style: {
      iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 group-hover:bg-amber-600 group-hover:text-white',
      hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
      hoverBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
      hoverText: 'group-hover:text-amber-900 dark:group-hover:text-amber-200',
    },
  },
  {
    slug: 'ropa',
    name: 'Venta de ropa',
    icon: CATEGORY_ICONS.ropa,
    style: {
      iconBg: 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 group-hover:bg-violet-600 group-hover:text-white',
      hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700',
      hoverBg: 'hover:bg-violet-50/50 dark:hover:bg-violet-950/20',
      hoverText: 'group-hover:text-violet-900 dark:group-hover:text-violet-200',
    },
  },
  {
    slug: 'ambulante',
    name: 'Venta ambulante',
    icon: CATEGORY_ICONS.ambulante,
    style: {
      iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white',
      hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
      hoverText: 'group-hover:text-emerald-900 dark:group-hover:text-emerald-200',
    },
  },
  {
    slug: 'belleza',
    name: 'Belleza y peluquería',
    icon: CATEGORY_ICONS.belleza,
    style: {
      iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 group-hover:bg-rose-600 group-hover:text-white',
      hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700',
      hoverBg: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
      hoverText: 'group-hover:text-rose-900 dark:group-hover:text-rose-200',
    },
  },
  {
    slug: 'comida',
    name: 'Comida casera',
    icon: CATEGORY_ICONS.comida,
    style: {
      iconBg: 'bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300 group-hover:bg-orange-600 group-hover:text-white',
      hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700',
      hoverBg: 'hover:bg-orange-50/50 dark:hover:bg-orange-950/20',
      hoverText: 'group-hover:text-orange-900 dark:group-hover:text-orange-200',
    },
  },
  {
    slug: 'domicilios',
    name: 'Domicilios y mandados',
    icon: CATEGORY_ICONS.domicilios,
    style: {
      iconBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 group-hover:bg-teal-600 group-hover:text-white',
      hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
      hoverBg: 'hover:bg-teal-50/50 dark:hover:bg-teal-950/20',
      hoverText: 'group-hover:text-teal-900 dark:group-hover:text-teal-200',
    },
  },
  {
    slug: 'tecnologia',
    name: 'Reparación tecnológica',
    icon: CATEGORY_ICONS.tecnologia,
    style: {
      iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 group-hover:bg-sky-600 group-hover:text-white',
      hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-700',
      hoverBg: 'hover:bg-sky-50/50 dark:hover:bg-sky-950/20',
      hoverText: 'group-hover:text-sky-900 dark:group-hover:text-sky-200',
    },
  },
  {
    slug: 'construccion',
    name: 'Obra y mantenimiento',
    icon: CATEGORY_ICONS.construccion,
    style: {
      iconBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-slate-600 group-hover:text-white',
      hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-700',
      hoverBg: 'hover:bg-slate-50/50 dark:hover:bg-slate-900/20',
      hoverText: 'group-hover:text-slate-900 dark:group-hover:text-slate-200',
    },
  },
  {
    slug: 'otros',
    name: 'Otros oficios',
    icon: CATEGORY_ICONS.otros,
    style: {
      iconBg: 'bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300 group-hover:bg-brand-600 group-hover:text-white',
      hoverBorder: 'hover:border-brand-300 dark:hover:border-brand-700',
      hoverBg: 'hover:bg-brand-50/50 dark:hover:bg-brand-950/20',
      hoverText: 'group-hover:text-brand-900 dark:group-hover:text-brand-200',
    },
  },
]

export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.slug, c]))

export function categoryLabel(slug: string): string {
  return CATEGORY_MAP.get(slug as Category['slug'])?.name ?? 'Otros oficios'
}

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_MAP.get(slug as Category['slug'])?.icon ?? CATEGORY_ICONS.otros
}
