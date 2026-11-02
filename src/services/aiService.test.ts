import { describe, expect, it } from 'vitest'
import { generarRespuestaLocal, leerMonto } from './aiService'
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

/**
 * Auditoría del cambio de precio.
 *
 * El flujo anterior respondía "¡Precio actualizado! He guardado este cambio
 * en la ficha" sin guardar nada, y al confirmar creaba un producto NUEVO sin
 * nombre en vez de editar el existente. Quien lo usaba acababa con el
 * catálogo sucio creyendo que había cambiado una tarifa.
 */

const CATALOGO = [
  { id: 'svc-1', nombre: 'Trenzas africanas', precio: 45000 },
  { id: 'svc-2', nombre: 'Corte de cabello', precio: 18000 },
]

function negocioCon(servicios: typeof CATALOGO) {
  return contextoNegocio({ servicios })
}

describe('cambiar el precio de un servicio', () => {
  it('propone la acción real, no un servicio nuevo', () => {
    const r = generarRespuestaLocal(
      'cambiale el precio a las trenzas a 50 mil',
      null,
      [],
      negocioCon(CATALOGO),
    )
    expect(r.tipo).toBe('confirmacion_accion')
    expect(r.accionPendiente?.tipo).toBe('cambiar_precio_servicio')
    expect(r.accionPendiente?.payload).toEqual({ servicioId: 'svc-1', precioNuevo: 50000 })
    // Lo que no debe volver a pasar nunca.
    expect(r.tipo).not.toBe('servicio_catalogo')
    expect(r.mensaje).not.toContain('Precio actualizado')
    expect(r.mensaje).not.toContain('He guardado')
  })

  it('dice el precio viejo y el nuevo, para poder cazar el error antes', () => {
    const r = generarRespuestaLocal(
      'sube el corte a 25 mil',
      null,
      [],
      negocioCon(CATALOGO),
    )
    expect(r.accionPendiente?.descripcion).toContain('18.000')
    expect(r.accionPendiente?.descripcion).toContain('25.000')
  })

  it('con dos servicios y sin decir cuál, pregunta en vez de elegir', () => {
    const r = generarRespuestaLocal('cambiar el precio a 30 mil', null, [], negocioCon(CATALOGO))
    expect(r.tipo).toBe('conversacion')
    expect(r.accionPendiente).toBeUndefined()
    expect(r.mensaje).toContain('Trenzas africanas')
    expect(r.mensaje).toContain('Corte de cabello')
  })

  it('con un solo servicio no hace falta nombrarlo', () => {
    const r = generarRespuestaLocal(
      'cambiar el precio a 30 mil',
      null,
      [],
      negocioCon([CATALOGO[0]]),
    )
    expect(r.accionPendiente?.payload).toEqual({ servicioId: 'svc-1', precioNuevo: 30000 })
  })

  it('sin monto pregunta cuánto, sin inventar una cifra', () => {
    const r = generarRespuestaLocal(
      'quiero cambiar el precio de las trenzas',
      null,
      [],
      negocioCon(CATALOGO),
    )
    expect(r.tipo).toBe('conversacion')
    expect(r.mensaje).toContain('Trenzas africanas')
    expect(r.accionPendiente).toBeUndefined()
  })

  it('sin catálogo no ofrece cambiar nada', () => {
    const r = generarRespuestaLocal('cambiar el precio a 30 mil', null, [], negocioCon([]))
    expect(r.accionPendiente).toBeUndefined()
    expect(r.mensaje).toContain('no tienes servicios')
  })
})

describe('leerMonto', () => {
  it('entiende las formas en que la gente dice un precio', () => {
    expect(leerMonto('30 mil')).toBe(30000)
    expect(leerMonto('30.000')).toBe(30000)
    expect(leerMonto('a 30')).toBe(30000)
    expect(leerMonto('$45.000')).toBe(45000)
    expect(leerMonto('120 mil')).toBe(120000)
  })

  it('devuelve null cuando no hay monto', () => {
    expect(leerMonto('cambiar el precio')).toBeNull()
    expect(leerMonto('')).toBeNull()
  })
})

describe('la conversación de precio no pierde el hilo', () => {
  const preguntaPrevia = [
    {
      id: '1',
      emisor: 'asistente' as const,
      texto: '¿A qué valor dejo "Semipermanente con diseño"? Ahora está en $ 35.000.',
      fecha: new Date(),
    },
  ]
  const CAT3 = [
    ...CATALOGO,
    { id: 'svc-3', nombre: 'Semipermanente con diseño', precio: 35000 },
  ]

  it('responder solo con el monto cambia el servicio del que se venía hablando', () => {
    const r = generarRespuestaLocal('$40.000', null, preguntaPrevia, negocioCon(CAT3))
    expect(r.accionPendiente?.tipo).toBe('cambiar_precio_servicio')
    expect(r.accionPendiente?.payload).toEqual({ servicioId: 'svc-3', precioNuevo: 40000 })
  })

  it('y no se lo aplica a otro servicio', () => {
    const r = generarRespuestaLocal('40 mil', null, preguntaPrevia, negocioCon(CAT3))
    expect(r.accionPendiente?.payload).toMatchObject({ servicioId: 'svc-3' })
  })
})
