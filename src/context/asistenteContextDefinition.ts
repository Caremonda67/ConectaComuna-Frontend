import { createContext } from 'react'

export interface AsistenteContextValue {
  isOpen: boolean
  mensajeInicial: string | null
  abrirAsistente: (mensaje?: string) => void
  cerrarAsistente: () => void
  alternarAsistente: () => void
}

export const AsistenteContext = createContext<AsistenteContextValue | undefined>(undefined)
