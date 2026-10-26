import { apiFetch } from '@/lib/apiClient'
import { leerUbicacion } from '@/lib/ubicacion'
import type { MensajeChat, RespuestaAi } from '@/types/ai'

const BARRIO_POR_DEFECTO = 'Antonio Nariño'
const COORDENADAS_POR_DEFECTO = { lat: 3.4215, lng: -76.512 }

/**
 * Normaliza y describe la ubicación de forma humana para evitar frases como "en Mi ubicación".
 */
export function describirUbicacion(barrio: string) {
  if (!barrio || barrio.toLowerCase().includes('ubicación') || barrio.toLowerCase().includes('ubicacion')) {
    return {
      cercaDe: 'cerca de tu ubicación actual en la comuna',
      enBarrio: 'tu zona en la comuna',
      etiquetaCorta: 'Cerca de ti',
    }
  }
  return {
    cercaDe: `cerca del barrio ${barrio}`,
    enBarrio: `el barrio ${barrio}`,
    etiquetaCorta: `Barrio ${barrio}`,
  }
}

/**
 * Respaldo local inteligente en el navegador si no hay conexión al backend.
 * Replica la máquina de estados y memoria conversacional para que el chat siempre funcione.
 */
function generarRespuestaLocal(mensaje: string, barrio: string, historial: MensajeChat[] = []): RespuestaAi {
  const texto = mensaje.toLowerCase().trim()
  const descUbi = describirUbicacion(barrio)

  const mensajesBot = historial.filter((m) => m.emisor === 'asistente')
  const ultimoMensajeBot = mensajesBot.length > 0 ? mensajesBot[mensajesBot.length - 1].texto.toLowerCase() : ''

  // 1. Navegación al mapa comunal
  if (
    texto === 'ver en el mapa' ||
    texto.includes('en el mapa') ||
    texto.includes('ver mapa') ||
    texto.includes('abrir mapa') ||
    texto === 'mapa'
  ) {
    let ruta = '/mapa'
    let catNombre = ''
    if (ultimoMensajeBot.includes('costura') || ultimoMensajeBot.includes('modista') || ultimoMensajeBot.includes('marta')) {
      ruta = '/mapa?categoria=costura'
      catNombre = 'de costura y modistería'
    } else if (ultimoMensajeBot.includes('cerraj')) {
      ruta = '/mapa?categoria=cerrajeria'
      catNombre = 'de cerrajería'
    } else if (ultimoMensajeBot.includes('barber') || ultimoMensajeBot.includes('belleza') || ultimoMensajeBot.includes('peluquer')) {
      ruta = '/mapa?categoria=belleza'
      catNombre = 'de estética y barbería'
    } else if (ultimoMensajeBot.includes('comida') || ultimoMensajeBot.includes('almuerzo')) {
      ruta = '/mapa?categoria=comida'
      catNombre = 'de comida casera'
    } else if (ultimoMensajeBot.includes('celular') || ultimoMensajeBot.includes('tecnolog')) {
      ruta = '/mapa?categoria=tecnologia'
      catNombre = 'de reparación técnica'
    }

    const detalle = catNombre ? `los talleres ${catNombre}` : 'los talleres, modisterías y cerrajerías'

    return {
      mensaje: `¡Con gusto, vecino! En el mapa comunal interactivo puedes ubicar ${detalle} geolocalizados cerca de tu barrio. Toca el botón para abrir el mapa directamente:`,
      tipo: 'navegacion',
      rutaNavegacion: ruta,
      sugerencias: ['Oficios cerca de mí', '🔑 Cerrajería urgente', 'Buscar otro oficio'],
    }
  }

  // 2. Navegación a explorar oficios / buscar otro oficio
  if (
    texto.includes('buscar otro oficio') ||
    texto.includes('explorar oficios') ||
    texto.includes('ver categorías') ||
    texto.includes('ver categorias') ||
    texto.includes('otro oficio')
  ) {
    return {
      mensaje: `En nuestra comuna encuentras modistas, cerrajeros, zapateros, técnicos de celular, barberías y comida casera. Puedes tocar una categoría o explorar el directorio completo:`,
      tipo: 'navegacion',
      rutaNavegacion: '/explorar',
      sugerencias: ['👗 Costura y modistería', '🔑 Cerrajería', '💇 Barbería y estética', '📱 Reparación de celulares'],
    }
  }

  // 3. ¿Cómo pedir un servicio?
  if (
    texto.includes('cómo pedir') ||
    texto.includes('como pedir') ||
    texto.includes('cómo contratar') ||
    texto.includes('como contratar') ||
    texto.includes('pedir un servicio')
  ) {
    return {
      mensaje: `Pedir un servicio en ConectaComuna es directo y seguro:\n1. 🔍 Buscas el oficio que necesitas (por cercanía o categoría).\n2. 💬 Tocas el botón verde de WhatsApp para acordar directamente con el emprendedor.\n3. 🛡️ Si el trabajo requiere compra previa de repuestos o materiales, recuerden pactar el Trato Seguro: anticipo máximo del 50% con comprobante oficial.`,
      tipo: 'conversacion',
      sugerencias: ['¿Cómo funciona el Trato Seguro?', 'Ver oficios cercanos', 'Ver en el mapa'],
    }
  }

  // 4. Registro de nuevo negocio / Crear perfil
  if (
    texto.includes('crear perfil') ||
    texto.includes('crear negocio') ||
    texto.includes('cómo me registro') ||
    texto.includes('como me registro') ||
    texto.includes('registrar mi negocio') ||
    texto.includes('cómo publicar') ||
    texto.includes('como publicar')
  ) {
    return {
      mensaje: `¡Publicar tu oficio es 100% gratuito y toma menos de 2 minutos! Así tus vecinos podrán encontrarte en el mapa y pedirte servicios por WhatsApp sin comisiones ni intermediarios.`,
      tipo: 'navegacion',
      rutaNavegacion: '/registro?tipo=business',
      sugerencias: ['¿Qué necesito para registrarme?', '🎙️ Dictar mi servicio para el catálogo', '¿Qué es el facilitador?'],
    }
  }

  // 5. ¿Qué necesito para registrarme?
  if (texto.includes('qué necesito') || texto.includes('que necesito') || texto.includes('requisitos')) {
    return {
      mensaje: `Para publicar tu oficio solo necesitas:\n• El nombre de tu taller u oficio.\n• Tu número de WhatsApp de contacto.\n• Tu barrio en la comuna (o dirección aproximada).\n• Si tienes fotos de tus trabajos, ¡mucho mejor! Y si no sabes cómo subirlas, un Facilitador Comunitario te apoya en persona.`,
      tipo: 'conversacion',
      sugerencias: ['Crear negocio para publicar', '¿Qué es el facilitador?', 'Ver en el mapa'],
    }
  }

  // 6. Petición para aprender a dictar o iniciar el dictado (NO crea servicio falso)
  const esPeticionDictado =
    texto.includes('dictar mi servicio') ||
    texto.includes('cómo dicto') ||
    texto.includes('como dicto') ||
    texto.includes('quiero dictar') ||
    texto.includes('dictar un servicio') ||
    texto.includes('dictar servicio')

  if (esPeticionDictado) {
    return {
      mensaje: `¡Listo vecino! Estoy listo para escucharte. Puedes tocar el botón del micrófono 🎙️ que está aquí abajo o escribirme en una sola frase qué haces y cuánto cobras.\n\nPor ejemplo:\n• "Hago confección de vestidos y arreglos de costura a 25 mil pesos"\n• "Cambio guardas, chapas y candados a domicilio a 30 mil"\n• "Corte de cabello para caballero y barbería a 18 mil"\n\n¿Qué oficio o servicio quieres registrar hoy?`,
      tipo: 'conversacion',
      sugerencias: [
        'Hago arreglos de ropa a $15.000',
        'Cambio cerraduras a $30.000',
        'Corte de cabello a $18.000',
      ],
    }
  }

  // 7. Intención de cambiar el precio
  const esPeticionCambiarPrecio =
    texto === 'cambiar el precio' ||
    texto.includes('cambiar el precio') ||
    texto.includes('cambiar precio') ||
    texto.includes('modificar precio') ||
    texto.includes('ajustar precio') ||
    texto.includes('otro precio') ||
    texto.includes('cambiar valor')

  if (esPeticionCambiarPrecio) {
    return {
      mensaje: `¿A qué valor deseas cambiar el precio de tu servicio? Dime el nuevo monto (por ejemplo: "30 mil pesos") o toca uno de los valores rápidos:`,
      tipo: 'conversacion',
      sugerencias: ['$15.000', '$20.000', '$30.000', '$40.000'],
    }
  }

  // 8. Respuesta con un nuevo monto tras pedir cambio de precio
  const precioSoloMatch = texto.match(/\b(\d{1,3}(?:\.\d{3})*|\d+)\s*(?:mil|pesos|\$)?\b/)
  const contextoPrevioPidePrecio =
    ultimoMensajeBot.includes('precio') ||
    ultimoMensajeBot.includes('monto') ||
    ultimoMensajeBot.includes('valor') ||
    ultimoMensajeBot.includes('servicio identificado')

  if (precioSoloMatch && contextoPrevioPidePrecio && !texto.includes('vendo') && !texto.includes('hago')) {
    const num = parseInt(precioSoloMatch[1].replace(/\./g, ''), 10)
    const nuevoPrecio = num < 1000 ? num * 1000 : num

    return {
      mensaje: `¡Precio actualizado a $${nuevoPrecio.toLocaleString('es-CO')} COP! He guardado este cambio en la ficha. Cuando quieras puedes guardarlo en tu catálogo:`,
      tipo: 'servicio_catalogo',
      servicio: {
        titulo: 'Servicio de oficio comunal',
        descripcion: 'Tarifa ajustada según solicitud',
        precioSugerido: nuevoPrecio,
        categoria: 'costura',
      },
      sugerencias: ['Guardar en mi catálogo', 'Cambiar el precio', '¿Cómo funciona el anticipo?'],
    }
  }

  // 9. Guardar en catálogo
  const esPeticionGuardar =
    texto === 'guardar en mi catálogo' ||
    texto === 'guardar en mi catalogo' ||
    texto.includes('cómo guardo') ||
    texto.includes('como guardo') ||
    texto.includes('publicar en catálogo')

  if (esPeticionGuardar) {
    return {
      mensaje: `Para publicar este servicio en la plataforma:\n1. Si ya tienes tu cuenta de negocio, solo toca el botón verde "Guardar directamente en mi catálogo" en la tarjeta superior y se registrará al instante.\n2. Si aún no te has registrado como emprendedor, toca el botón para crear tu perfil gratis en 1 minuto. Así tu taller quedará visible para todos los vecinos.`,
      tipo: 'conversacion',
      sugerencias: ['Crear negocio para publicar', 'Ver oficios cercanos', '¿Cómo funciona el Trato Seguro?'],
    }
  }

  // 10. Trato Seguro / Anticipo
  if (
    texto.includes('trato seguro') ||
    texto.includes('anticipo') ||
    texto.includes('garantia') ||
    texto.includes('garantía') ||
    texto.includes('50%')
  ) {
    return {
      mensaje: `¡Hola vecino! El Trato Seguro Comunal es el pacto de confianza de nuestro barrio:\n1. Ningún anticipo para compra de materiales puede superar el 50% del total acordado.\n2. Todo queda registrado por escrito con código de verificación oficial.\n3. Si surge algún desacuerdo, cuentas con mediación vecinal comunitaria antes de cualquier conflicto.`,
      tipo: 'conversacion',
      sugerencias: ['¿Cómo pedir un servicio?', '¿Qué pasa si hay un desacuerdo?', 'Ver en el mapa'],
    }
  }

  // 11. Desacuerdos / Mediación
  if (
    texto.includes('desacuerdo') ||
    texto.includes('problema') ||
    texto.includes('mediación') ||
    texto.includes('mediacion')
  ) {
    return {
      mensaje: `Si surge algún inconveniente o retraso con un trabajo, ConectaComuna promueve la mediación comunitaria a través de los líderes de la Junta de Acción Comunal (JAC) y los facilitadores del barrio, buscando siempre un acuerdo amistoso y justo.`,
      tipo: 'conversacion',
      sugerencias: ['¿Cómo funciona el Trato Seguro?', '¿Qué es el facilitador?', 'Ver oficios cercanos'],
    }
  }

  // 12. Facilitador Comunitario
  if (
    texto.includes('facilitador') ||
    texto.includes('apadrinar') ||
    texto.includes('nieto') ||
    texto.includes('ayuda digital') ||
    texto.includes('adulto mayor')
  ) {
    return {
      mensaje: `El Facilitador Comunitario es un familiar o vecino joven de confianza que apoya a los adultos mayores o artesanos a gestionar su catálogo y fotos. En el panel de negocio encuentras un código de 6 letras para vincularlo de inmediato.`,
      tipo: 'conversacion',
      sugerencias: ['Crear negocio para publicar', '¿Cómo funciona el Trato Seguro?', 'Ver oficios cercanos'],
    }
  }

  // 13. Dictado real de un oficio
  const contieneAccionOficio =
    texto.includes('vendo') ||
    texto.includes('hago') ||
    texto.includes('ofrezco') ||
    texto.includes('cobro') ||
    texto.includes('arreglo') ||
    texto.includes('reparo') ||
    texto.includes('confecciono') ||
    texto.includes('cambio chapas') ||
    texto.includes('corte de')

  const contieneOficioOMonto =
    texto.includes('vestido') ||
    texto.includes('pantalon') ||
    texto.includes('ropa') ||
    texto.includes('chapa') ||
    texto.includes('llave') ||
    texto.includes('celular') ||
    texto.includes('corte') ||
    texto.includes('comida') ||
    texto.includes('pesos') ||
    texto.includes('mil') ||
    texto.includes('$')

  if (contieneAccionOficio && contieneOficioOMonto && !esPeticionDictado) {
    let precio = 20000
    if (precioSoloMatch) {
      const num = parseInt(precioSoloMatch[1].replace(/\./g, ''), 10)
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
    } else if (texto.includes('chapa') || texto.includes('llave') || texto.includes('candado') || texto.includes('cerradura')) {
      categoria = 'cerrajeria'
      titulo = 'Servicio de cerrajería y aperturas'
    } else if (texto.includes('celular') || texto.includes('pantalla') || texto.includes('computador') || texto.includes('tecnolog')) {
      categoria = 'tecnologia'
      titulo = 'Mantenimiento y arreglo técnico'
    } else if (texto.includes('barber') || texto.includes('corte') || texto.includes('unas') || texto.includes('uñas') || texto.includes('manicure')) {
      categoria = 'belleza'
      titulo = 'Cuidado personal y estética barrial'
    } else if (texto.includes('comida') || texto.includes('almuerzo') || texto.includes('empanada')) {
      categoria = 'comida'
      titulo = 'Preparación de alimentos caseros'
    }

    return {
      mensaje: `¡Qué buen oficio! He estructurado tu servicio para los vecinos de ${descUbi.enBarrio}. Revisa los datos y puedes guardarlo en tu catálogo con un solo toque:`,
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

  // 14. Saludo o mensaje general de orientación
  return {
    mensaje: `¡Hola vecino! Soy tu Asistente Comunal para ${descUbi.enBarrio}. Estoy aquí para ayudarte a:\n• 📍 Encontrar oficios de confianza cerca de tu ubicación actual.\n• 🎙️ Dictar y publicar tus servicios con la voz para tu catálogo.\n• 🛡️ Explicarte el Trato Seguro y las garantías vecinales.\n\n¿En qué te colaboro hoy?`,
    tipo: 'conversacion',
    sugerencias: ['Oficios cerca de mí', '🎙️ Dictar mi servicio para el catálogo', 'Ver en el mapa'],
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
    return generarRespuestaLocal(mensaje, barrio, historial)
  }
}
