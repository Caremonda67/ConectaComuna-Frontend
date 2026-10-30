import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'

interface Props {
  notaInicial: string
  busy: boolean
  onClose: () => void
  onConfirm: (nota: string | null) => Promise<void>
}

/** Nota que el taller deja para que el cliente sepa cómo va el trabajo. */
export function NotaAvanceModal({ notaInicial, busy, onClose, onConfirm }: Props) {
  const [nota, setNota] = useState(notaInicial)

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div className="card w-full max-w-sm max-h-[90dvh] overflow-y-auto p-5 space-y-4 shadow-xl">
        <h3 className="font-bold text-base text-ink-900">Añadir nota de avance del trabajo</h3>
        <p className="text-xs text-ink-600">
          Esta nota la verá el cliente en su panel (ej: "Prenda lista para prueba", "Material
          comprado").
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void onConfirm(nota.trim() || null)
          }}
          className="space-y-3"
        >
          <TextAreaField
            label="Nota del taller"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: Ya compré los hilos y cierres, entrego mañana a las 3:00 p.m."
            required
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={busy} fullWidth>
              Guardar nota
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
