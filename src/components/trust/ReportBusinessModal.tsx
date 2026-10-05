import { useState } from 'react'
import { motion } from 'motion/react'
import { UI_ICONS } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import { businessService } from '@/services/businessService'
import type { MotivoReporte } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  businessId: string
  businessName: string
  userId: string | null
  onRequireAuth: () => void
  onReportSubmitted?: () => void
}

const MOTIVOS: Array<{ id: MotivoReporte; label: string; desc: string }> = [
  {
    id: 'anticipo_incumplido',
    label: 'Cobró anticipo y no entregó el trabajo',
    desc: 'Se acordó un pago previo y el emprendedor no cumplió ni responde.',
  },
  {
    id: 'direccion_falsa',
    label: 'Dirección o local inexistente',
    desc: 'La ubicación no coincide con la realidad en el barrio.',
  },
  {
    id: 'precios_enganosos',
    label: 'Precios o servicios engañosos',
    desc: 'La información publicada no corresponde a lo ofrecido.',
  },
  {
    id: 'suplantacion',
    label: 'Suplantación de identidad',
    desc: 'Utiliza el nombre, fotos o identidad de otra persona.',
  },
  {
    id: 'otro',
    label: 'Otro motivo de seguridad',
    desc: 'Cualquier otra conducta irregular que ponga en riesgo a los vecinos.',
  },
]

export function ReportBusinessModal({
  open,
  onClose,
  businessId,
  businessName,
  userId,
  onRequireAuth,
  onReportSubmitted,
}: Props) {
  const [motivo, setMotivo] = useState<MotivoReporte>('anticipo_incumplido')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  if (!userId) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-cream-50 p-5 shadow-xl text-center space-y-3 border border-ink-200"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <UI_ICONS.alert size={24} />
          </div>
          <h2 className="text-lg font-bold text-ink-900">Identificación requerida</h2>
          <p className="text-xs text-ink-600">
            Para evitar denuncias falsas y proteger a los trabajadores del barrio, debes acceder con tu cuenta para enviar un reporte.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => {
                onClose()
                onRequireAuth()
              }}
              fullWidth
            >
              Ingresar
            </Button>
            <Button onClick={onClose} variant="secondary" fullWidth>
              Cancelar
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setEnviando(true)
    setError(null)

    try {
      await businessService.reportarNegocio({
        negocio_id: businessId,
        reportado_por_id: userId,
        motivo,
        descripcion: descripcion.trim() || null,
      })
      setEnviado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos registrar tu reporte. Intenta más tarde.')
    } finally {
      setEnviando(false)
    }
  }

  function handleCloseModal() {
    if (enviado) {
      setEnviado(false)
      onReportSubmitted?.()
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reporte-titulo"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs transition-opacity duration-200"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-cream-50 p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-ink-200"
      >
        {enviado ? (
          <div className="text-center py-4 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <UI_ICONS.shieldCheck size={24} />
            </div>
            <h2 className="text-lg font-bold text-ink-900">Reporte recibido</h2>
            <p className="text-xs text-ink-600 leading-relaxed">
              Gracias por cuidar la seguridad de nuestra comuna. El equipo de facilitadores y la administración revisarán la información de {businessName}.
            </p>
            <Button
              onClick={handleCloseModal}
              fullWidth
            >
              Aceptar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
                <UI_ICONS.flag size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                  Protección comunitaria
                </p>
                <h2 id="reporte-titulo" className="text-lg font-bold text-ink-900">
                  Reportar a {businessName}
                </h2>
              </div>
            </div>

            <p className="text-xs text-ink-600">
              Selecciona el motivo principal de la irregularidad detectada:
            </p>

            <div className="space-y-2">
              {MOTIVOS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    motivo === m.id
                      ? 'border-brand-500 bg-brand-50/50 text-ink-900'
                      : 'border-ink-200 hover:bg-cream-50 text-ink-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m.id}
                    checked={motivo === m.id}
                    onChange={() => setMotivo(m.id)}
                    className="mt-0.5 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-semibold block text-ink-900">{m.label}</span>
                    <span className="text-[11px] text-ink-500">{m.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-800 mb-1">
                Detalles adicionales (opcional)
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Explica brevemente lo ocurrido para facilitar la verificación..."
                rows={3}
                className="w-full rounded-xl border border-ink-200 p-2.5 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <p className="text-[11px] text-ink-500 bg-cream-100 p-2.5 rounded-xl">
              ⚠️ <strong>Uso responsable:</strong> Las denuncias falsas afectan el trabajo de familias del barrio. Usa esta herramienta únicamente ante situaciones reales de riesgo.
            </p>

            {error && <p className="text-xs text-rose-700">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button type="submit" loading={enviando} fullWidth>
                Enviar reporte
              </Button>
              <Button type="button" onClick={onClose} variant="secondary" fullWidth>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
