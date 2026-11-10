import { describe, expect, it } from 'vitest'
import {
  CALIDAD,
  LADO_MAXIMO,
  PESO_MINIMO,
  dimensionesDestino,
  valeLaPenaComprimir,
} from './imagenes'

/**
 * El dibujado en lienzo no se prueba aquí: en jsdom no hay `canvas` de
 * verdad y montar uno falso solo comprobaría el falso. Lo que sí se puede
 * fijar, y es donde de verdad se cuelan los errores, son las dos decisiones
 * previas: cuánto hay que reducir y si conviene tocar el archivo.
 */
describe('dimensionesDestino', () => {
  it('no agranda una foto que ya cabe', () => {
    expect(dimensionesDestino(800, 600)).toEqual({ ancho: 800, alto: 600 })
  })

  it('reduce por el lado mayor y conserva la proporción', () => {
    const { ancho, alto } = dimensionesDestino(4000, 3000)
    expect(ancho).toBe(LADO_MAXIMO)
    expect(alto).toBe(1200)
    expect(ancho / alto).toBeCloseTo(4000 / 3000, 5)
  })

  it('funciona igual con fotos verticales, que es como fotografía la gente', () => {
    const { ancho, alto } = dimensionesDestino(3000, 4000)
    expect(alto).toBe(LADO_MAXIMO)
    expect(ancho).toBe(1200)
  })

  it('nunca devuelve cero en imágenes muy alargadas', () => {
    // Un panorama de 8000x10 reducido daría 2 px de alto por redondeo, y un
    // lienzo de alto cero lanza al dibujar.
    const { ancho, alto } = dimensionesDestino(8000, 10)
    expect(ancho).toBe(LADO_MAXIMO)
    expect(alto).toBeGreaterThanOrEqual(1)
  })

  it('aguanta una imagen vacía sin dividir por cero', () => {
    expect(dimensionesDestino(0, 0)).toEqual({ ancho: 0, alto: 0 })
  })
})

describe('valeLaPenaComprimir', () => {
  it('comprime la foto de cámara, que es el caso que motivó esto', () => {
    // La portada que medimos en producción pesaba 2.588 KB.
    expect(valeLaPenaComprimir('image/jpeg', 2588 * 1024)).toBe(true)
  })

  it('deja en paz una foto que ya es liviana', () => {
    expect(valeLaPenaComprimir('image/jpeg', PESO_MINIMO - 1)).toBe(false)
  })

  it('no toca PNG ni GIF', () => {
    // Un PNG suele ser un logo o una captura con texto: pasarlo a JPEG le
    // mete suciedad alrededor de las letras. Un GIF perdería la animación.
    expect(valeLaPenaComprimir('image/png', 5 * 1024 * 1024)).toBe(false)
    expect(valeLaPenaComprimir('image/gif', 5 * 1024 * 1024)).toBe(false)
  })

  it('ignora lo que no es una imagen', () => {
    expect(valeLaPenaComprimir('application/pdf', 5 * 1024 * 1024)).toBe(false)
    expect(valeLaPenaComprimir('', 5 * 1024 * 1024)).toBe(false)
  })
})

describe('los valores elegidos', () => {
  it('el lado máximo cubre de sobra la foto más grande que pinta la app', () => {
    expect(LADO_MAXIMO).toBeGreaterThanOrEqual(1200)
  })

  it('la calidad no baja a territorio de artefactos visibles', () => {
    expect(CALIDAD).toBeGreaterThanOrEqual(0.75)
    expect(CALIDAD).toBeLessThan(1)
  })
})
