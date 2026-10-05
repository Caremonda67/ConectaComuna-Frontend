import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Order } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  order: Order
}

export function TratoSeguroReceiptModal({ open, onClose, order }: Props) {
  if (!open) return null

  const precio = order.final_price ?? order.price_estimate ?? 0
  const anticipo = order.advance_payment ?? 0
  const saldo = Math.max(0, precio - anticipo)
  const codigoAcuerdo = `CC-${order.id.slice(0, 8).toUpperCase()}`

  const resumenTexto = `🤝 *Comprobante de Trato Seguro ConectaComuna*
*Acuerdo:* #${codigoAcuerdo}
*Emprendedor:* ${order.business?.name ?? 'Taller comunitario'}
*Cliente:* ${order.client?.full_name ?? 'Vecino'}
*Servicio:* ${order.title}
*Modalidad:* ${order.service_location_type === 'home_delivery' ? 'A domicilio' : 'En taller/local'}
${order.delivery_address ? `*Dirección:* ${order.delivery_address}\n` : ''}
💰 *Total acordado:* ${formatCurrency(precio)}
💵 *Anticipo abonado:* ${formatCurrency(anticipo)}
🧾 *Saldo contra entrega:* ${formatCurrency(saldo)}
📅 *Fecha:* ${formatDate(order.created_at)}

_Respaldado por el Trato Seguro Comunal: máximo 50% de anticipo y entrega a satisfacción._`

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(resumenTexto)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white"
    >
      <div className="card w-full max-w-lg overflow-hidden shadow-2xl print:shadow-none print:border-none print:m-0">
        {/* Cabecera del comprobante */}
        <div className="bg-brand-600 px-6 py-4 text-white print:bg-white print:text-black print:border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🤝</span>
              <span className="font-extrabold tracking-wide text-sm uppercase">Trato Seguro Comunal</span>
            </div>
            <span className="font-mono text-xs font-semibold bg-brand-700/80 px-2.5 py-1 rounded-md print:border">
              {codigoAcuerdo}
            </span>
          </div>
          <h2 id="receipt-title" className="text-lg font-bold mt-1">
            Ficha de Acuerdo de Servicio
          </h2>
        </div>

        {/* Cuerpo del comprobante */}
        <div className="p-6 space-y-4 text-ink-900 dark:text-ink-100">
          <div className="grid grid-cols-2 gap-3 text-sm pb-3 border-b border-ink-100 dark:border-ink-800">
            <div>
              <p className="text-xs text-ink-500 dark:text-ink-400">Emprendedor</p>
              <p className="font-semibold">{order.business?.name ?? 'Emprendedor local'}</p>
              {order.business?.phone && (
                <p className="text-xs text-ink-500 dark:text-ink-400">{order.business.phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-ink-500 dark:text-ink-400">Cliente</p>
              <p className="font-semibold">{order.client?.full_name ?? 'Vecino cliente'}</p>
              {order.client?.phone && (
                <p className="text-xs text-ink-500 dark:text-ink-400">{order.client.phone}</p>
              )}
            </div>
          </div>

          <div className="text-sm space-y-1">
            <p className="text-xs text-ink-500 dark:text-ink-400">Detalle del trabajo pactado</p>
            <p className="font-semibold text-base">{order.title}</p>
            {order.description && (
              <p className="text-xs text-ink-600 dark:text-ink-300 italic">{order.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-cream-100 dark:bg-cream-200 px-2 py-0.5 text-ink-700 dark:text-ink-300 font-medium">
                Modalidad: {order.service_location_type === 'home_delivery' ? '🛵 A domicilio' : '🏠 En taller / local'}
              </span>
              {order.delivery_address && (
                <span className="rounded-md bg-cream-100 dark:bg-cream-200 px-2 py-0.5 text-ink-700 dark:text-ink-300">
                  {order.delivery_address}
                </span>
              )}
            </div>
          </div>

          {order.business_notes && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-2.5 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold">Nota de avance:</span> {order.business_notes}
            </div>
          )}

          {/* Desglose de dinero */}
          <div className="rounded-xl bg-cream-50 dark:bg-cream-200/50 p-4 border border-ink-200 dark:border-ink-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-600 dark:text-ink-300">Valor acordado:</span>
              <span className="font-semibold text-ink-900 dark:text-ink-100">{formatCurrency(precio)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-300">
              <span>Anticipo entregado (máx. 50%):</span>
              <span className="font-semibold">{formatCurrency(anticipo)}</span>
            </div>
            <div className="border-t border-ink-200 dark:border-ink-700 pt-2 flex justify-between text-base font-bold text-ink-900 dark:text-ink-50">
              <span>Saldo a cancelar contra entrega:</span>
              <span className="text-brand-800 dark:text-brand-200">{formatCurrency(saldo)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-ink-300 dark:border-ink-600 p-2.5 text-center text-xs text-ink-600 dark:text-ink-300">
            Trato Seguro: el saldo se paga cuando el trabajo esté terminado y a entera satisfacción. En caso de desacuerdo, acude a tu facilitador o comité vecinal.
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 bg-cream-50 dark:bg-cream-100 border-t border-ink-100 dark:border-ink-800 flex flex-wrap gap-2 justify-end print:hidden">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleShareWhatsApp}
            className="text-emerald-700 dark:text-emerald-300"
          >
            <UI_ICONS.whatsapp size={14} className="shrink-0" />
            Compartir por WhatsApp
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
            Imprimir / Guardar
          </Button>
          <Button type="button" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
