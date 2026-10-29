import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { useAsistente } from '@/hooks/useAsistente'
import { useAuth } from '@/hooks/useAuth'
import { leerUbicacion, guardarUbicacion } from '@/lib/ubicacion'
import { UI_ICONS, CATEGORY_ICONS } from '@/components/ui/icons'
import { AudioWaveVisualizer } from '@/components/ui/AudioWaveVisualizer'
import {
  enviarMensajeAsistente,
  describirUbicacion,
  declaraSuUbicacion,
  resolverUbicacionDeclarada,
} from '@/services/aiService'
import { reverseGeocodificar } from '@/services/direccionService'
import { estaEnZonaPiloto, PUNTO_PILOTO } from '@/lib/zonaPiloto'
import { businessService } from '@/services/businessService'
import { profileService } from '@/services/profileService'
import { orderService } from '@/services/orderService'
import { TratoSeguroReceiptModal } from '@/components/trust/TratoSeguroReceiptModal'
import type { AccionPendienteAi, ContextoUsuarioCopiloto, MensajeChat, NegocioSugeridoAi, PedidoActivoCopiloto, ServicioSugeridoAi } from '@/types/ai'
import type { Order, ServiceCatalogItem } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'

// Web Speech API interfaces
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: (event: any) => void
  onerror: (event: any) => void
  onend: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => IWindowSpeechRecognition
    webkitSpeechRecognition?: new () => IWindowSpeechRecognition
  }
}

const CHIPS_SUGERIDOS = [
  '👗 Modista o costurera cerca',
  '🔑 Cerrajería urgente',
  '🛡️ ¿Cómo funciona el Trato Seguro?',
  '🎙️ Dictar mi servicio para el catálogo',
  '📍 Negocios más cercanos',
]

/**
 * Renderiza el texto de los mensajes convirtiendo formato Markdown simple (**negrita**)
 * en elementos semánticos sin mostrar asteriscos crudos en pantalla.
 */
function FormatoTextoMensaje({ texto }: { texto: string }) {
  if (!texto) return null
  const lineas = texto.split('\n')

  return (
    <div className="space-y-1">
      {lineas.map((linea, lIdx) => {
        if (!linea.trim()) {
          return <div key={lIdx} className="h-1.5" />
        }

        const partes = linea.split(/(\*\*[^*]+\*\*)/gu)

        return (
          <p key={lIdx} className="leading-relaxed">
            {partes.map((parte, pIdx) => {
              if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
                const contenidoNegrita = parte.slice(2, -2)
                return (
                  <strong key={pIdx} className="font-bold text-ink-950 dark:text-white">
                    {contenidoNegrita}
                  </strong>
                )
              }
              return parte
            })}
          </p>
        )
      })}
    </div>
  )
}

function crearSaludoInicial(barrio?: string | null, esDefinida = false): MensajeChat {
  const descUbi = describirUbicacion(barrio, esDefinida)
  const saludoZona = esDefinida ? descUbi.enBarrio : 'tu comuna'
  const cercaDeTexto = esDefinida ? descUbi.cercaDe : 'cerca de ti'
  return {
    id: 'bienvenida',
    emisor: 'asistente',
    fecha: new Date(),
    texto: `¡Hola vecino! Soy tu Asistente Comunal para ${saludoZona}.
Puedo colaborarte para:
• 📍 Encontrar oficios de confianza ${cercaDeTexto}.
• 🎙️ Dictar tus servicios con la voz para tu catálogo si no puedes escribir rápido.
• 🛡️ Entender cómo funciona el Trato Seguro y la regla del 50% de anticipo.

¿En qué te colaboro hoy?`,
    respuestaEstructurada: {
      mensaje: '',
      tipo: 'conversacion',
      sugerencias: CHIPS_SUGERIDOS,
    },
  }
}

export function AsistenteComunalModal() {
  const { isOpen, cerrarAsistente, mensajeInicial } = useAsistente()
  const { userId, email, profile, business, activeRole, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const prefersReduced = useReducedMotion()

  const ubicacion = leerUbicacion()
  const tieneUbicacionDefinida = !!(ubicacion?.etiqueta || profile?.neighborhood)
  const barrioActivo = ubicacion?.etiqueta || profile?.neighborhood || null
  const descUbi = describirUbicacion(barrioActivo, tieneUbicacionDefinida)

  const [mensajes, setMensajes] = useState<MensajeChat[]>(() => [
    crearSaludoInicial(barrioActivo, tieneUbicacionDefinida),
  ])
  const [textoEntrada, setTextoEntrada] = useState('')
  const [cargando, setCargando] = useState(false)
  const [escuchandoVoz, setEscuchandoVoz] = useState(false)
  const [ttsActivo, setTtsActivo] = useState(() => {
    try {
      return localStorage.getItem('cc_ai_tts_enabled') === 'true'
    } catch {
      return false
    }
  })
  const [hablandoId, setHablandoId] = useState<string | null>(null)
  const [guardandoServicioId, setGuardandoServicioId] = useState<string | null>(null)
  const [servicioGuardadoId, setServicioGuardadoId] = useState<string | null>(null)
  const [errorVoz, setErrorVoz] = useState<string | null>(null)
  const [ejecutandoAccion, setEjecutandoAccion] = useState(false)
  const [pedidosUsuario, setPedidosUsuario] = useState<PedidoActivoCopiloto[]>([])
  const [comprobante, setComprobante] = useState<Order | null>(null)
  const [cargandoComprobante, setCargandoComprobante] = useState<string | null>(null)

  const reconocimientoRef = useRef<IWindowSpeechRecognition | null>(null)
  const listaRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Cargar pedidos y pactos activos para que el copiloto tenga contexto real
  useEffect(() => {
    if (!isOpen || !userId) return
    let cancelado = false

    const cargarPedidos = async () => {
      try {
        let orders: Order[] = []
        if (business?.id) {
          orders = await orderService.listAsBusiness(business.id)
        } else {
          orders = await orderService.listAsClient(userId)
        }
        if (cancelado) return

        const filtrados: PedidoActivoCopiloto[] = orders
          .filter((o) => ['pending', 'accepted', 'in_progress'].includes(o.status))
          .slice(0, 5)
          .map((o) => ({
            id: o.id,
            codigo: `CC-${o.id.slice(0, 8).toUpperCase()}`,
            titulo: o.title,
            estado: o.status,
            monto: o.final_price || o.price_estimate || 0,
            anticipo: o.advance_payment || 0,
            contraparte: business?.id ? (o.client?.full_name || 'Vecino solicitante') : (o.business?.name || 'Taller del barrio'),
            rol: (business?.id ? 'comerciante' : 'cliente') as 'comerciante' | 'cliente',
          }))

        setPedidosUsuario(filtrados)

        // Si el usuario tiene pactos activos, enriquecer las sugerencias del saludo inicial
        if (filtrados.length > 0) {
          const primerPacto = filtrados[0]
          setMensajes((prev) => {
            if (prev.length === 1 && prev[0].id === 'bienvenida') {
              return [
                {
                  ...prev[0],
                  respuestaEstructurada: {
                    ...prev[0].respuestaEstructurada!,
                    sugerencias: [
                      `🛡️ Mi pacto #${primerPacto.codigo}`,
                      '📦 Mis pedidos activos',
                      '🛡️ ¿Cómo funciona el Trato Seguro?',
                      '📍 Negocios más cercanos',
                    ],
                  },
                },
              ]
            }
            return prev
          })
        }
      } catch (err) {
        console.warn('No se pudieron precargar pedidos para el copiloto:', err)
      }
    }

    void cargarPedidos()
    return () => {
      cancelado = true
    }
  }, [isOpen, userId, business?.id])

  // Detener lectura de voz en curso
  const detenerLecturaVoz = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setHablandoId(null)
  }, [])

  // Leer un texto en voz alta con síntesis de voz (TTS)
  const leerTextoEnVozAlta = useCallback(
    (texto: string, mensajeId: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      if (hablandoId === mensajeId) {
        detenerLecturaVoz()
        return
      }

      detenerLecturaVoz()
      const textoLimpio = texto.replace(/[#*•_]/gu, '')
      const utterance = new SpeechSynthesisUtterance(textoLimpio)
      utterance.lang = 'es-CO'
      utterance.rate = 0.96
      utterance.pitch = 1.0

      const voces = window.speechSynthesis.getVoices()
      // Priorizar voces Naturales / Neuronales en español colombiano o latinoamericano
      const vozEspanol = voces
        .filter((v) => v.lang.startsWith('es') || v.lang.includes('ES') || v.lang.includes('CO'))
        .sort((a, b) => {
          const scoreA =
            (a.lang.includes('CO') ? 40 : 0) +
            (a.name.includes('Natural') || a.name.includes('Neural') || a.name.includes('Online') ? 30 : 0) +
            (a.name.includes('Google') ? 20 : 0) +
            (a.lang.includes('419') || a.lang.includes('MX') || a.lang.includes('US') ? 10 : 0)
          const scoreB =
            (b.lang.includes('CO') ? 40 : 0) +
            (b.name.includes('Natural') || b.name.includes('Neural') || b.name.includes('Online') ? 30 : 0) +
            (b.name.includes('Google') ? 20 : 0) +
            (b.lang.includes('419') || b.lang.includes('MX') || b.lang.includes('US') ? 10 : 0)
          return scoreB - scoreA
        })[0]

      if (vozEspanol) {
        utterance.voice = vozEspanol
      }

      utterance.onend = () => setHablandoId(null)
      utterance.onerror = () => setHablandoId(null)

      setHablandoId(mensajeId)
      window.speechSynthesis.speak(utterance)
    },
    [hablandoId, detenerLecturaVoz]
  )

  // Enviar mensaje al asistente
  const manejarEnvio = useCallback(
    async (textoAEnviar?: string) => {
      const texto = (textoAEnviar ?? textoEntrada).trim()
      if (!texto || cargando) return

      detenerLecturaVoz()
      if (escuchandoVoz) {
        reconocimientoRef.current?.stop()
        setEscuchandoVoz(false)
      }

      setTextoEntrada('')
      setErrorVoz(null)

      const idUsuario = `user-${Date.now()}`
      const nuevoMensajeUsuario: MensajeChat = {
        id: idUsuario,
        emisor: 'usuario',
        texto,
        fecha: new Date(),
      }

      setMensajes((prev) => [...prev, nuevoMensajeUsuario])
      setCargando(true)

      // "Estoy en Chapinero" tiene que funcionar igual que "Estoy en El Rodeo".
      // El diccionario de barrios solo cubre Cali, así que lo que no reconozca
      // se resuelve contra el geocodificador antes de seguir.
      if (declaraSuUbicacion(texto)) {
        const lugar = await resolverUbicacionDeclarada(texto)
        if (lugar) {
          guardarUbicacion({ etiqueta: lugar.etiqueta, center: lugar.center, origen: 'busqueda' })
          const enPiloto = estaEnZonaPiloto(lugar.center)
          setCargando(false)
          setMensajes((prev) => [
            ...prev,
            {
              id: `ubi-declarada-${Date.now()}`,
              emisor: 'asistente',
              texto: enPiloto
                ? `¡Listo vecino! Te ubiqué en ${lugar.etiqueta}. Estos son los oficios más cercanos a tu zona:`
                : `Te ubiqué en ${lugar.etiqueta}. Por ahora el piloto de ConectaComuna está en la Comuna de Cali, así que en tu zona todavía no hay talleres registrados. Si quieres verlos con distancias reales:`,
              fecha: new Date(),
              respuestaEstructurada: {
                mensaje: '',
                tipo: 'conversacion',
                sugerencias: enPiloto
                  ? ['Negocios más cercanos', '👗 Modista o costurera cerca', '🔑 Cerrajería urgente']
                  : [
                      'Ver comercios del piloto (Cali)',
                      '🎙️ Dictar mi servicio para el catálogo',
                      '🛡️ ¿Cómo funciona el Trato Seguro?',
                    ],
              },
            },
          ])
          return
        }
      }

      try {
        const contexto: ContextoUsuarioCopiloto = {
          autenticado: !!userId,
          userId,
          nombre: profile?.full_name || null,
          email: email || null,
          tipoCuenta: profile?.account_type || (userId ? 'client' : undefined),
          rolActivo: activeRole,
          telefono: profile?.phone || null,
          barrio: profile?.neighborhood || barrioActivo,
          negocioPropio: business
            ? {
                tieneNegocio: true,
                id: business.id,
                nombre: business.name,
                categoria: business.category,
                serviciosCount: business.services_catalog?.length || 0,
                verificado: business.verification_status === 'verified',
              }
            : { tieneNegocio: false },
          pedidosActivos: pedidosUsuario,
          pantallaActual: {
            ruta: location.pathname,
          },
          ubicacion: {
            barrio: barrioActivo,
            lat: ubicacion?.center.lat || null,
            lng: ubicacion?.center.lng || null,
            esDefinida: tieneUbicacionDefinida,
          },
        }

        const respuestaAi = await enviarMensajeAsistente(
          texto,
          [...mensajes, nuevoMensajeUsuario],
          contexto
        )

        const idRespuesta = `ai-${Date.now()}`
        const nuevoMensajeAi: MensajeChat = {
          id: idRespuesta,
          emisor: 'asistente',
          texto: respuestaAi.mensaje,
          fecha: new Date(),
          respuestaEstructurada: respuestaAi,
        }

        if (respuestaAi.ubicacionDetectada) {
          guardarUbicacion({
            etiqueta: respuestaAi.ubicacionDetectada.barrio,
            center: {
              lat: respuestaAi.ubicacionDetectada.lat,
              lng: respuestaAi.ubicacionDetectada.lng,
            },
            origen: 'busqueda',
          })
        }

        setMensajes((prev) => [...prev, nuevoMensajeAi])

        if (ttsActivo && respuestaAi.mensaje) {
          leerTextoEnVozAlta(respuestaAi.mensaje, idRespuesta)
        }
      } catch (err) {
        console.error('Error al responder:', err)
        const errorMsg: MensajeChat = {
          id: `err-${Date.now()}`,
          emisor: 'asistente',
          texto: 'Disculpa vecino, ocurrió un inconveniente momentáneo. Por favor intenta de nuevo.',
          fecha: new Date(),
        }
        setMensajes((prev) => [...prev, errorMsg])
      } finally {
        setCargando(false)
      }
    },
    [textoEntrada, cargando, escuchandoVoz, mensajes, ttsActivo, detenerLecturaVoz, leerTextoEnVozAlta, userId, email, profile, business, activeRole, location.pathname, barrioActivo, tieneUbicacionDefinida, ubicacion, pedidosUsuario]
  )

  const solicitarUbicacionGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      void manejarEnvio('Mi dispositivo no soporta geolocalización GPS')
      return
    }

    setCargando(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }

        let etiqueta = 'Mi ubicación actual'
        try {
          const geo = await reverseGeocodificar(coords)
          if (geo?.etiqueta) etiqueta = geo.etiqueta
        } catch {}

        guardarUbicacion({
          etiqueta,
          center: coords,
          origen: 'gps',
        })
        setCargando(false)

        if (estaEnZonaPiloto(coords)) {
          void manejarEnvio(`He compartido mi ubicación GPS en ${etiqueta}`)
        } else {
          setMensajes((prev) => [
            ...prev,
            {
              id: `gps-loc-${Date.now()}`,
              emisor: 'asistente',
              texto:
                `¡Te ubiqué en ${etiqueta}! Reconocemos tu ubicación real aquí en ${etiqueta}. Como ConectaComuna está operando su fase piloto territorial en la Comuna de Cali, en este radio aún no contamos con talleres registrados. Si deseas ver los comercios del piloto de Cali con distancias reales y probar el Trato Seguro, puedes tocar la opción abajo:`,
              fecha: new Date(),
              respuestaEstructurada: {
                mensaje: '',
                tipo: 'conversacion',
                sugerencias: [
                  'Ver comercios del piloto (Cali)',
                  '👗 Modista o costurera cerca',
                  '🔑 Cerrajería urgente',
                  '🎙️ Dictar mi servicio para el catálogo',
                  '🛡️ ¿Cómo funciona el Trato Seguro?',
                ],
              },
            },
          ])
        }
      },
      () => {
        setCargando(false)
        setMensajes((prev) => [
          ...prev,
          {
            id: `gps-err-${Date.now()}`,
            emisor: 'asistente',
            texto:
              'Vecino, no se pudo acceder al GPS del dispositivo (revisa los permisos en tu navegador). Escríbeme dónde estás y yo te ubico: sirve el barrio con la ciudad, como «Estoy en Chapinero, Bogotá» o «Estoy en El Rodeo». Si prefieres, toca uno de los barrios del piloto:',
            fecha: new Date(),
            respuestaEstructurada: {
              mensaje: '',
              tipo: 'conversacion',
              sugerencias: [
                'Estoy en El Rodeo, Cali',
                'Estoy en Chapinero, Bogotá',
              ],
            },
          },
        ])
      },
      { timeout: 7000, enableHighAccuracy: false }
    )
  }, [manejarEnvio])

  const manejarClickChip = useCallback(
    (chip: string) => {
      if (chip.includes('Usar mi ubicación actual') || chip.includes('Activar mi ubicación')) {
        solicitarUbicacionGps()
        return
      }
      if (chip.includes('Ver comercios del piloto (Cali)') || chip.includes('comercios del piloto')) {
        guardarUbicacion({ ...PUNTO_PILOTO, origen: 'busqueda' })
        void manejarEnvio('Muéstrame los oficios del piloto en Cali')
        return
      }
      void manejarEnvio(chip)
    },
    [solicitarUbicacionGps, manejarEnvio]
  )

  // Procesar mensaje inicial si fue invocado externamente
  useEffect(() => {
    if (isOpen && mensajeInicial) {
      const timer = setTimeout(() => {
        void manejarEnvio(mensajeInicial)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, mensajeInicial, manejarEnvio])

  // Desplazar al último mensaje. `scrollIntoView` sobre el centinela dejaba la
  // conversación a media altura: la respuesta llegaba y el vecino no la veía
  // hasta que bajaba a mano. Se mueve el contenedor, que sí es predecible.
  useEffect(() => {
    if (!isOpen) return
    const lista = listaRef.current
    if (!lista) return
    const ir = () => lista.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' })
    ir()
    // Las tarjetas de negocio y los chips entran después del primer pintado.
    const t = setTimeout(ir, 120)
    return () => clearTimeout(t)
  }, [mensajes, cargando, isOpen])

  // Manejar Escape para cerrar
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        cerrarAsistente()
        detenerLecturaVoz()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, cerrarAsistente, detenerLecturaVoz])

  // Enfocar automáticamente el campo de entrada al abrir el asistente
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Ejecutar acción de mutación confirmada por el usuario
  const ejecutarAccionConfirmada = async (accion?: AccionPendienteAi) => {
    setEjecutandoAccion(true)
    try {
      if (accion?.tipo === 'activar_negocio' || !accion) {
        if (userId) {
          await profileService.update(userId, { account_type: 'business' })
          await refresh()
        }
        detenerLecturaVoz()
        cerrarAsistente()
        navigate('/panel/negocio')
      }
    } catch (err) {
      console.error('Error al ejecutar acción confirmada:', err)
    } finally {
      setEjecutandoAccion(false)
    }
  }

  // Guardar preferencia de TTS
  const toggleTts = () => {
    const nuevo = !ttsActivo
    setTtsActivo(nuevo)
    if (!nuevo) {
      detenerLecturaVoz()
    }
    try {
      localStorage.setItem('cc_ai_tts_enabled', String(nuevo))
    } catch {}
  }

  // Activar dictado por voz (Speech-to-Text)
  const alternarReconocimientoVoz = () => {
    setErrorVoz(null)
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechClass) {
      setErrorVoz('Tu navegador no soporta dictado por voz. Puedes escribir tu consulta.')
      return
    }

    if (escuchandoVoz) {
      reconocimientoRef.current?.stop()
      setEscuchandoVoz(false)
      return
    }

    try {
      detenerLecturaVoz()
      const recognition = new SpeechClass()
      recognition.lang = 'es-CO'
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onresult = (event: any) => {
        let textoTranscribiendo = ''
        for (let i = 0; i < event.results.length; ++i) {
          textoTranscribiendo += event.results[i][0].transcript
        }
        setTextoEntrada(textoTranscribiendo)
      }

      recognition.onerror = (event: any) => {
        console.warn('Error en reconocimiento de voz:', event.error)
        setEscuchandoVoz(false)
        if (event.error === 'not-allowed') {
          setErrorVoz('Permiso de micrófono denegado. Habilítalo en tu navegador para dictar.')
        } else if (event.error === 'no-speech') {
          setErrorVoz('No se escuchó voz. Toca de nuevo el micrófono y habla con tranquilidad.')
        } else {
          setErrorVoz('No te escuchamos bien. Intenta dictar más cerca del micrófono.')
        }
      }

      recognition.onend = () => {
        setEscuchandoVoz(false)
      }

      reconocimientoRef.current = recognition
      recognition.start()
      setEscuchandoVoz(true)
    } catch (err) {
      console.error('Fallo al iniciar micrófono:', err)
      setEscuchandoVoz(false)
      setErrorVoz('No se pudo iniciar el micrófono.')
    }
  }

  // Guardar servicio estructurado en el catálogo del negocio del usuario
  const guardarEnCatalogo = async (servicio: ServicioSugeridoAi, mensajeId: string) => {
    if (!business) {
      if (userId) {
        detenerLecturaVoz()
        cerrarAsistente()
        navigate('/panel/negocio')
      } else {
        detenerLecturaVoz()
        cerrarAsistente()
        navigate('/registro?tipo=business')
      }
      return
    }

    setGuardandoServicioId(mensajeId)
    try {
      const catalogoActual: ServiceCatalogItem[] = business.services_catalog || []
      const idSrv = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `srv-${mensajeId}`
      const nuevoItem: ServiceCatalogItem = {
        id: idSrv,
        name: servicio.titulo,
        price: servicio.precioSugerido,
        description: servicio.descripcion,
      }

      const catalogoActualizado = [...catalogoActual, nuevoItem]

      await businessService.upsert(business.owner_id, {
        ...business,
        services_catalog: catalogoActualizado,
      })

      await refresh()
      setServicioGuardadoId(mensajeId)

      const msgExito: MensajeChat = {
        id: `exito-${mensajeId}`,
        emisor: 'asistente',
        texto: `¡Excelente, vecino! El servicio "${servicio.titulo}" con tarifa de ${servicio.precioSugerido?.toLocaleString('es-CO')} COP ya quedó guardado en el catálogo público de tu negocio "${business.name}".`,
        fecha: new Date(),
        respuestaEstructurada: {
          mensaje: '',
          tipo: 'conversacion',
          sugerencias: ['🎙️ Dictar otro servicio', 'Ir al panel de mi negocio', 'Ver en el mapa'],
        },
      }
      setMensajes((prev) => [...prev, msgExito])
    } catch (err) {
      console.error('Error al guardar servicio en catálogo:', err)
    } finally {
      setGuardandoServicioId(null)
    }
  }

  // El comprobante se abre encima del chat: el vecino no pierde la conversación.
  const abrirComprobante = async (mensajeId: string, orderId?: string) => {
    if (!orderId) return
    setCargandoComprobante(mensajeId)
    try {
      const pedido = await orderService.getForReceipt(orderId)
      if (pedido) setComprobante(pedido)
    } catch (err) {
      console.error('No se pudo abrir el comprobante del pacto:', err)
    } finally {
      setCargandoComprobante(null)
    }
  }

  // Reiniciar conversación
  const reiniciarConversacion = () => {
    detenerLecturaVoz()
    setMensajes([crearSaludoInicial(barrioActivo, tieneUbicacionDefinida)])
    setErrorVoz(null)
  }

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-6 pointer-events-none">
          {/* Fondo oscuro traslúcido en móviles */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              detenerLecturaVoz()
              cerrarAsistente()
            }}
            className="fixed inset-0 bg-ink-950/50 backdrop-blur-xs sm:hidden pointer-events-auto"
          />

          {/* Ventana de chat */}
          <motion.section
            role="dialog"
            aria-label="Asistente Comunal"
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="pointer-events-auto relative flex flex-col w-full sm:w-[440px] h-[85vh] sm:h-[650px] max-h-[92vh] bg-cream-100 dark:bg-cream-100 border border-ink-200 dark:border-ink-700 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Encabezado */}
            <header className="flex items-center justify-between px-3.5 sm:px-4 py-3 border-b border-ink-200 dark:border-ink-700 bg-cream-200/70 dark:bg-cream-100">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-900/20 shrink-0">
                  <UI_ICONS.bot size={20} className="stroke-[2.2] text-amber-300 sm:w-[22px] sm:h-[22px]" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full border-2 border-cream-100" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <h2 className="text-sm font-bold text-ink-900 leading-tight truncate">
                      Asistente Comunal
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 text-brand-900 dark:bg-emerald-950/90 dark:text-emerald-300 border border-brand-200 dark:border-emerald-700/60 shrink-0">
                      IA Vecinal
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-ink-600">
                    <UI_ICONS.map size={12} className="text-brand-600 dark:text-brand-400 shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">
                      {descUbi.etiquetaCorta}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
                {/* Toggle lectura de voz (TTS) */}
                <button
                  type="button"
                  onClick={toggleTts}
                  title={ttsActivo ? 'Desactivar lectura en voz alta' : 'Activar lectura automática en voz alta'}
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    ttsActivo
                      ? 'bg-brand-200 dark:bg-emerald-950/80 text-brand-900 dark:text-emerald-300 border border-brand-300 dark:border-emerald-700/60'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-cream-200 dark:text-ink-300 dark:hover:text-white dark:hover:bg-cream-200'
                  )}
                  aria-label={ttsActivo ? 'Silenciar lectura de voz' : 'Activar lectura de voz'}
                >
                  {ttsActivo ? <UI_ICONS.volume size={18} /> : <UI_ICONS.volumeMute size={18} />}
                </button>

                {/* Reiniciar chat */}
                <button
                  type="button"
                  onClick={reiniciarConversacion}
                  title="Reiniciar conversación"
                  className="p-2 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-cream-200 dark:text-ink-300 dark:hover:text-white dark:hover:bg-cream-200 transition-colors"
                  aria-label="Reiniciar conversación"
                >
                  <UI_ICONS.reset size={18} />
                </button>

                {/* Cerrar modal */}
                <button
                  type="button"
                  onClick={() => {
                    detenerLecturaVoz()
                    cerrarAsistente()
                  }}
                  className="p-2 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-cream-200 dark:text-ink-300 dark:hover:text-white dark:hover:bg-cream-200 transition-colors"
                  aria-label="Cerrar chat"
                >
                  <UI_ICONS.close size={20} />
                </button>
              </div>
            </header>

            {/* Área de mensajes con scroll */}
            <div ref={listaRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {mensajes.map((m) => {
                const esUsuario = m.emisor === 'usuario'
                const estructurada = m.respuestaEstructurada

                return (
                  <div
                    key={m.id}
                    className={cn('flex flex-col', esUsuario ? 'items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed',
                        esUsuario
                          ? 'bg-brand-600 text-white rounded-tr-none shadow-xs'
                          : 'bg-white dark:bg-cream-200 border border-ink-200 dark:border-ink-700 text-ink-900 dark:text-white rounded-tl-none shadow-xs'
                      )}
                    >
                      <FormatoTextoMensaje texto={m.texto} />

                      {/* Botón de reproducción de audio para mensajes del asistente */}
                      {!esUsuario && m.texto && (
                        <div className="mt-2 pt-2 border-t border-ink-200 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => leerTextoEnVozAlta(m.texto, m.id)}
                            className="flex items-center gap-1.5 text-xs text-brand-700 dark:text-emerald-400 font-semibold hover:underline focus:outline-none"
                          >
                            <UI_ICONS.volume size={14} />
                            {hablandoId === m.id ? (
                              <span className="inline-flex items-center gap-1.5 text-brand-700 dark:text-emerald-400">
                                <AudioWaveVisualizer active className="scale-75" />
                                Pausar audio
                              </span>
                            ) : 'Escuchar respuesta'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tarjetas de acción estructurada del Asistente (Negocios recomendados) */}
                    {estructurada?.tipo === 'negocios' && !!estructurada.negociosSugeridos?.length && (
                      <div className="mt-3 w-full max-w-[95%] space-y-2">
                        <div className="text-xs font-semibold text-ink-700 px-1">
                          Negocios recomendados cerca de ti:
                        </div>
                        {estructurada.negociosSugeridos.map((negocio: NegocioSugeridoAi) => {
                          const CategoryIcon =
                            CATEGORY_ICONS[negocio.categoria as keyof typeof CATEGORY_ICONS] ||
                            UI_ICONS.store

                          return (
                            <div
                              key={negocio.id}
                              className="card p-3.5 border border-ink-200 hover:border-brand-300 transition-all shadow-xs rounded-2xl"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-xl bg-brand-100 text-brand-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-transparent dark:border-emerald-700/50">
                                    <CategoryIcon size={18} />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-ink-900 text-sm leading-snug">
                                      {negocio.nombre}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-xs text-ink-600 mt-0.5">
                                      <span>{negocio.barrio || descUbi.etiquetaCorta}</span>
                                      {negocio.distanciaMetros && (
                                        <>
                                          <span>•</span>
                                          <span className="font-semibold text-brand-700 dark:text-brand-400">
                                            {negocio.distanciaMetros < 1000
                                              ? `a ${negocio.distanciaMetros} m`
                                              : `a ${(negocio.distanciaMetros / 1000).toFixed(1)} km`}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {negocio.verificado && (
                                  <span
                                    title="Verificado en territorio por la comunidad"
                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0"
                                  >
                                    <UI_ICONS.shieldCheck size={12} />
                                    Verificado
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate(`/negocio/${negocio.id}`)
                                    cerrarAsistente()
                                  }}
                                  className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl bg-cream-200 hover:bg-cream-300 dark:bg-cream-200 dark:hover:bg-cream-300 text-ink-900 dark:text-white text-center transition-colors border border-ink-200 dark:border-ink-700"
                                >
                                  Ver perfil
                                </button>

                                {negocio.whatsapp && (
                                  <a
                                    href={`https://wa.me/57${negocio.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                                      '¡Hola! Te encontré en ConectaComuna con el Asistente Comunal y me gustaría consultar por tus servicios.'
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                                  >
                                    <UI_ICONS.whatsapp size={14} />
                                    WhatsApp
                                  </a>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Tarjeta de servicio estructurado (Emprendedor dictando servicio) */}
                    {estructurada && estructurada.tipo === 'servicio_catalogo' && estructurada.servicio && (
                      <div className="mt-3 w-full max-w-[95%] card-soft p-4 border-2 border-brand-300 dark:border-brand-500/50 rounded-2xl shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-800 dark:text-emerald-400 uppercase tracking-wider mb-2">
                          <UI_ICONS.checkCircle size={15} />
                          Servicio identificado para tu catálogo
                        </div>

                        <div className="font-bold text-ink-900 text-base">
                          {estructurada.servicio.titulo}
                        </div>

                        <p className="text-xs text-ink-700 mt-1 leading-relaxed">
                          {estructurada.servicio.descripcion}
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-ink-600 font-medium">Precio estimado:</span>
                          <span className="text-sm font-extrabold text-brand-700 dark:text-emerald-400">
                            ${estructurada.servicio.precioSugerido.toLocaleString('es-CO')} COP
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-800/60 flex flex-col gap-2">
                          {servicioGuardadoId === m.id ? (
                            <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                              <UI_ICONS.check size={16} />
                              ¡Guardado en tu catálogo exitosamente!
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={guardandoServicioId === m.id}
                              onClick={() => guardarEnCatalogo(estructurada.servicio!, m.id)}
                              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-900/10 transition-colors disabled:opacity-50"
                            >
                              {guardandoServicioId === m.id ? (
                                <UI_ICONS.loader size={16} className="animate-spin" />
                              ) : (
                                <UI_ICONS.package size={16} />
                              )}
                              {business ? 'Guardar directamente en mi catálogo' : 'Crear negocio para publicar este servicio'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tarjeta de Pacto de Trato Seguro */}
                    {estructurada && estructurada.tipo === 'acuerdo_trato_seguro' && (
                      <div className="mt-3 w-full max-w-[95%] card-soft p-4 border-2 border-emerald-400/80 dark:border-emerald-500/60 rounded-2xl shadow-xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                            <UI_ICONS.shieldCheck size={16} />
                            {estructurada.acuerdo?.estado ? 'Pacto en el registro' : 'Pacto de Trato Seguro'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {estructurada.acuerdo?.esEjemplo && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                                Ejemplo
                              </span>
                            )}
                            <span className="font-mono text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                              Tope 50% anticipo
                            </span>
                          </span>
                        </div>

                        {estructurada.acuerdo ? (
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-ink-900 text-sm">
                                  {estructurada.acuerdo.servicio}
                                </div>
                                <div className="text-xs text-ink-600">
                                  {estructurada.acuerdo.negocioNombre}
                                </div>
                              </div>
                              <span className="font-mono text-[11px] font-bold text-ink-600 shrink-0">
                                #{estructurada.acuerdo.codigo}
                              </span>
                            </div>
                            <div className="rounded-xl border border-ink-200 dark:border-ink-800 bg-white/70 dark:bg-ink-900/60 p-3 space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-ink-600">Presupuesto total:</span>
                                <span className="font-bold text-ink-900">{formatCurrency(estructurada.acuerdo.precioEstimado)}</span>
                              </div>
                              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                <span>Anticipo registrado (máx. 50%):</span>
                                <span className="font-semibold">{formatCurrency(estructurada.acuerdo.anticipoMaximo)}</span>
                              </div>
                              <div className="flex justify-between border-t border-ink-200 dark:border-ink-700 pt-1 font-bold">
                                <span>Saldo contra entrega:</span>
                                <span className="text-brand-700">{formatCurrency(estructurada.acuerdo.saldoContraEntrega)}</span>
                              </div>
                            </div>
                            {!estructurada.acuerdo.esParticipante && (
                              <p className="text-[11px] text-ink-500 leading-relaxed">
                                El nombre y la dirección del vecino solo los ven las partes del acuerdo.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-ink-700 leading-relaxed">
                            Un trabajo pactado por acá queda con tope de anticipo del 50% y un comprobante que cualquiera puede consultar con el código.
                          </p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          {estructurada.acuerdo?.esParticipante && estructurada.acuerdo.orderId ? (
                            <button
                              type="button"
                              disabled={cargandoComprobante === m.id}
                              onClick={() => void abrirComprobante(m.id, estructurada.acuerdo?.orderId)}
                              className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-center transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                              {cargandoComprobante === m.id ? (
                                <UI_ICONS.loader size={14} className="animate-spin" />
                              ) : (
                                <UI_ICONS.shieldCheck size={14} />
                              )}
                              <span>Ver comprobante</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                detenerLecturaVoz()
                                cerrarAsistente()
                                navigate(
                                  estructurada.acuerdo?.codigo
                                    ? `/trato-seguro/verificar/${estructurada.acuerdo.codigo}`
                                    : '/trato-seguro/verificar'
                                )
                              }}
                              className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-center transition-colors shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <UI_ICONS.shieldCheck size={14} />
                              <span>Ver ficha pública</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              detenerLecturaVoz()
                              cerrarAsistente()
                              navigate('/trato-seguro')
                            }}
                            className="py-2 px-3 text-xs font-semibold rounded-xl bg-cream-200 hover:bg-cream-300 dark:bg-cream-200 dark:hover:bg-cream-300 text-ink-800 dark:text-white text-center transition-colors border border-ink-200 dark:border-ink-700"
                          >
                            Cómo funciona
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tarjeta de Confirmación de Acción Explícita */}
                    {estructurada && estructurada.tipo === 'confirmacion_accion' && (
                      <div className="mt-3 w-full max-w-[95%] card-soft p-3.5 border-2 border-amber-400/80 dark:border-amber-500/60 rounded-2xl shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1.5">
                          <UI_ICONS.alert size={15} />
                          Confirmación requerida
                        </div>
                        <div className="text-xs font-bold text-ink-900">
                          {estructurada.accionPendiente?.titulo || 'Confirmar acción'}
                        </div>
                        <p className="text-[11px] text-ink-700 mt-1 leading-snug">
                          {estructurada.accionPendiente?.descripcion ||
                            'Para continuar, confirma si deseas realizar este cambio en tu perfil.'}
                        </p>

                        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <button
                            type="button"
                            disabled={ejecutandoAccion}
                            onClick={() => ejecutarAccionConfirmada(estructurada.accionPendiente)}
                            className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-center transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {ejecutandoAccion ? (
                              <UI_ICONS.loader size={14} className="animate-spin" />
                            ) : (
                              <UI_ICONS.checkCircle size={14} />
                            )}
                            <span>
                              {estructurada.accionPendiente?.botonConfirmar || '✅ Sí, activar mi negocio'}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={ejecutandoAccion}
                            onClick={() =>
                              manejarEnvio(
                                estructurada.accionPendiente?.botonCancelar || '❌ No por ahora'
                              )
                            }
                            className="py-2 px-3 text-xs font-semibold rounded-xl bg-cream-200 hover:bg-cream-300 dark:bg-cream-200 dark:hover:bg-cream-300 text-ink-800 dark:text-white text-center transition-colors border border-ink-200 dark:border-ink-700"
                          >
                            <span>
                              {estructurada.accionPendiente?.botonCancelar || '❌ No por ahora'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tarjeta de navegación rápida enriquecida */}
                    {estructurada && estructurada.tipo === 'navegacion' && estructurada.rutaNavegacion && (() => {
                      const esMapa = estructurada.rutaNavegacion.startsWith('/mapa')
                      const esExplorar = estructurada.rutaNavegacion.startsWith('/explorar')
                      const esRegistro = estructurada.rutaNavegacion.startsWith('/registro')
                      const esVerificarTrato =
                        estructurada.rutaNavegacion.includes('verificar') ||
                        estructurada.rutaNavegacion.startsWith('/trato-seguro')
                      const esPanel = estructurada.rutaNavegacion.startsWith('/panel')

                      const IconoNav = esVerificarTrato
                        ? UI_ICONS.shieldCheck
                        : esPanel
                        ? UI_ICONS.store
                        : esMapa
                        ? UI_ICONS.map
                        : esExplorar
                        ? UI_ICONS.search
                        : esRegistro
                        ? UI_ICONS.store
                        : UI_ICONS.compass

                      const tituloNav = esVerificarTrato
                        ? 'Verificador Oficial de Trato Seguro'
                        : esPanel
                        ? 'Panel de Control Vecinal'
                        : esMapa
                        ? 'Mapa Comunal Interactivo'
                        : esExplorar
                        ? 'Directorio de Oficios'
                        : esRegistro
                        ? 'Registro de Emprendedor'
                        : 'Sección recomendada'

                      const descNav = esVerificarTrato
                        ? 'Comprueba el tope de anticipo del 50%, el negocio con el que se pactó y el estado del trabajo en tiempo real'
                        : esPanel
                        ? 'Administra tus solicitudes de servicio, acuerdos en curso y catálogo de oficio'
                        : esMapa
                        ? 'Ubica talleres, modisterías y cerrajerías geolocalizados cerca de tu barrio'
                        : esExplorar
                        ? 'Explora todas las categorías y emprendedores de la comuna'
                        : esRegistro
                        ? 'Publica tu taller u oficio gratis en 2 minutos sin intermediarios'
                        : 'Toca el botón para abrir esta sección directamente'

                      const botonTexto = esVerificarTrato
                        ? 'Abrir comprobante verificable con QR'
                        : esPanel
                        ? 'Ir a mi panel'
                        : esMapa
                        ? 'Abrir mapa comunal'
                        : esExplorar
                        ? 'Explorar directorio'
                        : esRegistro
                        ? 'Crear perfil gratis'
                        : 'Ir a la sección'

                      return (
                        <div
                          className={cn(
                            'mt-3 w-full max-w-[95%] p-3.5 rounded-2xl shadow-xs border',
                            esVerificarTrato
                              ? 'bg-cream-50 dark:bg-cream-100 border-emerald-400 dark:border-emerald-600/70'
                              : 'card-soft border-brand-300 dark:border-brand-500/40'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                                esVerificarTrato
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-brand-100 text-brand-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-transparent dark:border-emerald-700/50'
                              )}
                            >
                              <IconoNav size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-ink-900">
                                {tituloNav}
                              </div>
                              <p className="text-[11px] text-ink-600 dark:text-ink-400 mt-0.5 leading-snug">
                                {descNav}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              detenerLecturaVoz()
                              navigate(estructurada.rutaNavegacion!)
                              cerrarAsistente()
                            }}
                            className={cn(
                              'mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl text-white transition-colors shadow-xs',
                              esVerificarTrato
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-brand-600 hover:bg-brand-700'
                            )}
                          >
                            <span>{botonTexto}</span>
                            <UI_ICONS.chevronRight size={14} />
                          </button>
                        </div>
                      )
                    })()}

                    {/* Chips sugeridos dentro de la respuesta */}
                    {estructurada && estructurada.sugerencias && estructurada.sugerencias.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {estructurada.sugerencias.map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => manejarClickChip(chip)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-ink-300 dark:border-ink-600 bg-cream-50 dark:bg-cream-200 text-ink-800 dark:text-white hover:border-brand-500 hover:text-brand-700 dark:hover:border-emerald-400 dark:hover:text-emerald-300 transition-colors shadow-2xs"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Indicador de carga */}
              {cargando && (
                <div className="flex items-center gap-2 text-xs text-ink-600 py-1">
                  <UI_ICONS.loader size={16} className="animate-spin text-brand-600" />
                  <span>El Asistente Comunal está consultando información...</span>
                </div>
              )}

            </div>

            {/* Notificación de error de voz si aplica */}
            {errorVoz && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <span>{errorVoz}</span>
                <button
                  type="button"
                  onClick={() => setErrorVoz(null)}
                  className="text-amber-600 hover:text-amber-900 ml-2"
                >
                  <UI_ICONS.close size={14} />
                </button>
              </div>
            )}

            {/* Banner de escucha activa */}
            {escuchandoVoz && (
              <div className="px-4 py-2 bg-rose-500 text-white text-xs font-medium flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                  <span>Te estoy escuchando... Habla con tranquilidad.</span>
                </div>
                <button
                  type="button"
                  onClick={alternarReconocimientoVoz}
                  className="text-xs font-bold underline"
                >
                  Terminar
                </button>
              </div>
            )}

            {/* Entrada de texto y botón de voz */}
            <footer className="p-3 border-t border-ink-200 dark:border-ink-700 bg-cream-100 dark:bg-cream-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void manejarEnvio()
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={textoEntrada}
                    onChange={(e) => setTextoEntrada(e.target.value)}
                    placeholder={
                      escuchandoVoz ? 'Escuchando tu voz...' : 'Escribe o presiona el micrófono...'
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-2xl bg-cream-50 dark:bg-cream-200 text-ink-900 dark:text-white border border-ink-200 dark:border-ink-700 focus:border-brand-500 focus:outline-none transition-all placeholder:text-ink-500 dark:placeholder:text-ink-400 shadow-2xs"
                  />

                  {/* Botón de micrófono */}
                  <button
                    type="button"
                    onClick={alternarReconocimientoVoz}
                    title={escuchandoVoz ? 'Detener micrófono' : 'Hablar por micrófono (Voz a texto)'}
                    className={cn(
                      'absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all',
                      escuchandoVoz
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : 'text-ink-600 dark:text-ink-300 hover:text-brand-600 dark:hover:text-emerald-400 hover:bg-cream-200 dark:hover:bg-cream-200'
                    )}
                    aria-label={escuchandoVoz ? 'Detener grabación de voz' : 'Iniciar grabación de voz'}
                  >
                    {escuchandoVoz ? <UI_ICONS.micOff size={18} /> : <UI_ICONS.mic size={18} />}
                  </button>
                </div>

                {/* Botón de envío */}
                <button
                  type="submit"
                  disabled={!textoEntrada.trim() || cargando}
                  className="flex items-center justify-center w-11 h-11 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-900/20 disabled:opacity-40 disabled:pointer-events-none transition-all focus:outline-none focus:ring-2 focus:ring-brand-400"
                  aria-label="Enviar mensaje"
                >
                  <UI_ICONS.send size={18} />
                </button>
              </form>
            </footer>
          </motion.section>
        </div>
      </AnimatePresence>

      {comprobante && (
        <TratoSeguroReceiptModal
          open
          onClose={() => setComprobante(null)}
          order={comprobante}
        />
      )}
    </>
  )
}
