import { describe, expect, it } from 'vitest'
import { comunaDePunto } from './comunas'
import { COMUNAS_CALI } from './comunasCali'

/**
 * Las coordenadas de referencia salieron de geocodificar el barrio contra
 * Nominatim y se comprobaron contra los polígonos de precisión completa, que
 * son los que usa Postgres. La comuna esperada es la división real de Cali.
 */
const BARRIOS_CONOCIDOS: [string, number, number, number][] = [
  ['El Vallado', 3.4062, -76.4994, 15],
  ['Ciudad Córdoba', 3.4012, -76.508, 15],
  ['Mariano Ramos', 3.4036, -76.5172, 16],
  ['República de Israel', 3.4076, -76.5134, 16],
]

describe('comunaDePunto', () => {
  it.each(BARRIOS_CONOCIDOS)('ubica %s en la comuna %d', (_barrio, lat, lng, esperada) => {
    expect(comunaDePunto(lat, lng)).toBe(esperada)
  })

  it('devuelve null fuera de Cali, no una comuna cualquiera', () => {
    // Plaza de Bolívar, Bogotá. Hay negocios fuera de Cali desde la migración
    // de Bogotá y el panel tiene que poder contarlos aparte.
    expect(comunaDePunto(4.5981, -74.0758)).toBeNull()
    // Mar Pacífico, mismo meridiano que Cali pero sin tierra.
    expect(comunaDePunto(3.42, -78.5)).toBeNull()
  })

  it('devuelve null con coordenadas que no son números', () => {
    expect(comunaDePunto(Number.NaN, -76.5)).toBeNull()
    expect(comunaDePunto(3.42, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('prueba de la prueba: no siempre devuelve lo mismo', () => {
    // Si la función devolviera una constante, los casos de arriba pasarían
    // igual con solo cambiar el valor esperado. Aquí se exige que distinga.
    const vistas = new Set(BARRIOS_CONOCIDOS.map(([, lat, lng]) => comunaDePunto(lat, lng)))
    expect(vistas.size).toBeGreaterThan(1)
  })
})

describe('las siluetas que viajan al navegador', () => {
  it('son las 22 comunas, sin faltar ni repetir', () => {
    const numeros = COMUNAS_CALI.map((c) => c.comuna).sort((a, b) => a - b)
    expect(numeros).toEqual(Array.from({ length: 22 }, (_, i) => i + 1))
  })

  it('cada anillo cierra y tiene suficientes puntos para ser un polígono', () => {
    for (const { comuna, anillos } of COMUNAS_CALI) {
      expect(anillos.length, `comuna ${comuna} sin anillos`).toBeGreaterThan(0)
      for (const anillo of anillos) {
        expect(anillo.length, `comuna ${comuna}`).toBeGreaterThanOrEqual(4)
        expect(anillo[0], `comuna ${comuna} no cierra`).toEqual(anillo[anillo.length - 1])
      }
    }
  })

  it('todas caen dentro del recuadro de Cali', () => {
    // Si una comuna quedara con coordenadas invertidas (lat,lng en vez de
    // lng,lat) el mapa se dibujaría en el océano Índico y nadie lo notaría
    // hasta verlo.
    for (const { comuna, anillos } of COMUNAS_CALI) {
      for (const [lng, lat] of anillos.flat()) {
        expect(lng, `comuna ${comuna}`).toBeGreaterThan(-76.8)
        expect(lng, `comuna ${comuna}`).toBeLessThan(-76.3)
        expect(lat, `comuna ${comuna}`).toBeGreaterThan(3.2)
        expect(lat, `comuna ${comuna}`).toBeLessThan(3.6)
      }
    }
  })

  it('pesa poco: es lo que baja un celular de gama baja', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(COMUNAS_CALI)).length
    expect(bytes).toBeLessThan(25_000)
  })
})
