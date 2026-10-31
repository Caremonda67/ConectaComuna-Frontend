import type { ReactNode } from 'react'
import { UI_ICONS, type LucideIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  icon: LucideIcon
  titulo: string
  /** Una línea que diga por qué le sirve a quien llena la ficha, no qué es. */
  porQue: string
  /** Las secciones opcionales se marcan: nadie debe sentirse obligado. */
  opcional?: boolean
  /** Verde cuando la sección ya tiene lo que necesita. */
  completa?: boolean
  acción?: ReactNode
  children: ReactNode
}

/**
 * Cabecera común de las secciones de la ficha del negocio.
 *
 * Antes cada sección era una tarjeta plana con un `<h2>` en negrita y nada
 * más: las seis pesaban lo mismo, no se distinguía lo imprescindible de lo
 * accesorio y no había forma de saber si una ya estaba lista. El `id` sirve
 * además de ancla para que el resumen de arriba pueda saltar aquí.
 */
export function SeccionFicha({
  id,
  icon: Icon,
  titulo,
  porQue,
  opcional = false,
  completa = false,
  acción,
  children,
}: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="card scroll-mt-24 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
              completa ? 'bg-brand-700 text-white dark:text-brand-50' : 'bg-brand-100 text-brand-800',
            )}
          >
            {completa ? <UI_ICONS.check size={19} strokeWidth={2.6} /> : <Icon size={19} />}
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-titulo`} className="flex flex-wrap items-center gap-2 font-bold text-ink-900">
              {titulo}
              {opcional && (
                <span className="rounded-full border border-ink-200 bg-cream-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
                  Opcional
                </span>
              )}
            </h2>
            <p className="text-xs text-ink-500">{porQue}</p>
          </div>
        </div>
        {acción}
      </div>
      {children}
    </section>
  )
}
