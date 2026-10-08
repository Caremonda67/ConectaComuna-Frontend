import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { categoryLabel } from '@/data/categories'
import { CategoryGlyph } from '@/components/ui/CategoryGlyph'
import { formatDistance, getBusinessOpenStatus, cn } from '@/lib/utils'
import { RatingStars } from '@/components/ui/Rating'
import { UI_ICONS } from '@/components/ui/icons'
import type { BusinessWithDistance } from '@/types'

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
            title="Verificado en territorio"
            className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300"
          >
            <UI_ICONS.shieldCheck size={11} className="text-emerald-700 dark:text-emerald-400" />
            Verificado
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
            className="inline-flex items-center gap-1 shrink-0 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800/60 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800 dark:text-brand-300"
          >
            <UI_ICONS.package size={11} className="text-brand-600 dark:text-brand-400" />
            Por mayor
          </span>
        )}
      </div>
      <p className="truncate text-xs text-ink-500">{categoryLabel(business.category)}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars value={business.rating_avg} count={business.rating_count} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {business.neighborhood && (
          <span className="flex items-center gap-1 truncate text-ink-500">
            <MapPin aria-hidden="true" size={13} strokeWidth={1.75} className="shrink-0" />
            {business.neighborhood}
            {business.distanceKm != null && ` · ${formatDistance(business.distanceKm)}`}
          </span>
        )}
        {business.hours && business.hours.length > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded-md',
              openStatus.isOpen
                ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60'
                : 'text-ink-600 dark:text-ink-400 bg-cream-200/80 dark:bg-cream-200/40',
            )}
            title={openStatus.detail ?? openStatus.label}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0',
                openStatus.isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-ink-400',
              )}
            />
            {openStatus.label}
          </span>
        )}
      </div>
    </>
  )

  if (layout === 'tile') {
    return (
      <article className="card h-full overflow-hidden transition-all duration-200 hover:border-brand-300 sm:hover:-translate-y-0.5 sm:hover:shadow-sm">
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
    <article className="card p-3 transition-all duration-200 hover:border-brand-300 sm:hover:-translate-y-0.5 sm:hover:shadow-sm min-w-0">
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
