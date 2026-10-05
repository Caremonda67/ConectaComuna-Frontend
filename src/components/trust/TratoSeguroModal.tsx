import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { UI_ICONS } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import { SKIP_TRATO_SEGURO_KEY } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onProceed: () => void
  businessName: string
  isVerified: boolean
  actionType: 'whatsapp' | 'call'
}

export function TratoSeguroModal({
  open,
  onClose,
  onProceed,
  businessName,
  isVerified,
  actionType,
}: Props) {
  const [noMostrarHoy, setNoMostrarHoy] = useState(false)

  if (!open) return null

  function handleProceed() {
    if (noMostrarHoy) {
      try {
        sessionStorage.setItem(SKIP_TRATO_SEGURO_KEY, 'true')
      } catch {
        // En caso de modo incógnito restrictivo
      }
    }
    onProceed()
  }

  const ShieldIcon = isVerified ? UI_ICONS.shieldCheck : UI_ICONS.alert

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trato-seguro-titulo"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs transition-opacity duration-200"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-cream-50 p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-ink-200"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isVerified
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
            }`}
          >
            <ShieldIcon size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Uso seguro y ético de la plataforma
            </p>
            <h2 id="trato-seguro-titulo" className="text-lg font-bold text-ink-900">
              Consejos para un trato seguro
            </h2>
          </div>
        </div>

        {isVerified ? (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-3 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <span className="font-semibold block">Negocio verificado en territorio</span>
            Un facilitador o líder comunitario visitó y validó la existencia física de {businessName} en la comuna.
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold block">Negocio sin verificación presencial</span>
            Este negocio aún no cuenta con visita territorial de un facilitador. Te aconsejamos especial precaución con pagos por adelantado.
          </div>
        )}

        <div className="space-y-2.5 text-xs text-ink-700">
          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/60 font-bold text-brand-800 dark:text-brand-300 text-[11px]">
              1
            </span>
            <p>
              <strong className="text-ink-900">Paga contra entrega:</strong> Evita girar anticipos a personas que no conozcas en persona, salvo acuerdos razonables de compra de materiales con recibo previo.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800 text-[11px]">
              2
            </span>
            <p>
              <strong className="text-ink-900">Punto de encuentro conocido:</strong> Si vas a llevar o retirar prendas o artículos de valor, acude a la dirección publicada o acuerda un lugar concurrido del barrio.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800 text-[11px]">
              3
            </span>
            <p>
              <strong className="text-ink-900">Todo por escrito:</strong> Deja claridad en el chat sobre el precio final, la fecha de entrega y lo que incluye el trabajo antes de autorizarlo.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 pt-1 text-xs text-ink-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={noMostrarHoy}
            onChange={(e) => setNoMostrarHoy(e.target.checked)}
            className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          No volver a mostrar en esta sesión
        </label>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={handleProceed} fullWidth>
            {actionType === 'whatsapp' ? 'Continuar a WhatsApp' : 'Continuar a llamada'}
          </Button>
          <Button onClick={onClose} variant="secondary" fullWidth>
            Volver
          </Button>
        </div>

        <div className="pt-1 text-center">
          <Link
            to="/trato-seguro"
            onClick={onClose}
            className="text-xs font-semibold text-brand-700 hover:text-brand-900 underline underline-offset-2"
          >
            Conoce los 5 acuerdos del Trato Seguro Comunal →
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

