import type { Badge } from '@/types'
import { cn } from '@/lib/utils'

/**
 * La paleta del proyecto es de tres colores, así que las insignias se
 * diferencian por intensidad del verde y no por colores ajenos al sistema.
 */
const tones: Record<Badge['tone'], string> = {
  gold: 'bg-brand-200 dark:bg-brand-900/40 text-brand-800 dark:text-brand-300 border-brand-300 dark:border-brand-700/60',
  silver: 'bg-cream-200 dark:bg-cream-200/50 text-ink-700 dark:text-ink-300 border-ink-200',
  bronze: 'bg-cream-300 dark:bg-cream-300/40 text-ink-700 dark:text-ink-300 border-ink-200',
  info: 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-100 dark:border-brand-900/60',
  verified: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 font-semibold',
  danger: 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 font-semibold',
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
