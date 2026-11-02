/**
 * Lo que el copiloto HACE cuando la persona confirma.
 *
 * Vivía dentro del modal del asistente, que pasa de 1.400 líneas, y por eso
 * no estaba cubierto por ninguna prueba. El precio de eso se vio en uso real:
 * pedir un cambio de precio acababa **creando un producto nuevo sin nombre**
 * en vez de editar el que ya existía, y una confirmación mal formada ofrecía
 * «activar mi negocio» —que cambia el tipo de cuenta— en una conversación que
 * no tenía nada que ver.
 *
 * Aquí está aparte y se prueba contra el backend de demostración, que escribe
 * de verdad. Si una acción vuelve a crear en vez de editar, la prueba cae.
 */
import { businessService } from '@/services/businessService'
import { orderService } from '@/services/orderService'
import { profileService } from '@/services/profileService'
import { facilitadorService } from '@/services/facilitadorService'
import type { AccionPendienteAi } from '@/types/ai'
import type { Business } from '@/types'

export interface ResultadoAccion {
  /** Lo que se le dice a la persona en el chat. */
  mensaje: string
  sugerencias?: string[]
  /** A dónde llevarla después, si procede. */
  navegarA?: string
  /** Si hay que recargar el perfil/negocio en memoria. */
  recargar?: boolean
}

export interface ContextoAccion {
  userId?: string | null
  negocio?: Business | null
}

const IR_AL_NEGOCIO = ['Ir al panel de mi negocio']

/**
 * Ejecuta una acción ya confirmada.
 *
 * Nunca lanza por un fallo esperable: devuelve el motivo en `mensaje`. El de
 * la base suele estar escrito para la persona —«El anticipo no puede pasar
 * del 50% del precio»— y le dice qué corregir, así que se deja pasar tal cual
 * en vez de taparlo con un mensaje genérico.
 */
export async function ejecutarAccionCopiloto(
  accion: AccionPendienteAi | undefined,
  ctx: ContextoAccion,
): Promise<ResultadoAccion> {
  // Sin acción no se hace nada. Antes se asumía `activar_negocio` como
  // respaldo y una confirmación mal formada acababa cambiando el tipo de
  // cuenta: una acción que nadie pidió nunca debe ser la de reserva.
  if (!accion?.tipo) {
    return {
      mensaje: 'No me quedó claro qué cambio querías. ¿Me lo repites?',
      sugerencias: ['Ver mi catálogo', 'Ver mis pedidos'],
    }
  }

  const { userId, negocio } = ctx

  try {
    switch (accion.tipo) {
      case 'activar_negocio': {
        if (userId) await profileService.update(userId, { account_type: 'business' })
        return { mensaje: '', navegarA: '/panel/negocio', recargar: true }
      }

      case 'generar_codigo_apadrinamiento': {
        if (!negocio?.id) {
          return {
            mensaje:
              'Para generar el código primero necesitas tener tu negocio creado. Te llevo a crearlo cuando quieras.',
            sugerencias: IR_AL_NEGOCIO,
          }
        }
        const codigo = await facilitadorService.generarCodigo(negocio.id)
        return {
          mensaje: `Listo. Tu código de apadrinamiento es **${codigo}**.\n\nEntrégaselo en persona a quien va a ayudarte —un familiar, un vecino o tu facilitador comunitario—. Sirve una sola vez y vence en 24 horas. Con él podrá editar tu negocio: fotos, precios y catálogo.\n\nNo lo publiques ni lo mandes a grupos: quien lo tenga puede tomar el control de tu ficha.`,
          sugerencias: ['Ir al panel de mi negocio', 'Ver quién puede editar mi negocio'],
        }
      }

      case 'cambiar_precio_servicio': {
        const { servicioId, precioNuevo } = (accion.payload ?? {}) as {
          servicioId?: string
          precioNuevo?: number
        }
        const catalogo = negocio?.services_catalog ?? []
        const servicio = catalogo.find((s) => s.id === servicioId)

        // Si el servicio no está, se para. Antes esto acababa en alta de un
        // producto nuevo sin nombre, que es justo lo que no debe pasar.
        if (!negocio?.id || !servicio || typeof precioNuevo !== 'number') {
          return {
            mensaje:
              'No tengo claro cuál servicio ni a qué precio. Dímelo así: «sube el pedicure a 30 mil».',
            sugerencias: ['Ver mi catálogo'],
          }
        }

        await businessService.upsert(negocio.owner_id, {
          id: negocio.id,
          name: negocio.name,
          category: negocio.category,
          services_catalog: catalogo.map((s) =>
            s.id === servicioId ? { ...s, price: precioNuevo } : s,
          ),
        })
        return {
          mensaje: `Listo. "${servicio.name}" queda en $ ${precioNuevo.toLocaleString('es-CO')}. Ya se ve así en tu ficha del directorio.`,
          sugerencias: ['Ver mi catálogo', 'Cambiar otro precio'],
          recargar: true,
        }
      }

      case 'aceptar_pedido': {
        const { pedidoId, precioFinal, anticipo } = (accion.payload ?? {}) as {
          pedidoId?: string
          precioFinal?: number
          anticipo?: number
        }
        if (!pedidoId || typeof precioFinal !== 'number') {
          return {
            mensaje: 'Para aceptar el pedido necesito el precio acordado.',
            sugerencias: ['Ver mis pedidos'],
          }
        }
        // El tope del 50% no se comprueba aquí a propósito: lo impone la base
        // con un CHECK. Validar en dos sitios invita a que se desincronicen y
        // a que alguien crea que basta con el de arriba.
        await orderService.updateStatus(pedidoId, 'accepted', {
          finalPrice: precioFinal,
          advancePayment: anticipo ?? 0,
        })
        return {
          mensaje: `Pedido aceptado por $ ${precioFinal.toLocaleString('es-CO')}${
            anticipo ? `, con anticipo de $ ${anticipo.toLocaleString('es-CO')}` : ''
          }. El cliente ya puede ver el comprobante del Trato Seguro.`,
          sugerencias: ['Ver mis pedidos'],
        }
      }

      case 'nota_avance_pedido': {
        const { pedidoId, nota } = (accion.payload ?? {}) as { pedidoId?: string; nota?: string }
        if (!pedidoId || !nota?.trim()) {
          return {
            mensaje: '¿Qué le cuento al cliente sobre cómo va el trabajo?',
            sugerencias: ['Ver mis pedidos'],
          }
        }
        await orderService.guardarNotaAvance(pedidoId, nota.trim())
        return {
          mensaje: `Nota guardada. El cliente la va a ver en su panel: "${nota.trim()}"`,
          sugerencias: ['Ver mis pedidos'],
        }
      }

      case 'actualizar_horario': {
        const { dias, opens, closes, cerrado } = (accion.payload ?? {}) as {
          dias?: number[]
          opens?: string
          closes?: string
          cerrado?: boolean
        }
        if (!negocio?.id || !Array.isArray(dias) || dias.length === 0) {
          return {
            mensaje: 'Dime qué días y a qué horas, por ejemplo: «los sábados abro de 9 a 2».',
            sugerencias: IR_AL_NEGOCIO,
          }
        }
        const nuevos = (negocio.hours ?? []).map((h) =>
          dias.includes(h.day)
            ? {
                ...h,
                closed: !!cerrado,
                opens: cerrado ? null : (opens ?? h.opens),
                closes: cerrado ? null : (closes ?? h.closes),
              }
            : h,
        )
        await businessService.upsert(negocio.owner_id, {
          id: negocio.id,
          name: negocio.name,
          category: negocio.category,
          hours: nuevos,
        })
        return {
          mensaje: 'Horario actualizado. Así lo van a ver los vecinos en tu ficha.',
          sugerencias: ['Ver mi negocio'],
          recargar: true,
        }
      }

      default:
        // Tipos declarados pero sin implementar. Antes el botón se quedaba
        // girando sin hacer nada y sin decir por qué.
        return {
          mensaje:
            'Esa acción todavía no la puedo hacer yo desde el chat. Te llevo a la pantalla donde sí se puede.',
          sugerencias: IR_AL_NEGOCIO,
        }
    }
  } catch (err) {
    const motivo = err instanceof Error ? err.message : ''
    return {
      mensaje: motivo
        ? `No se pudo: ${motivo}`
        : 'No pude completar la acción. Vuelve a intentarlo en un momento, o hazlo desde el panel de tu negocio.',
      sugerencias: IR_AL_NEGOCIO,
    }
  }
}
