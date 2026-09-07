import { useMemo, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { businessService } from '@/services/businessService'
import { LazyMap } from '@/components/map/LazyMap'
import { BusinessCard } from '@/components/business/BusinessCard'
import { UbicacionPicker } from '@/components/location/UbicacionPicker'
import { guardarUbicacion, leerUbicacion, type UbicacionElegida } from '@/lib/ubicacion'
import { CardSkeletonList, Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { COMUNA_CENTER } from '@/lib/env'
import { CATEGORIES } from '@/data/categories'
import type { CategorySlug } from '@/types'
import { UI_ICONS } from '@/components/ui/icons'

export default function MapPage() {
  const [ubicacion, setUbicacion] = useState<UbicacionElegida | null>(leerUbicacion)
  const [category, setCategory] = useState<CategorySlug | 'all'>('all')
  const [radiusKm, setRadiusKm] = useState(5)

  const elegirUbicacion = (u: UbicacionElegida) => {
    guardarUbicacion(u)
    setUbicacion(u)
  }

  const center = ubicacion?.center ?? COMUNA_CENTER

  const filters = useMemo(
    () => ({ category, center, radiusKm, sort: 'distance' as const }),
    [category, center, radiusKm],
  )

  const { data, loading, error, reload } = useAsync(
    () => businessService.search(filters),
    [filters],
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mapa de la comuna</h1>

      <UbicacionPicker value={ubicacion} onChange={elegirUbicacion} />

      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-ink-700">
          Oficio
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategorySlug | 'all')}
            className="ml-2 min-h-9 rounded-lg border border-ink-200 bg-white px-2 text-sm"
          >
            <option value="all">Todos</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-700">
          Radio
          <select
            value={String(radiusKm)}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="ml-2 min-h-9 rounded-lg border border-ink-200 bg-white px-2 text-sm"
          >
            <option value="1">1 km</option>
            <option value="3">3 km</option>
            <option value="5">5 km</option>
            <option value="20">Toda la ciudad</option>
          </select>
        </label>
      </div>

      {/*
        El mapa NO se desmonta durante la carga: si lo reemplazáramos por un
        skeleton en cada cambio de filtro, Leaflet se destruiría y recrearía
        una y otra vez (parpadeo, tiles recargados y pérdida del zoom/paneo).
        Solo mostramos el skeleton en la primera carga, cuando aún no hay datos.
      */}
      {loading && !data ? (
        <Skeleton className="w-full rounded-[14px]" style={{ height: '55vh' }} />
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <LazyMap
            businesses={data ?? []}
            center={center}
            height="55vh"
            showUser={ubicacion?.origen === 'gps'}
          />
        </div>
      )}

      <section aria-label="Negocios visibles en el mapa">
        <h2 className="mb-2 text-lg font-bold">Negocios cercanos</h2>
        {loading && <CardSkeletonList count={2} />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && (data?.length ?? 0) === 0 && (
          <EmptyState
            icon={UI_ICONS.map}
            title="Ningún negocio en este radio"
            description="Amplía el radio de búsqueda para ver más opciones."
          />
        )}
        <div className="grid gap-3">
          {(data ?? []).slice(0, 10).map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      </section>
    </div>
  )
}
