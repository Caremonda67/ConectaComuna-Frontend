import { UI_ICONS } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

interface Props {
  visible: boolean
  children?: React.ReactNode
  className?: string
}

/**
 * Acuse de recibo de una acción que salió bien.
 *
 * `role="status"` para que un lector de pantalla lo anuncie sin robar el foco.
 * Se queda montado y solo cambia de opacidad: montarlo y desmontarlo movería
 * los botones de sitio cada vez que alguien guarda, que es justo el momento en
 * que no conviene que nada se mueva. Las escalas `emerald` no se invierten con
 * el tema, así que estas sí llevan variante `dark:`.
 */
export function AvisoGuardado({ visible, children = 'Guardado', className }: Props) {
  return (
    <span
      role="status"
      aria-hidden={!visible}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-opacity duration-300',
        'border-emerald-300 bg-emerald-50 text-emerald-800',
        'dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        className,
      )}
    >
      <UI_ICONS.checkCircle size={13} strokeWidth={2.2} className="shrink-0" />
      {visible ? children : ' '}
    </span>
  )
}
