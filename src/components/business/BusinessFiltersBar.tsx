import { useState, useRef, useEffect, useCallback } from 'react'
import { LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { CATEGORIES } from '@/data/categories'
import { cn } from '@/lib/utils'
import { UI_ICONS, type LucideIcon } from '@/components/ui/icons'
import type { BusinessFilters, CategorySlug } from '@/types'

interface Props {
  filters: BusinessFilters
  onChange: (patch: Partial<BusinessFilters>) => void
  hasLocation: boolean
}

export function BusinessFiltersBar({ filters, onChange, hasLocation }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const movedRef = useRef(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  const scrollByAmount = (amount: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    isDraggingRef.current = true
    startXRef.current = e.pageX - el.offsetLeft
    scrollLeftRef.current = el.scrollLeft
    movedRef.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const el = scrollRef.current
    if (!el) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = (x - startXRef.current) * 1.3
    if (Math.abs(walk) > 4) {
      movedRef.current = true
    }
    el.scrollLeft = scrollLeftRef.current - walk
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

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
          className="min-h-11 w-full rounded-[10px] border border-ink-200 bg-white dark:bg-cream-50 px-4 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
        />
      </div>

      {/* Carrusel horizontal de categorías con flechas de avance, desvanecimiento y arrastre */}
      <div className="relative group -mx-4 px-4">
        {/* Desvanecimiento izquierdo */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-0 top-0 bottom-1 w-8 sm:w-12 bg-gradient-to-r from-cream-100 to-transparent z-10 transition-opacity duration-200',
            canScrollLeft ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* Botón flecha izquierda */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount(-220)}
            aria-label="Ver categorías anteriores"
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/95 dark:bg-cream-50/95 border border-ink-200 shadow-md text-ink-700 hover:text-brand-700 hover:border-brand-400 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2.25} />
          </button>
        )}

        {/* Contenedor desplazable */}
        <div
          ref={scrollRef}
          role="group"
          aria-label="Filtrar por categoría"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex gap-2 overflow-x-auto pb-1 overscroll-x-contain cursor-grab active:cursor-grabbing scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
          }}
        >
          <CategoryChip
            active={!filters.category || filters.category === 'all'}
            onClick={() => {
              if (!movedRef.current) onChange({ category: 'all' })
            }}
            label="Todos"
            icon={LayoutGrid}
          />
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c.slug}
              active={filters.category === c.slug}
              onClick={() => {
                if (!movedRef.current) onChange({ category: c.slug as CategorySlug })
              }}
              label={c.name}
              icon={c.icon}
            />
          ))}
        </div>

        {/* Desvanecimiento derecho */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute right-0 top-0 bottom-1 w-10 sm:w-16 bg-gradient-to-l from-cream-100 to-transparent z-10 transition-opacity duration-200',
            canScrollRight ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* Botón flecha derecha */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount(220)}
            aria-label="Ver más categorías"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/95 dark:bg-cream-50/95 border border-ink-200 shadow-md text-ink-700 hover:text-brand-700 hover:border-brand-400 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronRight size={16} strokeWidth={2.25} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Toggle rápido de abierto ahora */}
        <button
          type="button"
          onClick={() => onChange({ openNow: !filters.openNow })}
          aria-pressed={Boolean(filters.openNow)}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-9 px-3 rounded-[10px] border text-xs sm:text-sm font-medium transition-colors cursor-pointer',
            filters.openNow
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60'
              : 'border-ink-200 bg-white dark:bg-cream-50 text-ink-700 hover:bg-cream-100 dark:hover:bg-cream-200',
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              filters.openNow ? 'bg-emerald-500 animate-pulse' : 'bg-ink-400',
            )}
          />
          Solo abiertos ahora
        </button>

        {/* Toggle rápido de venta al por mayor */}
        <button
          type="button"
          onClick={() => onChange({ wholesaleOnly: !filters.wholesaleOnly })}
          aria-pressed={Boolean(filters.wholesaleOnly)}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-9 px-3 rounded-[10px] border text-xs sm:text-sm font-medium transition-colors cursor-pointer',
            filters.wholesaleOnly
              ? 'border-brand-500 bg-brand-50 text-brand-800 shadow-sm dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-700/60 font-semibold'
              : 'border-ink-200 bg-white dark:bg-cream-50 text-ink-700 hover:bg-cream-100 dark:hover:bg-cream-200',
          )}
        >
          <UI_ICONS.package size={15} className="shrink-0 text-brand-600 dark:text-brand-400" />
          Venta al por mayor
        </button>

        <label className="text-xs sm:text-sm text-ink-700 flex items-center">
          Orden
          <select
            value={filters.sort ?? 'distance'}
            onChange={(e) => onChange({ sort: e.target.value as BusinessFilters['sort'] })}
            className="ml-1.5 min-h-9 rounded-[10px] border border-ink-200 bg-white dark:bg-cream-50 px-2 text-xs sm:text-sm text-ink-900"
          >
            <option value="distance" disabled={!hasLocation}>
              Más cerca
            </option>
            <option value="rating">Mejor calificados</option>
            <option value="recent">Más nuevos</option>
          </select>
        </label>

        <label className="text-xs sm:text-sm text-ink-700 flex items-center">
          Calificación
          <select
            value={String(filters.minRating ?? 0)}
            onChange={(e) => onChange({ minRating: Number(e.target.value) })}
            className="ml-1.5 min-h-9 rounded-[10px] border border-ink-200 bg-white dark:bg-cream-50 px-2 text-xs sm:text-sm text-ink-900"
          >
            <option value="0">Cualquiera</option>
            <option value="3">3★ o más</option>
            <option value="4">4★ o más</option>
            <option value="4.5">4.5★ o más</option>
          </select>
        </label>

        {hasLocation && (
          <label className="text-xs sm:text-sm text-ink-700 flex items-center">
            Radio
            <select
              value={String(filters.radiusKm ?? 5)}
              onChange={(e) => onChange({ radiusKm: Number(e.target.value) })}
              className="ml-1.5 min-h-9 rounded-[10px] border border-ink-200 bg-white dark:bg-cream-50 px-2 text-xs sm:text-sm text-ink-900"
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
        'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap active:scale-95 transition-all duration-150 select-none cursor-pointer',
        active
          ? 'border-brand-500 bg-brand-500 text-white shadow-sm font-semibold'
          : 'border-ink-200 bg-white dark:bg-cream-50 text-ink-700 hover:border-brand-300 hover:bg-cream-50 dark:hover:bg-cream-200',
      )}
    >
      <Icon aria-hidden="true" size={15} strokeWidth={1.75} />
      {label}
    </button>
  )
}
