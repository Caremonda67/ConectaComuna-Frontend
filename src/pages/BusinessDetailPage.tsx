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
import { DAY_NAMES, formatDate, getBadges, shouldSkipTratoSeguro, getBusinessOpenStatus, cn } from '@/lib/utils'
import { AuthGate } from '@/components/auth/AuthGate'
import { UI_ICONS } from '@/components/ui/icons'
import { TratoSeguroModal } from '@/components/trust/TratoSeguroModal'
import { ReportBusinessModal } from '@/components/trust/ReportBusinessModal'
import { BusinessShareModal } from '@/components/business/BusinessShareModal'

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
                  ? 'text-emerald-800 bg-emerald-100/80 border border-emerald-300'
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
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
            <UI_ICONS.shieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Negocio verificado en territorio</span>
              <span className="text-[11px] text-emerald-800">
                {business.verification_note || 'Validado en persona en la comuna por un facilitador o junta comunitaria.'}
              </span>
            </div>
          </div>
        )}

        {business.verification_status === 'under_review' && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
            <UI_ICONS.alert size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Bajo observación comunitaria</span>
              <span className="text-[11px] text-amber-800">
                Este negocio cuenta con reportes recientes que están siendo verificados por la comunidad.
              </span>
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

          {!isOwner && activeRole === 'client' && (
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

            {isOwner && (
              <Link
                to="/panel/negocio"
                className="flex-1 min-h-11 inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white hover:bg-brand-600 transition-colors text-center"
              >
                Editar mi negocio
              </Link>
            )}
          </div>

          {activeRole === 'business' && !isOwner && (
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

        {!isOwner && (
          <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between">
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
            onDone={() => navigate('/panel')}
            onCancel={() => setShowForm(false)}
          />
        </motion.div>
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

function RequestForm({
  businessId,
  clientId,
  onDone,
  onCancel,
}: {
  businessId: string
  clientId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 4) {
      setErr('Describe el servicio en pocas palabras (mínimo 4 caracteres).')
      return
    }
    setSubmitting(true)
    setErr(null)
    try {
      await orderService.create({
        businessId,
        clientId,
        title: title.trim(),
        description: description.trim(),
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      })
      onDone()
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
      <TextField
        label="¿Para cuándo? (opcional)"
        type="datetime-local"
        value={scheduledFor}
        onChange={(e) => setScheduledFor(e.target.value)}
      />
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
