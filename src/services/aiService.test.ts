import { describe, expect, it } from 'vitest'
import { generarRespuestaLocal } from './aiService'
import type { ContextoUsuarioCopiloto } from '@/types/ai'

/**
 * El copiloto le decía a un emprendedor que no había finalizado ningún
 * trabajo cuando sí los tenía.
 *
 * No era que calculara mal: nunca veía los finalizados. El contexto solo
 * llevaba los pedidos **activos** (pendiente, aceptado, en curso), y los datos
 * del negocio no incluían `completed_orders`. Con esa información la única
 * respuesta posible era cero.
 */

function contextoNegocio(
  negocio: Partial<NonNullable<ContextoUsuarioCopiloto['negocioPropio']>> = {},
): ContextoUsuarioCopiloto {
  return {
    autenticado: true,
    userId: 'u1',
    nombre: 'Jaime Ortiz',
    tipoCuenta: 'business',
    rolActivo: 'business',
    negocioPropio: {
      tieneNegocio: true,
      id: 'b1',
      nombre: 'Carpintería Don Jaime',
      categoria: 'carpinteria',
      pedidosFinalizados: 0,
      calificacion: 0,
      resenas: 0,
      ...negocio,
    },
    pedidosActivos: [],
  }
}

describe('el copiloto responde por el desempeño del negocio', () => {
  it('dice cuántos trabajos finalizó, que es el caso que fallaba', () => {
    const r = generarRespuestaLocal(
      '¿cuántos pedidos he finalizado?',
      null,
      [],
      contextoNegocio({ pedidosFinalizados: 7 }),
    )
    expect(r.mensaje).toContain('7')
    expect(r.mensaje).toContain('Carpintería Don Jaime')
    // La frase que daba antes, y que no debe volver.
    expect(r.mensaje).not.toContain('no tienes pedidos ni pactos activos')
  })

  it('con cero finalizados explica cómo se cuenta uno, en vez de solo negar', () => {
    const r = generarRespuestaLocal(
      'cuántos trabajos llevo',
      null,
      [],
      contextoNegocio({ pedidosFinalizados: 0 }),
    )
    expect(r.mensaje).toContain('0')
    expect(r.mensaje).toContain('marcas')
  })

  it('informa la calificación cuando hay reseñas', () => {
    const r = generarRespuestaLocal(
      'cómo va mi negocio',
      null,
      [],
      contextoNegocio({ pedidosFinalizados: 4, calificacion: 4.5, resenas: 3 }),
    )
    expect(r.mensaje).toContain('4.5')
    expect(r.mensaje).toContain('3 reseñas')
  })

  it('no promete reseñas que no existen', () => {
    const r = generarRespuestaLocal(
      'mis reseñas',
      null,
      [],
      contextoNegocio({ pedidosFinalizados: 2, resenas: 0 }),
    )
    expect(r.mensaje).toContain('Todavía no tienes reseñas')
  })

  it('a un cliente sin negocio no le responde con cifras de negocio', () => {
    const r = generarRespuestaLocal('cuántos pedidos he finalizado', null, [], {
      autenticado: true,
      userId: 'u2',
      nombre: 'Carmen',
      tipoCuenta: 'client',
      negocioPropio: { tieneNegocio: false },
      pedidosActivos: [],
    })
    expect(r.mensaje).not.toContain('Trabajos finalizados')
  })
})
