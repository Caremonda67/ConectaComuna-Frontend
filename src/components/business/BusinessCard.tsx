import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { categoryLabel } from '@/data/categories'
import { CategoryGlyph } from '@/components/ui/CategoryGlyph'
import { formatDistance } from '@/lib/utils'
import { RatingStars } from '@/components/ui/Rating'
import type { BusinessWithDistance } from '@/types'

interface Props {
  business: BusinessWithDistance
  /** 'row' para listas de resultados; 'tile' para las rejillas destacadas. */
  layout?: 'row' | 'tile'
}

export function BusinessCard({ business, layout = 'row' }: Props) {
  const cover = business.photos[0]

  const meta = (
    <>
      <h3 className="truncate font-semibold text-ink-900">{business.name}</h3>
      <p className="truncate text-xs text-ink-500">{categoryLabel(business.category)}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars value={business.rating_avg} count={business.rating_count} />
      </div>
      {business.neighborhood && (
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-500">
          <MapPin aria-hidden="true" size={13} strokeWidth={1.75} className="shrink-0" />
          {business.neighborhood}
          {business.distanceKm != null && ` · ${formatDistance(business.distanceKm)}`}
        </p>
      )}
    </>
  )

  if (layout === 'tile') {
    return (
      <article className="card h-full overflow-hidden transition-colors hover:border-brand-300">
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
    <article className="card p-3 transition-colors hover:border-brand-300">
      <Link to={`/negocio/${business.id}`} className="flex gap-3">
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
