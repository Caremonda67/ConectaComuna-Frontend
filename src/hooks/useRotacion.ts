import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

export const ROTACION_MS = 2800

/**
 * Índice que avanza en bucle. Con `prefers-reduced-motion` se queda quieto en
 * el primero, así que todo lo que use este hook tiene que seguir teniendo
 * sentido mostrando solo un elemento. Pasar `total` 0 o 1 lo detiene: sirve
 * para pausar la rotación sin desmontar nada.
 */
export function useRotacion(total: number, cadaMs: number = ROTACION_MS): number {
  const prefersReduced = useReducedMotion()
  const [i, setI] = useState(0)

  useEffect(() => {
    if (prefersReduced || total < 2) return undefined
    const id = window.setInterval(() => setI((n) => (n + 1) % total), cadaMs)
    return () => window.clearInterval(id)
  }, [prefersReduced, total, cadaMs])

  return prefersReduced ? 0 : Math.min(i, Math.max(total - 1, 0))
}
