import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { orderService } from '@/services/orderService'
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
