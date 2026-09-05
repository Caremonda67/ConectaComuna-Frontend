import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { MapPin } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { useGeolocation } from '@/hooks/useGeolocation'
import { businessService } from '@/services/businessService'
import { CATEGORIES } from '@/data/categories'
import { CATEGORY_ICONS } from '@/components/ui/icons'
import { BusinessCard } from '@/components/business/BusinessCard'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { DEFAULT_RADIUS_KM } from '@/lib/env'

export default function HomePage() {
  const { profile } = useAuth()
  const { position, status, request } = useGeolocation()

  const filters = useMemo(
    () => ({ center: position, radiusKm: DEFAULT_RADIUS_KM, sort: 'rating' as const }),
    [position],
  )

  const { data, loading, error, reload } = useAsync(
    () => businessService.search(filters),
    [filters],
  )

  const featured = data?.slice(0, 4) ?? []

  return (
    <div className="space-y-12">
      {/* Hero: titular a dos tonos, como en el diseño. */}
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            Tu comuna, más conectada
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] sm:text-5xl">
            {profile ? (
              <>
                Hola, {profile.full_name.split(' ')[0]}
                <span className="block text-brand-600">¿qué necesitas hoy?</span>
              </>
            ) : (
              <>
                Servicios locales,
                <span className="block text-brand-600">personas reales.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-md text-ink-500">
            Conecta con quienes ofrecen y necesitan servicios en tu comuna. Fácil, rápido y
            seguro.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/explorar">
              <Button size="lg">Explorar servicios</Button>
            </Link>
            <Link to={profile ? '/panel/negocio' : '/registro'}>
              <Button size="lg" variant="secondary">
                Publicar servicio
              </Button>
            </Link>
          </div>
        </div>

        {/* Ilustración construida con CSS e iconos: sin imágenes que descargar. */}
        <div
          aria-hidden="true"
          className="relative hidden h-64 overflow-hidden rounded-[14px] bg-brand-50 lg:block"
        >
          <span className="absolute left-12 top-12 flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
            <CATEGORY_ICONS.costura size={30} strokeWidth={1.5} />
          </span>
          <span className="absolute right-20 top-16 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
            <CATEGORY_ICONS.manicure size={26} strokeWidth={1.5} />
          </span>
          <span className="absolute bottom-12 left-28 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
            <CATEGORY_ICONS.cerrajeria size={26} strokeWidth={1.5} />
          </span>
          <span className="absolute bottom-16 right-14 flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
            <CATEGORY_ICONS.ambulante size={30} strokeWidth={1.5} />
          </span>
          <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-500 text-white">
            <MapPin size={36} strokeWidth={1.75} />
          </span>
        </div>
      </section>

      {status !== 'granted' && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-ink-700">
            Activa tu ubicación para ver quién está más cerca de ti.
          </p>
          <Button size="sm" variant="secondary" onClick={request} loading={status === 'locating'}>
            Usar mi ubicación
          </Button>
        </div>
      )}

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-4 text-2xl font-bold">
          Explora por categoría
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.slice(0, 7).map((c) => (
            <li key={c.slug}>
              <Link
                to={`/explorar?categoria=${c.slug}`}
                className="card flex min-h-28 flex-col items-center justify-center gap-2 p-3 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700"
                >
                  <c.icon size={20} strokeWidth={1.75} />
                </span>
                <span className="text-xs font-medium text-ink-700">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="destacados">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="destacados" className="text-2xl font-bold">
            Servicios destacados
          </h2>
          <Link to="/explorar" className="text-sm font-medium text-brand-700 hover:underline">
            Ver todos
          </Link>
        </div>

        {loading && <CardSkeletonList count={3} />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && featured.length === 0 && (
          <EmptyState
            title="Todavía no hay negocios cerca"
            description="Sé el primero en publicar tu oficio en esta zona."
            action={
              <Link to="/registro">
                <Button>Crear mi negocio</Button>
              </Link>
            }
          />
        )}
        {!loading && !error && featured.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((b) => (
              <li key={b.id}>
                <BusinessCard business={b} layout="tile" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Llamado a la acción con fondo verde claro (bloque 1 del diseño). */}
      <section className="card-soft flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-bold">¿Ofreces un servicio?</h2>
          <p className="text-sm text-ink-700">
            Publica tu servicio y conecta con personas de tu comuna.
          </p>
        </div>
        <Link to={profile ? '/panel/negocio' : '/registro'}>
          <Button>Publicar servicio</Button>
        </Link>
      </section>
    </div>
  )
}
