import { apiFetch } from '@/lib/apiClient'
import { leerUbicacion } from '@/lib/ubicacion'
import type { ContextoUsuarioCopiloto, MensajeChat, RespuestaAi } from '@/types/ai'

const BARRIO_POR_DEFECTO = 'Antonio Nariño'
const COORDENADAS_POR_DEFECTO = { lat: 3.4372, lng: -76.5225 }

/**
 * Traduce la etiqueta de ubicación para que suene 100% natural y humana.
 */
export function describirUbicacion(barrio: string) {
  const esGenerica =
    !barrio ||
    barrio.toLowerCase().includes('mi ubicación') ||
    barrio.toLowerCase().includes('mi ubicacion') ||
    barrio.toLowerCase().includes('actual')

  if (esGenerica) {
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
 * Replica la máquina de estados, el contexto del usuario y las reglas lógicas.
 */
function generarRespuestaLocal(
  mensaje: string,
  barrio: string,
  historial: MensajeChat[] = [],
  contexto?: ContextoUsuarioCopiloto
): RespuestaAi {
  const texto = mensaje.toLowerCase().trim()
  const descUbi = describirUbicacion(barrio)

  const mensajesBot = historial.filter((m) => m.emisor === 'asistente')
  const ultimoMensajeBot = mensajesBot.length > 0 ? mensajesBot[mensajesBot.length - 1].texto.toLowerCase() : ''

  const esAutenticado = !!contexto?.autenticado
  const tipoCuenta = contexto?.tipoCuenta || (esAutenticado ? 'client' : 'anonimo')
  const esCliente = tipoCuenta === 'client'
  const esEmprendedor = tipoCuenta === 'business' || contexto?.rolActivo === 'business'
  const tieneNegocio = !!contexto?.negocioPropio?.tieneNegocio
  const nombreUsuario = contexto?.nombre ? contexto.nombre.split(' ')[0] : 'vecino'
  const nombreNegocio = contexto?.negocioPropio?.nombre || 'tu negocio'

  // 1. Confirmación explícita para activar negocio
  if (
    texto === 'sí, activar mi negocio' ||
    texto === 'si, activar mi negocio' ||
    texto === 'activar mi negocio' ||
    texto === 'confirmar activar negocio'
  ) {
    return {
      mensaje: `¡Excelente decisión, ${nombreUsuario}! He preparado la activación de tu perfil de Emprendedor. Toca el botón para completar los datos de tu taller (nombre, categoría y fotos):`,
      tipo: 'navegacion',
      rutaNavegacion: '/panel/negocio',
      sugerencias: ['🎙️ Dictar mi servicio para el catálogo', 'Ver en el mapa'],
    }
  }

  // 2. Declinación de activación
  if (
    texto === 'no por ahora' ||
    texto === 'no, mantener como cliente' ||
    texto === 'cancelar activación'
  ) {
    return {
      mensaje: `Entendido, ${nombreUsuario}. Tu cuenta continúa en rol de Cliente para buscar, consultar y contactar los mejores oficios de la comuna. ¿En qué te colaboro hoy?`,
      tipo: 'conversacion',
      sugerencias: ['Oficios cerca de mí', 'Ver en el mapa', '¿Cómo funciona el Trato Seguro?'],
    }
  }

  // 3. Navegación al mapa comunal
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

  // 4. Navegación a explorar oficios / buscar otro oficio
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

  // 5. ¿Cómo pedir un servicio?
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

  // 6. Registro de nuevo negocio / Crear perfil (Con puerta lógica de confirmación)
  if (
    texto.includes('crear perfil') ||
    texto.includes('crear negocio') ||
    texto.includes('cómo me registro') ||
    texto.includes('como me registro') ||
    texto.includes('registrar mi negocio') ||
    texto.includes('cómo publicar') ||
    texto.includes('como publicar') ||
    texto.includes('publicar mi servicio') ||
    texto.includes('publicar servicio') ||
    texto.includes('quiero vender') ||
    texto.includes('quiero ofrecer')
  ) {
    // Si ya tiene negocio
    if (esAutenticado && tieneNegocio) {
      return {
        mensaje: `¡Hola ${nombreUsuario}! Ya tienes registrado tu taller "${nombreNegocio}". Puedes dictarme un nuevo servicio para agregarlo a tu catálogo o ir a tu panel para editar tus datos:`,
        tipo: 'conversacion',
        sugerencias: ['🎙️ Dictar mi servicio para el catálogo', 'Ir al panel de mi negocio', 'Ver en el mapa'],
      }
    }

    // Si ya tiene rol de emprendedor pero no ha completado ficha
    if (esAutenticado && esEmprendedor && !tieneNegocio) {
      return {
        mensaje: `¡Hola ${nombreUsuario}! Tu cuenta ya está en modo Emprendedor. Solo te falta completar la ficha de tu taller (nombre, oficio y contacto) para que aparezcas en el directorio comunal.`,
        tipo: 'navegacion',
        rutaNavegacion: '/panel/negocio',
        sugerencias: ['Completar ficha de mi taller', '🎙️ Dictar mi servicio para el catálogo'],
      }
    }

    // Si es CLIENTE: ¡Confirmación explícita antes de cualquier cambio!
    if (esAutenticado && esCliente) {
      return {
        mensaje: `Hola ${nombreUsuario}, actualmente tu cuenta está registrada como **Cliente**. Para publicar tus servicios y tener tu taller visible en el mapa barrial, activaremos tu perfil como **Emprendedor** (podrás seguir pidiendo servicios a otros vecinos normalmente).\n\n¿Deseas activar tu perfil de negocio ahora?`,
        tipo: 'confirmacion_accion',
        accionPendiente: {
          tipo: 'activar_negocio',
          titulo: 'Activar perfil de Emprendedor',
          descripcion: 'Permite publicar tu oficio, definir tarifas y recibir pedidos de la comuna.',
          botonConfirmar: '✅ Sí, activar mi negocio',
          botonCancelar: '❌ No por ahora',
        },
        sugerencias: ['✅ Sí, activar mi negocio', '❌ No por ahora'],
      }
    }

    // Usuario anónimo / sin sesión
    return {
      mensaje: `¡Publicar tu oficio es 100% gratuito y toma menos de 2 minutos! Como aún no has iniciado sesión en ConectaComuna, toca el botón para crear tu cuenta vecinal:`,
      tipo: 'navegacion',
      rutaNavegacion: '/registro?tipo=business',
      sugerencias: ['¿Qué necesito para registrarme?', '¿Qué es el facilitador?', 'Ver en el mapa'],
    }
  }

  // 7. Navegación al panel del negocio
  if (
    texto === 'ir al panel de mi negocio' ||
    texto === 'ver mi panel de negocio' ||
    texto === 'mi panel' ||
    texto === 'ver mi negocio'
  ) {
    return {
      mensaje: `¡Con gusto, ${nombreUsuario}! Aquí puedes gestionar tus pedidos, ver tus calificaciones, vincular a tu facilitador y editar la información de tu taller:`,
      tipo: 'navegacion',
      rutaNavegacion: '/panel',
      sugerencias: ['🎙️ Dictar mi servicio para el catálogo', 'Ver en el mapa', '¿Cómo funciona el Trato Seguro?'],
    }
  }

  // 8. ¿Qué necesito para registrarme?
  if (texto.includes('qué necesito') || texto.includes('que necesito') || texto.includes('requisitos')) {
    return {
      mensaje: `Para publicar tu oficio solo necesitas:\n• El nombre de tu taller u oficio.\n• Tu número de WhatsApp de contacto.\n• Tu barrio en la comuna (o dirección aproximada).\n• Si tienes fotos de tus trabajos, ¡mucho mejor! Y si no sabes cómo subirlas, un Facilitador Comunitario te apoya en persona.`,
      tipo: 'conversacion',
      sugerencias: ['Crear negocio para publicar', '¿Qué es el facilitador?', 'Ver en el mapa'],
    }
  }

  // 9. Petición para aprender a dictar o iniciar el dictado (NO crea servicio falso)
  const esPeticionDictado =
    texto.includes('dictar mi servicio') ||
    texto.includes('cómo dicto') ||
    texto.includes('como dicto') ||
    texto.includes('quiero dictar') ||
    texto.includes('dictar un servicio') ||
    texto.includes('dictar servicio')

  if (esPeticionDictado) {
    return {
      mensaje: `¡Listo ${nombreUsuario}! Estoy listo para escucharte. Puedes tocar el botón del micrófono 🎙️ que está aquí abajo o escribirme en una sola frase qué haces y cuánto cobras.\n\nPor ejemplo:\n• "Hago confección de vestidos y arreglos de costura a 25 mil pesos"\n• "Cambio guardas, chapas y candados a domicilio a 30 mil"\n• "Corte de cabello para caballero y barbería a 18 mil"\n\n¿Qué oficio o servicio quieres registrar hoy?`,
      tipo: 'conversacion',
      sugerencias: [
        'Hago arreglos de ropa a $15.000',
        'Cambio cerraduras a $30.000',
        'Corte de cabello a $18.000',
      ],
    }
  }

  // 10. Intención de cambiar el precio
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

  // 11. Respuesta con un nuevo monto tras pedir cambio de precio
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

  // 12. Guardar en catálogo
  const esPeticionGuardar =
    texto === 'guardar en mi catálogo' ||
    texto === 'guardar en mi catalogo' ||
    texto.includes('cómo guardo') ||
    texto.includes('como guardo') ||
    texto.includes('guardar en catalogo') ||
    texto.includes('guardar en catálogo')

  if (esPeticionGuardar) {
    if (esAutenticado && tieneNegocio) {
      return {
        mensaje: `Para publicar este servicio en tu negocio "${nombreNegocio}", solo toca el botón "Confirmar y guardar en mi catálogo" que aparece en la tarjeta del servicio y quedará registrado al instante.`,
        tipo: 'conversacion',
        sugerencias: ['Cambiar el precio', 'Ver mi panel de negocio', 'Ver en el mapa'],
      }
    }

    if (esAutenticado && esCliente) {
      return {
        mensaje: `Para poder publicar este servicio, primero debemos activar tu perfil de Emprendedor. ¿Deseas activarlo ahora?`,
        tipo: 'confirmacion_accion',
        accionPendiente: {
          tipo: 'activar_negocio',
          titulo: 'Activar perfil de Emprendedor',
          descripcion: 'Permite registrar tu taller y guardar servicios en tu catálogo comunal.',
          botonConfirmar: '✅ Sí, activar mi negocio',
          botonCancelar: '❌ No por ahora',
        },
        sugerencias: ['✅ Sí, activar mi negocio', '❌ No por ahora'],
      }
    }

    return {
      mensaje: `Para publicar este servicio en la plataforma, primero crea tu cuenta vecinal gratuita en 1 minuto. Así tu taller quedará visible para todos los vecinos.`,
      tipo: 'navegacion',
      rutaNavegacion: '/registro?tipo=business',
      sugerencias: ['Crear negocio para publicar', 'Ver oficios cercanos', '¿Cómo funciona el Trato Seguro?'],
    }
  }

  // 13. Trato Seguro / Anticipo con validación lógica del 50%
  if (
    texto.includes('trato seguro') ||
    texto.includes('anticipo') ||
    texto.includes('garantia') ||
    texto.includes('garantía') ||
    texto.includes('50%')
  ) {
    const matchPorcentaje = texto.match(/(\d{2,3})\s*%/)
    if (matchPorcentaje && parseInt(matchPorcentaje[1], 10) > 50) {
      const pct = matchPorcentaje[1]
      return {
        mensaje: `Vecino, por las reglas de Trato Seguro Comunal, ningún anticipo para compra de repuestos o materiales puede superar el 50% (pediste un ${pct}%). Este límite protege tu dinero y garantiza el cumplimiento del artesano.\n\n¿Deseas que preparemos el acuerdo con el 50% máximo permitido?`,
        tipo: 'conversacion',
        sugerencias: ['Sí, con el 50%', '¿Cómo funciona el Trato Seguro?', 'Ver oficios cercanos'],
      }
    }

    return {
      mensaje: `¡Hola vecino! El Trato Seguro Comunal es el pacto de confianza de nuestro barrio:\n1. Ningún anticipo para compra de materiales puede superar el 50% del total acordado.\n2. Todo queda registrado por escrito con código de verificación oficial.\n3. Si surge algún desacuerdo, cuentas con mediación vecinal comunitaria antes de cualquier conflicto.`,
      tipo: 'conversacion',
      sugerencias: ['¿Cómo pedir un servicio?', '¿Qué pasa si hay un desacuerdo?', 'Ver en el mapa'],
    }
  }

  // 14. Desacuerdos / Mediación
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

  // 15. Facilitador Comunitario
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

  // 16. Dictado real de un oficio
  const contieneAccionOficio =
    texto.includes('vendo') ||
    texto.includes('hago') ||
    texto.includes('ofrezco') ||
    texto.includes('arreglo') ||
    texto.includes('reparo') ||
    texto.includes('confeccion') ||
    texto.includes('corte') ||
    texto.includes('cambio') ||
    texto.includes('servicio de') ||
    texto.includes('mantenimiento') ||
    texto.includes('lavado') ||
    texto.includes('domicilio')

  const tienePrecio = /\b\d{1,3}(?:\.\d{3})*\b|\b\d+\s*(?:mil|pesos)\b/.test(texto)

  if (contieneAccionOficio && tienePrecio) {
    const match = texto.match(/\b(\d{1,3}(?:\.\d{3})*|\d+)\s*(?:mil|pesos|\$)?\b/)
    let precio = 20000
    if (match) {
      const num = parseInt(match[1].replace(/\./g, ''), 10)
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

    if (esAutenticado && tieneNegocio) {
      return {
        mensaje: `¡Qué buen oficio! He estructurado este servicio para tu negocio "${nombreNegocio}". Revisa los datos y puedes guardarlo de verdad en tu catálogo con un toque:`,
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

    if (esAutenticado && esCliente) {
      return {
        mensaje: `¡Excelente servicio, ${nombreUsuario}! He estructurado tu tarifa a $${precio.toLocaleString('es-CO')} COP. Para poder publicarlo en el catálogo vecinal, primero debemos activar tu perfil de Emprendedor. ¿Deseas activarlo ahora?`,
        tipo: 'confirmacion_accion',
        accionPendiente: {
          tipo: 'activar_negocio',
          titulo: 'Activar perfil de Emprendedor',
          descripcion: `Para publicar "${titulo}" en el directorio comunal.`,
          botonConfirmar: '✅ Sí, activar mi negocio',
          botonCancelar: '❌ No por ahora',
        },
        sugerencias: ['✅ Sí, activar mi negocio', '❌ No por ahora'],
      }
    }

    return {
      mensaje: `¡Qué buen oficio! He estructurado tu servicio para los vecinos de ${descUbi.enBarrio}. Revisa los datos y puedes guardarlo en tu catálogo creando tu negocio:`,
      tipo: 'servicio_catalogo',
      servicio: {
        titulo,
        descripcion: mensaje,
        precioSugerido: precio,
        categoria,
      },
      sugerencias: ['Crear negocio para publicar', 'Cambiar el precio', '¿Cómo funciona el anticipo?'],
    }
  }

  // 17. Saludo o mensaje general de orientación
  return {
    mensaje: `¡Hola ${nombreUsuario}! Soy tu Asistente Comunal para ${descUbi.enBarrio}. Estoy aquí para ayudarte a:\n• 📍 Encontrar oficios de confianza cerca de tu ubicación actual.\n• 🎙️ Dictar y publicar tus servicios con la voz para tu catálogo.\n• 🛡️ Explicarte el Trato Seguro y las garantías vecinales.\n\n¿En qué te colaboro hoy?`,
    tipo: 'conversacion',
    sugerencias: ['Oficios cerca de mí', '🎙️ Dictar mi servicio para el catálogo', 'Ver en el mapa'],
  }
}

/**
 * Envía un mensaje al Asistente Comunal con contexto completo del usuario y de la pantalla.
 */
export async function enviarMensajeAsistente(
  mensaje: string,
  historial: MensajeChat[] = [],
  contexto?: ContextoUsuarioCopiloto
): Promise<RespuestaAi> {
  const ubicacionElegida = leerUbicacion()
  const barrio = contexto?.ubicacion?.barrio || ubicacionElegida?.etiqueta || BARRIO_POR_DEFECTO
  const lat = contexto?.ubicacion?.lat || ubicacionElegida?.center.lat || COORDENADAS_POR_DEFECTO.lat
  const lng = contexto?.ubicacion?.lng || ubicacionElegida?.center.lng || COORDENADAS_POR_DEFECTO.lng

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
        contexto,
      }),
    })

    return respuesta
  } catch (error) {
    console.warn('Backend de IA no disponible, empleando motor local de respaldo:', error)
    return generarRespuestaLocal(mensaje, barrio, historial, contexto)
  }
}
