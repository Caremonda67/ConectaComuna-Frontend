import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  count?: number
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Estrellas accesibles: las estrellas son decorativas (aria-hidden) y el valor
 * real se expone como texto para lectores de pantalla.
 */
export function RatingStars({ value, count, size = 'sm', className }: Props) {
  const rounded = Math.round(value)
  const px = size === 'md' ? 18 : 14
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={px}
            strokeWidth={1.5}
            className={n <= rounded ? 'text-brand-600' : 'text-ink-200'}
            fill="currentColor"
          />
        ))}
      </span>
      <span className="text-xs text-ink-500">
        {value > 0 ? value.toFixed(1) : 'Sin calificar'}
        {count != null && count > 0 && ` (${count})`}
      </span>
      <span className="sr-only">
        {value > 0
          ? `Calificación ${value.toFixed(1)} de 5${count ? `, ${count} reseñas` : ''}`
          : 'Todavía sin calificaciones'}
      </span>
    </span>
  )
}

interface InputProps {
  value: number
  onChange: (v: number) => void
}

/** Selector de calificación operable con teclado (radiogroup nativo). */
export function RatingInput({ value, onChange }: InputProps) {
  return (
    <fieldset className="flex items-center gap-1">
      <legend className="mb-1 text-sm font-medium text-ink-700">Tu calificación</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="cursor-pointer">
          <input
            type="radio"
            name="rating"
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            className="sr-only-focusable absolute"
          />
          <span
            aria-hidden="true"
            className={cn(
              'block',
              n <= value ? 'text-brand-600' : 'text-ink-200 hover:text-brand-300',
            )}
          >
            <Star size={30} strokeWidth={1.5} fill="currentColor" />
          </span>
          <span className="sr-only">{n} estrellas</span>
        </label>
      ))}
    </fieldset>
  )
}
