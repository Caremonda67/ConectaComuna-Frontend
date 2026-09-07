import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { orderService } from '@/services/orderService'
import { OrderCard } from '@/components/orders/OrderCard'
import { MisDirecciones } from '@/components/location/MisDirecciones'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { profileService } from '@/services/profileService'
import { ORDER_STATUS_LABEL, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import { UI_ICONS } from '@/components/ui/icons'

/** Panel del cliente: historial y seguimiento de sus solicitudes. */
export default function ClientDashboard() {
  const { userId, profile, refresh, isDual } = useAuth()
  const { data, loading, error, reload } = useAsync(
    () => (userId ? orderService.listAsClient(userId) : Promise.resolve([])),
    [userId],
  )

  const active =
    data?.filter((o) => !['completed', 'cancelled'].includes(o.status)) ?? []
  const history =
    data?.filter((o) => ['completed', 'cancelled'].includes(o.status)) ?? []

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <h1 className="text-xl font-bold">Mi cuenta</h1>
        <dl className="mt-2 grid gap-1 text-sm text-ink-700">
          <div className="flex gap-2">
            <dt className="font-medium">Nombre:</dt>
            <dd>{profile?.full_name}</dd>
          </div>
          {profile?.phone && (
            <div className="flex gap-2">
              <dt className="font-medium">Celular:</dt>
              <dd>{profile.phone}</dd>
            </div>
          )}
          {profile?.neighborhood && (
            <div className="flex gap-2">
              <dt className="font-medium">Barrio:</dt>
              <dd>{profile.neighborhood}</dd>
            </div>
          )}
          {profile && (
            <div className="flex gap-2">
              <dt className="font-medium">Miembro desde:</dt>
              <dd>{formatDate(profile.created_at)}</dd>
            </div>
          )}
        </dl>

        {!isDual && (
          <div className="mt-4 rounded-xl bg-brand-50 p-3">
            <p className="text-sm text-brand-700">
              ¿Tienes un oficio? Activa tu cuenta de negocio y empieza a recibir clientes de
              la comuna.
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={async () => {
                if (!userId) return
                await profileService.upgradeToBusiness(userId)
                await refresh()
              }}
            >
              Activar mi negocio
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="direcciones">
        <h2 id="direcciones" className="mb-2 text-lg font-bold">
          Mis direcciones
        </h2>
        {userId ? (
          <MisDirecciones usuarioId={userId} />
        ) : (
          <EmptyState
            icon={UI_ICONS.map}
            title="Inicia sesión para guardar direcciones"
            description="Guarda tu casa o el trabajo y busca oficios cerca de tu zona."
          />
        )}
      </section>

      <section aria-labelledby="activos">
        <h2 id="activos" className="mb-2 text-lg font-bold">
          Servicios en curso
        </h2>
        {loading && <CardSkeletonList count={2} />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && active.length === 0 && (
          <EmptyState
            icon={UI_ICONS.dashboard}
            title="No tienes servicios activos"
            description="Busca un oficio en tu comuna y haz tu primera solicitud."
            action={
              <Link to="/explorar" className="font-semibold text-brand-700 underline">
                Explorar oficios
              </Link>
            }
          />
        )}
        <div className="grid gap-3">
          {active.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              perspective="client"
              onStatusChange={async (status: OrderStatus) => {
                await orderService.updateStatus(o.id, status)
                reload()
              }}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-2 text-lg font-bold">
          Historial
        </h2>
        {!loading && history.length === 0 ? (
          <p className="text-sm text-ink-500">
            Aquí verás los servicios {ORDER_STATUS_LABEL.completed.toLowerCase()}s y
            cancelados.
          </p>
        ) : (
          <div className="grid gap-3">
            {history.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                perspective="client"
                onReview={async (rating, comment) => {
                  if (!userId) return
                  await orderService.createReview({
                    orderId: o.id,
                    businessId: o.business_id,
                    clientId: userId,
                    rating,
                    comment: comment || null,
                  })
                  reload()
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
