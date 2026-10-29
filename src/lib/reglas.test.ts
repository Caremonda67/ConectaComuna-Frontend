import { describe, expect, it } from 'vitest'
import { TOPE_ANTICIPO, anticipoExcedeElTope, anticipoPermitido } from './reglas'

describe('tope del anticipo', () => {
  it('es la mitad del precio acordado', () => {
    expect(TOPE_ANTICIPO).toBe(0.5)
    expect(anticipoPermitido(160000)).toBe(80000)
  })

  it('redondea hacia abajo en precios impares', () => {
    expect(anticipoPermitido(45001)).toBe(22500)
  })

  it('no devuelve monto cuando el precio no sirve', () => {
    expect(anticipoPermitido(0)).toBe(0)
    expect(anticipoPermitido(-5000)).toBe(0)
    expect(anticipoPermitido(Number.NaN)).toBe(0)
  })

  it('marca el exceso solo por encima del tope', () => {
    expect(anticipoExcedeElTope(100000, 50000)).toBe(false)
    expect(anticipoExcedeElTope(100000, 50001)).toBe(true)
    expect(anticipoExcedeElTope(100000, Number.NaN)).toBe(true)
  })
})
