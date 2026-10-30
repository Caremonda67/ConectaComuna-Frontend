import { TextoRotativo } from '@/components/ui/TextoRotativo'
import {
  OFICIOS,
  FRASES_CLIENTE,
  FRASES_NEGOCIO,
  FRASES_FACILITADOR,
} from './frasesTitular'
import type { ActiveRole } from '@/types'

export function TitularRotativo() {
  return <TextoRotativo items={OFICIOS} className="block text-brand-600" />
}

interface TitularUsuarioProps {
  nombre: string
  role: ActiveRole
  negocioNombre?: string
}

/**
 * Titular animado vertical adaptado al usuario según su rol activo.
 */
export function TitularUsuario({ nombre, role, negocioNombre }: TitularUsuarioProps) {
  if (role === 'business') {
    const encabezado = negocioNombre && negocioNombre.length <= 22 ? negocioNombre : `Taller de ${nombre}`
    return (
      <>
        <span aria-hidden="true">{encabezado},</span>
        <TextoRotativo items={FRASES_NEGOCIO} className="block text-brand-600" />
        <span aria-hidden="true" className="block">
          de vecino a vecino.
        </span>
      </>
    )
  }

  if (role === 'facilitador') {
    return (
      <>
        <span aria-hidden="true">Hola, {nombre},</span>
        <TextoRotativo items={FRASES_FACILITADOR} className="block text-brand-600" />
        <span aria-hidden="true" className="block">
          apoyo solidario en el territorio.
        </span>
      </>
    )
  }

  // Por defecto rol 'client'
  return (
    <>
      <span aria-hidden="true">Hola, {nombre},</span>
      <TextoRotativo items={FRASES_CLIENTE} className="block text-brand-600" />
      <span aria-hidden="true" className="block">
        en tu propio barrio lo resuelves.
      </span>
    </>
  )
}
