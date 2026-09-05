import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/** Skeleton: mantiene la altura del contenido para evitar saltos de layout (CLS). */
export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn('animate-pulse rounded-lg bg-cream-300', className)}
    />
  )
}

export function CardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Cargando resultados" className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 card p-3">
          <Skeleton className="h-20 w-20 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
