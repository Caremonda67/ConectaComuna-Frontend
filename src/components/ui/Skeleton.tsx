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
      className={cn('rounded-lg bg-cream-300 animate-shimmer', className)}
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

/** Filas compactas: listas sin miniatura (reportes, negocios apadrinados). */
export function RowSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

/**
 * Formulario en carga. Dibuja la forma que va a ocupar el contenido real, de
 * modo que al llegar los datos nada se mueve de sitio.
 */
export function FormSkeleton({ campos = 5 }: { campos?: number }) {
  return (
    <div role="status" aria-label="Cargando formulario" className="space-y-5">
      <Skeleton className="h-7 w-52" />
      <div className="space-y-4">
        {Array.from({ length: campos }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-40" />
    </div>
  )
}
