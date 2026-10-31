import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { businessService } from '@/services/businessService'
import { BusinessCard } from '@/components/business/BusinessCard'
import { BusinessFiltersBar } from '@/components/business/BusinessFiltersBar'
import { UbicacionPicker } from '@/components/location/UbicacionPicker'
import { useUbicacionElegida } from '@/hooks/useUbicacionElegida'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { TextoRotativo } from '@/components/ui/TextoRotativo'
import { CATEGORIES } from '@/data/categories'
import { Button } from '@/components/ui/Button'
import { COMUNA_CENTER, DEFAULT_RADIUS_KM } from '@/lib/env'
import { estaFueraDelPiloto, PUNTO_PILOTO } from '@/lib/zonaPiloto'
import { usePageMeta } from '@/hooks/usePageMeta'
import type { BusinessFilters, CategorySlug } from '@/types'

/** Se leen del catálogo real para que no puedan prometer lo que no existe. */
const SUGERENCIAS = CATEGORIES.slice(0, 6).map((c) => c.name)

/**
 * Los filtros viven en la URL (useSearchParams): la búsqueda es compartible
 * por WhatsApp y sobrevive al botón "atrás" del celular.
 */
export default function ExplorePage() {
  usePageMeta({
    title: 'Explorar oficios en tu comuna',
    description: 'Directorio barrial de oficios y servicios en Cali. Filtra por categoría, ubicación y disponibilidad.',
  })

  const [params, setParams] = useSearchParams()
  const [ubicacion, elegirUbicacion] = useUbicacionElegida()

  const filters: BusinessFilters = useMemo(
    () => ({
      query: params.get('q') ?? '',
      category: (params.get('categoria') as CategorySlug | null) ?? 'all',
      minRating: Number(params.get('min') ?? 0) || undefined,
      radiusKm: Number(params.get('radio') ?? DEFAULT_RADIUS_KM),
      center: ubicacion?.center ?? COMUNA_CENTER,
      sort: (params.get('orden') as BusinessFilters['sort']) ?? 'distance',
      openNow: params.get('abierto') === '1',
      wholesaleOnly: params.get('mayor') === '1',
    }),
    [params, ubicacion],
  )

  const fueraDelPiloto = estaFueraDelPiloto(ubicacion?.center)

  // El buscador escribe letra por letra. La URL se actualiza al instante, pero
  // la consulta espera 250 ms desde la última tecla: antes iba una petición a
  // Supabase por cada pulsación.
  const [busquedaDiferida, setBusquedaDiferida] = useState(filters.query)

  useEffect(() => {
    const espera = setTimeout(() => setBusquedaDiferida(filters.query), 250)
    return () => clearTimeout(espera)
  }, [filters.query])

  const filtrosParaBuscar = useMemo(
    () => (busquedaDiferida === filters.query ? filters : { ...filters, query: busquedaDiferida }),
    [filters, busquedaDiferida],
  )

  const { data, loading, error, reload } = useAsync(
    () => businessService.search(filtrosParaBuscar),
    [filtrosParaBuscar],
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
      if (patch.openNow !== undefined) {
        if (patch.openNow) next.set('abierto', '1')
        else next.delete('abierto')
      }
      if (patch.wholesaleOnly !== undefined) {
        if (patch.wholesaleOnly) next.set('mayor', '1')
        else next.delete('mayor')
      }
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
        {loading
          ? 'Buscando…'
          : `${data?.length ?? 0} ${(data?.length ?? 0) === 1 ? 'resultado' : 'resultados'}`}
      </p>

      {loading && <CardSkeletonList count={4} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          title={
            fueraDelPiloto
              ? `No hay negocios registrados aún en ${ubicacion?.etiqueta}`
              : filters.openNow
              ? 'No hay negocios abiertos en este momento'
              : 'No encontramos negocios con esos filtros'
          }
          description={
            fueraDelPiloto
              ? 'ConectaComuna opera actualmente su fase piloto territorial en la Comuna de Cali. Puedes explorar los oficios y talleres del piloto con un toque:'
              : filters.openNow
              ? 'En este horario los talleres se encuentran cerrados. Desactiva «Solo abiertos ahora» para ver todos los oficios disponibles y coordinar por WhatsApp.'
              : filters.wholesaleOnly
                ? 'No encontramos opciones con venta al por mayor para esta combinación. Desactiva el filtro mayorista o prueba en otra categoría.'
                : filters.query
                  ? `No hubo coincidencias para «${filters.query}». Revisa la ortografía o limpia los filtros de búsqueda.`
                  : 'Prueba ampliando el radio de búsqueda o cambiando la categoría seleccionada.'
          }
          hint={
            // Un callejón sin salida no dice qué sí existe. Las sugerencias
            // salen del catálogo real de categorías, no de una lista aparte,
            // y no son pulsables a propósito: un blanco en movimiento es
            // peor que ninguno. Los botones de abajo siguen quietos.
            fueraDelPiloto ? undefined : (
              <>
                Prueba con{' '}
                <TextoRotativo
                  enLinea
                  items={SUGERENCIAS}
                  // Sin repetir el "Prueba con" que ya esta escrito al lado:
                  // un lector de pantalla leia "Prueba con Prueba con...".
                  etiqueta={`${SUGERENCIAS.join(', ')}.`}
                  className="inline-block font-semibold text-brand-700"
                />
              </>
            )
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {fueraDelPiloto && (
                <Button
                  variant="primary"
                  onClick={() =>
                    elegirUbicacion({ ...PUNTO_PILOTO, origen: 'busqueda' })
                  }
                >
                  Ver comercios del piloto (Cali)
                </Button>
              )}
              {filters.openNow && (
                <Button variant="primary" onClick={() => onChange({ openNow: false })}>
                  Ver todos los negocios
                </Button>
              )}
              {filters.wholesaleOnly && (
                <Button variant="primary" onClick={() => onChange({ wholesaleOnly: false })}>
                  Quitar filtro mayorista
                </Button>
              )}
              <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                Limpiar filtros
              </Button>
            </div>
          }
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 animate-fade-in">
          {data.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}
    </div>
  )
}
