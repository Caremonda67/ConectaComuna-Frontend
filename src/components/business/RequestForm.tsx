import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { UI_ICONS } from '@/components/ui/icons'
import { orderService } from '@/services/orderService'
import { cn } from '@/lib/utils'
import type { Order } from '@/types'

const MAX_PHOTOS = 3
const MAX_FILE_MB = 5

export function RequestForm({
  businessId,
  clientId,
  initialTitle = '',
  initialPriceEstimate = null,
  onDone,
  onCancel,
}: {
  businessId: string
  clientId: string
  initialTitle?: string
  initialPriceEstimate?: number | null
  onDone: (order: Order) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [priceEstimate, setPriceEstimate] = useState(
    initialPriceEstimate != null ? String(initialPriceEstimate) : '',
  )
  const [serviceLocationType, setServiceLocationType] = useState<'workshop' | 'home_delivery'>('workshop')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? [])
    const valid = incoming.filter((f) => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > MAX_FILE_MB * 1024 * 1024) return false
      return true
    })
    const merged = [...photos, ...valid].slice(0, MAX_PHOTOS)
    setPhotos(merged)
    setPreviews(merged.map((f) => URL.createObjectURL(f)))
    e.target.value = ''
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index])
    const next = photos.filter((_, i) => i !== index)
    setPhotos(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 4) {
      setErr('Describe el servicio en pocas palabras (mínimo 4 caracteres).')
      return
    }
    if (serviceLocationType === 'home_delivery' && deliveryAddress.trim().length < 5) {
      setErr('Por favor indica tu dirección completa para el servicio a domicilio.')
      return
    }
    setSubmitting(true)
    setErr(null)
    try {
      const parsedPrice = priceEstimate ? Number(priceEstimate) : null
      const created = await orderService.create({
        businessId,
        clientId,
        title: title.trim(),
        description: description.trim(),
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        priceEstimate: parsedPrice && parsedPrice > 0 ? parsedPrice : null,
        photos: photos.length > 0 ? photos : undefined,
        serviceLocationType,
        deliveryAddress: serviceLocationType === 'home_delivery' ? deliveryAddress.trim() : undefined,
      })
      previews.forEach(URL.revokeObjectURL)
      onDone(created)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'No pudimos enviar tu solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 card p-4">
      <h2 className="text-lg font-bold">Solicitar servicio</h2>
      <TextField
        label="¿Qué necesitas?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ej: arreglar la basta de un pantalón"
        required
      />
      <TextAreaField
        label="Detalles"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        hint="Entre más detalles, mejor te puede cotizar."
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-900">
          Modalidad del servicio
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setServiceLocationType('workshop')}
            className={cn(
              'group flex flex-col items-center justify-center p-3 rounded-xl border text-center text-xs select-none cursor-pointer',
              'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-95',
              serviceLocationType === 'workshop'
                ? 'border-brand-500 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-400/50 shadow-xs'
                : 'border-ink-200 bg-white dark:bg-cream-50 text-ink-700 hover:border-brand-400 hover:bg-cream-100 dark:hover:bg-cream-200',
            )}
          >
            <UI_ICONS.tools size={18} className="mb-1 text-brand-600 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
            <span>En taller / local</span>
            <span className="text-[10px] text-ink-500 font-normal">Llevas o recoges allí</span>
          </button>

          <button
            type="button"
            onClick={() => setServiceLocationType('home_delivery')}
            className={cn(
              'group flex flex-col items-center justify-center p-3 rounded-xl border text-center text-xs select-none cursor-pointer',
              'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-95',
              serviceLocationType === 'home_delivery'
                ? 'border-brand-500 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-400/50 shadow-xs'
                : 'border-ink-200 bg-white dark:bg-cream-50 text-ink-700 hover:border-brand-400 hover:bg-cream-100 dark:hover:bg-cream-200',
            )}
          >
            <UI_ICONS.map size={18} className="mb-1 text-brand-600 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
            <span>A domicilio</span>
            <span className="text-[10px] text-ink-500 font-normal">En tu casa o dirección</span>
          </button>
        </div>
      </div>

      {serviceLocationType === 'home_delivery' && (
        <TextField
          label="Dirección de atención o entrega"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          placeholder="Ej: Carrera 45 # 12-34, Apto 201 (Barrio La Floresta)"
          required
          hint="Indica dirección exacta y barrio para que el emprendedor calcule el desplazamiento."
        />
      )}

      <TextField
        label="¿Para cuándo? (opcional)"
        type="datetime-local"
        value={scheduledFor}
        onChange={(e) => setScheduledFor(e.target.value)}
      />
      <TextField
        label="Presupuesto estimado (opcional)"
        type="number"
        min="0"
        step="500"
        value={priceEstimate}
        onChange={(e) => setPriceEstimate(e.target.value)}
        placeholder="Ej: 25000"
        hint="En pesos colombianos. Te sirve para acordar un rango con el emprendedor."
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-900">
          Fotos de referencia (opcional, máx. {MAX_PHOTOS})
        </label>
        {previews.length > 0 && (
          <ul className="mb-2 flex gap-2 flex-wrap">
            {previews.map((src, i) => (
              <li key={src} className="relative">
                <img
                  src={src}
                  alt={`Foto ${i + 1}`}
                  className="h-20 w-20 rounded-lg object-cover border border-ink-200"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Quitar foto ${i + 1}`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white text-xs leading-none shadow-sm hover:bg-rose-700 hover:scale-110 active:scale-90 transition-all duration-150 cursor-pointer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_PHOTOS && (
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotos}
            aria-label="Subir fotos de referencia"
            className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 file:cursor-pointer dark:file:bg-brand-900/30 dark:file:text-brand-300"
          />
        )}
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800 flex items-start gap-2">
        <UI_ICONS.shieldCheck size={16} className="text-brand-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block text-brand-900">Trato Seguro Comunal</span>
          <span className="text-[11px] text-brand-700">
            Al enviar esta solicitud queda registrada en el sistema. Acuerda anticipos máximos del 50% y solo liquida el total al recibir el servicio terminado.
          </span>
        </div>
      </div>

      {err && (
        <p role="alert" className="text-sm text-rose-700">
          {err}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" loading={submitting} fullWidth>
          Enviar solicitud
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
