import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { facilitadorService } from '@/services/facilitadorService'
import { profileService } from '@/services/profileService'
import { businessService } from '@/services/businessService'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'
import type { Business, FacilitadorNegocio } from '@/types'

export default function FacilitatorDashboard() {
  const { userId, profile, email, refresh } = useAuth()
  const navigate = useNavigate()
  const [vinculaciones, setVinculaciones] = useState<Array<{ vinculacion: FacilitadorNegocio, negocio: Business }>>([])
  const [loading, setLoading] = useState(true)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(profile?.full_name ?? '')
  const [nuevoTelefono, setNuevoTelefono] = useState(profile?.phone ?? '')
  const [nuevoBarrio, setNuevoBarrio] = useState(profile?.neighborhood ?? '')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  // Estado para el campo de código
  const [codigo, setCodigo] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null)
  const [exitoCodigo, setExitoCodigo] = useState(false)

  // Verificación en territorio
  const [verificandoBizId, setVerificandoBizId] = useState<string | null>(null)
  const [notaVerificacion, setNotaVerificacion] = useState('')
  const [guardandoVerif, setGuardandoVerif] = useState(false)

  useEffect(() => {
    if (userId) {
      facilitadorService
        .getNegociosVinculados(userId)
        .then((data) => setVinculaciones(data))
        .catch((e) => console.warn('Error cargando vinculados:', e))
        .finally(() => setLoading(false))
    }
  }, [userId])

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

  async function handleConfirmarVerificacion(negocioId: string) {
    if (!profile) return
    setGuardandoVerif(true)
    try {
      await businessService.verificarTerritorialmente(
        negocioId,
        profile.full_name || 'Facilitador Comunal',
        notaVerificacion,
      )
      setVerificandoBizId(null)
      if (userId) {
        const data = await facilitadorService.getNegociosVinculados(userId)
        setVinculaciones(data)
      }
    } finally {
      setGuardandoVerif(false)
    }
  }

  async function handleRevocarVerificacion(negocioId: string) {
    await businessService.revocarVerificacion(negocioId)
    if (userId) {
      const data = await facilitadorService.getNegociosVinculados(userId)
      setVinculaciones(data)
    }
  }



  if (loading) {
    return <div className="p-4 text-center text-ink-500">Cargando tus negocios apadrinados...</div>
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-ink-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Área de facilitador</p>
        <h1 className="mt-1 text-2xl font-bold">Mi cuenta</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          Administra tus datos personales y accede por separado a los negocios que estás apoyando.
        </p>
      </header>

      <section aria-labelledby="datos-cuenta" className="card border-brand-100 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Información personal</p>
            <h2 id="datos-cuenta" className="mt-1 font-bold text-ink-900">Datos de la cuenta</h2>
          </div>
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
              Editar datos
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
              <label className="mb-1 block text-sm font-medium text-ink-900">Barrio</label>
              <input
                type="text"
                value={nuevoBarrio}
                onChange={(e) => setNuevoBarrio(e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
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
          <dl className="mt-3 grid gap-2 text-sm text-ink-700">
            <div className="flex gap-2">
              <dt className="font-medium">Nombre:</dt>
              <dd>{profile?.full_name || 'Sin nombre'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Correo:</dt>
              <dd>{email || 'No disponible'}</dd>
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
            <div className="flex gap-2">
              <dt className="font-medium">Rol:</dt>
              <dd>Facilitador</dd>
            </div>
          </dl>
        )}
      </section>

      <section aria-labelledby="negocios-administra" className="space-y-3">
        <div className="flex items-end justify-between gap-3 border-b border-ink-200 pb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Gestión delegada</p>
            <h2 id="negocios-administra" className="mt-1 text-lg font-bold">
              Negocios que administro
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
            {vinculaciones.length} {vinculaciones.length === 1 ? 'negocio' : 'negocios'}
          </span>
        </div>

        {vinculaciones.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-ink-600">Aún no estás administrando ningún negocio. Ingresa un código abajo para empezar.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {vinculaciones.map(({ vinculacion, negocio }) => (
              <li key={vinculacion.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{negocio.name}</h3>
                    <p className="text-sm text-ink-500 capitalize">{negocio.category}</p>

                    <div className="mt-2">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                        vinculacion.estado_vinculacion === 'aprobado'
                          ? 'bg-green-100 dark:bg-emerald-950/60 text-green-800 dark:text-emerald-300'
                          : vinculacion.estado_vinculacion === 'pendiente'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}>
                        {vinculacion.estado_vinculacion === 'aprobado'
                          ? 'Acceso concedido'
                          : vinculacion.estado_vinculacion === 'pendiente'
                            ? 'Esperando aprobación del dueño'
                            : 'Acceso denegado'}
                      </span>
                    </div>
                  </div>
                </div>

                {vinculacion.estado_vinculacion === 'aprobado' && (
                  <div className="mt-4 space-y-3 border-t border-ink-100 dark:border-ink-200 pt-3">
                    <div className="rounded-xl border border-ink-100 dark:border-ink-200 p-3 text-xs bg-cream-50 dark:bg-cream-100/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink-900 flex items-center gap-1.5">
                          <UI_ICONS.shieldCheck
                            size={16}
                            className={negocio.verification_status === 'verified' ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-400'}
                          />
                          Sello de verificación en territorio
                        </span>
                        {negocio.verification_status === 'verified' ? (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 font-medium text-[11px]">
                            Verificado
                          </span>
                        ) : negocio.verification_status === 'under_review' ? (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-medium text-[11px]">
                            Bajo observación
                          </span>
                        ) : (
                          <span className="rounded-full bg-cream-200 text-ink-700 px-2 py-0.5 font-medium text-[11px]">
                            Sin verificar
                          </span>
                        )}
                      </div>

                      {negocio.verification_status === 'verified' ? (
                        <div className="text-ink-600 text-[11px] space-y-1">
                          <p>
                            <strong>Validado por:</strong> {negocio.verification_by || 'Facilitador comunal'}
                          </p>
                          {negocio.verification_note && (
                            <p>
                              <strong>Nota de campo:</strong> {negocio.verification_note}
                            </p>
                          )}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleRevocarVerificacion(negocio.id)}
                              className="text-rose-700 hover:underline text-[11px] cursor-pointer"
                            >
                              Retirar verificación
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-ink-600 text-[11px] space-y-2">
                          <p>
                            Si ya visitaste el taller/local o conoces personalmente a la persona en el barrio, valida su autenticidad para dar confianza a los clientes.
                          </p>
                          {verificandoBizId !== negocio.id ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setVerificandoBizId(negocio.id)
                                setNotaVerificacion('Local y taller visitados presencialmente en la comuna.')
                              }}
                            >
                              <UI_ICONS.shieldCheck size={14} className="text-emerald-700" />
                              Validar en territorio
                            </Button>
                          ) : (
                            <div className="mt-2 p-2.5 bg-white dark:bg-cream-100 rounded-xl border border-brand-300 dark:border-brand-800/60 space-y-2 text-xs">
                              <p className="font-semibold text-ink-900">
                                Certificar visita territorial:
                              </p>
                              <input
                                type="text"
                                value={notaVerificacion}
                                onChange={(e) => setNotaVerificacion(e.target.value)}
                                placeholder="Nota de campo (ej: Local visitado en Carrera 41)"
                                className="w-full rounded-lg border border-ink-200 bg-white dark:bg-cream-50 px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  loading={guardandoVerif}
                                  onClick={() => handleConfirmarVerificacion(negocio.id)}
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setVerificandoBizId(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => navigate(`/panel/negocio?id=${negocio.id}`)} variant="secondary" size="sm">
                        Editar perfil
                      </Button>
                      <Button onClick={() => navigate(`/negocio/${negocio.id}`)} variant="ghost" size="sm">
                        Ver público
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

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
            className="flex-1 min-w-0 rounded-lg border border-ink-200 px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button
            loading={vinculando}
            disabled={codigo.length !== 6}
            onClick={vincular}
            className="shrink-0"
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



      <section className="card p-4 bg-brand-50 border-brand-100">
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
