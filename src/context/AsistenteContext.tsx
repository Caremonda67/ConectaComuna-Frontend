import { useState, type ReactNode } from 'react'
import { AsistenteContext } from './asistenteContextDefinition'

export function AsistenteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mensajeInicial, setMensajeInicial] = useState<string | null>(null)

  const abrirAsistente = (mensaje?: string) => {
    if (mensaje) {
      setMensajeInicial(mensaje)
    }
    setIsOpen(true)
  }

  const cerrarAsistente = () => {
    setIsOpen(false)
    setMensajeInicial(null)
  }

  const alternarAsistente = () => {
    setIsOpen((prev) => !prev)
  }

  return (
    <AsistenteContext.Provider
      value={{
        isOpen,
        mensajeInicial,
        abrirAsistente,
        cerrarAsistente,
        alternarAsistente,
      }}
    >
      {children}
    </AsistenteContext.Provider>
  )
}
