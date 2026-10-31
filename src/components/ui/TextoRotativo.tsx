import { useEffect, useRef, useState } from 'react'
import { useRotacion } from '@/hooks/useRotacion'
import { cn } from '@/lib/utils'

/** Lo que tarda `.animate-texto-sale` en index.css, para desmontar al salir. */
const SALIDA_MS = 480

interface Props {
  items: readonly string[]
  /** Frase completa y quieta para lectores de pantalla. */
  etiqueta?: string
  /**
   * El texto va dentro de una frase, no en su propia línea. Entonces el ancho
   * de la celda sí se nota y hay que reservarlo; en bloque no hace falta,
   * porque ocupa la línea entera.
   */
  enLinea?: boolean
  className?: string
  cadaMs?: number
}

/**
 * Texto que se releva a sí mismo.
 *
 * Las dos palabras se cruzan en el aire: la que sale sigue en pantalla
 * mientras entra la siguiente, apiladas en la misma celda de un `grid`.
 *
 * El detalle que costaba: mientras conviven, la celda mide por la más ancha de
 * las dos, y al desmontarse la saliente el contenedor **encogía de golpe**. Se
 * resuelve reservando el sitio por adelantado, de dos formas según el uso:
 *
 * - En bloque (el titular, en su propia línea) la celda ocupa el ancho
 *   completo y no hay nada que encoger.
 * - En línea se apilan copias invisibles de todas las frases en la misma
 *   celda, así que el hueco mide siempre lo que la más ancha.
 *
 * Se probó antes a medir el texto con un elemento auxiliar y animar el ancho,
 * y no sirve: el auxiliar va en posición absoluta y sin restricciones, así que
 * mide más de lo que el contenedor real puede darle (126 px medidos frente a
 * 115 disponibles) y el ancho fijado acababa recortado. El tirón volvía por
 * otro lado.
 *
 * La transición es CSS, no `AnimatePresence`: aquel espera a que termine la
 * salida antes de montar la entrada, y si el navegador congela el bucle de
 * animación esa salida no termina nunca y el texto se queda a medias.
 */
export function TextoRotativo({ items, etiqueta, enLinea = false, className, cadaMs }: Props) {
  const i = useRotacion(items.length, cadaMs)
  const actual = items[i] ?? items[0]

  const [saliente, setSaliente] = useState<string | null>(null)
  const anteriorRef = useRef(actual)

  useEffect(() => {
    if (anteriorRef.current === actual) return undefined
    setSaliente(anteriorRef.current)
    anteriorRef.current = actual
    const id = window.setTimeout(() => setSaliente(null), SALIDA_MS)
    return () => window.clearTimeout(id)
  }, [actual])

  return (
    <span className={cn('min-h-[1.25em]', className)}>
      {etiqueta && <span className="sr-only">{etiqueta}</span>}
      <span aria-hidden="true" className={enLinea ? 'inline-grid align-bottom' : 'grid'}>
        {/* Reserva del sitio: todas las frases apiladas e invisibles, para que
            la celda mida siempre lo que la más ancha. Se apilan todas y no
            solo la más larga en letras, porque la más larga no es siempre la
            más ancha: depende de qué letras sean. */}
        {enLinea &&
          items.map((frase) => (
            <span key={`hueco-${frase}`} className="invisible col-start-1 row-start-1">
              {frase}
            </span>
          ))}
        {saliente !== null && saliente !== actual && (
          <span key={`sale-${saliente}`} className="col-start-1 row-start-1 animate-texto-sale">
            {saliente}
          </span>
        )}
        <span key={`entra-${actual}`} className="col-start-1 row-start-1 animate-texto-entra">
          {actual}
        </span>
      </span>
    </span>
  )
}
