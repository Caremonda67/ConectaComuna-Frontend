import { describe, expect, it } from 'vitest'
import { ATAJOS_PILOTO } from './lugares'
import { comunaDePunto } from './comunas'

/**
 * Los atajos de barrio no son un adorno: cuando alguien escribe su barrio en
 * vez de buscar la dirección, de aquí sale el punto del negocio, y de ese
 * punto sale la comuna que cuenta el panel.
 *
 * Las ocho coordenadas originales estaban mal, entre 1 y 3,5 km, y ninguna
 * caía en el barrio de su etiqueta. No se detectó durante semanas porque a
 * ojo una coordenada de Cali se parece a cualquier otra coordenada de Cali.
 * Estas pruebas existen para que la próxima vez salte aquí.
 *
 * La comuna esperada se comprobó contra Nominatim de ida y vuelta: se busca
 * el barrio, y el punto devuelto se geocodifica al revés para confirmar que
 * cae en ese mismo barrio.
 */
const COMUNA_ESPERADA: Record<string, number> = {
  'Antonio Nariño, Cali': 16,
  'El Rodeo, Cali': 12,
  'Nueva Floresta, Cali': 12,
  'El Vallado, Cali': 15,
  'San Judas, Cali': 10,
  'Ciudad Córdoba, Cali': 15,
  'Mariano Ramos, Cali': 16,
  'República de Israel, Cali': 16,
}

describe('atajos de barrio del piloto', () => {
  it('no hay etiquetas repetidas', () => {
    const etiquetas = ATAJOS_PILOTO.map((a) => a.etiqueta)
    expect(new Set(etiquetas).size).toBe(etiquetas.length)
  })

  it.each(ATAJOS_PILOTO)('$etiqueta cae dentro de Cali', ({ center }) => {
    // Un punto fuera de las 22 comunas significa que la coordenada está mal
    // tecleada: es el fallo que de verdad ocurrió.
    expect(comunaDePunto(center.lat, center.lng)).not.toBeNull()
  })

  it.each(ATAJOS_PILOTO)('$etiqueta cae en la comuna que le toca', ({ etiqueta, center }) => {
    expect(COMUNA_ESPERADA[etiqueta]).toBeDefined()
    expect(comunaDePunto(center.lat, center.lng)).toBe(COMUNA_ESPERADA[etiqueta])
  })

  it('la tabla de esperados cubre todos los atajos', () => {
    // Si se añade un barrio y no se comprueba su comuna, el `it.each` de
    // arriba pasaría de largo sin mirar nada.
    expect(Object.keys(COMUNA_ESPERADA).sort()).toEqual(
      ATAJOS_PILOTO.map((a) => a.etiqueta).sort(),
    )
  })
})
