import { describe, expect, it } from 'vitest'
import { construirDictado, corregirDictado, mejorAlternativa } from './voz'

describe('corregirDictado', () => {
  it('arregla los oficios que el dictado confunde', () => {
    expect(corregirDictado('necesito un serrajero')).toBe('necesito un cerrajero')
    expect(corregirDictado('busco serrajeria urgente')).toBe('busco cerrajeria urgente')
    expect(corregirDictado('quiero manicura')).toBe('quiero manicure')
  })

  it('respeta los nombres de los barrios del piloto', () => {
    expect(corregirDictado('vivo en el rodeo')).toBe('vivo en El Rodeo')
    expect(corregirDictado('por antonio narino')).toBe('por Antonio Nariño')
    expect(corregirDictado('en ballado')).toBe('en Vallado')
    expect(corregirDictado('cerca de silo')).toBe('cerca de silo')
    expect(corregirDictado('cerca de siloe')).toBe('cerca de Siloé')
  })

  it('escribe Trato Seguro como nombre propio', () => {
    expect(corregirDictado('como funciona el trato seguro')).toBe(
      'como funciona el Trato Seguro',
    )
  })

  it('normaliza los espacios sobrantes', () => {
    expect(corregirDictado('  hola   vecino  ')).toBe('hola vecino')
  })

  it('no toca lo que ya esta bien', () => {
    expect(corregirDictado('necesito una modista en mi barrio')).toBe(
      'necesito una modista en mi barrio',
    )
  })
})

describe('mejorAlternativa', () => {
  it('prefiere la que contiene palabras del oficio', () => {
    expect(mejorAlternativa(['cerrar ahi urgente', 'cerrajería urgente'])).toBe(
      'cerrajería urgente',
    )
  })

  it('con una sola alternativa devuelve esa', () => {
    expect(mejorAlternativa(['hola'])).toBe('hola')
  })

  it('sin alternativas devuelve cadena vacia', () => {
    expect(mejorAlternativa([])).toBe('')
  })

  it('si ninguna gana, se queda con la primera, que es la que el motor puntuo mejor', () => {
    expect(mejorAlternativa(['buenos dias', 'buenos días'])).toBe('buenos dias')
  })
})

describe('construirDictado', () => {
  const definitivo = (t: string) => ({ esDefinitivo: true, alternativas: [t] })
  const enCurso = (t: string) => ({ esDefinitivo: false, alternativas: [t] })

  it('no duplica cuando el motor reentrega un resultado ya cerrado', () => {
    // Android vuelve a entregar la lista completa en cada evento. Armar el
    // texto de cero tiene que dar lo mismo las veces que haga falta.
    const unaVez = [definitivo('hola')]
    expect(construirDictado(unaVez)).toBe('hola')
    expect(construirDictado(unaVez)).toBe('hola')
    expect(construirDictado(unaVez)).toBe('hola')
  })

  it('une los tramos con espacio, sin pegarlos', () => {
    expect(construirDictado([definitivo('necesito'), definitivo('una modista')])).toBe(
      'necesito una modista',
    )
  })

  it('mezcla lo cerrado con lo que se esta diciendo', () => {
    expect(construirDictado([definitivo('busco'), enCurso('un cerrajero')])).toBe(
      'busco un cerrajero',
    )
  })

  it('aplica el diccionario del oficio', () => {
    expect(construirDictado([definitivo('necesito un serrajero')])).toBe(
      'necesito un cerrajero',
    )
  })

  it('desempata a favor de las palabras del oficio', () => {
    expect(
      construirDictado([{ esDefinitivo: true, alternativas: ['cerrar ahi', 'cerrajería'] }]),
    ).toBe('cerrajería')
  })

  it('sin resultados devuelve cadena vacia', () => {
    expect(construirDictado([])).toBe('')
  })
})
