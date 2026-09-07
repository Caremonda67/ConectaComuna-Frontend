import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Plus, Trash2 } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { direccionService } from '@/services/direccionService'
import { guardarUbicacion, type UbicacionElegida } from '@/lib/ubicacion'
import { UbicacionPicker } from '@/components/location/UbicacionPicker'
import { TextField } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { ErrorState, EmptyState } from '@/components/ui/States'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import type { DireccionUsuario } from '@/types'

interface Props {
  usuarioId: string
}

/**
 * Direcciones guardadas del cliente (estilo Rappi): listarlas, usarlas para
 * buscar y eliminarlas; el formulario captura el punto con el UbicacionPicker.
 */
export function MisDirecciones({ usuarioId }: Props) {
  const navigate = useNavigate()
  const { data: direcciones, loading, error, reload } = useAsync(
    () => direccionService.listarPorUsuario(usuarioId),
    [usuarioId],
  )

  const [etiqueta, setEtiqueta] = useState('')
  const [ubicacion, setUbicacion] = useState<UbicacionElegida | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const guardar = async () => {
    const nombre = etiqueta.trim()
    if (!nombre) {
      setErrorForm('Ponle un nombre (ej. Casa, Trabajo).')
      return
    }
    if (!ubicacion) {
      setErrorForm('Busca o marca en el mapa dónde queda.')
      return
    }
    setGuardando(true)
    setErrorForm(null)
    try {
      await direccionService.crear(usuarioId, {
        etiqueta: nombre,
        direccionTexto: ubicacion.etiqueta,
        barrio: null,
        lat: ubicacion.center.lat,
        lng: ubicacion.center.lng,
      })
      setEtiqueta('')
      setUbicacion(null)
      reload()
    } catch {
      setErrorForm('No pudimos guardar la dirección.')
    } finally {
      setGuardando(false)
    }
  }

  const usar = (d: DireccionUsuario) => {
    guardarUbicacion({
      etiqueta: d.etiqueta,
      center: { lat: d.lat, lng: d.lng },
      origen: 'mapa',
    })
    navigate('/explorar')
  }

  const borrar = async (d: DireccionUsuario) => {
    if (!window.confirm(`¿Borrar "${d.etiqueta}"?`)) return
    try {
      await direccionService.eliminar(d.id)
      reload()
    } catch {
      // la dirección permanece visible; el siguiente reload vuelve a intentar
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {loading && <CardSkeletonList count={2} />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && (direcciones?.length ?? 0) === 0 && (
          <EmptyState
            icon={MapPin}
            title="Aún no tienes direcciones guardadas"
            description="Guarda tu casa o el trabajo para buscar oficios cerca de ahí en un toque."
          />
        )}
        {direcciones?.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{d.etiqueta}</p>
              <p className="truncate text-sm text-ink-500">{d.direccion_texto}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" onClick={() => usar(d)}>
                <Navigation size={15} strokeWidth={1.75} aria-hidden="true" />
                Usar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => void borrar(d)}
                aria-label={`Borrar ${d.etiqueta}`}
              >
                <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <form
        className="space-y-3 rounded-[14px] border border-ink-200 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
      >
        <h3 className="text-sm font-semibold text-ink-900">Guardar nueva dirección</h3>
        <TextField
          label="Nombre"
          placeholder="Casa, Trabajo, la casa de la abuela…"
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
        />
        <div>
          <span className="mb-1 block text-sm font-medium text-ink-900">¿Dónde queda?</span>
          <UbicacionPicker value={ubicacion} onChange={setUbicacion} />
        </div>
        {errorForm && (
          <p role="alert" className="text-sm text-rose-700">
            {errorForm}
          </p>
        )}
        <Button fullWidth loading={guardando} disabled={!!error}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Guardar dirección
        </Button>
      </form>
    </div>
  )
}