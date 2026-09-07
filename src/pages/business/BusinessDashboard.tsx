import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { orderService } from '@/services/orderService'
import { facilitadorService } from '@/services/facilitadorService'
import { OrderCard } from '@/components/orders/OrderCard'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { RatingStars } from '@/components/ui/Rating'
import { BadgeList } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { getBadges, profileCompletion } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import { UI_ICONS } from '@/components/ui/icons'

/** Panel del negocio: pedidos recibidos, reputación y perfil asistido. */
export default function BusinessDashboard() {
  const { business } = useAuth()
  const { data, loading, error, reload } = useAsync(
    () => (business ? orderService.listAsBusiness(business.id) : Promise.resolve([])),
    [business?.id],
  )

  if (!business) {
    return (
      <EmptyState
        icon={UI_ICONS.tools}
        title="Todavía no has creado tu negocio"
        description="Completa tu ficha para aparecer en el mapa y recibir solicitudes."
        action={
          <Link
            to="/panel/negocio"
            className="min-h-11 rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white"
          >
            Crear mi negocio
          </Link>
        }
      />
    )
  }

  const completion = profileCompletion(business)
  const pending = data?.filter((o) => o.status === 'pending') ?? []
  const inProgress =
    data?.filter((o) => ['accepted', 'in_progress'].includes(o.status)) ?? []
  const closed =
    data?.filter((o) => ['completed', 'cancelled'].includes(o.status)) ?? []

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{business.name}</h1>
            <RatingStars value={business.rating_avg} count={business.rating_count} />
          </div>
          <Link
            to="/panel/negocio"
            className="min-h-9 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium"
          >
            Editar
          </Link>
        </div>

        <div className="mt-3">
          <BadgeList badges={getBadges(business)} />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Pendientes" value={pending.length} />
          <Stat label="En curso" value={inProgress.length} />
          <Stat label="Finalizados" value={business.completed_orders} />
        </dl>
      </section>

      {/* Gestión asistida: le decimos exactamente qué le falta y por qué importa. */}
      {completion.percent < 100 && (
        <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <h2 className="font-bold text-brand-700">
            Tu perfil está {completion.percent}% completo
          </h2>
          <div
            role="progressbar"
            aria-valuenow={completion.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Completitud del perfil"
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white"
          >
            <div
              className="h-full bg-brand-500"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1 text-sm text-brand-700">
            {completion.missing.map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ul>
          <Link to="/panel/negocio">
            <Button size="sm" className="mt-3">
              Completar perfil
            </Button>
          </Link>
        </section>
      )}

      <ApadrinamientoPanel businessId={business.id} />
            <section aria-labelledby="pendientes">
        <h2 id="pendientes" className="mb-2 text-lg font-bold">
          Solicitudes nuevas
        </h2>
        {loading && <CardSkeletonList count={2} />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && pending.length === 0 && (
          <EmptyState
            icon={UI_ICONS.inbox}
            title="Sin solicitudes nuevas"
            description="Comparte tu perfil por WhatsApp para conseguir tus primeros clientes."
          />
        )}
        <div className="grid gap-3">
          {pending.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              perspective="business"
              onStatusChange={async (status: OrderStatus) => {
                await orderService.updateStatus(o.id, status)
                reload()
              }}
            />
          ))}
        </div>
      </section>

      {inProgress.length > 0 && (
        <section aria-labelledby="encurso">
          <h2 id="encurso" className="mb-2 text-lg font-bold">
            Trabajos en curso
          </h2>
          <div className="grid gap-3">
            {inProgress.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                perspective="business"
                onStatusChange={async (status: OrderStatus) => {
                  await orderService.updateStatus(o.id, status)
                  reload()
                }}
              />
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="cerrados">
          <h2 id="cerrados" className="mb-2 text-lg font-bold">
            Historial
          </h2>
          <div className="grid gap-3">
            {closed.map((o) => (
              <OrderCard key={o.id} order={o} perspective="business" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream-100 p-2">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="text-xl font-extrabold text-ink-900">{value}</dd>
    </div>
  )
}

function ApadrinamientoPanel({ businessId }: { businessId: string }) {
  const { data: vinculaciones, loading, error, reload } = useAsync(
    () => facilitadorService.getVinculacionesDelNegocio(businessId),
    [businessId],
  )
  const [accion, setAccion] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function responder(id: string, estado: 'aprobado' | 'rechazado' | 'revocado') {
    if (busy) return
    setBusy(true)
    setAccion(id)
    setMensaje(null)
    setErrorMsg(null)
    try {
      // Usamos el mismo método responderSolicitud, ya que solo cambia el estado.
      // Si el backend es estricto con los estados, asegúrate de que soporte 'revocado' o 'rechazado'.
      await facilitadorService.responderSolicitud(id, estado === 'revocado' ? 'rechazado' : estado)
      setMensaje(
        estado === 'aprobado'
          ? 'Apadrinamiento aprobado.'
          : estado === 'revocado'
            ? 'Acceso revocado correctamente.'
            : 'Solicitud rechazada.',
      )
      reload()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'No pudimos guardar tu decisión.')
    } finally {
      setBusy(false)
      setAccion(null)
    }
  }

  if (loading) return null
  if (error) {
    return (
      <section className="rounded-2xl border border-ink-200 p-4">
        <h2 className="text-lg font-bold">Gestión de Facilitadores</h2>
        <ErrorState message={error} onRetry={reload} />
      </section>
    )
  }

  const pendientes = vinculaciones?.filter((v) => v.estado_vinculacion === 'pendiente') ?? []
  const aprobados = vinculaciones?.filter((v) => v.estado_vinculacion === 'aprobado') ?? []

  if (pendientes.length === 0 && aprobados.length === 0) return null

  return (
    <section className="rounded-2xl border border-ink-200 p-4 space-y-4">
      {mensaje && <p className="text-sm font-medium text-brand-700">{mensaje}</p>}
      {errorMsg && (
        <p role="alert" className="text-sm text-rose-700">
          {errorMsg}
        </p>
      )}

      {pendientes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold">Solicitudes de apadrinamiento</h2>
          <p className="mb-3 text-sm text-ink-500">
            Un vecino pide ayudarte a administrar tu perfil. Aprobarlo le permite editar
            tus fotos y precios; tú sigues siendo el dueño principal.
          </p>
          <ul className="space-y-3">
            {pendientes.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-3"
              >
                <div>
                  <p className="font-semibold">{s.facilitador?.full_name ?? 'Vecino'}</p>
                  {s.facilitador?.phone && (
                    <p className="text-xs text-ink-500">{s.facilitador.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={busy && accion === s.id}
                    onClick={() => void responder(s.id, 'aprobado')}
                  >
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void responder(s.id, 'rechazado')}
                  >
                    Rechazar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aprobados.length > 0 && (
        <div>
          <h2 className="text-lg font-bold">Facilitadores autorizados</h2>
          <p className="mb-3 text-sm text-ink-500">
            Personas que actualmente pueden editar y gestionar tu negocio.
          </p>
          <ul className="space-y-3">
            {aprobados.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream-100 p-3"
              >
                <div>
                  <p className="font-semibold">{s.facilitador?.full_name ?? 'Vecino'}</p>
                  {s.facilitador?.phone && (
                    <p className="text-xs text-ink-500">{s.facilitador.phone}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy && accion === s.id}
                  onClick={() => {
                    if (window.confirm('¿Seguro que quieres revocar el acceso a este facilitador? Ya no podrá gestionar tu negocio.')) {
                      void responder(s.id, 'revocado')
                    }
                  }}
                >
                  Revocar acceso
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

