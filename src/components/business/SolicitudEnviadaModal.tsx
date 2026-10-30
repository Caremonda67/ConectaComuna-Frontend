import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils'
import type { Order } from '@/types'

export function SolicitudEnviadaModal({
  order,
  businessName,
  businessPhone,
  onVerComprobante,
  onClose,
  onGoToPanel,
}: {
  order: Order
  businessName: string
  businessPhone?: string
  onVerComprobante: () => void
  onClose: () => void
  onGoToPanel: () => void
}) {
  const code = order.id ? `#CC-${order.id.slice(0, 6).toUpperCase()}` : '#CC-NUEVO'
  const cleanPhone = businessPhone ? businessPhone.replace(/\D/g, '') : ''
  const whatsAppUrl = cleanPhone
    ? `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(
        `Hola ${businessName}, acabo de enviarte la solicitud "${order.title}" (${code}) por Conecta Comuna. ¡Quedo atento a tu respuesta!`,
      )}`
    : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-cream-50 p-5 shadow-xl border border-ink-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
            <UI_ICONS.shieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-900">
              ¡Solicitud registrada!
            </h2>
            <p className="text-xs text-ink-600 mt-0.5">
              Código de seguimiento:{' '}
              <span className="font-mono font-bold text-brand-800 bg-brand-100 px-2 py-0.5 rounded border border-brand-200">
                {code}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-ink-200 bg-cream-50 dark:bg-cream-100/60 p-4 space-y-2.5 text-sm">
          <div className="flex justify-between items-start">
            <span className="text-ink-500 text-xs font-medium">Servicio:</span>
            <span className="font-semibold text-ink-900 text-right">{order.title}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-ink-500 text-xs font-medium">Modalidad:</span>
            <span className="text-xs font-medium text-ink-800">
              {order.service_location_type === 'home_delivery'
                ? `A domicilio (${order.delivery_address || 'Dirección acordada'})`
                : 'En taller o local del emprendedor'}
            </span>
          </div>

          {order.price_estimate && (
            <div className="flex justify-between items-center pt-2 border-t border-ink-200">
              <span className="text-ink-500 text-xs font-medium">Presupuesto inicial:</span>
              <span className="font-bold text-brand-700">
                {formatCurrency(order.price_estimate)}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800">
          <p className="font-semibold flex items-center gap-1.5 mb-1 text-brand-900">
            <UI_ICONS.shieldCheck size={14} className="shrink-0 text-brand-700" />
            Respaldo Trato Seguro
          </p>
          <p className="text-brand-800">
            El emprendedor revisará los detalles y te responderá con la cotización final. No pagues más del 50% de anticipo.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          {whatsAppUrl && (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-[#20bd5a] transition-colors text-sm"
            >
              <UI_ICONS.whatsapp size={18} />
              Avisar a {businessName} por WhatsApp
            </a>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={onVerComprobante}
            fullWidth
            className="min-h-11 text-brand-700 border-brand-200"
          >
            <span aria-hidden="true">🤝</span>
            Ver ficha de solicitud
          </Button>

          <Link
            to={`/trato-seguro/verificar/${code.replace('#', '')}`}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
          >
            <UI_ICONS.shieldCheck size={14} />
            Ver pacto público verificable con QR
          </Link>

          <div className="flex gap-2">
            <Button onClick={onGoToPanel} fullWidth className="min-h-11">
              Ver en mis solicitudes
            </Button>
            <Button variant="secondary" onClick={onClose} fullWidth className="min-h-11">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
