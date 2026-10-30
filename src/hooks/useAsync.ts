import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Hook mínimo para pedir datos con estados de carga/error/vacío.
 *
 * Se prefiere esto a TanStack Query en las vistas simples para no cargar
 * más JS del necesario; React Query queda disponible para listas con caché
 * agresiva si el proyecto crece.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> & { reload: () => void; setData: (v: T) => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  const fnRef = useRef(fn)
  fnRef.current = fn

  // Cada corrida lleva su número y solo la última puede escribir el estado. Con
  // una bandera por corrida, dos 'reload' seguidos dejaban ganar a la respuesta
  // vieja si llegaba de últimas.
  const corrida = useRef(0)

  const run = useCallback(() => {
    const actual = ++corrida.current
    setState((s) => ({ ...s, loading: true, error: null }))
    fnRef
      .current()
      .then((data) => {
        if (actual === corrida.current) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (actual === corrida.current)
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Ocurrió un error inesperado.',
          })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return {
    ...state,
    reload: run,
    setData: (v: T) => setState({ data: v, loading: false, error: null }),
  }
}
