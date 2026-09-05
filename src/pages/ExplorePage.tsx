import { MapPin } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { useGeolocation } from '@/hooks/useGeolocation'
import { businessService } from '@/services/businessService'
import { BusinessCard } from '@/components/business/BusinessCard'
import { BusinessFiltersBar } from '@/components/business/BusinessFiltersBar'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { DEFAULT_RADIUS_KM } from '@/lib/env'
import type { BusinessFilters, CategorySlug } from '@/types'

/**
 * Los filtros viven en la URL (useSearchParams): la búsqueda es compartible
 * por WhatsApp y sobrevive al botón "atrás" del celular.
 */
export default function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const { position, status, request } = useGeolocation()

  const filters: BusinessFilters = useMemo(
    () => ({
      query: params.get('q') ?? '',
      category: (params.get('categoria') as CategorySlug | null) ?? 'all',
      minRating: Number(params.get('min') ?? 0) || undefined,
      radiusKm: Number(params.get('radio') ?? DEFAULT_RADIUS_KM),
      center: position,
      sort: (params.get('orden') as BusinessFilters['sort']) ?? 'distance',
    }),
    [params, position],
  )

  const { data, loading, error, reload } = useAsync(
    () => businessService.search(filters),
    [filters],
  )

  const onChange = useCallback(
    (patch: Partial<BusinessFilters>) => {
      const next = new URLSearchParams(params)
      if (patch.query !== undefined) {
        if (patch.query) next.set('q', patch.query)
        else next.delete('q')
      }
      if (patch.category !== undefined) {
        if (patch.category === 'all') next.delete('categoria')
        else next.set('categoria', patch.category)
      }
      if (patch.minRating !== undefined) {
        if (patch.minRating) next.set('min', String(patch.minRating))
        else next.delete('min')
      }
      if (patch.radiusKm !== undefined) next.set('radio', String(patch.radiusKm))
      if (patch.sort !== undefined) next.set('orden', patch.sort)
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Explorar oficios</h1>

      <BusinessFiltersBar
        filters={filters}
        onChange={onChange}
        hasLocation={status === 'granted'}
      />

      {status !== 'granted' && (
        <Button size="sm" variant="secondary" onClick={request} loading={status === 'locating'}>
          <MapPin aria-hidden="true" size={15} strokeWidth={1.75} />
          Ordenar por cercanía real
        </Button>
      )}

      <p aria-live="polite" className="text-sm text-ink-500">
        {loading ? 'Buscando…' : `${data?.length ?? 0} resultados`}
      </p>

      {loading && <CardSkeletonList count={4} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          title="No encontramos negocios con esos filtros"
          description="Prueba ampliando el radio o quitando la categoría."
          action={
            <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
              Limpiar filtros
            </Button>
          }
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}
    </div>
  )
}
