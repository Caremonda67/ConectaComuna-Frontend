import { Link } from 'react-router-dom'
import { MapPin, Award, Sprout } from 'lucide-react'
import { categoryLabel } from '@/data/categories'
import { CategoryGlyph } from '@/components/ui/CategoryGlyph'
import { formatDistance, getBusinessOpenStatus, cn } from '@/lib/utils'
import { RatingStars } from '@/components/ui/Rating'
import { UI_ICONS } from '@/components/ui/icons'
import { COMUNA_CENTER } from '@/lib/env'
import type { Business, BusinessWithDistance } from '@/types'

/**
 * Los negocios que nunca marcaron su punto quedaron guardados con el centro
 * de la comuna, así que mostrar una distancia desde ahí sería inventar.
 */
function sinUbicacionPropia(business: Business): boolean {
  return (
    Math.abs(business.lat - COMUNA_CENTER.lat) < 0.0001 &&
    Math.abs(business.lng - COMUNA_CENTER.lng) < 0.0001
  )
}

interface Props {
  business: BusinessWithDistance
  /** 'row' para listas de resultados; 'tile' para las rejillas destacadas. */
  layout?: 'row' | 'tile'
}

export function BusinessCard({ business, layout = 'row' }: Props) {
  const cover = business.photos[0]
  const openStatus = getBusinessOpenStatus(business.hours)

  const meta = (
    <>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
        <h3 className="font-semibold text-ink-900 min-w-0 line-clamp-1">{business.name}</h3>
        {business.verification_status === 'verified' && (
          <span
            title="Oficio verificado en territorio por un facilitador de la red"
            className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300"
          >
            <UI_ICONS.shieldCheck size={11} className="text-emerald-700 dark:text-emerald-400" />
            Mano de obra verificada
          </span>
        )}
        {business.completed_orders >= 10 && (
          <span
            title="Artesano con trayectoria destacada en la comuna"
            className="inline-flex items-center gap-1 shrink-0 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300"
          >
            <Award size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
            Oficio tradicional
          </span>
        )}
        {business.verification_status === 'under_review' && (
          <span
            title="Bajo observación comunitaria"
            className="inline-flex items-center gap-1 shrink-0 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300"
          >
            <UI_ICONS.alert size={11} className="text-amber-700 dark:text-amber-400" />
            En revisión
          </span>
        )}
        {business.wholesale_enabled && (
          <span
            title={business.wholesale_min_order ? `Mayorista: ${business.wholesale_min_order}` : 'Vende al por mayor'}
            className="inline-flex items-center gap-1 shrink-0 rounded-full bg-brand-50 border border-brand-200 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800"
          >
            <UI_ICONS.package size={11} className="text-brand-600 shrink-0" />
            Por mayor
          </span>
        )}
      </div>
      <p className="truncate text-xs text-ink-500">{categoryLabel(business.category)}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* Cero reseñas no es "nadie lo recomienda", es "acaba de entrar". Las
            estrellas vacías leían a negocio abandonado en todo el directorio. */}
        {business.rating_count > 0 ? (
          <RatingStars value={business.rating_avg} count={business.rating_count} />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/60 px-2 py-0.5 text-[11px] font-medium text-brand-800 dark:text-brand-300">
            <Sprout size={12} className="shrink-0 text-brand-600 dark:text-brand-400" />
            Nuevo en la comuna
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {business.neighborhood && (
          <span className="flex items-center gap-1 truncate text-ink-500">
            <MapPin aria-hidden="true" size={13} strokeWidth={1.75} className="shrink-0" />
            {business.neighborhood}
            {business.distanceKm != null &&
              (sinUbicacionPropia(business)
                ? ' · Ubicación por confirmar'
                : ` · ${formatDistance(business.distanceKm)}`)}
          </span>
        )}
        {business.hours && business.hours.length > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md',
              openStatus.isOpen
                ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60'
                : 'text-ink-600 bg-cream-200 border border-ink-200',
            )}
            title={openStatus.detail ?? openStatus.label}
          >
            {openStatus.isOpen ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-ink-400 shrink-0" />
            )}
            {openStatus.isOpen ? 'En taller · Abierto' : openStatus.label}
          </span>
        )}
      </div>
    </>
  )

  if (layout === 'tile') {
    return (
      <article className="card h-full overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-cream-50 shadow-warm-sm hover:shadow-warm-md hover:border-brand-400 transition-all duration-200 hover:-translate-y-0.5">
        <Link to={`/negocio/${business.id}`} className="block">
          {cover ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex aspect-[4/3] w-full items-center justify-center bg-brand-50 text-brand-500"
            >
              <CategoryGlyph category={business.category} size={40} strokeWidth={1.25} />
            </div>
          )}
          <div className="p-3">{meta}</div>
        </Link>
      </article>
    )
  }

  return (
    <article className="card p-3 sm:p-3.5 rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-cream-50 shadow-warm-sm hover:shadow-warm-md hover:border-brand-400 transition-all duration-200 hover:-translate-y-0.5 min-w-0">
      <Link to={`/negocio/${business.id}`} className="flex gap-3 min-w-0">
        {cover ? (
          <img
            src={cover}
            alt=""
            width={88}
            height={88}
            /* lazy + decoding async: la lista no bloquea el hilo principal */
            loading="lazy"
            decoding="async"
            className="shrink-0 rounded-[10px] object-cover"
            style={{ height: 88, width: 88 }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-500"
            style={{ height: 88, width: 88 }}
          >
            <CategoryGlyph category={business.category} size={32} strokeWidth={1.25} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {meta}
          <p className="mt-1 line-clamp-2 text-sm text-ink-500">{business.description}</p>
        </div>
      </Link>
    </article>
  )
}
