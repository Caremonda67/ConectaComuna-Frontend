import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { categoryIcon } from '@/data/categories'
import { formatDistance } from '@/lib/utils'
import type { LucideIcon } from '@/components/ui/icons'
import type { BusinessWithDistance, Coordinates } from '@/types'

/**
 * Iconos con `divIcon` (HTML puro) en vez de imágenes PNG:
 * evitamos 3 requests extra de sprites de Leaflet y el bug clásico de
 * rutas rotas de marker-icon con bundlers.
 *
 * Leaflet exige una cadena de HTML, no un elemento de React. En vez de
 * renderizar el componente (React no puede renderizar de forma síncrona dentro
 * de otro render: `flushSync` se ignora y el pin sale vacío) extraemos el
 * `iconNode` que lucide pasa como prop —la descripción declarativa de los
 * trazados— invocando el `render` del forwardRef, que es una función pura, y lo
 * serializamos a mano. Es síncrono, no monta nada y evita importar
 * `react-dom/server`, que añadía ~190 KB al bundle.
 *
 * El resultado se cachea por categoría: un icono se serializa una sola vez en
 * toda la sesión, no una por marcador.
 */
type IconNode = [string, Record<string, string | number>][]

const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2F6B33" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

function escapeAttr(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function readIconNode(Icon: LucideIcon): IconNode {
  const forwardRef = Icon as unknown as {
    render?: (props: object, ref: null) => { props?: { iconNode?: IconNode } }
  }
  if (typeof forwardRef.render !== 'function') return []
  return forwardRef.render({}, null)?.props?.iconNode ?? []
}

function iconToSvg(Icon: LucideIcon): string {
  const shapes = readIconNode(Icon)
    .map(([tag, attrs]) => {
      const serialized = Object.entries(attrs)
        // `key` es de React, no un atributo SVG válido.
        .filter(([name]) => name !== 'key')
        .map(([name, value]) => `${name}="${escapeAttr(value)}"`)
        .join(' ')
      return `<${tag} ${serialized}/>`
    })
    .join('')
  return `<svg ${SVG_ATTRS}>${shapes}</svg>`
}

const iconCache = new Map<string, L.DivIcon>()

function pinIcon(key: string, Icon: LucideIcon, highlighted = false) {
  const cacheKey = `${key}:${highlighted}`
  const cached = iconCache.get(cacheKey)
  if (cached) return cached

  const icon = L.divIcon({
    className: '',
    html: `<span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${
      highlighted ? '#CFE8C6' : '#ffffff'
    };border:2px solid #6FB257;box-shadow:0 1px 3px rgba(26,26,26,.25)">${iconToSvg(Icon)}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  })
  iconCache.set(cacheKey, icon)
  return icon
}

const userIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#6FB257;border:3px solid #fff;box-shadow:0 0 0 3px rgba(111,178,87,.35)"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

/**
 * Recentra solo cuando cambian las coordenadas reales. Si dependiéramos del
 * objeto `center`, cada render del padre crearía una referencia nueva y el
 * mapa se recentraría en bucle, cancelando el paneo del usuario.
 */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

function ClickCapture({ onPick }: { onPick: (c: Coordinates) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

/**
 * Leaflet calcula el tamaño del contenedor al montar. Si en ese momento el
 * contenedor aún no tiene su altura final (fuentes cargando, layout que se
 * reacomoda, o el mapa montado dentro de un contenedor que acaba de aparecer),
 * el mapa queda gris o con los tiles descuadrados. Observamos el tamaño real
 * y forzamos `invalidateSize` cuando cambia.
 */
function ResizeHandler() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    map.invalidateSize()
    const raf = requestAnimationFrame(() => map.invalidateSize())
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [map])
  return null
}

interface Props {
  businesses?: BusinessWithDistance[]
  center: Coordinates
  zoom?: number
  height?: string
  showUser?: boolean
  /** Modo selección: usado en el editor de perfil para fijar la ubicación. */
  pickable?: boolean
  pickedPosition?: Coordinates | null
  onPick?: (c: Coordinates) => void
}

export default function BusinessMap({
  businesses = [],
  center,
  zoom = 15,
  height = '60vh',
  showUser = true,
  pickable = false,
  pickedPosition = null,
  onPick,
}: Props) {
  const markers = useMemo(
    () =>
      businesses.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lng]}
          icon={pinIcon(b.category, categoryIcon(b.category))}
        >
          <Popup>
            <div className="min-w-40">
              <p className="font-semibold">{b.name}</p>
              <p className="text-xs text-ink-500">{formatDistance(b.distanceKm)}</p>
              <Link
                to={`/negocio/${b.id}`}
                className="mt-1 inline-block text-sm font-medium text-brand-700 underline"
              >
                Ver perfil
              </Link>
            </div>
          </Popup>
        </Marker>
      )),
    [businesses],
  )

  return (
    <div
      style={{ height }}
      className="overflow-hidden rounded-[14px] border border-ink-200 bg-cream-100"
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        // preferCanvas reduce nodos DOM: mejor rendimiento en gama baja.
        preferCanvas
      >
        <TileLayer
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Recenter lat={center.lat} lng={center.lng} />
        <ResizeHandler />
        {showUser && <Marker position={[center.lat, center.lng]} icon={userIcon} />}
        {markers}
        {pickable && onPick && <ClickCapture onPick={onPick} />}
        {pickable && pickedPosition && (
          <Marker
            position={[pickedPosition.lat, pickedPosition.lng]}
            icon={pinIcon('picked', MapPin, true)}
          />
        )}
      </MapContainer>
    </div>
  )
}
