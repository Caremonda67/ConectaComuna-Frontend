import { describe, expect, it } from 'vitest'
import { cn, distanceKm, extractErrorMessage, formatCurrency, formatDistance } from './utils'

describe('distancias', () => {
  it('mide en kilómetros entre dos puntos', () => {
    // Centro de Cali contra Palmira: unos 25 km en línea recta
    const d = distanceKm({ lat: 3.4516, lng: -76.532 }, { lat: 3.5394, lng: -76.3036 })
    expect(d).toBeGreaterThan(15)
    expect(d).toBeLessThan(35)
  })

  it('da cero entre el mismo punto', () => {
    expect(distanceKm({ lat: 3.4516, lng: -76.532 }, { lat: 3.4516, lng: -76.532 })).toBe(0)
  })

  it('escribe la distancia corta en metros', () => {
    expect(formatDistance(0.302)).toBe('302 m')
    expect(formatDistance(null)).toBe('Ubicación por confirmar')
  })
})

describe('formato de moneda', () => {
  it('escribe pesos sin decimales', () => {
    expect(formatCurrency(80000)).toMatch(/80[. ]000/)
  })

  it('no inventa un monto cuando no hay precio', () => {
    expect(formatCurrency(null)).toBe('A convenir')
  })
})

describe('cn', () => {
  it('junta clases y descarta lo falso', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})

describe('extractErrorMessage', () => {
  it('extrae el mensaje de una instancia de Error', () => {
    expect(extractErrorMessage(new Error('Fallo de red'))).toBe('Fallo de red')
  })

  it('extrae el mensaje de un objeto PostgrestError de Supabase', () => {
    const pgError = { message: 'permission denied for table businesses', code: '42501' }
    expect(extractErrorMessage(pgError)).toBe('permission denied for table businesses')
  })

  it('usa fallback cuando el error viene vacío o no tiene mensaje', () => {
    expect(extractErrorMessage(null)).toBe('Ocurrió un error inesperado.')
    expect(extractErrorMessage({})).toBe('Ocurrió un error inesperado.')
  })
})
