import { useEffect, useRef, useState } from 'react'
import { useRotacion } from '@/hooks/useRotacion'
import { cn } from '@/lib/utils'

/** Lo que tarda `.animate-texto-sale` en index.css, para desmontar al salir. */
const SALIDA_MS = 480

interface Props {
  items: readonly string[]
  /** Frase completa y quieta para lectores de pantalla. */
  etiqueta?: string
  className?: string
  cadaMs?: number
}

/**
 * Texto que se releva a sí mismo.
 *
 * Las dos palabras se funden una en otra: la que sale sigue en pantalla
 * mientras entra la siguiente. Sin desplazamiento vertical, solo opacidad y
 * un desenfoque leve. Se apilan con `grid` en la misma celda, no con
 * posición absoluta, para que el contenedor siga midiendo lo que mide el texto
 * y no haya que inventarle un tamaño.
 *
 * La transición es CSS, no `AnimatePresence`. Aquel espera a que termine la
 * salida antes de montar la entrada, y si el navegador congela el bucle de
 * animación (una pestaña en segundo plano, por ejemplo) esa salida no termina
 * nunca y el texto se queda a medio desvanecer para siempre.
 *
 * El alto se reserva por adelantado: sin eso cada palabra de ancho distinto
 * empuja lo que tenga debajo y la pantalla late. Y no se fija `display` en el
 * contenedor externo porque `cn` solo concatena clases: chocaría con el que
 * ponga quien llama.
 */
export function TextoRotativo({ items, etiqueta, className, cadaMs }: Props) {
  const i = useRotacion(items.length, cadaMs)
  const actual = items[i] ?? items[0]

  const [saliente, setSaliente] = useState<string | null>(null)
  const anteriorRef = useRef(actual)

  useEffect(() => {
    if (anteriorRef.current === actual) return undefined
    setSaliente(anteriorRef.current)
    anteriorRef.current = actual
    // La que sale se desmonta al acabar su animación. Si se quedara montada,
    // la celda del grid seguiría midiendo por la palabra más ancha de las dos.
    const id = window.setTimeout(() => setSaliente(null), SALIDA_MS)
    return () => window.clearTimeout(id)
  }, [actual])

  return (
    <span className={cn('min-h-[1.25em]', className)}>
      {etiqueta && <span className="sr-only">{etiqueta}</span>}
      <span aria-hidden="true" className="inline-grid">
        {saliente !== null && saliente !== actual && (
          <span
            key={`sale-${saliente}`}
            className="col-start-1 row-start-1 animate-texto-sale"
          >
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
