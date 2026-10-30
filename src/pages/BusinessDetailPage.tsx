import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { businessService } from '@/services/businessService'
import { LazyMap } from '@/components/map/LazyMap'
import { RatingStars } from '@/components/ui/Rating'
import { BadgeList } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { categoryLabel } from '@/data/categories'
import { DAY_NAMES, formatDate, getBadges, shouldSkipTratoSeguro, getBusinessOpenStatus, cn, formatCurrency } from '@/lib/utils'
import { AuthGate } from '@/components/auth/AuthGate'
import { UI_ICONS } from '@/components/ui/icons'
import { TratoSeguroModal } from '@/components/trust/TratoSeguroModal'
import { TratoSeguroReceiptModal } from '@/components/trust/TratoSeguroReceiptModal'
import { ReportBusinessModal } from '@/components/trust/ReportBusinessModal'
import { BusinessShareModal } from '@/components/business/BusinessShareModal'
import { RequestForm } from '@/components/business/RequestForm'
import { SolicitudEnviadaModal } from '@/components/business/SolicitudEnviadaModal'
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal'
import { usePageMeta } from '@/hooks/usePageMeta'
import type { Order, ServiceCatalogItem } from '@/types'

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
  const [comprobanteModalOrder, setComprobanteModalOrder] = useState<Order | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const rutaNegocio = `/negocio/${id}`

  const { data: business, loading, error, reload } = useAsync(
    () => businessService.getById(id),
    [id],
  )

  usePageMeta({
    title: business ? `${business.name} · ${categoryLabel(business.category)} en ${business.neighborhood || 'Cali'}` : 'Detalle de oficio',
    description: business?.description || 'Consulta los servicios, tarifas y contacto de este emprendedor en ConectaComuna.',
    image: business?.photos?.[0],
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  })

  const motivoContacto = `Para contactar a ${business?.name ?? 'este emprendedor'}, necesitas ingresar a tu cuenta.`
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
  const canRequest = activeRole === 'client' && !isOwner
  const isFormVisible = showForm && canRequest && Boolean(userId)
  const openStatus = getBusinessOpenStatus(business.hours)

  function handleSelectService(item: ServiceCatalogItem) {
    if (!userId) {
      setPedirCuenta(true)
      return
    }
    if (!canRequest) return
    setSelectedService(item)
    setShowForm(true)
    setTimeout(() => {
      document.getElementById('solicitud-servicio-form')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

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
              {openStatus.isOpen ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-ink-400 shrink-0" />
              )}
              {openStatus.isOpen ? `En taller · Atendiendo ahora` : openStatus.label} {openStatus.detail ? `· ${openStatus.detail}` : ''}
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
              {/* Quién firmó y cuándo. Un sello anónimo no compromete a nadie;
                  con el nombre a la vista, quien avala responde por lo que avala. */}
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block">
                {business.verification_by
                  ? `Lo visitó ${business.verification_by}${
                      business.verification_date
                        ? `, el ${new Date(business.verification_date).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}`
                        : ''
                    }.`
                  : 'Validado en persona por un facilitador de la red.'}
              </span>
              {business.verification_note && (
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block mt-0.5 italic">
                  «{business.verification_note}»
                </span>
              )}
            </div>
          </div>
        )}

        {business.verification_status === 'under_review' && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
            <UI_ICONS.alert size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Bajo observación comunitaria</span>
              <span className="text-[11px] text-amber-800 dark:text-amber-300">
                Este negocio acumula reportes confirmados por el equipo de Conecta Comuna. Habla con la persona antes de pagar un anticipo.
              </span>
            </div>
          </div>
        )}

        {business.wholesale_enabled && (
          <div className="mt-3.5 rounded-xl border border-brand-200 dark:border-brand-400/35 bg-brand-50/80 dark:bg-[#18281d] p-3.5 text-xs text-brand-950 dark:text-ink-800 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <UI_ICONS.package size={20} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-sm text-brand-900 dark:text-[#b4f5bf]">
                    Venta al por mayor y distribuidores
                  </span>
                  {business.wholesale_min_order && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-100 dark:bg-[#24422e] text-brand-800 dark:text-[#b4f5bf] font-semibold text-[11px] border border-transparent dark:border-[#386546]">
                      Pedido mín: {business.wholesale_min_order}
                    </span>
                  )}
                </div>
                {business.wholesale_terms ? (
                  <p className="text-brand-800 dark:text-[#e8efe9] text-xs leading-relaxed">
                    {business.wholesale_terms}
                  </p>
                ) : (
                  <p className="text-brand-800 dark:text-[#e8efe9] text-xs leading-relaxed">
                    Este emprendimiento ofrece precios especiales para tiendas, distribuidores y compras por volumen.
                  </p>
                )}
                {business.whatsapp && !isOwner && (
                  <div className="pt-1">
                    <a
                      href={getWholesaleWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-xs text-brand-700 dark:text-[#78de8b] hover:text-brand-900 dark:hover:text-white hover:underline"
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
          {/* Solo contamos lo que pasó por la plataforma. La trayectoria de
              antes la cuenta la persona en su descripción, que es donde
              corresponde: es algo que declara, no algo que nosotros podamos
              certificar. */}
          {business.completed_orders > 0 && (
            <div className="flex gap-2">
              <dt className="font-medium">Servicios por ConectaComuna:</dt>
              <dd>{business.completed_orders}</dd>
            </div>
          )}
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
                className={cn(
                  "group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#20bd5a] hover:shadow-md hover:shadow-[#25D366]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer",
                  !business.phone && "sm:col-span-2"
                )}
              >
                <UI_ICONS.whatsapp size={18} className="transition-transform duration-200 group-hover:scale-115 group-hover:-rotate-6" />
                Contactar por WhatsApp
              </button>
            )}

            {business.phone && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCall}
                fullWidth
                className={cn("min-h-12", !business.whatsapp && "sm:col-span-2")}
              >
                <UI_ICONS.phone size={18} />
                Llamar directo
              </Button>
            )}

            {canRequest && (
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
                  {isFormVisible ? 'Ocultar solicitud' : 'Solicitar servicio en la plataforma'}
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
              Respaldado por el Trato Seguro Comunal
            </Link>
            <Link
              to="/trato-seguro/verificar"
              className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-brand-700 transition-colors"
            >
              <UI_ICONS.search size={13} className="shrink-0" />
              Verificar un pacto con QR
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
              className="group inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-rose-700 transition-colors cursor-pointer active:scale-95"
            >
              <UI_ICONS.flag size={13} className="shrink-0 transition-transform duration-150 group-hover:scale-115 group-hover:-rotate-12" />
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

      {isFormVisible && (
        <div id="solicitud-servicio-form">
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          >
            <RequestForm
              key={selectedService?.id ?? 'default'}
              businessId={business.id}
              clientId={userId!}
              initialTitle={selectedService?.name || ''}
              initialPriceEstimate={selectedService?.price ?? null}
              onDone={(createdOrder) => {
                setShowForm(false)
                setSelectedService(null)
                setSolicitudExitosa(createdOrder)
              }}
              onCancel={() => {
                setShowForm(false)
                setSelectedService(null)
              }}
            />
          </motion.div>
        </div>
      )}

      {solicitudExitosa && (
        <SolicitudEnviadaModal
          order={solicitudExitosa}
          businessName={business.name}
          businessPhone={business.phone || business.whatsapp || undefined}
          onVerComprobante={() => setComprobanteModalOrder(solicitudExitosa)}
          onClose={() => setSolicitudExitosa(null)}
          onGoToPanel={() => {
            setSolicitudExitosa(null)
            navigate('/panel')
          }}
        />
      )}

      {comprobanteModalOrder && (
        <TratoSeguroReceiptModal
          open={!!comprobanteModalOrder}
          onClose={() => setComprobanteModalOrder(null)}
          order={comprobanteModalOrder}
        />
      )}

      {business.services_catalog && business.services_catalog.length > 0 && (
        <section aria-labelledby="catalogo-servicios">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 id="catalogo-servicios" className="text-lg font-bold">
              Servicios y tarifas de referencia
            </h2>
            <span className="text-xs text-ink-500 font-medium">Precios orientativos</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {business.services_catalog.map((item) => (
              <div
                key={item.id}
                className="card p-3.5 flex flex-col justify-between gap-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-ink-900">
                      {item.name}
                    </h3>
                    {item.price != null && (
                      <span className="font-bold text-sm text-brand-700 shrink-0">
                        {formatCurrency(item.price)}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-xs text-ink-600">
                      {item.description}
                    </p>
                  )}
                </div>
                {!isOwner && activeRole === 'client' && (
                  <button
                    type="button"
                    onClick={() => handleSelectService(item)}
                    className="group self-start inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 pt-1 cursor-pointer active:scale-95 transition-transform"
                  >
                    <span className="hover:underline">Pedir este trabajo</span>
                    <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-1">&rarr;</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {business.photos.length > 0 && (
        <section aria-labelledby="portafolio">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 id="portafolio" className="text-lg font-bold">
              Portafolio
            </h2>
            <span className="text-xs text-ink-500 font-medium">
              Toca para ampliar y hacer zoom
            </span>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {business.photos.map((src, idx) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="group relative aspect-square w-full overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer block border border-ink-200/60 dark:border-ink-700/40 shadow-2xs hover:shadow-md transition-shadow"
                  aria-label={`Ver foto ${idx + 1} de ${business.name} en tamaño completo`}
                >
                  <img
                    src={src}
                    alt={`Trabajo de ${business.name}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/65 text-white rounded-full p-2.5 shadow-lg transform scale-75 group-hover:scale-100">
                      <UI_ICONS.zoomIn size={18} />
                    </span>
                  </div>
                </button>
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

      {business.photos.length > 0 && lightboxIndex !== null && (
        <ImageLightboxModal
          key={lightboxIndex}
          images={business.photos}
          initialIndex={lightboxIndex}
          open={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          title={business.name}
        />
      )}
    </div>
  )
}
