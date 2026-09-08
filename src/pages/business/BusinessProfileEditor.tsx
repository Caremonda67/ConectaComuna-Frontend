import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { businessService } from '@/services/businessService'
import { LazyMap } from '@/components/map/LazyMap'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { CATEGORIES } from '@/data/categories'
import { COMUNA_CENTER } from '@/lib/env'
import { DAY_NAMES } from '@/lib/utils'
import type { BusinessHours, CategorySlug, Coordinates } from '@/types'

const schema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  category: z.string().min(1, 'Elige tu oficio.'),
  description: z
    .string()
    .min(40, 'Cuenta en al menos 40 caracteres qué haces: ayuda a que te contraten.'),
  phone: z
    .string()
    .regex(/^3\d{9}$/, 'Celular de 10 dígitos (ej: 3001234567).')
    .optional()
    .or(z.literal('')),
  whatsapp: z
    .string()
    .regex(/^3\d{9}$/, 'Celular de 10 dígitos.')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
})
type Values = z.infer<typeof schema>

const emptyHours = (): BusinessHours[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    opens: '08:00',
    closes: '18:00',
    closed: day === 0,
  }))

export default function BusinessProfileEditor() {
  const { userId, business, refresh } = useAuth()
  const navigate = useNavigate()

  const [position, setPosition] = useState<Coordinates>(
    business ? { lat: business.lat, lng: business.lng } : COMUNA_CENTER,
  )
  const [photos, setPhotos] = useState<string[]>(business?.photos ?? [])
  const [hours, setHours] = useState<BusinessHours[]>(business?.hours?.length ? business.hours : emptyHours())
  const [uploading, setUploading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: business?.name ?? '',
      category: business?.category ?? '',
      description: business?.description ?? '',
      phone: business?.phone ?? '',
      whatsapp: business?.whatsapp ?? '',
      address: business?.address ?? '',
      neighborhood: business?.neighborhood ?? '',
    },
  })

  const description = useWatch({ control, name: 'description' }) ?? ''

  async function onSubmit(values: Values) {
    if (!userId) return
    setServerError(null)
    try {
      await businessService.upsert(userId, {
        name: values.name,
        category: values.category as CategorySlug,
        description: values.description,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        address: values.address || null,
        neighborhood: values.neighborhood || null,
        lat: position.lat,
        lng: position.lng,
        photos,
        hours,
        is_active: true,
      })
      await refresh()
      navigate('/panel')
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No pudimos guardar tu negocio.')
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !userId) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 6 - photos.length)) {
        urls.push(await businessService.uploadPhoto(userId, file))
      }
      setPhotos((p) => [...p, ...urls])
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No pudimos subir la foto.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <h1 className="text-xl font-bold">
        {business ? 'Editar mi negocio' : 'Crear mi negocio'}
      </h1>

      <section className="space-y-3 card p-4">
        <h2 className="font-bold">Lo básico</h2>
        <TextField
          label="Nombre del negocio"
          hint="Usa el nombre con el que te conocen en el barrio."
          error={errors.name?.message}
          {...register('name')}
        />
        <SelectField label="Oficio" error={errors.category?.message} {...register('category')}>
          <option value="">Selecciona…</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="¿Qué ofreces?"
          error={errors.description?.message}
          hint={`${description.length}/40 caracteres mínimos. Menciona precios aproximados y tiempos de entrega.`}
          {...register('description')}
        />
      </section>

      <section className="space-y-3 card p-4">
        <h2 className="font-bold">Contacto y ubicación</h2>
        <TextField
          label="Celular"
          type="tel"
          inputMode="numeric"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label="WhatsApp"
          type="tel"
          inputMode="numeric"
          error={errors.whatsapp?.message}
          {...register('whatsapp')}
        />
        <TextField
          label="Dirección o punto de referencia"
          error={errors.address?.message}
          {...register('address')}
        />
        <TextField label="Barrio" error={errors.neighborhood?.message} {...register('neighborhood')} />

        <div>
          <p className="mb-1 text-sm font-medium text-ink-700">
            Toca el mapa para marcar dónde te encuentran
          </p>
          <LazyMap
            center={position}
            pickable
            pickedPosition={position}
            onPick={setPosition}
            showUser={false}
            height="260px"
            zoom={16}
          />
          <p className="mt-1 text-xs text-ink-500">
            Coordenadas: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </p>
        </div>
      </section>

      <section className="space-y-3 card p-4">
        <h2 className="font-bold">Portafolio</h2>
        <p className="text-sm text-ink-500">
          Sube hasta 6 fotos de tus trabajos. Las fotos reales aumentan mucho la confianza.
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || photos.length >= 6}
          className="block w-full text-sm"
          aria-label="Subir fotos del portafolio"
        />
        {uploading && <p className="text-sm text-ink-500">Subiendo fotos…</p>}
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((src) => (
              <li key={src} className="relative">
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((x) => x !== src))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
                >
                  Quitar<span className="sr-only"> foto</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 card p-4">
        <h2 className="font-bold">Horarios</h2>
        <ul className="space-y-2">
          {hours.map((h, i) => (
            <li key={h.day} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-10 font-medium">{DAY_NAMES[h.day]}</span>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={!h.closed}
                  onChange={(e) =>
                    setHours((prev) =>
                      prev.map((x, j) => (i === j ? { ...x, closed: !e.target.checked } : x)),
                    )
                  }
                />
                Abierto
              </label>
              {!h.closed && (
                <>
                  <input
                    type="time"
                    aria-label={`Hora de apertura ${DAY_NAMES[h.day]}`}
                    value={h.opens ?? '08:00'}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, opens: e.target.value } : x)),
                      )
                    }
                    className="min-h-9 rounded-lg border border-ink-200 px-2"
                  />
                  <input
                    type="time"
                    aria-label={`Hora de cierre ${DAY_NAMES[h.day]}`}
                    value={h.closes ?? '18:00'}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, closes: e.target.value } : x)),
                      )
                    }
                    className="min-h-9 rounded-lg border border-ink-200 px-2"
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {serverError && (
        <p role="alert" className="text-sm text-rose-700">
          {serverError}
        </p>
      )}

      <div className="sticky bottom-20 flex gap-2">
        <Button type="submit" fullWidth loading={isSubmitting}>
          Guardar negocio
        </Button>
      </div>
    </form>
  )
}
