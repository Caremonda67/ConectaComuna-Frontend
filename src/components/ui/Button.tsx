import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-md hover:shadow-brand-500/25 active:bg-brand-700 disabled:bg-brand-300 dark:disabled:bg-brand-900/50',
  secondary:
    'bg-white text-ink-900 border border-ink-200 hover:border-brand-400 hover:bg-cream-100 hover:text-brand-900 hover:shadow-xs active:bg-cream-200 dark:bg-cream-50 dark:text-ink-900 dark:border-ink-200 dark:hover:border-brand-500/70 dark:hover:bg-cream-200',
  ghost:
    'bg-transparent text-brand-700 hover:bg-brand-50/80 hover:text-brand-800 dark:text-brand-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-300',
  danger:
    'bg-white text-rose-700 border border-rose-300 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800 hover:shadow-xs hover:shadow-rose-500/15 active:bg-rose-100 dark:bg-cream-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/40',
}

// min-h-11 ≈ 44px: área táctil mínima recomendada para uso con el pulgar.
const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3.5 text-sm',
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-12 px-5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none cursor-pointer overflow-hidden',
        // Transición suave inspirada en interfaces modernas táctiles
        'transition-all duration-200 ease-out',
        // Elevación en reposo sobre hover y compresión física al presionar
        'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
        // Anulación en estado inhabilitado
        'disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {/* Destello de luz suave (shine sweep) al pasar el cursor en botones primarios */}
      {variant === 'primary' && !disabled && !loading && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
      )}
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
