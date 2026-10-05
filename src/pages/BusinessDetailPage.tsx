import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { businessService } from '@/services/businessService'
import { orderService } from '@/services/orderService'
import { LazyMap } from '@/components/map/LazyMap'
import { RatingStars } from '@/components/ui/Rating'
import { BadgeList } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { categoryLabel } from '@/data/categories'
import { DAY_NAMES, formatDate, getBadges, shouldSkipTratoSeguro, getBusinessOpenStatus, cn, formatCurrency } from '@/lib/utils'
import { AuthGate } from '@/components/auth/AuthGate'
import { UI_ICONS } from '@/components/ui/icons'
import { TratoSeguroModal } from '@/components/trust/TratoSeguroModal'
import { ReportBusinessModal } from '@/components/trust/ReportBusinessModal'
import { BusinessShareModal } from '@/components/business/BusinessShareModal'
import type { Order } from '@/types'

export default function BusinessDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { userId, profile, activeRole } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [pedirCuenta, setPedirCuenta] = useState(false)
  const [tratoModalOpen, setTratoModalOpen] = useState(false)
  const [tratoAction, setTratoAction] = useState<'whatsapp' | 'call'>('whatsapp')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [solicitudExitosa, setSolicitudExitosa] = useState<Order | null>(null)
  const rutaNegocio = `/negocio/${id}`

  const { data: business, loading, error, reload } = useAsync(
    () => businessService.getById(id),
    [id],
  )
  const motivoContacto = `Para contactar a ${business?.name ?? 'este emprendedor'}, necesitas iniciar sesión.`
  const { data: reviews } = useAsync(() => businessService.listReviews(id), [id])

  if (loading) return <CardSkeletonList count={2} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!business)
    return (
      <EmptyState
        icon={UI_ICONS.search}
        title="Este negocio ya no está disponible"
        action={
          <Link to="/explorar" className="font-semibold text-brand-700 underline">
            Volver a explorar
          </Link>
        }
      />
    )

  const isOwner = business.owner_id === userId
  const openStatus = getBusinessOpenStatus(business.hours)

  function getWhatsAppUrl() {
    if (!business?.whatsapp) return ''
    const clean = business.whatsapp.replace(/\D/g, '')
    const cat = categoryLabel(business.category)
    const text = encodeURIComponent(
      `Hola ${business.name}, vi tu servicio de ${cat} en Conecta Comuna. Me gustaría consultar sobre un trabajo.`,
    )
    return `https://wa.me/57${clean}?text=${text}`
  }

  function getWholesaleWhatsAppUrl() {
    if (!business?.whatsapp) return ''
    const clean = business.whatsapp.replace(/\D/g, '')
    const text = encodeURIComponent(
      `Hola ${business.name}, vi en Conecta Comuna que vendes al por mayor. Me interesa cotizar un lote o pedido mayorista.`,
    )
    return `https://wa.me/57${clean}?text=${text}`
  }

  function handleWhatsApp() {
    if (!userId) {
      setPedirCuenta(true)
      return
    }
    if (shouldSkipTratoSeguro()) {
      window.open(getWhatsAppUrl(), '_blank', 'noopener,noreferrer')
      return
    }
    setTratoAction('whatsapp')
    setTratoModalOpen(true)
  }

  function handleCall() {
    if (!userId) {
      setPedirCuenta(true)
      return
    }
    if (shouldSkipTratoSeguro()) {
      window.location.href = `tel:+57${business?.phone}`
      return
    }
    setTratoAction('call')
    setTratoModalOpen(true)
  }

  function proceedTratoSeguro() {
    setTratoModalOpen(false)
    if (tratoAction === 'whatsapp' && business?.whatsapp) {
      window.open(getWhatsAppUrl(), '_blank', 'noopener,noreferrer')
    } else if (tratoAction === 'call' && business?.phone) {
      window.location.href = `tel:+57${business.phone}`
    }
  }

  return (
    <div className="space-y-5">
      <header className="card p-4">
        <p className="text-xs font-medium text-brand-700">
          {categoryLabel(business.category)}
        </p>
        <h1 className="text-2xl font-extrabold">{business.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <RatingStars
            value={business.rating_avg}
            count={business.rating_count}
            size="md"
          />
          {business.hours && business.hours.length > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full',
                openStatus.isOpen
                  ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60'
                  : 'text-ink-700 bg-cream-200 border border-ink-200',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  openStatus.isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-ink-400',
                )}
              />
              {openStatus.label} {openStatus.detail ? `· ${openStatus.detail}` : ''}
            </span>
          )}
        </div>
        <p className="mt-2 text-ink-700">{business.description}</p>
        <div className="mt-3">
          <BadgeList badges={getBadges(business)} />
        </div>

        {business.verification_status === 'verified' && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-3 text-xs text-emerald-900 dark:text-emerald-200">
            <UI_ICONS.shieldCheck size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Negocio verificado en territorio</span>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                {business.verification_note || 'Validado en persona en la comuna por un facilitador o junta comunitaria.'}
              </span>
            </div>
          </div>
        )}

        {business.verification_status === 'under_review' && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
            <UI_ICONS.alert size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Bajo observación comunitaria</span>
              <span className="text-[11px] text-amber-800 dark:text-amber-300">
                Este negocio cuenta con reportes recientes que están siendo verificados por la comunidad.
              </span>
            </div>
          </div>
        )}

        {business.wholesale_enabled && (
          <div className="mt-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 text-xs text-indigo-950 dark:text-indigo-200">
            <div className="flex items-start gap-2.5">
              <UI_ICONS.package size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                    Venta al por mayor y distribuidores
                  </span>
                  {business.wholesale_min_order && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-medium text-[11px]">
                      Pedido mín: {business.wholesale_min_order}
                    </span>
                  )}
                </div>
                {business.wholesale_terms ? (
                  <p className="text-indigo-800 dark:text-indigo-300 text-xs">
                    {business.wholesale_terms}
                  </p>
                ) : (
                  <p className="text-indigo-800 dark:text-indigo-300 text-xs">
                    Este emprendimiento ofrece precios especiales para tiendas, distribuidores y compras por volumen.
                  </p>
                )}
                {business.whatsapp && !isOwner && (
                  <div className="pt-1.5">
                    <a
                      href={getWholesaleWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-xs text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 hover:underline"
                    >
                      <UI_ICONS.whatsapp size={14} className="text-[#25D366]" />
                      Consultar precios mayoristas por WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <dl className="mt-4 grid gap-1 text-sm text-ink-700">
          {business.address && (
            <div className="flex gap-2">
              <dt className="font-medium">Dirección:</dt>
              <dd>{business.address}</dd>
            </div>
          )}
          {business.neighborhood && (
            <div className="flex gap-2">
              <dt className="font-medium">Barrio:</dt>
              <dd>{business.neighborhood}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="font-medium">Servicios finalizados:</dt>
            <dd>{business.completed_orders}</dd>
          </div>
        </dl>

        {isOwner ? (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">
                ✓
              </span>
              <p className="text-sm font-semibold text-brand-900">
                Este es tu negocio (vista previa pública)
              </p>
            </div>
            <p className="text-xs text-ink-600">
              Así es exactamente como los vecinos y clientes ven tu ficha, portafolio y horarios en la comuna.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Link
                to="/panel/negocio"
                className="flex-1 min-h-11 inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white hover:bg-brand-600 transition-colors text-center text-sm shadow-xs"
              >
                Editar información de mi negocio
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShareModalOpen(true)}
                className="flex-1 min-h-11"
              >
                <UI_ICONS.share size={18} />
                Compartir volante digital
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {business.whatsapp && (
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#20bd5a] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                <UI_ICONS.whatsapp size={18} />
                Contactar por WhatsApp
              </button>
            )}

            {business.phone && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCall}
                fullWidth
                className="min-h-12"
              >
                <UI_ICONS.phone size={18} />
                Llamar directo
              </Button>
            )}

            {activeRole === 'client' && (
              <div className="sm:col-span-2">
                <Button
                  onClick={() => {
                    if (!userId) {
                      setPedirCuenta(true)
                      return
                    }
                    setShowForm((v) => !v)
                  }}
                  fullWidth
                  className="min-h-12"
                >
                  {showForm ? 'Ocultar solicitud' : 'Solicitar servicio en la plataforma'}
                </Button>
              </div>
            )}

            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShareModalOpen(true)}
                className="flex-1 min-h-11"
              >
                <UI_ICONS.share size={18} />
                Compartir tarjeta del negocio
              </Button>
            </div>

            {activeRole === 'business' && (
              <div className="sm:col-span-2">
                <p className="text-sm text-ink-500 bg-brand-50 p-2.5 rounded-xl border border-brand-100">
                  Para contratar este servicio, cambia al rol de <strong>Cliente</strong> en el menú superior.
                </p>
              </div>
            )}

            {activeRole === 'facilitador' && (
              <div className="sm:col-span-2">
                <p className="text-sm text-ink-500 bg-brand-50 p-2.5 rounded-xl border border-brand-100">
                  Para apadrinar este negocio, pídele el código al dueño e ingrésalo en tu panel de facilitador.
                </p>
              </div>
            )}
          </div>
        )}

        {!isOwner && (
          <div className="mt-4 pt-3 border-t border-ink-100 flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/trato-seguro"
              className="inline-flex items-center gap-1.5 text-xs text-brand-700 hover:text-brand-900 transition-colors"
            >
              <UI_ICONS.shieldCheck size={14} className="shrink-0" />
              Contacto respaldado por el Trato Seguro Comunal
            </Link>
            <button
              type="button"
              onClick={() => {
                if (!userId) {
                  setPedirCuenta(true)
                  return
                }
                setReportModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <UI_ICONS.flag size={13} className="shrink-0" />
              Reportar irregularidad o posible fraude
            </button>
          </div>
        )}
      </header>

      <AuthGate
        open={pedirCuenta}
        onClose={() => setPedirCuenta(false)}
        from={rutaNegocio}
        motivo={motivoContacto}
      />

      <TratoSeguroModal
        open={tratoModalOpen}
        onClose={() => setTratoModalOpen(false)}
        onProceed={proceedTratoSeguro}
        businessName={business.name}
        isVerified={business.verification_status === 'verified'}
        actionType={tratoAction}
      />

      <ReportBusinessModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        businessId={business.id}
        businessName={business.name}
        userId={userId}
        onRequireAuth={() => setPedirCuenta(true)}
        onReportSubmitted={reload}
      />

      <BusinessShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        business={business}
      />

      {showForm && userId && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        >
          <RequestForm
            businessId={business.id}
            clientId={userId}
            onDone={(createdOrder) => {
              setShowForm(false)
              setSolicitudExitosa(createdOrder)
            }}
            onCancel={() => setShowForm(false)}
          />
        </motion.div>
      )}

      {solicitudExitosa && (
        <SolicitudEnviadaModal
          order={solicitudExitosa}
          businessName={business.name}
          businessPhone={business.phone || business.whatsapp || undefined}
          onClose={() => setSolicitudExitosa(null)}
          onGoToPanel={() => {
            setSolicitudExitosa(null)
            navigate('/panel')
          }}
        />
      )}

      {business.photos.length > 0 && (
        <section aria-labelledby="portafolio">
          <h2 id="portafolio" className="mb-2 text-lg font-bold">
            Portafolio
          </h2>
          <ul className="grid grid-cols-3 gap-2">
            {business.photos.map((src) => (
              <li key={src}>
                <img
                  src={src}
                  alt={`Trabajo de ${business.name}`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full rounded-xl object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ubicacion">
        <h2 id="ubicacion" className="mb-2 text-lg font-bold">
          Cómo llegar
        </h2>
        <LazyMap
          center={{ lat: business.lat, lng: business.lng }}
          businesses={[{ ...business, distanceKm: null }]}
          showUser={false}
          height="240px"
          zoom={16}
        />
      </section>

      {business.hours.length > 0 && (
        <section aria-labelledby="horarios">
          <h2 id="horarios" className="mb-2 text-lg font-bold">
            Horarios
          </h2>
          <ul className="card p-3 text-sm">
            {business.hours.map((h) => (
              <li key={h.day} className="flex justify-between border-b border-ink-100 py-1.5 last:border-0">
                <span className="font-medium">{DAY_NAMES[h.day]}</span>
                <span className="text-ink-500">
                  {h.closed ? 'Cerrado' : `${h.opens} – ${h.closes}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="resenas">
        <div className="mb-2">
          <h2 id="resenas" className="text-lg font-bold">
            Reseñas
          </h2>
          <p className="text-xs text-ink-500 flex items-center gap-1.5 mt-0.5">
            <UI_ICONS.shieldCheck size={14} className="text-emerald-700 shrink-0" />
            Opiniones verificadas de vecinos con servicios completados en la plataforma.
          </p>
        </div>
        {!reviews || reviews.length === 0 ? (
          <EmptyState
            icon={UI_ICONS.message}
            title="Aún no hay reseñas"
            description="Sé la primera persona en calificar este servicio."
          />
        ) : (
          <ul className="grid gap-2">
            {reviews.map((r) => (
              <li key={r.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.client?.full_name ?? 'Vecino'}</span>
                  <RatingStars value={r.rating} />
                </div>
                {r.comment && <p className="mt-1 text-sm text-ink-700">{r.comment}</p>}
                <p className="mt-1 text-xs text-ink-500">{formatDate(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {profile?.account_type === 'business' && !isOwner && (
        <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
          Estás contratando como cliente. Tu negocio no se ve afectado.
        </p>
      )}
    </div>
  )
}

const MAX_PHOTOS = 3
const MAX_FILE_MB = 5

function RequestForm({
  businessId,
  clientId,
  onDone,
  onCancel,
}: {
  businessId: string
  clientId: string
  onDone: (order: Order) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [priceEstimate, setPriceEstimate] = useState('')
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
        <label className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-ink-100">
          Modalidad del servicio
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setServiceLocationType('workshop')}
            className={cn(
              'flex flex-col items-center justify-center p-3 rounded-xl border text-center text-xs transition-colors cursor-pointer',
              serviceLocationType === 'workshop'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 font-semibold'
                : 'border-ink-200 dark:border-ink-700 bg-white dark:bg-cream-50 text-ink-700 hover:bg-cream-100 dark:hover:bg-cream-100/10',
            )}
          >
            <UI_ICONS.tools size={18} className="mb-1 text-brand-600 dark:text-brand-400" />
            <span>En taller / local</span>
            <span className="text-[10px] text-ink-500 font-normal">Llevas o recoges allí</span>
          </button>

          <button
            type="button"
            onClick={() => setServiceLocationType('home_delivery')}
            className={cn(
              'flex flex-col items-center justify-center p-3 rounded-xl border text-center text-xs transition-colors cursor-pointer',
              serviceLocationType === 'home_delivery'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 font-semibold'
                : 'border-ink-200 dark:border-ink-700 bg-white dark:bg-cream-50 text-ink-700 hover:bg-cream-100 dark:hover:bg-cream-100/10',
            )}
          >
            <UI_ICONS.map size={18} className="mb-1 text-brand-600 dark:text-brand-400" />
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
                  className="h-20 w-20 rounded-lg object-cover border border-ink-200 dark:border-ink-600"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Quitar foto ${i + 1}`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white text-xs leading-none shadow-sm hover:bg-rose-700 transition-colors cursor-pointer"
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

      <div className="rounded-xl border border-brand-200 dark:border-brand-800/60 bg-brand-50/70 dark:bg-brand-950/40 p-3 text-xs text-brand-900 dark:text-brand-200 flex items-start gap-2">
        <UI_ICONS.shieldCheck size={16} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block">Trato Seguro Comunal</span>
          <span className="text-[11px] text-brand-800 dark:text-brand-300">
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

function SolicitudEnviadaModal({
  order,
  businessName,
  businessPhone,
  onClose,
  onGoToPanel,
}: {
  order: Order
  businessName: string
  businessPhone?: string
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-cream-100 p-5 shadow-xl border border-ink-100 dark:border-ink-700 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <UI_ICONS.shieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">
              ¡Solicitud registrada!
            </h2>
            <p className="text-xs text-ink-500">
              Código de seguimiento: <span className="font-mono font-bold text-brand-700 dark:text-brand-300">{code}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-ink-200 dark:border-ink-700 bg-cream-50 dark:bg-cream-50/5 p-3.5 space-y-2 text-sm">
          <div className="flex justify-between items-start">
            <span className="text-ink-500 text-xs">Servicio:</span>
            <span className="font-semibold text-ink-900 dark:text-ink-100 text-right">{order.title}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-ink-500 text-xs">Modalidad:</span>
            <span className="text-xs font-medium text-ink-800 dark:text-ink-200">
              {order.service_location_type === 'home_delivery'
                ? `A domicilio (${order.delivery_address || 'Dirección acordada'})`
                : 'En taller o local del emprendedor'}
            </span>
          </div>

          {order.price_estimate && (
            <div className="flex justify-between items-center pt-1 border-t border-ink-100 dark:border-ink-800">
              <span className="text-ink-500 text-xs">Presupuesto inicial:</span>
              <span className="font-bold text-brand-700 dark:text-brand-300">
                {formatCurrency(order.price_estimate)}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-brand-200 dark:border-brand-800/60 bg-brand-50/70 dark:bg-brand-950/40 p-3 text-xs text-brand-900 dark:text-brand-200">
          <p className="font-semibold flex items-center gap-1.5 mb-1">
            <UI_ICONS.shieldCheck size={14} className="shrink-0 text-brand-600" />
            Respaldo Trato Seguro
          </p>
          <p className="text-brand-800 dark:text-brand-300">
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
