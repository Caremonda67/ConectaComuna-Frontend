import { apiFetch } from '@/lib/apiClient'
import { leerUbicacion } from '@/lib/ubicacion'
import { resolverLugar } from '@/lib/lugares'
import type { UbicacionGeocodificada } from '@/services/direccionService'
import type { ContextoUsuarioCopiloto, MensajeChat, RespuestaAi } from '@/types/ai'

/**
 * ¿El usuario está diciendo dónde está, o solo mencionó un barrio de paso?
 * Sin esta distinción, escribir "mi prima vive en El Rodeo" bastaba para
 * reubicar a alguien que está en Bogotá.
 */
export function declaraSuUbicacion(texto?: string): boolean {
  if (!texto) return false
  return /\b(estoy|vivo|vivimos|resido|me encuentro|mi barrio|soy de|aquí en|aca en|acá en)\b/i.test(texto)
}

// Ojo con los artículos: quitar un "el" suelto convierte "El Rodeo" en
// "Rodeo", que el geocodificador resuelve en otra ciudad. Solo se recortan
// los encabezados que no forman parte del nombre.
const DECLARACION =
  /\b(?:estoy|vivo|vivimos|resido|me encuentro|soy)\s+(?:en|de)\s+(?:el\s+barrio\s+|la\s+localidad\s+|el\s+municipio\s+(?:de\s+)?)?(.+)$|\bmi\s+barrio\s+es\s+(.+)$/i

/**
 * Saca el lugar de una frase como "estoy en Chapinero, Bogotá" y lo busca en
 * el geocodificador. El diccionario de barrios solo cubre Cali, así que sin
 * esto quien se conecta desde otra ciudad no tiene forma de decir dónde está.
 */
export async function resolverUbicacionDeclarada(
  texto: string,
): Promise<UbicacionGeocodificada | null> {
  const coincidencia = DECLARACION.exec(texto.trim())
  const lugar = (coincidencia?.[1] ?? coincidencia?.[2] ?? '')
    .replace(/[.?!¿¡]+$/, '')
    .trim()
  if (!lugar) return null
  return resolverLugar(lugar)
}

/**
 * Traduce la etiqueta de ubicación para que suene 100% natural y humana.
 */
export function describirUbicacion(barrio?: string | null, esDefinida = true) {
  if (
    !esDefinida ||
    !barrio ||
    barrio === 'Comuna' ||
    barrio.toLowerCase().includes('mi ubicación') ||
    barrio.toLowerCase().includes('mi ubicacion')
  ) {
    return {
      cercaDe: 'en la zona',
      enBarrio: 'tu zona',
      etiquetaCorta: 'Comuna',
      esDefinida: false,
    }
  }

  const b = barrio.trim()
  const limpio = b.replace(/^barrio\s+/i, '')

  // Si es un punto en el mapa o coordenadas
  if (/^punto\s+/i.test(limpio) || /^\(?-?\d+\.\d+/.test(limpio)) {
    return {
      cercaDe: 'cerca de este punto',
      enBarrio: 'el punto marcado',
      etiquetaCorta: 'Punto en el mapa',
      esDefinida: true,
    }
  }

  // Si tiene ciudad o coma (ej: "Quinta Paredes, Bogotá", "Junín, Cali", "El Poblado, Medellín")
  if (limpio.includes(',')) {
    return {
      cercaDe: `cerca de ${limpio}`,
      enBarrio: limpio,
      etiquetaCorta: limpio,
      esDefinida: true,
    }
  }

  // Si es un barrio tradicional
  return {
    cercaDe: `cerca del barrio ${limpio}`,
    enBarrio: `el barrio ${limpio}`,
    etiquetaCorta: limpio,
    esDefinida: true,
  }
}

/**
 * Respaldo local inteligente en el navegador si no hay conexión al backend.
 * Replica la máquina de estados, el contexto del usuario y las reglas lógicas.
 */
function generarRespuestaLocal(
  mensaje: string,
  barrioParam?: string | null,
  historial: MensajeChat[] = [],
  contexto?: ContextoUsuarioCopiloto
): RespuestaAi {
  const texto = mensaje.toLowerCase().trim()
  const tieneUbicacionExplicita = !!(
    (contexto?.ubicacion?.esDefinida && contexto?.ubicacion?.barrio && contexto.ubicacion.barrio !== 'Comuna') ||
    (barrioParam && barrioParam !== 'Comuna')
  )

  const barrio = tieneUbicacionExplicita ? (barrioParam || contexto?.ubicacion?.barrio || null) : null
  const descUbi = describirUbicacion(barrio, tieneUbicacionExplicita)

  // 0b. Pregunta por cercanía ("cuál es el comercio más cercano") cuando la ubicación aún no está definida
  const esPreguntaCercania =
    texto.includes('más cercano') ||
    texto.includes('mas cercano') ||
    texto.includes('cerca de mí') ||
    texto.includes('cerca de mi') ||
    texto.includes('más cerca') ||
    texto.includes('mas cerca') ||
    texto === 'oficios cerca' ||
    texto === 'oficios cercanos' ||
    texto.includes('comercio más cercano') ||
    texto.includes('comercio mas cercano')

  if (esPreguntaCercania && !tieneUbicacionExplicita) {
    return {
      mensaje: `Vecino, aún no conozco tu barrio o ubicación exacta en la comuna para calcularte distancias precisas. Puedes activar tu ubicación con el botón de GPS o indicarme en qué barrio te encuentras (por ejemplo: Antonio Nariño, El Rodeo, Nueva Floresta, Vallado).\n\nMientras tanto, aquí tienes algunos oficios y talleres destacados de la comuna:`,
      tipo: 'negocios',
      negociosSugeridos: [
        {
          id: 'biz-1',
          nombre: 'Uñas de Kelly',
          categoria: 'manicure',
          barrio: 'El Rodeo',
          whatsapp: '3145558899',
          distanciaMetros: null,
          verificado: false,
        },
        {
          id: 'biz-2',
          nombre: 'Costuras Doña Marta',
          categoria: 'costura',
          barrio: 'Antonio Nariño',
          whatsapp: '3009876543',
          distanciaMetros: null,
          verificado: true,
        },
        {
          id: 'biz-3',
          nombre: 'TecnoFix Celulares',
          categoria: 'tecnologia',
          barrio: 'Nueva Floresta',
          whatsapp: '3129990011',
          distanciaMetros: null,
          verificado: false,
        },
      ],
      sugerencias: [
        '📍 Usar mi ubicación actual',
        'Estoy en El Rodeo',
        'Estoy en Antonio Nariño',
        'Estoy en Nueva Floresta',
      ],
    }
  }

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

  // 2b. Detección directa de código oficial de Trato Seguro (ej: CC-93E416, CC-ORD-1)
  const matchCodigo = texto.match(/\b(CC-[A-Z0-9]{4,10})\b/i)
  if (matchCodigo) {
    const cod = matchCodigo[1].toUpperCase()
    const pedidoRelacionado = (contexto?.pedidosActivos || []).find(
      (p) => p.codigo.toUpperCase() === cod || (p.id && p.id.toUpperCase().startsWith(cod.replace('CC-', '')))
    )

    let detalle = `¡He ubicado el acuerdo ${cod} en el registro comunal!`
    if (pedidoRelacionado) {
      const est =
        pedidoRelacionado.estado === 'pending'
          ? 'Pendiente de inicio'
          : pedidoRelacionado.estado === 'accepted'
          ? 'Pacto aceptado por el taller'
          : pedidoRelacionado.estado === 'in_progress'
          ? 'Trabajo en ejecución'
          : pedidoRelacionado.estado === 'completed'
          ? 'Finalizado y entregado'
          : pedidoRelacionado.estado
      const contra = pedidoRelacionado.rol === 'comerciante' ? `Cliente: ${pedidoRelacionado.contraparte}` : `Taller: ${pedidoRelacionado.contraparte}`
      detalle += `\n• Trabajo: ${pedidoRelacionado.titulo}\n• ${contra}\n• Estado: ${est}\n• Valor: $ ${Number(pedidoRelacionado.monto).toLocaleString('es-CO')} COP`
    }

    return {
      mensaje: `${detalle}\n\nToca el botón para consultar el comprobante oficial con código QR y verificación en tiempo real:`,
      tipo: 'navegacion',
      rutaNavegacion: `/trato-seguro/verificar/${cod}`,
      sugerencias: ['¿Cómo funciona el Trato Seguro?', 'Ver mis pedidos activos', 'Ver oficios cercanos'],
    }
  }

  // 2c. Consulta de pedidos o acuerdos del usuario ("mis pedidos", "cómo va mi pedido", etc.)
  const esConsultaMisPedidos =
    texto.includes('mis pedidos') ||
    texto.includes('mi pedido') ||
    texto.includes('mis acuerdos') ||
    texto.includes('mis tratos') ||
    texto.includes('mis pactos') ||
    texto.includes('cómo va mi') ||
    texto.includes('como va mi') ||
    texto.includes('estado de mi') ||
    texto.includes('trabajos en curso')

  if (esConsultaMisPedidos) {
    if (!esAutenticado) {
      return {
        mensaje: `Para consultar el estado de tus pedidos y acuerdos de Trato Seguro, por favor ingresa a tu cuenta vecinal:`,
        tipo: 'navegacion',
        rutaNavegacion: '/entrar',
        sugerencias: ['Ingresar a mi cuenta', '¿Cómo funciona el Trato Seguro?', 'Ver oficios cercanos'],
      }
    }

    const pedidos = Array.isArray(contexto?.pedidosActivos) ? contexto.pedidosActivos : []
    if (pedidos.length > 0) {
      const primerPedido = pedidos[0]
      const detallePedidos = pedidos
        .map((p, idx) => {
          const est =
            p.estado === 'pending'
              ? 'Pendiente de inicio'
              : p.estado === 'accepted'
              ? 'Aceptado por el taller'
              : p.estado === 'in_progress'
              ? 'En curso'
              : p.estado === 'completed'
              ? 'Finalizado'
              : p.estado
          const contra = p.rol === 'comerciante' ? `Cliente: ${p.contraparte}` : `Taller: ${p.contraparte}`
          return `${idx + 1}. #${p.codigo} — "${p.titulo}" (${contra}) • Estado: ${est} • Valor: $ ${Number(p.monto).toLocaleString('es-CO')} COP`
        })
        .join('\n')

      return {
        mensaje: `¡Hola ${nombreUsuario}! Tienes ${pedidos.length} acuerdo(s) en la comuna:\n\n${detallePedidos}\n\nPuedes consultar el comprobante oficial con código QR o ir a tu panel:`,
        tipo: 'navegacion',
        rutaNavegacion: `/trato-seguro/verificar/${primerPedido.codigo}`,
        sugerencias: [
          `Verificar ${primerPedido.codigo}`,
          esEmprendedor ? 'Ir al panel de mi negocio' : 'Ver mis pedidos en el panel',
          '¿Cómo funciona el Trato Seguro?',
        ],
      }
    }

    return {
      mensaje: `Vecino ${nombreUsuario}, en este momento no tienes pedidos ni pactos activos registrados. Cuando solicites un servicio a un taller del barrio o recibas un encargo, aparecerá aquí con código verificable y tope de anticipo protegido.`,
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

  // 13. Trato Seguro / Anticipo con validación lógica del 50% y generación de acuerdos
  if (
    texto.includes('trato seguro') ||
    texto.includes('anticipo') ||
    texto.includes('garantia') ||
    texto.includes('garantía') ||
    texto.includes('50%') ||
    texto.includes('pactar') ||
    texto.includes('acuerdo') ||
    texto.includes('comprobante')
  ) {
    if (texto.includes('verificar') || texto.includes('código') || texto.includes('codigo')) {
      return {
        mensaje: `Puedes verificar la autenticidad de cualquier acuerdo vecinal escaneando su código QR o buscando su código oficial (por ejemplo CC-ORD-1). Aquí puedes consultar el comprobante en tiempo real:`,
        tipo: 'navegacion',
        rutaNavegacion: '/trato-seguro/verificar',
        sugerencias: ['Verificar CC-ORD-1', '¿Cómo funciona el Trato Seguro?', 'Ver oficios cercanos'],
      }
    }

    if (texto.includes('pactar') || texto.includes('hacer acuerdo') || texto.includes('crear acuerdo')) {
      const precioBase = 45000
      const anticipoMax = 22500
      return {
        mensaje: `¡Excelente iniciativa, ${nombreUsuario}! He estructurado la ficha de Pacto de Trato Seguro. Cumple con la regla comunal: máximo 50% de anticipo para materiales y saldo contra entrega a entera satisfacción:`,
        tipo: 'acuerdo_trato_seguro',
        acuerdo: {
          codigo: 'CC-ORD-1',
          servicio: 'Servicio de oficio comunal acordado',
          negocioNombre: 'Taller Comunitario',
          precioEstimado: precioBase,
          anticipoMaximo: anticipoMax,
          saldoContraEntrega: precioBase - anticipoMax,
          modalidad: 'workshop',
        },
        sugerencias: ['Verificar comprobante oficial', '¿Qué pasa si hay un desacuerdo?', 'Ver en el mapa'],
      }
    }

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
      mensaje: `¡Hola vecino! El Trato Seguro Comunal es el pacto de confianza de nuestro barrio:\n1. 🛡️ Ningún anticipo para compra de materiales puede superar el 50% del total acordado.\n2. 🧾 Todo queda registrado por escrito con código de verificación oficial y código QR escaneable.\n3. 🤝 Si surge algún desacuerdo, cuentas con el respaldo de mediación comunitaria de la Junta de Acción Comunal (JAC) antes de cualquier conflicto.`,
      tipo: 'acuerdo_trato_seguro',
      acuerdo: {
        codigo: 'CC-ORD-1',
        servicio: 'Servicio de mantenimiento y arreglo',
        negocioNombre: 'Taller Comunal',
        precioEstimado: 45000,
        anticipoMaximo: 22500,
        saldoContraEntrega: 22500,
        modalidad: 'workshop',
      },
      sugerencias: ['Verificar comprobante oficial', '¿Qué pasa si hay un desacuerdo?', 'Ver en el mapa'],
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

  // 16b. Consulta directa de los talleres del piloto territorial en Cali
  const esPeticionPiloto =
    texto.includes('comercios del piloto') ||
    texto.includes('oficios del piloto') ||
    texto.includes('negocios del piloto') ||
    texto.includes('piloto en cali') ||
    texto.includes('piloto de cali')

  if (esPeticionPiloto) {
    return {
      mensaje: `¡Claro que sí, vecino! Aquí tienes los talleres de la fase piloto territorial en la Comuna de Cali. Puedes consultar sus oficios, coordinar directamente por WhatsApp o pactar con Trato Seguro:`,
      tipo: 'negocios',
      negociosSugeridos: [
        {
          id: 'biz-1',
          nombre: 'Costuras Doña Marta',
          categoria: 'costura',
          barrio: 'Antonio Nariño',
          whatsapp: '3151234567',
          distanciaMetros: null,
          verificado: true,
        },
        {
          id: 'biz-2',
          nombre: 'Cerrajería El Rayo',
          categoria: 'cerrajeria',
          barrio: 'Nueva Floresta',
          whatsapp: '3187654321',
          distanciaMetros: null,
          verificado: true,
        },
        {
          id: 'biz-3',
          nombre: 'TecnoFix Celulares',
          categoria: 'tecnologia',
          barrio: 'Nueva Floresta',
          whatsapp: '3129990011',
          distanciaMetros: null,
          verificado: false,
        },
      ],
      sugerencias: ['Ver en el mapa', '¿Cómo funciona el Trato Seguro?', '🎙️ Dictar mi servicio para el catálogo'],
    }
  }

  // 17. Saludos o preguntas de cortesía
  const esSaludo =
    /^(hola|buen[ao]s? (d[ií]as?|tardes?|noches?)|qu[eé] tal|c[oó]mo est[aá]s?|saludos)/i.test(texto) ||
    texto === 'hola' ||
    texto.startsWith('hola ') ||
    texto.includes('cómo estás') ||
    texto.includes('como estas')

  if (esSaludo) {
    return {
      mensaje: `¡Hola, vecino! Qué gusto saludarte. Por acá todo muy bien en la comuna, listos para colaborarte en lo que necesites hoy. ¿Buscas algún oficio de confianza o te ayudo con tu negocio?`,
      tipo: 'conversacion',
      sugerencias: ['Oficios cerca de mí', '🎙️ Dictar mi servicio para el catálogo', 'Ver en el mapa'],
    }
  }

  // 18. Capacidades y qué puede hacer
  const esPreguntaCapacidades =
    /qu[eé] puedes hacer|para qu[eé] sirves|c[oó]mo me puedes ayudar|qu[eé] funciones tienes|qu[eé] haces|en qu[eé] me puedes colaborar/i.test(texto)

  if (esPreguntaCapacidades) {
    return {
      mensaje: `¡Con mucho gusto, vecino! Como copiloto comunal de ConectaComuna, puedo colaborarte con:\n\n• 📍 Encontrar oficios de confianza: modistas, cerrajeros, barberías, comidas y arreglos cerca de ${descUbi.enBarrio}.\n• 🎙️ Dictar tus servicios por voz: si tienes un oficio y no tienes tiempo de escribir, me dices qué haces y cuánto cobras para armar tu catálogo.\n• 🛡️ Trato Seguro: acordar trabajos con la regla comunal del 50% de anticipo para compra de repuestos y saldo contra entrega.\n• 🗺️ Mapa de talleres: ubicar los emprendedores de la comuna en el mapa interactivo.\n\n¿Por cuál te gustaría empezar?`,
      tipo: 'conversacion',
      sugerencias: ['Oficios cerca de mí', '🎙️ Dictar mi servicio para el catálogo', '🛡️ ¿Cómo funciona el Trato Seguro?', 'Ver en el mapa'],
    }
  }

  // 19. Solicitud de ayuda general
  const esPedidoAyuda =
    /^(necesito ayuda|ayuda|ay[uú]dame|auxilio|no s[eé] qu[eé] hacer|no entiendo|orientaci[oó]n)/i.test(texto) ||
    texto === 'necesito ayuda' ||
    texto === 'ayuda'

  if (esPedidoAyuda) {
    return {
      mensaje: `¡Tranquilo, vecino! Aquí estamos para darte una mano. Cuéntame qué necesitas o elige una de estas opciones:\n\n1. 🔍 Buscar a alguien de confianza (costura, arreglo, cerrajería, comida).\n2. 🎙️ Publicar tu propio oficio o negocio en el catálogo comunal.\n3. 🛡️ Consultar el estado de tus pedidos o cómo funciona el Trato Seguro.\n\n¿Cuál de estas necesitas?`,
      tipo: 'conversacion',
      sugerencias: ['Oficios cerca de mí', '🎙️ Dictar mi servicio para el catálogo', '¿Cómo funciona el Trato Seguro?'],
    }
  }

  // 20. Agradecimiento
  const esAgradecimiento =
    /^(gracias|muchas gracias|mil gracias|vale gracias|te lo agradezco|listo gracias|ok gracias)/i.test(texto) ||
    texto === 'gracias' ||
    texto.startsWith('gracias ')

  if (esAgradecimiento) {
    return {
      mensaje: `¡Con el mayor de los gustos, vecino! Para eso estamos en la comuna: apoyarnos entre vecinos y mover los oficios de nuestro barrio. Si necesitas algo más, aquí estaré.`,
      tipo: 'conversacion',
      sugerencias: ['Buscar otro oficio', 'Ver en el mapa', '¿Cómo funciona el Trato Seguro?'],
    }
  }

  // 21. Pregunta de identidad
  const esPreguntaIdentidad =
    /qui[eé]n eres|quien eres|eres un robot|eres una ia|eres un bot/i.test(texto)

  if (esPreguntaIdentidad) {
    return {
      mensaje: `Soy el Asistente Comunal de ConectaComuna, tu copiloto barrial para los habitantes y artesanos de la comuna en Cali. Te ayudo a encontrar oficios cercanos, pactar trabajos seguros con el 50% de anticipo y publicar tus servicios con la voz.`,
      tipo: 'conversacion',
      sugerencias: ['Oficios cerca de mí', '🎙️ Dictar mi servicio para el catálogo', 'Ver en el mapa'],
    }
  }

  // 22. Mensaje conversacional de seguimiento (cuando ya hay historial)
  if (historial && historial.length > 0) {
    return {
      mensaje: `Te escucho con atención, vecino. Cuéntame un poco más de lo que necesitas (por ejemplo: el tipo de arreglo, oficio o duda que tengas) y con gusto te oriento de inmediato.`,
      tipo: 'conversacion',
      sugerencias: ['Oficios cerca de mí', '🎙️ Dictar mi servicio para el catálogo', 'Ver en el mapa'],
    }
  }

  // 23. Saludo o mensaje general de orientación (solo al inicio)
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
  // La ubicación ya viene resuelta: quien declara dónde está pasa antes por
  // `resolverUbicacionDeclarada`, que la guarda. Aquí solo se lee, nunca se
  // adivina a partir del texto.
  const ubicacionElegida = leerUbicacion()
  const esDefinida = !!(contexto?.ubicacion?.esDefinida || ubicacionElegida?.etiqueta)

  const barrio = contexto?.ubicacion?.barrio || ubicacionElegida?.etiqueta || null
  const lat = contexto?.ubicacion?.lat ?? ubicacionElegida?.center.lat ?? null
  const lng = contexto?.ubicacion?.lng ?? ubicacionElegida?.center.lng ?? null

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
        ubicacion: { barrio, lat, lng, esDefinida },
        contexto,
      }),
    })

    return respuesta
  } catch (error) {
    console.warn('Backend de IA no disponible, empleando motor local de respaldo:', error)
    return generarRespuestaLocal(mensaje, barrio, historial, contexto)
  }
}
