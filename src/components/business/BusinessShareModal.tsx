import { useState } from 'react'
import { motion } from 'motion/react'
import { UI_ICONS } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import { categoryLabel } from '@/data/categories'
import type { Business } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  business: Business
}

export function BusinessShareModal({ open, onClose, business }: Props) {
  const [copiado, setCopiado] = useState(false)

  if (!open) return null

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/negocio/${business.id}`
    : `/negocio/${business.id}`

  const textoFlyer = [
    `*${business.name}* en Conecta Comuna`,
    `🏷️ Oficio: ${categoryLabel(business.category)}`,
    business.neighborhood ? `📍 Barrio: ${business.neighborhood}` : null,
    business.verification_status === 'verified' ? '✅ Verificado presencialmente en territorio' : null,
    business.description ? `📝 "${business.description.slice(0, 100)}${business.description.length > 100 ? '...' : ''}"` : null,
    business.phone || business.whatsapp ? `📞 Contacto: ${business.whatsapp || business.phone}` : null,
    '',
    `👉 Conoce sus fotos, horarios y opiniones de vecinos aquí:`,
    shareUrl,
  ]
    .filter(Boolean)
    .join('\n')

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoFlyer)}`

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(textoFlyer)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Fallback si el portapapeles no tiene permisos
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compartir-titulo"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs transition-opacity duration-200"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-cream-50 p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-ink-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50 text-brand-800 dark:text-brand-300">
              <UI_ICONS.share size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                Tarjeta digital de barrio
              </p>
              <h2 id="compartir-titulo" className="text-lg font-bold text-ink-900">
                Compartir {business.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-400 hover:text-ink-700 cursor-pointer"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-ink-600 leading-relaxed">
          Comparte esta tarjeta en los grupos de WhatsApp de tu cuadra o en tus estados para que más vecinos conozcan el trabajo local.
        </p>

        {/* Vista previa del volante digital */}
        <div className="rounded-xl border border-brand-200 dark:border-brand-900/60 bg-brand-50/40 dark:bg-brand-950/30 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink-900 text-base">{business.name}</h3>
            {business.verification_status === 'verified' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                <UI_ICONS.shieldCheck size={11} className="text-emerald-700 dark:text-emerald-400" />
                Verificado
              </span>
            )}
          </div>
          <p className="text-xs text-brand-800 dark:text-brand-300 font-medium">
            {categoryLabel(business.category)} {business.neighborhood ? `· Barrio ${business.neighborhood}` : ''}
          </p>
          {business.description && (
            <p className="text-xs text-ink-700 dark:text-ink-300 line-clamp-2 italic bg-white/80 dark:bg-cream-100/80 p-2 rounded-lg border border-ink-100 dark:border-ink-200">
              "{business.description}"
            </p>
          )}
          <div className="flex items-center justify-between text-[11px] text-ink-500 pt-1 border-t border-brand-100 dark:border-brand-900/60">
            <span>ConectaComuna</span>
            <span>📱 {business.whatsapp || business.phone || 'Disponible en el barrio'}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-95"
          >
            <UI_ICONS.whatsapp size={18} />
            Compartir en WhatsApp o Estado
          </a>

          <Button
            type="button"
            variant="secondary"
            onClick={handleCopiar}
            fullWidth
          >
            {copiado ? <UI_ICONS.check size={16} /> : <UI_ICONS.copy size={16} />}
            {copiado ? '¡Copiado al portapapeles!' : 'Copiar volante de texto y enlace'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
