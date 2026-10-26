import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { useAsistente } from '@/hooks/useAsistente'
import { useAuth } from '@/hooks/useAuth'
import { leerUbicacion } from '@/lib/ubicacion'
import { UI_ICONS, CATEGORY_ICONS } from '@/components/ui/icons'
import { enviarMensajeAsistente } from '@/services/aiService'
import { businessService } from '@/services/businessService'
import type { MensajeChat, NegocioSugeridoAi, ServicioSugeridoAi } from '@/types/ai'
import type { ServiceCatalogItem } from '@/types'
import { cn } from '@/lib/utils'

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

function crearSaludoInicial(barrio: string): MensajeChat {
  return {
    id: 'bienvenida',
    emisor: 'asistente',
    fecha: new Date(),
    texto: `¡Hola vecino de ${barrio}! Soy tu Asistente Comunal.
Puedo colaborarte para:
• 📍 Encontrar oficios de confianza cerca de ti (con tu ubicación actual).
• 🎙️ Dictar tus servicios con la voz para tu catálogo si no puedes escribir rápido.
• 🛡️ Entender cómo te protege el Trato Seguro y la regla del 50% de anticipo.

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
  const { business, refresh } = useAuth()
  const navigate = useNavigate()
  const prefersReduced = useReducedMotion()

  const ubicacion = leerUbicacion()
  const barrioActivo = ubicacion?.etiqueta || 'Antonio Nariño'

  const [mensajes, setMensajes] = useState<MensajeChat[]>(() => [
    crearSaludoInicial(barrioActivo),
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

  const reconocimientoRef = useRef<IWindowSpeechRecognition | null>(null)
  const finalScrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

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
      utterance.rate = 1.0

      const voces = window.speechSynthesis.getVoices()
      const vozEspanol = voces.find((v) => v.lang.startsWith('es-') || v.lang === 'es')
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

      try {
        const respuestaAi = await enviarMensajeAsistente(texto, [...mensajes, nuevoMensajeUsuario])

        const idRespuesta = `ai-${Date.now()}`
        const nuevoMensajeAi: MensajeChat = {
          id: idRespuesta,
          emisor: 'asistente',
          texto: respuestaAi.mensaje,
          fecha: new Date(),
          respuestaEstructurada: respuestaAi,
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
    [textoEntrada, cargando, escuchandoVoz, mensajes, ttsActivo, detenerLecturaVoz, leerTextoEnVozAlta]
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

  // Desplazar al último mensaje
  useEffect(() => {
    if (isOpen) {
      finalScrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
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
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          textoTranscribiendo += event.results[i][0].transcript
        }
        setTextoEntrada(textoTranscribiendo)
      }

      recognition.onerror = (event: any) => {
        console.warn('Error en reconocimiento de voz:', event.error)
        setEscuchandoVoz(false)
        if (event.error === 'not-allowed') {
          setErrorVoz('Permiso de micrófono denegado. Habilítalo en tu navegador para dictar.')
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
      navigate('/panel/negocio')
      cerrarAsistente()
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
    } catch (err) {
      console.error('Error al guardar servicio en catálogo:', err)
    } finally {
      setGuardandoServicioId(null)
    }
  }

  // Reiniciar conversación
  const reiniciarConversacion = () => {
    detenerLecturaVoz()
    setMensajes([crearSaludoInicial(barrioActivo)])
    setErrorVoz(null)
  }

  if (!isOpen) return null

  return (
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
          className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm sm:hidden pointer-events-auto"
        />

        {/* Ventana de chat */}
        <motion.section
          role="dialog"
          aria-label="Asistente Comunal"
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="pointer-events-auto relative flex flex-col w-full sm:w-[440px] h-[85vh] sm:h-[650px] max-h-[92vh] bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Encabezado */}
          <header className="flex items-center justify-between px-4 py-3.5 border-b border-ink-200 dark:border-ink-800 bg-brand-50/70 dark:bg-brand-950/30">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-900/20">
                <UI_ICONS.bot size={22} className="stroke-[2.2] text-amber-300" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-ink-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-ink-900 dark:text-ink-100 leading-tight">
                    Asistente Comunal
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300">
                    IA Vecinal
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-ink-600 dark:text-ink-400">
                  <UI_ICONS.map size={12} className="text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {barrioActivo} (Cali)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Toggle lectura de voz (TTS) */}
              <button
                type="button"
                onClick={toggleTts}
                title={ttsActivo ? 'Desactivar lectura en voz alta' : 'Activar lectura automática en voz alta'}
                className={cn(
                  'p-2 rounded-xl transition-colors',
                  ttsActivo
                    ? 'bg-brand-200 dark:bg-brand-800/60 text-brand-900 dark:text-brand-100'
                    : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100 dark:hover:bg-ink-800'
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
                className="p-2 rounded-xl text-ink-500 hover:text-ink-900 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
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
                className="p-2 rounded-xl text-ink-500 hover:text-ink-900 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                aria-label="Cerrar chat"
              >
                <UI_ICONS.close size={20} />
              </button>
            </div>
          </header>

          {/* Área de mensajes con scroll */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
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
                      'max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap',
                      esUsuario
                        ? 'bg-brand-600 text-white rounded-tr-none shadow-sm'
                        : 'bg-ink-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 rounded-tl-none border border-ink-200 dark:border-ink-700'
                    )}
                  >
                    {m.texto}

                    {/* Botón de reproducción de audio para mensajes del asistente */}
                    {!esUsuario && m.texto && (
                      <div className="mt-2 pt-2 border-t border-ink-200/60 dark:border-ink-700/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => leerTextoEnVozAlta(m.texto, m.id)}
                          className="flex items-center gap-1.5 text-xs text-brand-700 dark:text-brand-300 font-medium hover:underline focus:outline-none"
                        >
                          <UI_ICONS.volume size={14} />
                          {hablandoId === m.id ? 'Pausar audio' : 'Escuchar respuesta'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tarjetas de acción estructurada del Asistente */}
                  {estructurada && estructurada.tipo === 'negocios' && estructurada.negociosSugeridos && (
                    <div className="mt-3 w-full max-w-[95%] space-y-2">
                      <div className="text-xs font-semibold text-ink-600 dark:text-ink-400 px-1">
                        Negocios recomendados cerca de tu barrio:
                      </div>
                      {estructurada.negociosSugeridos.map((negocio: NegocioSugeridoAi) => {
                        const CategoryIcon =
                          CATEGORY_ICONS[negocio.categoria as keyof typeof CATEGORY_ICONS] ||
                          UI_ICONS.store

                        return (
                          <div
                            key={negocio.id}
                            className="card p-3 border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-850 rounded-2xl shadow-sm hover:border-brand-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                                  <CategoryIcon size={18} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-ink-900 dark:text-ink-100 text-sm leading-snug">
                                    {negocio.nombre}
                                  </h4>
                                  <div className="flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-400 mt-0.5">
                                    <span>{negocio.barrio || barrioActivo}</span>
                                    {negocio.distanciaMetros && (
                                      <>
                                        <span>•</span>
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
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
                                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0"
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
                                className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl bg-ink-100 dark:bg-ink-800 text-ink-800 dark:text-ink-200 hover:bg-ink-200 text-center transition-colors"
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
                                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
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
                    <div className="mt-3 w-full max-w-[95%] card p-4 border-2 border-brand-300 dark:border-brand-700/60 bg-brand-50/50 dark:bg-brand-950/20 rounded-2xl">
                      <div className="flex items-center gap-2 text-xs font-bold text-brand-800 dark:text-brand-300 uppercase tracking-wider mb-2">
                        <UI_ICONS.checkCircle size={15} />
                        Servicio identificado para tu catálogo
                      </div>

                      <div className="font-bold text-ink-900 dark:text-ink-100 text-base">
                        {estructurada.servicio.titulo}
                      </div>

                      <p className="text-xs text-ink-700 dark:text-ink-300 mt-1 leading-relaxed">
                        {estructurada.servicio.descripcion}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-ink-500">Precio estimado:</span>
                        <span className="text-sm font-extrabold text-brand-800 dark:text-brand-300">
                          ${estructurada.servicio.precioSugerido.toLocaleString('es-CO')} COP
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-800/60 flex flex-col gap-2">
                        {servicioGuardadoId === m.id ? (
                          <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl">
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

                  {/* Tarjeta de navegación rápida */}
                  {estructurada && estructurada.tipo === 'navegacion' && estructurada.rutaNavegacion && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          navigate(estructurada.rutaNavegacion!)
                          cerrarAsistente()
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors shadow-sm"
                      >
                        <UI_ICONS.compass size={16} />
                        Ir a la sección
                      </button>
                    </div>
                  )}

                  {/* Chips sugeridos dentro de la respuesta */}
                  {estructurada && estructurada.sugerencias && estructurada.sugerencias.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {estructurada.sugerencias.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => manejarEnvio(chip)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
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
              <div className="flex items-center gap-2 text-xs text-ink-500 py-1">
                <UI_ICONS.loader size={16} className="animate-spin text-brand-600" />
                <span>El Asistente Comunal está consultando información...</span>
              </div>
            )}

            <div ref={finalScrollRef} />
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
          <footer className="p-3 border-t border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900">
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
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-2xl bg-ink-100 dark:bg-ink-800 text-ink-900 dark:text-ink-100 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-ink-850 focus:outline-none transition-all placeholder:text-ink-400"
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
                      : 'text-ink-500 hover:text-brand-600 hover:bg-ink-200/50 dark:hover:bg-ink-700'
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
  )
}
