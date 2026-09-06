import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { facilitadorService } from '@/services/facilitadorService'
import { Button } from '@/components/ui/Button'
import type { Business, FacilitadorNegocio } from '@/types'

export default function FacilitatorDashboard() {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const [vinculaciones, setVinculaciones] = useState<Array<{ vinculacion: FacilitadorNegocio, negocio: Business }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      facilitadorService.getNegociosVinculados(userId).then((data) => {
        setVinculaciones(data)
        setLoading(false)
      })
    }
  }, [userId])

  if (loading) {
    return <div className="p-4 text-center text-ink-500">Cargando tus negocios apadrinados...</div>
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Panel de Facilitador</h1>
        <p className="text-sm text-ink-500">
          Aquí puedes ver y administrar los perfiles de los emprendedores que estás apoyando.
        </p>
      </header>

      {vinculaciones.length === 0 ? (
        <section className="card p-6 text-center">
          <p className="mb-4 text-ink-600">Aún no estás administrando ningún negocio.</p>
          <Button onClick={() => navigate('/explorar')}>
            Buscar un negocio para apadrinar
          </Button>
        </section>
      ) : (
        <ul className="space-y-4">
          {vinculaciones.map(({ vinculacion, negocio }) => (
            <li key={vinculacion.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-lg">{negocio.name}</h2>
                  <p className="text-sm text-ink-500 capitalize">{negocio.category}</p>
                  
                  <div className="mt-2">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                      vinculacion.estado_vinculacion === 'aprobado' 
                        ? 'bg-green-100 text-green-800'
                        : vinculacion.estado_vinculacion === 'pendiente'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {vinculacion.estado_vinculacion === 'aprobado' ? 'Acceso concedido' :
                       vinculacion.estado_vinculacion === 'pendiente' ? 'Esperando aprobación del dueño' : 
                       'Acceso denegado'}
                    </span>
                  </div>
                </div>
              </div>

              {vinculacion.estado_vinculacion === 'aprobado' && (
                <div className="mt-4 pt-4 border-t border-ink-100 flex gap-2">
                  <Button onClick={() => navigate(`/panel/negocio?id=${negocio.id}`)} variant="secondary" size="sm">
                    Editar perfil
                  </Button>
                  <Button onClick={() => navigate(`/negocio/${negocio.id}`)} variant="ghost" size="sm">
                    Ver público
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="card p-4 bg-primary-50 border-primary-100 mt-8">
        <h3 className="font-bold text-primary-900 mb-2">¿Cómo apadrinar a un emprendedor?</h3>
        <ol className="list-decimal list-inside text-sm text-primary-800 space-y-1">
          <li>Busca el negocio en la sección de Explorar.</li>
          <li>Entra al perfil y presiona "Solicitar administración".</li>
          <li>Dile al dueño (tu familiar o vecino) que apruebe la solicitud en su propio celular.</li>
          <li>¡Listo! Podrás ayudarle a actualizar sus fotos y precios desde aquí.</li>
        </ol>
      </section>
    </div>
  )
}
