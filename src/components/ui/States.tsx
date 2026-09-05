import type { ReactNode } from 'react'
import { Button } from './Button'
import { AlertTriangle, Search, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

/** Estado vacío: nunca dejamos una pantalla en blanco sin explicar qué pasó. */
export function EmptyState({ icon: Icon = Search, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-[14px] border border-dashed border-ink-200 bg-white p-8 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600"
      >
        <Icon size={26} strokeWidth={1.75} />
      </span>
      <h3 className="mt-3 text-lg font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-[14px] border border-rose-200 bg-rose-50 p-6 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700"
      >
        <AlertTriangle size={24} strokeWidth={1.75} />
      </span>
      <h3 className="mt-2 font-semibold text-rose-900">Algo salió mal</h3>
      <p className="mt-1 text-sm text-rose-800">{message}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  )
}
