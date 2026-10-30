import { TextoRotativo } from '@/components/ui/TextoRotativo'

/**
 * Los oficios que rotan en el titular. Tres reglas los gobiernan:
 *
 * 1. Caben en una línea a 375 px (unos 20 caracteres). Más largo parte el
 *    titular y empuja los botones fuera de la primera pantalla.
 * 2. Ninguno termina en un verbo que admita «de», porque lo que sigue es «de
 *    tu propio barrio»: «a quien te salva de tu propio barrio» diría justo lo
 *    contrario de lo que queremos decir.
 * 3. Todos corresponden a una categoría que existe en el directorio, para que
 *    lo que promete el titular se pueda ver listado unas pantallas más abajo.
 */
const OFICIOS = [
  'a la modista',
  'al cerrajero',
  'a la manicurista',
  'al de las empanadas',
  'al maestro de obra',
  'a quien hace tortas',
  'al peluquero',
  'a quien repara todo',
  'al domiciliario',
  'a quien cocina',
  'al sastre',
  'a quien pinta',
] as const

/** Para lectores de pantalla: una frase completa y quieta, sin parloteo. */
export const TITULAR_ACCESIBLE =
  'Encuentra a la modista, al cerrajero o a la manicurista de tu propio barrio.'

export function TitularRotativo() {
  return <TextoRotativo items={OFICIOS} className="block text-brand-600" />
}
