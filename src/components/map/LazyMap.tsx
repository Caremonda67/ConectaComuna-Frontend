import { lazy, Suspense, type ComponentProps } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import type BusinessMap from './BusinessMap'

/**
 * Leaflet pesa ~150 KB. Lo cargamos bajo demanda: quien solo usa la lista
 * nunca descarga el mapa.
 */
const Map = lazy(() => import('./BusinessMap'))

export function LazyMap(props: ComponentProps<typeof BusinessMap>) {
  return (
    <Suspense
      fallback={
        // Reservamos la altura exacta del mapa para evitar saltos de layout.
        <Skeleton className="w-full rounded-2xl" style={{ height: props.height ?? '60vh' }} />
      }
    >
      <Map {...props} />
    </Suspense>
  )
}
