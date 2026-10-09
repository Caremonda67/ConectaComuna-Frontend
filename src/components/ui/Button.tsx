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
  primary: 'bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300 dark:disabled:bg-brand-900/50',
  secondary: 'bg-white text-ink-900 border border-ink-200 hover:bg-cream-200 dark:bg-cream-50 dark:text-ink-900 dark:border-ink-200 dark:hover:bg-cream-200',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50',
  danger: 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 dark:bg-cream-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/40',
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
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
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
