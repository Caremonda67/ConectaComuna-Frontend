import type { Badge } from '@/types'
import { cn } from '@/lib/utils'

/**
 * La paleta del proyecto es de tres colores, así que las insignias se
 * diferencian por intensidad del verde y no por colores ajenos al sistema.
 */
const tones: Record<Badge['tone'], string> = {
  gold: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/60 font-semibold',
  silver: 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700/60 font-medium',
  bronze: 'bg-orange-50 dark:bg-orange-950/50 text-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800/60 font-medium',
  info: 'bg-brand-100 dark:bg-brand-100 text-brand-800 dark:text-brand-800 border-brand-200 dark:border-brand-200 font-medium',
  verified: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700/60 font-semibold',
  danger: 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700/60 font-semibold',
}

export function BadgePill({ badge }: { badge: Badge }) {
  const Icon = badge.icon
  return (
    <span
      title={badge.description}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[badge.tone],
      )}
    >
      <Icon aria-hidden="true" size={14} strokeWidth={2} />
      {badge.label}
    </span>
  )
}

export function BadgeList({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Insignias del negocio">
      {badges.map((b) => (
        <li key={b.id}>
          <BadgePill badge={b} />
        </li>
      ))}
    </ul>
  )
}
