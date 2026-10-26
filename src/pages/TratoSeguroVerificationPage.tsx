import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'
import type { PactoVerificado } from '@/types'

export default function TratoSeguroVerificationPage() {
  const { codigo } = useParams<{ codigo?: string }>()
  const navigate = useNavigate()
  const [codigoBuscado, setCodigoBuscado] = useState(codigo || '')
  const [pacto, setPacto] = useState<PactoVerificado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const pactoActivo = codigo ? pacto : null
  const errorActivo = codigo ? errorBusqueda : null

  usePageMeta({
    title: pactoActivo ? `Pacto Verificado #${pactoActivo.codigo} | ConectaComuna` : 'Verificador de Trato Seguro Comunal',
    description: 'Comprueba la autenticidad de pactos de servicio vecinales, anticipos con tope del 50% y mediación JAC.',
  })

  useEffect(() => {
    if (!codigo) return

    let cancelado = false
    const cargar = async () => {
      setCargando(true)
      try {
        const resultado = await orderService.getVerifiableByCode(codigo)
        if (cancelado) return
        if (resultado) {
          setPacto(resultado)
          setErrorBusqueda(null)
        } else {
          setPacto(null)
          setErrorBusqueda(`No se encontró ningún pacto registrado con el código "${codigo}".`)
        }
      } catch {
        if (cancelado) return
        setPacto(null)
        setErrorBusqueda('Hubo un inconveniente al consultar el pacto. Intenta nuevamente.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    void cargar()

    return () => {
      cancelado = true
    }
  }, [codigo])

  const manejarBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    const limpio = codigoBuscado.trim()
    if (!limpio) return
    navigate(`/trato-seguro/verificar/${encodeURIComponent(limpio)}`)
  }

  const urlActual = typeof window !== 'undefined' ? window.location.href : ''
  const urlQr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(urlActual)}`

  const mensajeWhatsApp = pactoActivo
    ? `🤝 *Comprobante de Trato Seguro Verificado - ConectaComuna*
*Código:* #${pactoActivo.codigo}
*Emprendedor:* ${pactoActivo.business.name} (${pactoActivo.business.phone || 'Comuna'})
*Cliente:* ${pactoActivo.client.name}
*Servicio:* ${pactoActivo.title}
*Modalidad:* ${pactoActivo.service_location_type === 'home_delivery' ? 'A domicilio' : 'En taller/local'}
💰 *Valor total:* ${formatCurrency(pactoActivo.precio_total)}
💵 *Anticipo abonado (máx. 50%):* ${formatCurrency(pactoActivo.anticipo)} (${pactoActivo.porcentaje_anticipo}%)
🧾 *Saldo contra entrega:* ${formatCurrency(pactoActivo.saldo_contra_entrega)}

🛡️ *Verificación oficial comunal:*
${urlActual}

_Respaldado por el Trato Seguro Comunal y la mediación comunitaria de la Junta de Acción Comunal (JAC)._`
    : ''

  const compartirWhatsApp = () => {
    if (!mensajeWhatsApp) return
    window.open(`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank', 'noopener,noreferrer')
  }

  const copiarEnlace = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(urlActual)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  const getEstadoBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          texto: 'Trabajo Finalizado a Satisfacción',
          clases: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
        }
      case 'in_progress':
        return {
          texto: 'Trabajo en Ejecución',
          clases: 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700',
        }
      case 'accepted':
        return {
          texto: 'Pacto Aceptado por el Taller',
          clases: 'bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-700',
        }
      case 'cancelled':
        return {
          texto: 'Pacto Cancelado',
          clases: 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700',
        }
      case 'pending':
      default:
        return {
          texto: 'Solicitud Registrada (Pendiente de inicio)',
          clases: 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700',
        }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2 sm:py-6">
      {/* Navegación superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          to="/trato-seguro"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-800 hover:text-brand-900 dark:hover:text-brand-700 transition-colors"
        >
          <span aria-hidden="true">←</span> Volver al Trato Seguro Comunal
        </Link>
        <Link
          to="/explorar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 hover:text-ink-900 transition-colors"
        >
          Explorar otros oficios del barrio <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Apartado buscador de código */}
      <div className="card p-5 sm:p-7 bg-white dark:bg-cream-50 border border-ink-200 shadow-sm space-y-4 print:hidden">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-100 border border-brand-200 dark:border-brand-300 text-xs font-bold text-brand-700 dark:text-brand-800">
            <UI_ICONS.shieldCheck size={16} />
            Verificador Oficial de Trato Seguro Comunal
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink-900 tracking-tight">
            Verifica un acuerdo o comprobante vecinal
          </h2>
          <p className="text-sm text-ink-600 leading-relaxed max-w-xl">
            Ingresa el código oficial o escanea el código QR para comprobar la autenticidad, el tope máximo del 50% de anticipo y el respaldo de la JAC.
          </p>
        </div>

        <form onSubmit={manejarBuscar} className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500">
              <UI_ICONS.shieldCheck size={20} />
            </span>
            <input
              type="text"
              value={codigoBuscado}
              onChange={(e) => setCodigoBuscado(e.target.value)}
              placeholder="Ej: CC-ORD-1 o CC-E9894D7D..."
              className="w-full min-h-12 pl-12 pr-4 rounded-xl border-2 border-brand-300 dark:border-brand-300 bg-white dark:bg-cream-100 text-ink-900 font-mono font-bold tracking-wider text-base uppercase placeholder:text-ink-400 placeholder:normal-case focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 transition-all"
              aria-label="Código de comprobante Trato Seguro"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={cargando}
            className="min-h-12 px-6 shrink-0 font-bold shadow-sm"
          >
            <UI_ICONS.search size={18} />
            Verificar pacto
          </Button>
        </form>

        <div className="pt-3 border-t border-ink-200 flex flex-wrap items-center gap-2 text-xs text-ink-600">
          <span className="font-medium">Códigos de prueba para jurados y vecinos:</span>
          <button
            type="button"
            onClick={() => { setCodigoBuscado('CC-E9894D7D'); navigate('/trato-seguro/verificar/CC-E9894D7D') }}
            className="px-2.5 py-1 rounded-lg bg-cream-200 hover:bg-brand-50 dark:hover:bg-brand-100 text-ink-900 font-mono font-bold border border-ink-200 transition-colors cursor-pointer"
          >
            CC-E9894D7D
          </button>
          <button
            type="button"
            onClick={() => { setCodigoBuscado('CC-ORD-1'); navigate('/trato-seguro/verificar/CC-ORD-1') }}
            className="px-2.5 py-1 rounded-lg bg-cream-200 hover:bg-brand-50 dark:hover:bg-brand-100 text-ink-900 font-mono font-bold border border-ink-200 transition-colors cursor-pointer"
          >
            CC-ORD-1
          </button>
          <button
            type="button"
            onClick={() => { setCodigoBuscado('CC-ORD-2'); navigate('/trato-seguro/verificar/CC-ORD-2') }}
            className="px-2.5 py-1 rounded-lg bg-cream-200 hover:bg-brand-50 dark:hover:bg-brand-100 text-ink-900 font-mono font-bold border border-ink-200 transition-colors cursor-pointer"
          >
            CC-ORD-2
          </button>
        </div>
      </div>

      {/* Estado: Cargando */}
      {cargando && (
        <div className="card p-10 text-center space-y-4 animate-pulse bg-white dark:bg-cream-50 border border-ink-200">
          <div className="h-10 w-10 mx-auto rounded-full bg-brand-200 dark:bg-brand-300" />
          <div className="h-6 w-48 mx-auto bg-cream-200 rounded-md" />
          <p className="text-sm text-ink-500">Consultando libro comunal de acuerdos...</p>
        </div>
      )}

      {/* Estado: Error / No encontrado */}
      {!cargando && errorActivo && (
        <div className="card p-6 sm:p-8 border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 space-y-4">
          <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200">
            <UI_ICONS.alert size={24} className="shrink-0" />
            <h2 className="text-lg font-bold">Acuerdo no encontrado o no registrado</h2>
          </div>
          <p className="text-sm text-ink-800 dark:text-ink-700 leading-relaxed">
            {errorActivo}
          </p>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/80 bg-white/80 dark:bg-cream-50 p-4 text-xs text-ink-700 space-y-2">
            <p className="font-semibold text-amber-950 dark:text-amber-200">
              🛡️ Por qué es importante esta verificación:
            </p>
            <p className="leading-relaxed">
              En ConectaComuna todo acuerdo vecinal queda registrado para protegerte contra cobros abusivos o pérdidas. Si alguien te pide más del 50% de anticipo por WhatsApp sin comprobante oficial en nuestra plataforma, abstente de pagar y contacta a tu facilitador o comité de la JAC.
            </p>
          </div>
        </div>
      )}

      {/* Estado: Pacto Encontrado y Verificado */}
      {!cargando && pactoActivo && (
        <article className="card overflow-hidden shadow-xl border border-ink-200 bg-white dark:bg-cream-50 print:shadow-none print:border-none">
          {/* Cabecera oficial del comprobante */}
          <div className="bg-brand-700 dark:bg-brand-100 px-6 py-5 border-b border-brand-800 dark:border-brand-200 print:bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 dark:bg-brand-200 text-white dark:text-brand-800">
                  <UI_ICONS.shieldCheck size={22} />
                </span>
                <div>
                  <span className="block font-extrabold text-[11px] uppercase tracking-widest text-emerald-200 dark:text-brand-700">
                    Sello Oficial de Autenticidad
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white dark:text-ink-900">
                    Pacto Vecinal de Trato Seguro
                  </h1>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-extrabold bg-white/20 dark:bg-brand-200 text-white dark:text-brand-800 px-3 py-1 rounded-lg border border-white/30 dark:border-brand-300 block">
                  #{pactoActivo.codigo}
                </span>
                <span className="text-[11px] text-emerald-100/90 dark:text-ink-600 block mt-1">
                  Emitido: {formatDate(pactoActivo.created_at)}
                </span>
              </div>
            </div>

            {/* Insignia de estado */}
            <div className="mt-4 pt-3 border-t border-white/20 dark:border-brand-200 flex flex-wrap items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getEstadoBadge(pactoActivo.status).clases}`}>
                <UI_ICONS.checkCircle size={14} />
                {getEstadoBadge(pactoActivo.status).texto}
              </span>
              <span className="text-xs text-white/90 dark:text-ink-700 font-medium">
                Tope máximo de anticipo protegido: <strong className="font-bold text-white dark:text-ink-900">50%</strong>
              </span>
            </div>
          </div>

          {/* Cuerpo del comprobante */}
          <div className="p-6 sm:p-8 space-y-6 text-ink-900">
            {/* Las Partes */}
            <section aria-labelledby="partes-titulo" className="space-y-3">
              <h2 id="partes-titulo" className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Partes del Acuerdo Vecinal
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-ink-200 p-4 bg-cream-50 dark:bg-cream-100 space-y-2">
                  <span className="text-xs font-bold text-brand-700 dark:text-brand-800 block uppercase tracking-wider">
                    Emprendedor / Taller Comunal
                  </span>
                  <p className="font-bold text-base text-ink-900">
                    {pactoActivo.business.name}
                  </p>
                  <p className="text-xs text-ink-600">
                    Oficio: <span className="font-semibold capitalize text-ink-800">{pactoActivo.business.category}</span>
                  </p>
                  <p className="text-xs text-ink-600">
                    Zona: <span className="font-medium text-ink-800">{pactoActivo.business.barrio || 'Comuna de Cali'}</span>
                  </p>
                  {pactoActivo.business.phone && (
                    <p className="text-xs text-ink-600">
                      Contacto: <span className="font-mono font-medium text-ink-800">{pactoActivo.business.phone}</span>
                    </p>
                  )}
                  {pactoActivo.business.id && (
                    <div className="pt-2">
                      <Link
                        to={`/negocio/${pactoActivo.business.id}`}
                        className="text-xs font-bold text-brand-700 dark:text-brand-800 hover:underline inline-flex items-center gap-1"
                      >
                        Ver ficha del negocio <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-ink-200 p-4 bg-cream-50 dark:bg-cream-100 space-y-2">
                  <span className="text-xs font-bold text-ink-500 block uppercase tracking-wider">
                    Vecino Solicitante (Cliente)
                  </span>
                  <p className="font-bold text-base text-ink-900">
                    {pactoActivo.client.name}
                  </p>
                  {pactoActivo.client.phone_masked && (
                    <p className="text-xs text-ink-600">
                      Teléfono verificado: <span className="font-mono font-medium text-ink-800">{pactoActivo.client.phone_masked}</span>
                    </p>
                  )}
                  <p className="text-xs text-ink-600">
                    Modalidad acordada: <span className="font-medium text-ink-800">{pactoActivo.service_location_type === 'home_delivery' ? '🛵 A domicilio' : '🏠 En taller / local'}</span>
                  </p>
                  {pactoActivo.delivery_address && (
                    <p className="text-xs text-ink-600">
                      Dirección acordada: <span className="font-medium text-ink-800">{pactoActivo.delivery_address}</span>
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Servicio Acordado */}
            <section aria-labelledby="servicio-titulo" className="space-y-2">
              <h2 id="servicio-titulo" className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Trabajo o Encargo Acordado
              </h2>
              <div className="rounded-xl border border-ink-200 p-4 bg-white dark:bg-cream-100 space-y-2">
                <p className="font-bold text-lg text-ink-900">
                  {pactoActivo.title}
                </p>
                {pactoActivo.description && (
                  <p className="text-sm text-ink-700 leading-relaxed italic">
                    "{pactoActivo.description}"
                  </p>
                )}
                {pactoActivo.scheduled_for && (
                  <div className="flex items-center gap-1.5 text-xs text-ink-600 pt-1">
                    <UI_ICONS.calendar size={14} className="text-brand-600 dark:text-brand-700" />
                    <span>Compromiso de entrega: <strong className="font-bold text-ink-800">{formatDate(pactoActivo.scheduled_for)}</strong></span>
                  </div>
                )}
              </div>
            </section>

            {/* Blindaje Económico: 50% máx */}
            <section aria-labelledby="economico-titulo" className="space-y-3">
              <h2 id="economico-titulo" className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Condiciones Económicas Protegidas (Trato Seguro)
              </h2>
              <div className="rounded-xl border border-brand-200 dark:border-brand-200 bg-brand-50/70 dark:bg-brand-50 p-5 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ink-700 font-medium">Presupuesto total del trabajo:</span>
                  <span className="text-lg font-bold text-ink-900">
                    {formatCurrency(pactoActivo.precio_total)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm text-emerald-800 dark:text-emerald-300">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <UI_ICONS.checkCircle size={15} />
                    Anticipo acordado / entregado (máx. 50%):
                  </span>
                  <span className="font-bold">
                    {formatCurrency(pactoActivo.anticipo)}{' '}
                    <span className="text-xs font-normal">({pactoActivo.porcentaje_anticipo}%)</span>
                  </span>
                </div>

                <div className="border-t border-ink-200 pt-3 flex justify-between items-center text-base font-extrabold text-ink-900">
                  <span className="text-brand-800 dark:text-brand-800">
                    Saldo protegido a pagar contra entrega:
                  </span>
                  <span className="text-xl text-brand-700 dark:text-brand-700 font-extrabold">
                    {formatCurrency(pactoActivo.saldo_contra_entrega)}
                  </span>
                </div>

                <div className="rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-3 text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  🛡️ <strong>Regla de oro del Trato Seguro:</strong> En ConectaComuna el saldo se paga únicamente cuando el trabajo ha sido terminado y entregado a entera satisfacción del cliente.
                </div>
              </div>
            </section>

            {/* Cláusula de Mediación Vecinal JAC */}
            <section aria-labelledby="jac-titulo" className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 p-5 space-y-2">
              <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-bold text-sm">
                <UI_ICONS.handshake size={18} />
                <h3 id="jac-titulo">Cláusula de Respaldo Comunal y Mediación Vecinal</h3>
              </div>
              <p className="text-xs text-teal-950 dark:text-teal-200 leading-relaxed">
                Este trabajo se rige bajo los principios de buena fe y respeto vecinal. En caso de discrepancia sobre tiempos, materiales o acabado final, ambas partes acuerdan acudir a la mediación amistosa del Comité de Convivencia de la <strong>Junta de Acción Comunal (JAC)</strong> del barrio o a la red de <strong>Facilitadores Comunitarios</strong> antes de cualquier reclamación formal.
              </p>
            </section>

            {/* Código QR Verificable y Enlace Directo */}
            <div className="rounded-2xl border border-ink-200 bg-cream-50 dark:bg-cream-100 p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-3 bg-white rounded-xl shadow-xs border border-ink-200 shrink-0">
                <img
                  src={urlQr}
                  alt={`Código QR oficial del pacto #${pactoActivo.codigo}`}
                  width={140}
                  height={140}
                  className="rounded-lg"
                  loading="lazy"
                />
              </div>
              <div className="space-y-2 text-center sm:text-left flex-1">
                <h4 className="text-sm font-bold text-ink-900">
                  Código QR de Verificación Pública
                </h4>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Cualquier vecino, cliente o líder de la JAC puede escanear este código con su teléfono para corroborar en tiempo real que este acuerdo es auténtico y está protegido por ConectaComuna.
                </p>
                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={copiarEnlace}
                    className="text-xs"
                  >
                    <UI_ICONS.copy size={14} />
                    {copiado ? '¡Enlace copiado!' : 'Copiar enlace directo'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Acciones */}
          <div className="p-5 bg-cream-50 dark:bg-cream-100 border-t border-ink-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => window.print()}
            >
              Imprimir o Guardar PDF
            </Button>

            <div className="flex flex-wrap gap-2">
              {pactoActivo.business.phone && (
                <a
                  href={`https://wa.me/57${pactoActivo.business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te escribo por el Pacto de Trato Seguro #${pactoActivo.codigo} de ConectaComuna.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-ink-200 bg-white dark:bg-cream-50 text-ink-900 hover:bg-cream-100 transition-colors"
                >
                  <UI_ICONS.whatsapp size={16} className="text-emerald-600" />
                  Escribir al taller
                </a>
              )}

              <Button
                type="button"
                size="md"
                onClick={compartirWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <UI_ICONS.whatsapp size={16} />
                Compartir por WhatsApp
              </Button>
            </div>
          </div>
        </article>
      )}
    </div>
  )
}
