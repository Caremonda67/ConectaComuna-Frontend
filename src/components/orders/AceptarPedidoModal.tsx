import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { anticipoExcedeElTope, anticipoPermitido } from '@/lib/reglas'
import { formatCurrency } from '@/lib/utils'

interface Props {
  priceEstimate: number | null
  busy: boolean
  onClose: () => void
  onConfirm: (valores: { finalPrice: number; advancePayment: number }) => Promise<void>
}

/** Confirmar el precio final y el anticipo. El tope del 50% se revisa aquí. */
export function AceptarPedidoModal({ priceEstimate, busy, onClose, onConfirm }: Props) {
  const [precio, setPrecio] = useState(priceEstimate ? String(priceEstimate) : '')
  const [anticipo, setAnticipo] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()

    const precioFinal = precio ? Number(precio) : priceEstimate
    const anticipoFinal = anticipo ? Number(anticipo) : 0

    if (precioFinal && anticipoExcedeElTope(precioFinal, anticipoFinal)) {
      // Un alert del navegador sale como diálogo del sistema y rompe el hilo
      // de la pantalla, sobre todo en celular. El aviso va donde está el error.
      setError(
        `El anticipo no puede pasar del 50%. Para ${formatCurrency(precioFinal)} el tope es ${formatCurrency(anticipoPermitido(precioFinal))}.`,
      )
      return
    }

    setError(null)
    await onConfirm({ finalPrice: precioFinal ?? 0, advancePayment: anticipoFinal })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div className="card w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5 space-y-4 shadow-xl">
        <h3 className="font-bold text-base text-ink-900">Aceptar pedido y confirmar cotización</h3>
        <p className="text-xs text-ink-600">
          El cliente propuso un estimado de <strong>{formatCurrency(priceEstimate)}</strong>. Puedes
          confirmarlo o ajustarlo antes de empezar.
        </p>
        <form onSubmit={enviar} className="space-y-3">
          <TextField
            label="Precio final acordado (COP)"
            type="number"
            min="0"
            step="500"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />
          <TextField
            label="Anticipo acordado / recibido (opcional)"
            type="number"
            min="0"
            max={precio ? String(anticipoPermitido(Number(precio))) : undefined}
            step="500"
            value={anticipo}
            onChange={(e) => setAnticipo(e.target.value)}
            hint={
              precio
                ? `Tope Trato Seguro (máx. 50%): hasta ${formatCurrency(anticipoPermitido(Number(precio)))}`
                : 'Regla Trato Seguro Comunal: máximo 50% para materiales.'
            }
          />
          {precio && (
            <div className="rounded-lg bg-cream-50 dark:bg-cream-100 p-2.5 text-xs flex justify-between font-semibold">
              <span>Saldo contra entrega:</span>
              <span className="text-brand-700">
                {formatCurrency(Math.max(0, Number(precio) - (anticipo ? Number(anticipo) : 0)))}
              </span>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs font-medium text-rose-800 dark:text-rose-300"
            >
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" loading={busy} fullWidth>
              Confirmar trabajo
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
