import { LayoutGrid } from 'lucide-react'
import { CATEGORIES } from '@/data/categories'
import { cn } from '@/lib/utils'
import type { LucideIcon } from '@/components/ui/icons'
import type { BusinessFilters, CategorySlug } from '@/types'

interface Props {
  filters: BusinessFilters
  onChange: (patch: Partial<BusinessFilters>) => void
  hasLocation: boolean
}

export function BusinessFiltersBar({ filters, onChange, hasLocation }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="q" className="sr-only">
          Buscar oficio o negocio
        </label>
        <input
          id="q"
          type="search"
          inputMode="search"
          placeholder="Busca: costura, uñas, guardas…"
          value={filters.query ?? ''}
          onChange={(e) => onChange({ query: e.target.value })}
          className="min-h-11 w-full rounded-[10px] border border-ink-200 bg-white px-4 text-base text-ink-900 placeholder:text-ink-400"
        />
      </div>

      {/* Chips horizontales: patrón familiar y cómodo con el pulgar. */}
      <div
        role="group"
        aria-label="Filtrar por categoría"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        <CategoryChip
          active={!filters.category || filters.category === 'all'}
          onClick={() => onChange({ category: 'all' })}
          label="Todos"
          icon={LayoutGrid}
        />
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.slug}
            active={filters.category === c.slug}
            onClick={() => onChange({ category: c.slug as CategorySlug })}
            label={c.name}
            icon={c.icon}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-ink-700">
          Orden
          <select
            value={filters.sort ?? 'distance'}
            onChange={(e) => onChange({ sort: e.target.value as BusinessFilters['sort'] })}
            className="ml-2 min-h-9 rounded-[10px] border border-ink-200 bg-white px-2 text-sm text-ink-900"
          >
            <option value="distance" disabled={!hasLocation}>
              Más cerca
            </option>
            <option value="rating">Mejor calificados</option>
            <option value="recent">Más nuevos</option>
          </select>
        </label>

        <label className="text-sm text-ink-700">
          Calificación mínima
          <select
            value={String(filters.minRating ?? 0)}
            onChange={(e) => onChange({ minRating: Number(e.target.value) })}
            className="ml-2 min-h-9 rounded-[10px] border border-ink-200 bg-white px-2 text-sm text-ink-900"
          >
            <option value="0">Cualquiera</option>
            <option value="3">3 estrellas o más</option>
            <option value="4">4 estrellas o más</option>
            <option value="4.5">4.5 estrellas o más</option>
          </select>
        </label>

        {hasLocation && (
          <label className="text-sm text-ink-700">
            Radio
            <select
              value={String(filters.radiusKm ?? 5)}
              onChange={(e) => onChange({ radiusKm: Number(e.target.value) })}
              className="ml-2 min-h-9 rounded-[10px] border border-ink-200 bg-white px-2 text-sm text-ink-900"
            >
              <option value="1">1 km</option>
              <option value="3">3 km</option>
              <option value="5">5 km</option>
              <option value="20">Toda la ciudad</option>
            </select>
          </label>
        )}
      </div>
    </div>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap',
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-ink-200 bg-white text-ink-700',
      )}
    >
      <Icon aria-hidden="true" size={15} strokeWidth={1.75} />
      {label}
    </button>
  )
}
