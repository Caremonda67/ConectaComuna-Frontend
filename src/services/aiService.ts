import { apiFetch } from '@/lib/apiClient'
import { leerUbicacion } from '@/lib/ubicacion'
import type { MensajeChat, RespuestaAi } from '@/types/ai'

const BARRIO_POR_DEFECTO = 'Antonio Nariño'
const COORDENADAS_POR_DEFECTO = { lat: 3.4215, lng: -76.512 }

/**
 * Respaldo local en el navegador si no hay conexión al backend.
 * Garantiza que la experiencia nunca se interrumpa.
 */
function generarRespuestaLocal(mensaje: string, barrio: string): RespuestaAi {
  const texto = mensaje.toLowerCase().trim()

  if (texto.includes('trato seguro') || texto.includes('anticipo') || texto.includes('garantia')) {
    return {
      mensaje: `¡Hola vecino! El Trato Seguro Comunal es el pacto de confianza de nuestro barrio:\n1. Ningún anticipo para materiales puede superar el 50% del total acordado.\n2. Todo queda registrado con código de verificación.\n3. Si surge algún desacuerdo, cuentas con mediación vecinal comunitaria.`,
      tipo: 'conversacion',
      sugerencias: ['¿Cómo pedir un servicio?', '¿Qué es el facilitador?', 'Ver oficios cercanos'],
    }
  }

  if (texto.includes('facilitador') || texto.includes('apadrinar') || texto.includes('ayuda digital')) {
    return {
      mensaje: `El Facilitador Comunitario es un familiar o vecino joven de confianza que apoya a los adultos mayores a gestionar su catálogo y fotos. En el panel de negocio encuentras un código de 6 letras para vincularlo.`,
      tipo: 'conversacion',
      sugerencias: ['¿Cómo registrarme?', '¿Cómo funciona el Trato Seguro?'],
    }
  }

  const esDictado =
    texto.includes('vendo') ||
    texto.includes('hago') ||
    texto.includes('ofrezco') ||
    texto.includes('cobro') ||
    texto.includes('publicar') ||
    texto.includes('mi servicio') ||
    texto.includes('mi catalogo') ||
    texto.includes('mi catálogo') ||
    texto.includes('dictar')

  if (esDictado) {
    const precioMatch = texto.match(/\b(\d{1,3}(?:\.\d{3})*|\d+)\s*(?:mil|pesos|\$)?\b/)
    let precio = 20000
    if (precioMatch) {
      const num = parseInt(precioMatch[1].replace(/\./g, ''), 10)
      precio = num < 1000 ? num * 1000 : num
    }

    let categoria = 'otros'
    let titulo = 'Servicio de oficio comunal'

    if (
      texto.includes('vestido') ||
      texto.includes('ropa') ||
      texto.includes('pantalon') ||
      texto.includes('confecci') ||
      texto.includes('costura') ||
      texto.includes('dobladillo')
    ) {
      categoria = 'costura'
      titulo = 'Confección y arreglo de prendas'
    } else if (texto.includes('chapa') || texto.includes('llave') || texto.includes('candado')) {
      categoria = 'cerrajeria'
      titulo = 'Servicio de cerrajería y aperturas'
    } else if (texto.includes('celular') || texto.includes('pantalla') || texto.includes('computador') || texto.includes('tecnolog')) {
      categoria = 'tecnologia'
      titulo = 'Mantenimiento y arreglo técnico'
    } else if (texto.includes('barber') || texto.includes('corte') || texto.includes('unas') || texto.includes('manicure')) {
      categoria = 'belleza'
      titulo = 'Cuidado personal y estética barrial'
    }

    return {
      mensaje: `¡Qué buen oficio! He estructurado tu servicio para que los vecinos de ${barrio} se enteren de inmediato. Puedes revisarlo y publicarlo con un solo toque:`,
      tipo: 'servicio_catalogo',
      servicio: {
        titulo,
        descripcion: mensaje,
        precioSugerido: precio,
        categoria,
      },
      sugerencias: ['Guardar en mi catálogo', 'Cambiar el precio', '¿Cómo funciona el anticipo?'],
    }
  }

  return {
    mensaje: `¡Hola vecino de ${barrio}! Soy tu Asistente Comunal. Puedo orientarte sobre oficios cercanos de confianza, explicarte cómo te protege el Trato Seguro o ayudarte a publicar tus servicios dictándomelos con tu voz. ¿En qué te colaboro hoy?`,
    tipo: 'conversacion',
    sugerencias: ['¿Quién arregla ropa?', 'Cerrajería de confianza', '¿Cómo funciona el Trato Seguro?'],
  }
}

/**
 * Envía un mensaje al Asistente Comunal y devuelve la respuesta estructurada.
 */
export async function enviarMensajeAsistente(
  mensaje: string,
  historial: MensajeChat[] = [],
): Promise<RespuestaAi> {
  const ubicacionElegida = leerUbicacion()
  const barrio = ubicacionElegida?.etiqueta || BARRIO_POR_DEFECTO
  const lat = ubicacionElegida?.center.lat || COORDENADAS_POR_DEFECTO.lat
  const lng = ubicacionElegida?.center.lng || COORDENADAS_POR_DEFECTO.lng

  const historialFormateado = historial.slice(-6).map((m) => ({
    rol: m.emisor === 'usuario' ? 'user' : 'model',
    texto: m.texto,
  }))

  try {
    const respuesta = await apiFetch<RespuestaAi>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        mensaje,
        historial: historialFormateado,
        ubicacion: { barrio, lat, lng },
      }),
    })

    return respuesta
  } catch (error) {
    console.warn('Backend de IA no disponible, empleando motor local de respaldo:', error)
    return generarRespuestaLocal(mensaje, barrio)
  }
}
