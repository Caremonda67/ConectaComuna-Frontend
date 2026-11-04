import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COMUNAS_CALI } from '@/lib/comunasCali'
import type { ConteoComuna } from '@/lib/metricasPanel'

/**
 * Mapa de las 22 comunas de Cali con cuántos negocios hay en cada una.
 *
 * Es un SVG en línea, no un mapa de teselas. Leaflet más las teselas de una
 * vista de Cali son cerca de 450 KB; estas siluetas son 4,3 KB comprimidos y
 * van en el trozo del panel. En un celular de gama baja con datos, esa es toda
 * la diferencia. Además un SVG deja que cada comuna sea un elemento enfocable
 * con etiqueta, que un mapa de teselas hace mal.
 *
 * Cali está a 3,4 grados de latitud, así que un grado de longitud y uno de
 * latitud miden casi lo mismo (cos 3,4° = 0,998): se puede proyectar
 * directamente sin corregir, y el error de forma es menor que el grosor de la
 * línea.
 */

interface Props {
  conteos: ConteoComuna[]
}

/** Cuatro cortes y no un degradado continuo: nadie distingue el tono 14 del 15. */
const CORTES = [
  { desde: 11, etiqueta: 'más de 10', opacidad: 0.92 },
  { desde: 4, etiqueta: '4 a 10', opacidad: 0.62 },
  { desde: 1, etiqueta: '1 a 3', opacidad: 0.34 },
  { desde: 0, etiqueta: 'sin negocios', opacidad: 0.06 },
]

function opacidadDe(n: number): number {
  return CORTES.find((c) => n >= c.desde)?.opacidad ?? 0.06
}

export function MapaComunas({ conteos }: Props) {
  const [elegida, setElegida] = useState<number | null>(null)
  const cajaRef = useRef<HTMLDivElement>(null)
  const [anchoReal, setAnchoReal] = useState(600)

  // Todo dentro de un SVG se escala con el viewBox, también la letra. A 309 px
  // de ancho —un celular— un cuerpo de 26 unidades acaba en 8 px y no se lee.
  // Se mide el ancho pintado y se compensa, para que la cifra tenga el mismo
  // tamaño real en el celular y en el portátil.
  // Se observa el div y no el propio <svg>: un ResizeObserver sobre un
  // elemento SVG no reporta ancho en varios navegadores, y la compensación
  // no se aplicaba nunca. Se vio midiendo, no mirando: la letra seguía en
  // 5 px y en la captura parecía aceptable.
  useLayoutEffect(() => {
    const el = cajaRef.current
    if (!el) return
    // Se mide a mano en el primer pintado y además se observa. Solo con el
    // observador, el valor inicial se quedaba pegado al ancho de antes y la
    // letra salía a 5 px en el celular.
    const medir = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setAnchoReal(w)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    window.addEventListener('resize', medir)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [])

  const porComuna = useMemo(
    () => new Map(conteos.map((c) => [c.comuna, c])),
    [conteos],
  )

  // El recuadro sale de los propios polígonos: si algún día se cambian por los
  // del DAPM, el mapa se reencuadra solo.
  const { d, ancho, alto } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const { anillos } of COMUNAS_CALI) {
      for (const [lng, lat] of anillos.flat()) {
        if (lng < minX) minX = lng
        if (lng > maxX) maxX = lng
        if (lat < minY) minY = lat
        if (lat > maxY) maxY = lat
      }
    }
    const ancho = 1000
    const escala = ancho / (maxX - minX)
    const alto = Math.round((maxY - minY) * escala)

    // La latitud crece hacia el norte y la `y` del SVG hacia abajo: se invierte.
    const proyecta = (lng: number, lat: number): string =>
      `${((lng - minX) * escala).toFixed(1)},${((maxY - lat) * escala).toFixed(1)}`

    const d = new Map<number, string>()
    for (const { comuna, anillos } of COMUNAS_CALI) {
      d.set(
        comuna,
        anillos
          .map((a) => 'M' + a.map(([lng, lat]) => proyecta(lng, lat)).join('L') + 'Z')
          .join(' '),
      )
    }
    return { d, ancho, alto }
  }, [])

  const centros = useMemo(() => {
    const c = new Map<number, { x: number; y: number }>()
    for (const [comuna, path] of d) {
      const nums = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
      let sx = 0, sy = 0, n = 0
      for (let i = 0; i + 1 < nums.length; i += 2) {
        sx += nums[i]
        sy += nums[i + 1]
        n++
      }
      if (n) c.set(comuna, { x: sx / n, y: sy / n })
    }
    return c
  }, [d])

  // Unidades de usuario por píxel de pantalla.
  const u = ancho / Math.max(Math.min(anchoReal, 672), 1)
  const estrecho = anchoReal < 420

  const conPresencia = conteos
    .filter((c) => c.comuna != null && c.negocios > 0)
    .sort((a, b) => b.negocios - a.negocios)
  const maximo = Math.max(...conPresencia.map((c) => c.negocios), 1)

  const sinClasificar = porComuna.get(null)
  const detalle = elegida != null ? porComuna.get(elegida) : undefined
  const total = conteos.reduce((a, c) => a + c.negocios, 0)

  return (
    <section className="card p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold text-ink-900">Negocios por comuna</h2>
        <p className="text-xs text-ink-600">
          {total} negocios activos · presencia en {conPresencia.length} de las 22 comunas
        </p>
      </header>

      <div ref={cajaRef} className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          className="w-full max-w-2xl mx-auto h-auto"
          role="group"
          aria-label="Mapa de las comunas de Cali con el número de negocios registrados en cada una"
        >
          {COMUNAS_CALI.map(({ comuna }) => {
            const fila = porComuna.get(comuna)
            const n = fila?.negocios ?? 0
            const centro = centros.get(comuna)
            const activa = elegida === comuna
            return (
              <g key={comuna}>
                <path
                  d={d.get(comuna)}
                  fill="var(--color-brand-600)"
                  fillOpacity={opacidadDe(n)}
                  stroke={activa ? 'var(--color-brand-700)' : 'var(--color-ink-400)'}
                  // El grosor en píxeles de pantalla y no en unidades del
                  // viewBox: si no, en un celular el borde cae por debajo del
                  // píxel y el mapa se ve como una mancha sin divisiones.
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={activa ? 3 : 1}
                  tabIndex={0}
                  role="button"
                  aria-pressed={activa}
                  aria-label={`Comuna ${comuna}, ${n} ${n === 1 ? 'negocio' : 'negocios'}`}
                  className="cursor-pointer outline-none focus-visible:stroke-[4]"
                  onClick={() => setElegida(activa ? null : comuna)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setElegida(activa ? null : comuna)
                    }
                  }}
                />
                {centro && !(estrecho && n === 0) && (
                  // El número va impreso encima: el color solo ayuda a barrer
                  // con la vista, el dato es la cifra. El halo del color del
                  // fondo lo deja legible sobre cualquier relleno.
                  <text
                    x={centro.x}
                    y={centro.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.round((n > 0 ? 13 : 10) * u)}
                    fontWeight={n > 0 ? 700 : 400}
                    fill="var(--color-ink-900)"
                    stroke="var(--color-cream-50)"
                    strokeWidth={3 * u}
                    paintOrder="stroke fill"
                    className="pointer-events-none select-none"
                  >
                    {n > 0 ? `${comuna}·${n}` : comuna}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
        {CORTES.map((c, i) => {
          // La leyenda dice también cuántas comunas caen en cada corte: sin
          // eso hay que contarlas a ojo sobre el mapa, que es justo lo que un
          // mapa debería evitar.
          const desde = c.desde
          const hasta = i === 0 ? Infinity : CORTES[i - 1].desde - 1
          const cuantas = conteos.filter(
            (f) => f.comuna != null && f.negocios >= desde && f.negocios <= hasta,
          ).length
          return (
            <li key={c.etiqueta} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-sm border border-ink-400"
                style={{ background: 'var(--color-brand-600)', opacity: c.opacidad }}
              />
              {c.etiqueta}
              <span className="text-ink-600">({cuantas})</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-1 text-xs text-ink-600">
        {estrecho
          ? 'Toca una comuna en el mapa o en la lista para ver su detalle.'
          : 'Cada comuna lleva impreso «número de comuna · negocios». Toca una para ver su detalle.'}
      </p>

      {/* El mapa dice dónde; la lista dice cuánto y en qué orden. Las dos
          juntas, porque sacar un ranking de un mapa de colores es justo lo que
          la gente no sabe hacer de un vistazo. */}
      {conPresencia.length > 0 && (
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-ink-900">
            Dónde hay más, en orden
          </h3>
          <ul className="mt-1.5 space-y-1">
            {conPresencia.map((f) => {
              const activa = elegida === f.comuna
              return (
                <li key={f.comuna}>
                  <button
                    type="button"
                    onClick={() => setElegida(activa ? null : f.comuna)}
                    aria-pressed={activa}
                    className={`flex min-h-9 w-full items-center gap-2 rounded-lg border px-2 text-left text-sm transition-colors ${
                      activa
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-transparent hover:bg-cream-200'
                    }`}
                  >
                    <span className="w-20 shrink-0 font-medium text-ink-800">
                      Comuna {f.comuna}
                    </span>
                    <span
                      aria-hidden
                      className="h-2.5 shrink-0 rounded-full bg-brand-600"
                      style={{ width: `${Math.round((f.negocios / maximo) * 55)}%`, minWidth: 6 }}
                    />
                    <span className="tabular-nums font-semibold text-ink-900">
                      {f.negocios}
                    </span>
                    {f.verificados > 0 && (
                      <span className="text-xs text-ink-600">
                        · {f.verificados} con sello
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-1.5 text-xs text-ink-600">
            Las otras {22 - conPresencia.length} comunas de Cali no tienen todavía ningún
            negocio registrado. Ahí es donde falta un facilitador.
          </p>
        </div>
      )}

      {detalle && (
        <p className="mt-3 rounded-lg bg-cream-100 border border-ink-200 p-3 text-sm text-ink-800">
          <strong className="text-ink-900">Comuna {detalle.comuna}:</strong>{' '}
          {detalle.negocios === 0 ? (
            <>
              todavía no hay ningún negocio registrado. Es donde más falta hace un
              facilitador.
            </>
          ) : (
            <>
              {detalle.negocios} {detalle.negocios === 1 ? 'negocio' : 'negocios'}, de los
              cuales {detalle.verificados} {detalle.verificados === 1 ? 'tiene' : 'tienen'}{' '}
              sello en territorio.
            </>
          )}
        </p>
      )}

      {sinClasificar && sinClasificar.negocios > 0 && (
        // Se muestra siempre que lo haya. Si los números del mapa no suman el
        // total, el mapa está mintiendo aunque cada celda se vea bien.
        <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-3 text-sm text-amber-900 dark:text-amber-200">
          <strong>{sinClasificar.negocios} sin clasificar.</strong> Su punto en el mapa no
          cae dentro de ninguna comuna de Cali: o están en otra ciudad, o la ubicación
          quedó mal marcada. No se cuentan en el mapa pero sí existen.
        </p>
      )}
    </section>
  )
}
