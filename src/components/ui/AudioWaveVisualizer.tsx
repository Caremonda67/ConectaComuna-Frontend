import { cn } from '@/lib/utils'

interface Props {
  active?: boolean
  className?: string
  barClassName?: string
}

export function AudioWaveVisualizer({
  active = true,
  className,
  barClassName,
}: Props) {
  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'inline-flex items-end gap-1 h-4 px-1.5 py-0.5 rounded-md bg-emerald-600/15 dark:bg-emerald-500/20',
        className
      )}
      title="Audio activo"
    >
      <span className={cn('w-0.5 sm:w-1 bg-emerald-600 dark:bg-emerald-400 rounded-full h-full animate-wave-1', barClassName)} />
      <span className={cn('w-0.5 sm:w-1 bg-emerald-600 dark:bg-emerald-400 rounded-full h-full animate-wave-2', barClassName)} />
      <span className={cn('w-0.5 sm:w-1 bg-emerald-600 dark:bg-emerald-400 rounded-full h-full animate-wave-3', barClassName)} />
      <span className={cn('w-0.5 sm:w-1 bg-emerald-600 dark:bg-emerald-400 rounded-full h-full animate-wave-4', barClassName)} />
    </div>
  )
}
