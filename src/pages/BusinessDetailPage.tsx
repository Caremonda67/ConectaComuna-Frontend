import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { DAY_NAMES, formatDate, getBadges } from '@/lib/utils'
import { UI_ICONS } from '@/components/ui/icons'

export default function BusinessDetailPage() {
  const { id = '' } = useParams()
  const { userId, profile, activeRole } = useAuth()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)

  const { data: business, loading, error, reload } = useAsync(
    () => businessService.getById(id),
    [id],
  )
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

  return (
    <div className="space-y-5">
      <header className="card p-4">
        <p className="text-xs font-medium text-brand-700">
          {categoryLabel(business.category)}
        </p>
        <h1 className="text-2xl font-extrabold">{business.name}</h1>
        <div className="mt-1">
          <RatingStars
            value={business.rating_avg}
            count={business.rating_count}
            size="md"
          />
        </div>
        <p className="mt-2 text-ink-700">{business.description}</p>
        <div className="mt-3">
          <BadgeList badges={getBadges(business)} />
        </div>

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

        <div className="mt-4 flex flex-wrap gap-2">
          {business.whatsapp && (
            <a
              href={`https://wa.me/57${business.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 rounded-full bg-brand-500 px-4 py-2.5 font-semibold text-white hover:bg-brand-600"
            >
              WhatsApp
            </a>
          )}
          {business.phone && (
            <a
              href={`tel:+57${business.phone}`}
              className="min-h-11 rounded-xl border border-ink-200 bg-white px-4 py-2.5 font-semibold"
            >
              Llamar
            </a>
          )}
          {isOwner ? (
            <Link
              to="/panel/negocio"
              className="min-h-11 rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white"
            >
              Editar mi negocio
            </Link>
          ) : (
            <>
              {activeRole === 'client' && (
                <Button
                  onClick={() => {
                    if (!userId) {
                      navigate('/entrar', { state: { from: `/negocio/${business.id}` } })
                      return
                    }
                    setShowForm((v) => !v)
                  }}
                >
                  Solicitar servicio
                </Button>
              )}
              {activeRole === 'business' && (
                <p className="text-sm text-ink-500">
                  Para contratar este servicio, cambia al rol de <strong>Cliente</strong> en el menú superior.
                </p>
              )}
              {activeRole === 'facilitador' && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const { facilitadorService } = await import('@/services/facilitadorService')
                      await facilitadorService.solicitarVinculacion(userId, business.id)
                      alert('Solicitud enviada al dueño del negocio.')
                    } catch (e: any) {
                      alert(e.message)
                    }
                  }}
                >
                  Apadrinar (Administrar)
                </Button>
              )}
            </>
          )}
        </div>
      </header>

      {showForm && userId && (
        <RequestForm
          businessId={business.id}
          clientId={userId}
          onDone={() => navigate('/panel')}
          onCancel={() => setShowForm(false)}
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
        <h2 id="resenas" className="mb-2 text-lg font-bold">
          Reseñas
        </h2>
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
