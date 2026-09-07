import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { businessService } from '@/services/businessService'
import { BusinessCard } from '@/components/business/BusinessCard'
import { BusinessFiltersBar } from '@/components/business/BusinessFiltersBar'
import { UbicacionPicker } from '@/components/location/UbicacionPicker'
import { guardarUbicacion, leerUbicacion, type UbicacionElegida } from '@/lib/ubicacion'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { COMUNA_CENTER, DEFAULT_RADIUS_KM } from '@/lib/env'
import type { BusinessFilters, CategorySlug } from '@/types'

/**
 * Los filtros viven en la URL (useSearchParams): la búsqueda es compartible
 * por WhatsApp y sobrevive al botón "atrás" del celular.
 */
export default function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const [ubicacion, setUbicacion] = useState<UbicacionElegida | null>(leerUbicacion)

  const elegirUbicacion = useCallback(
    (u: UbicacionElegida) => {
      guardarUbicacion(u)
      setUbicacion(u)
    },
    [],
  )

  const filters: BusinessFilters = useMemo(
    () => ({
      query: params.get('q') ?? '',
      category: (params.get('categoria') as CategorySlug | null) ?? 'all',
      minRating: Number(params.get('min') ?? 0) || undefined,
      radiusKm: Number(params.get('radio') ?? DEFAULT_RADIUS_KM),
      center: ubicacion?.center ?? COMUNA_CENTER,
      sort: (params.get('orden') as BusinessFilters['sort']) ?? 'distance',
    }),
    [params, ubicacion],
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

      <UbicacionPicker value={ubicacion} onChange={elegirUbicacion} />

      <BusinessFiltersBar
        filters={filters}
        onChange={onChange}
        hasLocation={!!ubicacion}
      />

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
