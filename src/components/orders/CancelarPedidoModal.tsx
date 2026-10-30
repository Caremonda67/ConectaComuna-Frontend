import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const MOTIVOS = [
  'Sin disponibilidad en la fecha requerida',
  'No cuento con los insumos o materiales necesarios',
  'No se llegó a un acuerdo en el precio',
  'El cliente canceló por imprevisto familiar',
  'Otro motivo coordinado entre las partes',
]

interface Props {
  busy: boolean
  onClose: () => void
  onConfirm: (motivo: string) => Promise<void>
}

/** Cancelar pide motivo: la otra parte tiene que entender qué pasó. */
export function CancelarPedidoModal({ busy, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState('')

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div className="card w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5 space-y-4 shadow-xl">
        <h3 className="font-bold text-base text-rose-700 dark:text-rose-400">
          ¿Deseas cancelar esta solicitud?
        </h3>
        <p className="text-xs text-ink-600">
          Indica un motivo para que la otra parte comprenda lo ocurrido y se mantenga la confianza en
          la comuna.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void onConfirm(motivo.trim() || 'Cancelado por el usuario')
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Motivo de cancelación
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-xl border border-ink-200 bg-white dark:bg-cream-50 p-2 text-xs text-ink-900"
              required
            >
              <option value="">Selecciona un motivo...</option>
              {MOTIVOS.map((texto) => (
                <option key={texto} value={texto}>
                  {texto}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" variant="danger" loading={busy} fullWidth>
              Confirmar cancelación
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Volver
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
