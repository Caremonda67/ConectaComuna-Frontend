import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { useNeighborhoodLocator } from '@/hooks/useNeighborhoodLocator'
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

  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(profile?.full_name ?? '')
  const [nuevoTelefono, setNuevoTelefono] = useState(profile?.phone ?? '')
  const [nuevoBarrio, setNuevoBarrio] = useState(profile?.neighborhood ?? '')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  const { locate: detectarBarrio, loading: detectando } = useNeighborhoodLocator(
    (barrio) => setNuevoBarrio(barrio),
    () => {},
  )

  async function guardarPerfil() {
    if (!userId) return
    setGuardandoPerfil(true)
    try {
      await profileService.update(userId, {
        full_name: nuevoNombre.trim() || profile?.full_name || '',
        phone: nuevoTelefono.trim() || null,
        neighborhood: nuevoBarrio.trim() || null,
      })
      await refresh()
      setEditandoPerfil(false)
    } finally {
      setGuardandoPerfil(false)
    }
  }

  const active =
    data?.filter((o) => !['completed', 'cancelled'].includes(o.status)) ?? []
  const history =
    data?.filter((o) => ['completed', 'cancelled'].includes(o.status)) ?? []

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold">Mi cuenta</h1>
          {!editandoPerfil && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setNuevoNombre(profile?.full_name ?? '')
                setNuevoTelefono(profile?.phone ?? '')
                setNuevoBarrio(profile?.neighborhood ?? '')
                setEditandoPerfil(true)
              }}
            >
              Editar perfil
            </Button>
          )}
        </div>

        {editandoPerfil ? (
          <div className="mt-3 space-y-3 text-sm text-ink-700">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-900">Nombre</label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink-900">Celular</label>
              <input
                type="tel"
                value={nuevoTelefono}
                onChange={(e) => setNuevoTelefono(e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink-900">Barrio / ubicación</label>
              <input
                type="text"
                value={nuevoBarrio}
                onChange={(e) => setNuevoBarrio(e.target.value)}
                placeholder="Escribe tu barrio"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={detectarBarrio}
                  disabled={detectando}
                  className="flex items-center text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                >
                  {detectando ? '⏳ Detectando...' : (
                    <><UI_ICONS.map size={14} className="mr-1" /> Usar GPS</>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" loading={guardandoPerfil} onClick={guardarPerfil}>
                Guardar cambios
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditandoPerfil(false)
                  setNuevoNombre(profile?.full_name ?? '')
                  setNuevoTelefono(profile?.phone ?? '')
                  setNuevoBarrio(profile?.neighborhood ?? '')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
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
            <div className="flex gap-2 items-start">
              <dt className="font-medium">Barrio:</dt>
              <dd>{profile?.neighborhood || 'Sin definir'}</dd>
            </div>
            {profile && (
              <div className="flex gap-2">
                <dt className="font-medium">Miembro desde:</dt>
                <dd>{formatDate(profile.created_at)}</dd>
              </div>
            )}
          </dl>
        )}

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
