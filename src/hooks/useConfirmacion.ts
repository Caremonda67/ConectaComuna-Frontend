import { useCallback, useEffect, useRef, useState } from 'react'

const VISIBLE_MS = 2600

/**
 * Confirmación efímera para una acción que salió bien.
 *
 * Guardar un perfil o sellar un negocio cerraba el panel y ya: quien lo hacía
 * no tenía forma de saber si había quedado guardado o si se le había cerrado
 * sola la pantalla. Esto da el acuse de recibo sin obligar a cerrar nada.
 */
export function useConfirmacion(duracionMs: number = VISIBLE_MS) {
  const [visible, setVisible] = useState(false)
  const temporizador = useRef<number | null>(null)

  const confirmar = useCallback(() => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current)
    setVisible(true)
    temporizador.current = window.setTimeout(() => setVisible(false), duracionMs)
  }, [duracionMs])

  // Si el componente se desmonta mientras el aviso está en pantalla, el
  // temporizador intentaría escribir estado sobre algo que ya no existe.
  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current)
    },
    [],
  )

  return { visible, confirmar }
}
