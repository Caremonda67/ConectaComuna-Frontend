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
            // `hover:bg-ink-700` necesita pareja en oscuro. La escala de tinta
            // se invierte, asi que ahi `ink-700` es #ccd5cd: al pasar el raton
            // el fondo se aclaraba y el texto seguia claro, y el boton se
            // quedaba en blanco. `ink-300` si es un tono por encima del fondo.
            ? 'bg-ink-800 text-ink-100 hover:bg-ink-700 dark:bg-ink-200 dark:text-ink-900 dark:hover:bg-ink-300'
            : 'bg-brand-700 text-white dark:text-brand-50 hover:bg-brand-800 shadow-brand-900/30'
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
          {/* Sin color propio: lo hereda del botón. Tenía fijado el del estado
              cerrado (`dark:text-brand-50`), que en oscuro es casi negro porque
              la paleta se invierte. Eso funciona sobre el verde claro de
              `brand-700`, pero al abrir el asistente el fondo pasa a `ink-200`,
              que es oscuro, y el subtítulo desaparecía. */}
          <span className="text-[10px] leading-none opacity-80">
            {isOpen ? 'Toca para ocultar' : 'Voz & oficios cercanos'}
          </span>
        </div>
      </motion.button>
    </aside>
  )
}
