import { useEffect, useState } from 'react'
import { ChevronDown, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LazyMap } from '@/components/map/LazyMap'
import { cn } from '@/lib/utils'
import { COMUNA_CENTER } from '@/lib/env'
import { useGeolocation } from '@/hooks/useGeolocation'
import { geocodificar, type UbicacionGeocodificada } from '@/services/direccionService'
import type { UbicacionElegida } from '@/lib/ubicacion'
import type { Coordinates } from '@/types'

interface Props {
  value: UbicacionElegida | null
  onChange: (ubicacion: UbicacionElegida) => void
}

/**
 * Selector de ubicación estilo Rappi: usa el GPS, escribe un barrio o una
 * dirección, o toca el mapa. El punto elegido se convierte en `center` de la
 * búsqueda de negocios.
 */
export function UbicacionPicker({ value, onChange }: Props) {
  const { position, status, request } = useGeolocation()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [sugerencias, setSugerencias] = useState<UbicacionGeocodificada[]>([])
  const [buscando, setBuscando] = useState(false)
  const [verMapa, setVerMapa] = useState(false)
  const [picked, setPicked] = useState<Coordinates | null>(null)
  const [gpsActivo, setGpsActivo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cerrar = () => {
    setAbierto(false)
    setTexto('')
    setSugerencias([])
    setVerMapa(false)
    setPicked(null)
    setGpsActivo(false)
    setError(null)
  }

  const elegirSugerencia = (s: UbicacionGeocodificada) => {
    onChange({ etiqueta: s.etiqueta, center: s.center, origen: 'busqueda' })
    cerrar()
  }

  useEffect(() => {
    const query = texto.trim()
    if (query.length < 2) return
    const timeout = setTimeout(async () => {
      try {
        const hits = await geocodificar(query)
        setSugerencias(hits)
      } catch {
        setError('No pudimos geolocalizar esa dirección. Prueba con el nombre de un barrio.')
      } finally {
        setBuscando(false)
      }
    }, 250)
    return () => clearTimeout(timeout)
  }, [texto])

  const usarGps = () => {
    setVerMapa(false)
    setError(null)
    setGpsActivo(true)
    request()
  }

  useEffect(() => {
    if (!gpsActivo) return
    if (status === 'granted') {
      // Diferimos a un tick: el cambio de estado se aplica tras el render,
      // sin cascada dentro del efecto.
      const t = setTimeout(() => {
        setGpsActivo(false)
        onChange({ etiqueta: 'Mi ubicación', center: position, origen: 'gps' })
        cerrar()
      }, 0)
      return () => clearTimeout(t)
    }
    if (status === 'denied' || status === 'unsupported') {
      const t = setTimeout(() => {
        setGpsActivo(false)
        setError('No pudimos acceder a tu ubicación. Usa el buscador o el mapa.')
      }, 0)
      return () => clearTimeout(t)
    }
    return undefined
  }, [gpsActivo, status, position, onChange])

  const usarPuntoDelMapa = () => {
    if (!picked) return
    onChange({ etiqueta: 'Punto elegido en el mapa', center: picked, origen: 'mapa' })
    cerrar()
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 rounded-full border px-4 text-left',
          abierto
            ? 'border-brand-500 bg-brand-50 text-ink-900'
            : 'border-ink-300 bg-white text-ink-700 hover:bg-cream-200',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <MapPin aria-hidden="true" size={17} strokeWidth={1.75} className="shrink-0 text-brand-600" />
          <span className="truncate">{value ? value.etiqueta : 'Dónde buscar…'}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={2}
          className={cn('shrink-0 text-ink-400 transition-transform', abierto && 'rotate-180')}
        />
      </button>

      {abierto && (
        <div className="mt-2 space-y-3 rounded-[14px] border border-ink-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">¿Dónde buscamos?</h2>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar selector de ubicación"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-cream-200"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <Button variant="secondary" fullWidth onClick={usarGps} loading={gpsActivo}>
            <LocateFixed aria-hidden="true" size={16} strokeWidth={1.75} />
            Usar mi ubicación
          </Button>

          <div>
            <label htmlFor="buscador-ubicacion" className="mb-1 block text-xs font-medium text-ink-600">
              Buscar barrio o dirección
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                size={16}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                id="buscador-ubicacion"
                type="search"
                value={texto}
                onChange={(e) => {
                  const v = e.target.value
                  setTexto(v)
                  setVerMapa(false)
                  setError(null)
                  if (v.trim().length < 2) {
                    setSugerencias([])
                    setBuscando(false)
                  } else {
                    setBuscando(true)
                  }
                }}
                placeholder="Ej. El Rodeo, Antonio Nariño…"
                className="min-h-11 w-full rounded-full border border-ink-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500"
              />
            </div>

            {buscando && <p className="mt-2 text-sm text-ink-500">Buscando…</p>}

            {!buscando && sugerencias.length > 0 && (
              <ul
                role="listbox"
                aria-label="Sugerencias de ubicación"
                className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-200"
              >
                {sugerencias.map((s) => (
                  <li key={s.etiqueta}>
                    <button
                      type="button"
                      role="option"
                      onClick={() => elegirSugerencia(s)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink-800 hover:bg-brand-50"
                    >
                      <MapPin aria-hidden="true" size={15} strokeWidth={1.75} className="shrink-0 text-brand-500" />
                      <span className="truncate">{s.etiqueta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!buscando && texto.trim().length >= 2 && sugerencias.length === 0 && !error && (
              <p className="mt-2 text-sm text-ink-500">Sin coincidencias. Prueba con otro barrio.</p>
            )}
          </div>

          <Button variant="secondary" fullWidth onClick={() => setVerMapa((v) => !v)}>
            <MapPin aria-hidden="true" size={16} strokeWidth={1.75} />
            Elegir en el mapa
          </Button>

          {verMapa && (
            <div className="space-y-2">
              <LazyMap
                center={value?.center ?? COMUNA_CENTER}
                height="240px"
                showUser={false}
                pickable
                pickedPosition={picked}
                onPick={setPicked}
              />
              <Button fullWidth disabled={!picked} onClick={usarPuntoDelMapa}>
                Usar este punto
              </Button>
              <p className="text-xs text-ink-500">Toca el mapa donde quieras buscar.</p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}