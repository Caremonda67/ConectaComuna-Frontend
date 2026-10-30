import { describe, expect, it } from 'vitest'
import {
  FRASES_CLIENTE,
  FRASES_FACILITADOR,
  FRASES_NEGOCIO,
  OFICIOS,
} from './frasesTitular'

describe('frases del titular rotativo', () => {
  it('tiene variedad amplia de oficios para visitantes', () => {
    expect(OFICIOS.length).toBeGreaterThanOrEqual(20)
    // Sin duplicados
    const unicos = new Set(OFICIOS)
    expect(unicos.size).toBe(OFICIOS.length)
  })

  it('tiene variedad amplia de situaciones para clientes', () => {
    expect(FRASES_CLIENTE.length).toBeGreaterThanOrEqual(20)
    const unicos = new Set(FRASES_CLIENTE)
    expect(unicos.size).toBe(FRASES_CLIENTE.length)

    // Todas son preguntas cotidianas
    for (const frase of FRASES_CLIENTE) {
      expect(frase.startsWith('¿')).toBe(true)
      expect(frase.endsWith('?')).toBe(true)
      expect(frase.length).toBeLessThanOrEqual(35)
    }
  })

  it('tiene variedad de frases de valor para emprendedores y negocios', () => {
    expect(FRASES_NEGOCIO.length).toBeGreaterThanOrEqual(15)
    const unicos = new Set(FRASES_NEGOCIO)
    expect(unicos.size).toBe(FRASES_NEGOCIO.length)

    for (const frase of FRASES_NEGOCIO) {
      expect(frase.length).toBeLessThanOrEqual(35)
    }
  })

  it('tiene frases de acompañamiento para facilitadores', () => {
    expect(FRASES_FACILITADOR.length).toBeGreaterThanOrEqual(5)
    const unicos = new Set(FRASES_FACILITADOR)
    expect(unicos.size).toBe(FRASES_FACILITADOR.length)
  })
})
