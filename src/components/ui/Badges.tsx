import type { Badge } from '@/types'
import { cn } from '@/lib/utils'

/**
 * La paleta del proyecto es de tres colores, así que las insignias se
 * diferencian por intensidad del verde y no por colores ajenos al sistema.
 */
const tones: Record<Badge['tone'], string> = {
  gold: 'bg-brand-200 text-brand-800 border-brand-300',
  silver: 'bg-cream-200 text-ink-700 border-ink-200',
  bronze: 'bg-cream-300 text-ink-700 border-ink-200',
  info: 'bg-brand-50 text-brand-700 border-brand-100',
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
