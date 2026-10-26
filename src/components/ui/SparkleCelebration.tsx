import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

interface Props {
  active?: boolean
  className?: string
}

export function SparkleCelebration({ active = true, className }: Props) {
  const prefersReduced = useReducedMotion()

  if (!active || prefersReduced) return null

  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {[
        { x: '15%', y: '20%', delay: 0.05, size: 14, color: 'text-amber-400' },
        { x: '82%', y: '28%', delay: 0.15, size: 16, color: 'text-emerald-400' },
        { x: '30%', y: '75%', delay: 0.22, size: 12, color: 'text-emerald-300' },
        { x: '75%', y: '70%', delay: 0.12, size: 14, color: 'text-amber-300' },
        { x: '50%', y: '15%', delay: 0.18, size: 18, color: 'text-emerald-400' },
      ].map((s, idx) => (
        <motion.span
          key={idx}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{ scale: [0, 1.2, 0.9, 0], opacity: [0, 1, 1, 0], rotate: [0, 45, 90] }}
          transition={{ duration: 1.1, delay: s.delay, ease: 'easeOut' }}
          style={{ left: s.x, top: s.y }}
          className={cn('absolute -translate-x-1/2 -translate-y-1/2', s.color)}
        >
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </motion.span>
      ))}
    </div>
  )
}
