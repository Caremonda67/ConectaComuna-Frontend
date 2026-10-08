import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { businessService } from '@/services/businessService'
import { facilitadorService } from '@/services/facilitadorService'
import { LazyMap } from '@/components/map/LazyMap'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { CATEGORIES } from '@/data/categories'
import { COMUNA_CENTER } from '@/lib/env'
import { DAY_NAMES } from '@/lib/utils'
import { UI_ICONS } from '@/components/ui/icons'
import type { Business, BusinessHours, CategorySlug, Coordinates, ServiceCatalogItem } from '@/types'

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

interface FormProps {
  managedBusiness: Business | null
  userId: string
  onSaved: () => Promise<void>
}

export default function BusinessProfileEditor() {
  const { userId, business, profile, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedBusinessId = new URLSearchParams(location.search).get('id')
  const [targetBusiness, setTargetBusiness] = useState<Business | null>(null)
  const [loadingBusiness, setLoadingBusiness] = useState(Boolean(requestedBusinessId))
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (!requestedBusinessId || !userId) return

    const safeUserId = userId
    const safeBusinessId = requestedBusinessId
    let alive = true

    async function loadTargetBusiness(uid: string, bid: string) {
      try {
        setLoadingBusiness(true)
        const target = await businessService.getById(bid)
        if (!target) {
          if (alive) {
            setAccessDenied(true)
            setTargetBusiness(null)
          }
          return
        }

        const isOwner = target.owner_id === uid
        const isApprovedFacilitador =
          profile?.account_type === 'facilitador' &&
          (await facilitadorService.getNegociosVinculados(uid)).some(
            ({ vinculacion, negocio }) =>
              negocio.id === target.id && vinculacion.estado_vinculacion === 'aprobado',
          )

        if (!isOwner && !isApprovedFacilitador) {
          if (alive) {
            setAccessDenied(true)
            setTargetBusiness(null)
          }
          return
        }

        if (alive) {
          setTargetBusiness(target)
          setAccessDenied(false)
        }
      } catch {
        if (alive) {
          setAccessDenied(true)
          setTargetBusiness(null)
        }
      } finally {
        if (alive) setLoadingBusiness(false)
      }
    }

    void loadTargetBusiness(safeUserId, safeBusinessId)

    return () => {
      alive = false
    }
  }, [requestedBusinessId, userId, profile?.account_type])

  if (loadingBusiness) {
    return <p className="text-sm text-ink-500">Cargando negocio…</p>
  }

  if (accessDenied) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold">No tienes acceso a este negocio</h1>
        <p className="mt-2 text-sm text-ink-600">
          Solo el dueño del negocio o un facilitador aprobado puede editar este perfil.
        </p>
        <Button className="mt-4" onClick={() => navigate('/panel')}>
          Volver al panel
        </Button>
      </div>
    )
  }

  const activeBusiness = requestedBusinessId ? targetBusiness : business

  return (
    <BusinessProfileEditorForm
      key={activeBusiness?.id ?? 'nuevo'}
      managedBusiness={activeBusiness}
      userId={userId ?? ''}
      onSaved={async () => {
        await refresh()
        navigate('/panel')
      }}
    />
  )
}

function BusinessProfileEditorForm({ managedBusiness, userId, onSaved }: FormProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: managedBusiness?.name ?? '',
      category: managedBusiness?.category ?? '',
      description: managedBusiness?.description ?? '',
      phone: managedBusiness?.phone ?? '',
      whatsapp: managedBusiness?.whatsapp ?? '',
      address: managedBusiness?.address ?? '',
      neighborhood: managedBusiness?.neighborhood ?? '',
    },
  })

  const [position, setPosition] = useState<Coordinates>(
    managedBusiness ? { lat: managedBusiness.lat, lng: managedBusiness.lng } : COMUNA_CENTER,
  )
  const [photos, setPhotos] = useState<string[]>(managedBusiness?.photos ?? [])
  const [hours, setHours] = useState<BusinessHours[]>(
    managedBusiness?.hours?.length ? managedBusiness.hours : emptyHours(),
  )
  const [wholesaleEnabled, setWholesaleEnabled] = useState(managedBusiness?.wholesale_enabled ?? false)
  const [wholesaleMinOrder, setWholesaleMinOrder] = useState(managedBusiness?.wholesale_min_order ?? '')
  const [wholesaleTerms, setWholesaleTerms] = useState(managedBusiness?.wholesale_terms ?? '')
  const [servicesCatalog, setServicesCatalog] = useState<ServiceCatalogItem[]>(
    managedBusiness?.services_catalog ?? [],
  )
  const [uploading, setUploading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const description = useWatch({ control, name: 'description' }) ?? ''

  function handleAddService() {
    setServicesCatalog((prev) => [
      ...prev,
      { id: `srv-${Date.now()}`, name: '', price: null, description: '' },
    ])
  }

  function updateService(index: number, field: keyof ServiceCatalogItem, value: unknown) {
    setServicesCatalog((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  function removeService(index: number) {
    setServicesCatalog((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(values: Values) {
    if (!userId) return
    const ownerId = managedBusiness?.owner_id ?? userId
    setServerError(null)
    try {
      await businessService.upsert(ownerId, {
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
        wholesale_enabled: wholesaleEnabled,
        wholesale_min_order: wholesaleEnabled ? wholesaleMinOrder.trim() || null : null,
        wholesale_terms: wholesaleEnabled ? wholesaleTerms.trim() || null : null,
        services_catalog: servicesCatalog.filter((s) => s.name.trim().length > 0),
        is_active: true,
      })
      await onSaved()
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
        {managedBusiness ? 'Editar mi negocio' : 'Crear mi negocio'}
      </h1>

      {managedBusiness?.verification_status === 'verified' && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
          <UI_ICONS.shieldCheck size={20} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-sm">Tu negocio cuenta con el Sello de Verificación en Territorio</span>
            <span className="text-emerald-800 dark:text-emerald-300">
              {managedBusiness.verification_note || 'Validado en persona en la comuna por un facilitador o líder comunal.'}
            </span>
          </div>
        </div>
      )}

      {managedBusiness && managedBusiness.verification_status !== 'verified' && (
        <div className="rounded-xl border border-ink-200 bg-cream-100 p-3.5 text-xs text-ink-700 flex items-start gap-2.5">
          <UI_ICONS.shieldCheck size={20} className="text-ink-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-sm text-ink-900">¿Cómo obtener el Sello de Verificación en Territorio?</span>
            <p className="mt-0.5 text-ink-600 leading-relaxed">
              Los facilitadores comunitarios y líderes de la Junta de Acción Comunal validan presencialmente que tu negocio o taller existe físicamente en el barrio. Comparte tu código de apadrinamiento con tu facilitador asignado para registrar tu visita.
            </p>
          </div>
        </div>
      )}

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

      {/* Venta al por mayor y distribuidores */}
      <section className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              <UI_ICONS.package size={20} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-ink-900">
                Venta al por mayor y distribuidores
              </h2>
              <p className="text-xs text-ink-500">
                ¿Vendes por lotes o atiendes a comerciantes y tiendas de barrio?
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={wholesaleEnabled}
              onChange={(e) => setWholesaleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-cream-300 dark:bg-cream-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
          </label>
        </div>

        {wholesaleEnabled && (
          <div className="space-y-3 pt-2 border-t border-ink-100">
            <TextField
              label="Pedido mínimo al por mayor"
              value={wholesaleMinOrder}
              onChange={(e) => setWholesaleMinOrder(e.target.value)}
              placeholder="Ej: A partir de media docena (6 unidades) o $100.000"
              hint="Indica la cantidad o monto mínimo para acceder a precio mayorista."
            />
            <TextAreaField
              label="Condiciones o descuentos mayoristas"
              value={wholesaleTerms}
              onChange={(e) => setWholesaleTerms(e.target.value)}
              placeholder="Ej: 20% de descuento sobre precio al detal. Entrega en 48 horas para dotaciones o revendedores."
              hint="Explica cómo manejas los precios o entregas para otros comerciantes de la comuna."
            />
          </div>
        )}
      </section>

      {/* Catálogo de servicios y precios de referencia */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="font-bold text-sm text-ink-900 flex items-center gap-2">
              <UI_ICONS.fileText size={18} className="text-brand-500" />
              Catálogo de servicios y tarifas de referencia
            </h2>
            <p className="text-xs text-ink-500">
              Muestra a los vecinos tus servicios más pedidos y sus precios orientativos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddService}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/40 cursor-pointer"
          >
            + Añadir servicio o tarifa
          </button>
        </div>

        {servicesCatalog.length === 0 ? (
          <p className="text-xs text-ink-500 italic py-2">
            No has agregado servicios o tarifas de referencia aún. Añade los arreglos o trabajos que más te piden.
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            {servicesCatalog.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 rounded-xl border border-ink-200 bg-cream-50 dark:bg-cream-200/40 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] items-start gap-2">
                  <div className="min-w-0">
                    <label className="text-[11px] font-semibold text-ink-600 block mb-1">
                      Servicio o producto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Ruedo de pantalón o Copia de llave"
                      value={item.name}
                      onChange={(e) => updateService(idx, 'name', e.target.value)}
                      className="w-full text-sm font-medium px-3 py-1.5 rounded-lg border border-ink-200 bg-white dark:bg-cream-100 text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 sm:w-36">
                      <label className="text-[11px] font-semibold text-ink-600 block mb-1">
                        Tarifa aprox. ($)
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 15000"
                        value={item.price ?? ''}
                        onChange={(e) =>
                          updateService(
                            idx,
                            'price',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="w-full text-sm px-3 py-1.5 rounded-lg border border-ink-200 bg-white dark:bg-cream-100 text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div className="pt-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => removeService(idx)}
                        className="p-1.5 text-ink-400 hover:text-red-500 transition-colors"
                        title="Eliminar este servicio"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Descripción o detalle breve (ej: tela estándar, a mano o máquina)"
                    value={item.description ?? ''}
                    onChange={(e) => updateService(idx, 'description', e.target.value)}
                    className="w-full text-xs text-ink-700 px-3 py-1.5 rounded-lg border border-ink-200 bg-white dark:bg-cream-100 text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 card p-4">
        <div>
          <h2 className="font-bold">Horarios de atención</h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Indica qué días atiendes. Esto activa el indicador de "Abierto ahora" para que los vecinos sepan cuándo contactarte.
          </p>
        </div>
        <ul className="divide-y divide-ink-100">
          {hours.map((h, i) => (
            <li key={h.day} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:min-w-28">
                <span className="w-12 font-semibold text-ink-900">{DAY_NAMES[h.day]}</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-ink-700">
                  <input
                    type="checkbox"
                    checked={!h.closed}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, closed: !e.target.checked } : x)),
                      )
                    }
                    className="rounded border-ink-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>{!h.closed ? 'Abierto' : 'Cerrado'}</span>
                </label>
              </div>

              {!h.closed ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-ink-500">De</span>
                  <input
                    type="time"
                    aria-label={`Hora de apertura ${DAY_NAMES[h.day]}`}
                    value={h.opens ?? '08:00'}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, opens: e.target.value } : x)),
                      )
                    }
                    className="min-h-8 w-24 rounded-lg border border-ink-200 bg-white dark:bg-cream-50 px-1.5 text-xs text-ink-900 focus:border-brand-500 focus:ring-brand-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <span className="text-ink-500">a</span>
                  <input
                    type="time"
                    aria-label={`Hora de cierre ${DAY_NAMES[h.day]}`}
                    value={h.closes ?? '18:00'}
                    onChange={(e) =>
                      setHours((prev) =>
                        prev.map((x, j) => (i === j ? { ...x, closes: e.target.value } : x)),
                      )
                    }
                    className="min-h-8 w-24 rounded-lg border border-ink-200 bg-white dark:bg-cream-50 px-1.5 text-xs text-ink-900 focus:border-brand-500 focus:ring-brand-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              ) : (
                <span className="text-xs text-ink-400 italic">No atiende este día</span>
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

      <div className="rounded-xl border border-ink-200 bg-cream-50 p-3.5 space-y-1.5 text-xs text-ink-600">
        <p className="flex items-center gap-1.5 font-semibold text-ink-800">
          <UI_ICONS.shieldCheck size={16} className="text-brand-700 shrink-0" />
          Aviso de publicación y protección de datos
        </p>
        <p>
          Al guardar este negocio, autorizas que el nombre del oficio, fotos y número de WhatsApp se
          muestren públicamente en el directorio conforme a nuestra{' '}
          <Link to="/privacidad" target="_blank" className="text-brand-700 underline font-medium">
            Política de Privacidad
          </Link>{' '}
          y los{' '}
          <Link to="/terminos" target="_blank" className="text-brand-700 underline font-medium">
            Términos de Uso
          </Link>
          . Tu dirección residencial exacta nunca se expone en mapas públicos.
        </p>
        {profile?.account_type === 'facilitador' && (
          <p className="pt-1 text-ink-800 font-medium">
            Como facilitador, declaras bajo la gravedad de juramento que cuentas con la autorización
            expresa del titular del oficio para publicar su información en ConectaComuna.
          </p>
        )}
      </div>

      <div className="sticky bottom-20 flex flex-col sm:flex-row gap-2 bg-white/95 dark:bg-cream-50/95 p-3 rounded-2xl border border-ink-200 shadow-md backdrop-blur-xs">
        <Button type="submit" fullWidth loading={isSubmitting}>
          Guardar negocio
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/panel')}
          fullWidth
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
