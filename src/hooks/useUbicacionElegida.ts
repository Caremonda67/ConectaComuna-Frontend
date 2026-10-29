import { useCallback, useEffect, useState } from 'react'
import { alCambiarUbicacion, guardarUbicacion, leerUbicacion, type UbicacionElegida } from '@/lib/ubicacion'

/**
 * La ubicación de búsqueda vive en localStorage y la cambian varias pantallas
 * a la vez (el selector, el asistente, los botones del piloto). Con `useState`
 * suelto cada una leía su copia y se desincronizaban.
 */
export function useUbicacionElegida() {
  const [ubicacion, setUbicacion] = useState<UbicacionElegida | null>(leerUbicacion)

  useEffect(() => alCambiarUbicacion(setUbicacion), [])

  const elegir = useCallback((u: UbicacionElegida) => {
    guardarUbicacion(u)
    setUbicacion(u)
  }, [])

  return [ubicacion, elegir] as const
}
