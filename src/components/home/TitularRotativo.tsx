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
  'al carpintero',
  'al electricista',
  'al de las empanadas',
  'al que arregla motos',
  'al maestro de obra',
  'al técnico de celular',
  'a la que hornea rico',
  'al zapatero remendón',
  'al maestro plomero',
  'a la reina del blower',
  'al del taller de bicis',
  'a quien suelda rejas',
  'al que hace mandados',
  'al pintor de fachadas',
  'a la vecina repostera',
  'al que te saca de apuros',
  'al barbero de confianza',
  'al tapicero de muebles',
  'a quien cuida mascotas',
  'al de la comida casera',
  'a quien repara todo',
] as const

/** Para lectores de pantalla: una frase completa y quieta, sin parloteo. */
export const TITULAR_ACCESIBLE =
  'Encuentra a la modista, al cerrajero o a quien repara todo de tu propio barrio.'

export function TitularRotativo() {
  return <TextoRotativo items={OFICIOS} className="block text-brand-600" />
}
