import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRotacion } from '@/hooks/useRotacion'
import { cn } from '@/lib/utils'

/** Lo que tarda `.animate-texto-sale` en index.css, para desmontar al salir. */
const SALIDA_MS = 480

interface Props {
  items: readonly string[]
  /** Frase completa y quieta para lectores de pantalla. */
  etiqueta?: string
  /**
   * El texto va dentro de una frase, no en su propia línea. Entonces también
   * hay que reservar el ancho; en bloque basta con ocupar la línea entera.
   */
  enLinea?: boolean
  className?: string
  cadaMs?: number
}

/**
 * Texto que se releva a sí mismo.
 *
 * Las dos frases se cruzan en el aire: la que sale sigue en pantalla mientras
 * entra la siguiente, apiladas en la misma celda de un `grid`.
 *
 * El problema que costaba resolver: mientras conviven, la celda mide por la
 * más grande de las dos, y al desmontarse la saliente el contenedor **daba un
 * tirón**. Con frases de largo distinto pasa en los dos ejes, y el salto se
 * nota medio segundo después del cambio, desconectado de la animación.
 *
 * - **Alto.** Se mide la frase entrante *en su sitio*, ya montada en la celda
 *   y con el ancho real de la columna, así que el número cuenta los saltos de
 *   línea de verdad. Ese alto se fija en el contenedor con una transición: el
 *   hueco se abre o se cierra deslizándose mientras el texto entra.
 * - **Ancho.** En bloque ocupa la línea entera y no hay nada que ajustar. En
 *   línea se apilan copias invisibles de todas las frases, de modo que el
 *   hueco mide siempre lo que la más ancha.
 *
 * Lo que **no** funciona, por si alguien lo reintenta: medir con un elemento
 * auxiliar en posición absoluta. Al no tener las restricciones del sitio donde
 * vive, mide de más (126 px medidos frente a 115 disponibles) y el tamaño
 * fijado acaba recortado por el contenedor.
 */
export function TextoRotativo({ items, etiqueta, enLinea = false, className, cadaMs }: Props) {
  const i = useRotacion(items.length, cadaMs)
  const actual = items[i] ?? items[0]

  const [saliente, setSaliente] = useState<string | null>(null)
  const anteriorRef = useRef(actual)

  const entranteRef = useRef<HTMLSpanElement>(null)
  const [alto, setAlto] = useState<number>()

  useEffect(() => {
    if (anteriorRef.current === actual) return undefined
    setSaliente(anteriorRef.current)
    anteriorRef.current = actual
    const id = window.setTimeout(() => setSaliente(null), SALIDA_MS)
    return () => window.clearTimeout(id)
  }, [actual])

  // Antes de pintar: así la transición arranca en el mismo fotograma en que
  // entra la frase nueva, y el hueco se abre acompañándola en vez de después.
  useLayoutEffect(() => {
    const medido = entranteRef.current?.getBoundingClientRect().height
    if (medido) setAlto(medido)
  }, [actual])

  // Al cambiar el ancho de la ventana una frase puede pasar de una línea a dos:
  // el alto fijado se quedaría corto y recortaría el texto.
  useEffect(() => {
    const alRedimensionar = () => {
      const medido = entranteRef.current?.getBoundingClientRect().height
      if (medido) setAlto(medido)
    }
    window.addEventListener('resize', alRedimensionar)
    return () => window.removeEventListener('resize', alRedimensionar)
  }, [])

  return (
    <span className={cn('min-h-[1.25em]', className)}>
      {etiqueta && <span className="sr-only">{etiqueta}</span>}
      <span
        aria-hidden="true"
        className={cn(
          // `items-start` es imprescindible: con el alto fijado, un hijo
          // estirado mediria ese mismo alto y la medida se quedaria clavada
          // en el valor anterior. Alineado al inicio, mide lo suyo.
          // `overflow-hidden` convierte la celda en una ventana: el texto
          // entra deslizandose desde abajo y el que sale se va por arriba,
          // en vez de aparecer y desaparecer encima de lo que haya debajo.
          // El alto es el natural del texto, asi que las colas de las letras
          // no se cortan en reposo.
          'items-start overflow-hidden transition-[height] duration-[450ms] ease-out',
          enLinea ? 'inline-grid align-bottom' : 'grid',
        )}
        style={alto ? { height: alto } : undefined}
      >
        {/* Reserva del ancho: todas las frases apiladas e invisibles, para que
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
        <span
          ref={entranteRef}
          key={`entra-${actual}`}
          className="col-start-1 row-start-1 animate-texto-entra"
        >
          {actual}
        </span>
      </span>
    </span>
  )
}
