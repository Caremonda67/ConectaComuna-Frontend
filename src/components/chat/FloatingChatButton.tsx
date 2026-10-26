import { motion, useReducedMotion } from 'motion/react'
import { useAsistente } from '@/hooks/useAsistente'
import { UI_ICONS } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

export function FloatingChatButton() {
  const { isOpen, alternarAsistente } = useAsistente()
  const prefersReduced = useReducedMotion()

  return (
    <aside aria-label="Asistente Comunal" className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 select-none">
      <motion.button
        type="button"
        onClick={alternarAsistente}
        whileHover={prefersReduced ? undefined : { scale: 1.05 }}
        whileTap={prefersReduced ? undefined : { scale: 0.95 }}
        aria-label={isOpen ? 'Cerrar Asistente Comunal' : 'Abrir Asistente Comunal'}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-full px-4 py-3 shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400',
          isOpen
            ? 'bg-ink-800 text-ink-100 hover:bg-ink-700 dark:bg-ink-200 dark:text-ink-900'
            : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-900/30'
        )}
      >
        {/* Indicador de disponibilidad comunitaria */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-ink-900" />
          </span>
        )}

        <div className="flex items-center justify-center">
          {isOpen ? (
            <UI_ICONS.close size={22} className="stroke-[2.2]" />
          ) : (
            <UI_ICONS.bot size={22} className="stroke-[2.2] text-amber-300" />
          )}
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-bold leading-tight tracking-wide">
            {isOpen ? 'Cerrar asistente' : 'Asistente Comunal'}
          </span>
          <span className="text-[10px] text-white/80 dark:text-ink-800/80 leading-none">
            {isOpen ? 'Toca para ocultar' : 'Voz & oficios cercanos'}
          </span>
        </div>
      </motion.button>
    </aside>
  )
}
