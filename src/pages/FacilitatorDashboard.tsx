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

  // Estado para el campo de código
  const [codigo, setCodigo] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null)
  const [exitoCodigo, setExitoCodigo] = useState(false)

  useEffect(() => {
    if (userId) {
      facilitadorService.getNegociosVinculados(userId).then((data) => {
        setVinculaciones(data)
        setLoading(false)
      })
    }
  }, [userId])

  async function vincular() {
    if (!userId || !codigo.trim()) return
    setVinculando(true)
    setErrorCodigo(null)
    setExitoCodigo(false)
    try {
      await facilitadorService.vincularConCodigo(userId, codigo.trim())
      setExitoCodigo(true)
      setCodigo('')
      // Recargar la lista
      const data = await facilitadorService.getNegociosVinculados(userId)
      setVinculaciones(data)
    } catch (e) {
      setErrorCodigo(e instanceof Error ? e.message : 'No pudimos vincular. Revisa el código.')
    } finally {
      setVinculando(false)
    }
  }

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

      {/* Vinculación por código */}
      <section className="card p-4">
        <h2 className="font-bold text-ink-900 mb-2">Vincular con un emprendedor</h2>
        <p className="text-sm text-ink-500 mb-3">
          Pídele al dueño del negocio su código de apadrinamiento de 6 dígitos e ingrésalo aquí.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            placeholder="Ej: 482915"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.replace(/\D/g, ''))
              setErrorCodigo(null)
              setExitoCodigo(false)
            }}
            className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button
            loading={vinculando}
            disabled={codigo.length !== 6}
            onClick={vincular}
          >
            Vincular
          </Button>
        </div>
        {errorCodigo && (
          <p className="mt-2 text-sm text-rose-700">{errorCodigo}</p>
        )}
        {exitoCodigo && (
          <p className="mt-2 text-sm text-green-700">¡Vinculación exitosa! Ya puedes administrar el negocio.</p>
        )}
      </section>

      {vinculaciones.length === 0 ? (
        <section className="card p-6 text-center">
          <p className="text-ink-600">Aún no estás administrando ningún negocio. Ingresa un código arriba para empezar.</p>
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

      <section className="card p-4 bg-brand-50 border-brand-100 mt-8">
        <h3 className="font-bold text-brand-900 mb-2">¿Cómo apadrinar a un emprendedor?</h3>
        <ol className="list-decimal list-inside text-sm text-brand-800 space-y-1">
          <li>Pídele al dueño del negocio que genere un código en su panel.</li>
          <li>Ingresa ese código de 6 dígitos en el campo de arriba.</li>
          <li>¡Listo! Podrás ayudarle a actualizar sus fotos y precios desde aquí.</li>
        </ol>
      </section>
    </div>
  )
}
