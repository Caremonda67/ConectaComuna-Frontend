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
    title: pactoActivo ? `Verificación de Pacto #${pactoActivo.codigo} | ConectaComuna` : 'Verificador de Trato Seguro Comunal',
    description: 'Comprueba la autenticidad de pactos de servicio vecinales, anticipos protegidos y mediación JAC.',
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
        setErrorBusqueda('Hubo un inconveniente al consultar el pactoActivo. Intenta nuevamente.')
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
          clases: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        }
      case 'in_progress':
        return {
          texto: 'Trabajo en Ejecución',
          clases: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        }
      case 'accepted':
        return {
          texto: 'Pacto Aceptado por el Taller',
          clases: 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800',
        }
      case 'cancelled':
        return {
          texto: 'Pacto Cancelado',
          clases: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        }
      case 'pending':
      default:
        return {
          texto: 'Solicitud Registrada (Pendiente de inicio)',
          clases: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2 sm:py-6">
      {/* Navegación superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          to="/trato-seguro"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors"
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

      {/* Buscador de código */}
      <div className="card p-4 sm:p-5 border-brand-200 dark:border-brand-900/60 bg-brand-50/50 dark:bg-brand-950/20 print:hidden">
        <form onSubmit={manejarBuscar} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
              <UI_ICONS.shieldCheck size={18} />
            </span>
            <input
              type="text"
              value={codigoBuscado}
              onChange={(e) => setCodigoBuscado(e.target.value)}
              placeholder="Ej: CC-ORD-1 o código de comprobante..."
              className="input pl-10 uppercase font-mono tracking-wider text-sm"
              aria-label="Código de comprobante Trato Seguro"
            />
          </div>
          <Button type="submit" size="md" disabled={cargando} className="shrink-0">
            <UI_ICONS.search size={16} />
            Verificar pacto
          </Button>
        </form>
        <p className="mt-2 text-xs text-ink-500">
          Códigos de prueba rápidos para jurados y vecinos: <button type="button" onClick={() => { setCodigoBuscado('CC-ORD-1'); navigate('/trato-seguro/verificar/CC-ORD-1') }} className="font-mono text-brand-700 underline font-semibold mr-2">CC-ORD-1</button>
          <button type="button" onClick={() => { setCodigoBuscado('CC-ORD-2'); navigate('/trato-seguro/verificar/CC-ORD-2') }} className="font-mono text-brand-700 underline font-semibold">CC-ORD-2</button>
        </p>
      </div>

      {/* Estado: Cargando */}
      {cargando && (
        <div className="card p-10 text-center space-y-4 animate-pulse">
          <div className="h-10 w-10 mx-auto rounded-full bg-brand-200 dark:bg-brand-800" />
          <div className="h-6 w-48 mx-auto bg-ink-200 dark:bg-ink-800 rounded-md" />
          <p className="text-sm text-ink-500">Consultando libro comunal de acuerdos...</p>
        </div>
      )}

      {/* Estado: Error / No encontrado */}
      {!cargando && errorActivo && (
        <div className="card p-6 sm:p-8 border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 space-y-4">
          <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300">
            <UI_ICONS.alert size={24} className="shrink-0" />
            <h2 className="text-lg font-bold">Acuerdo no encontrado o no registrado</h2>
          </div>
          <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
            {errorActivo}
          </p>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-white/70 dark:bg-ink-900/60 p-4 text-xs text-ink-600 dark:text-ink-400 space-y-2">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              🛡️ Por qué es importante esta verificación:
            </p>
            <p>
              En ConectaComuna todo acuerdo vecinal queda registrado para protegerte contra cobros abusivos o pérdidas. Si alguien te pide más del 50% de anticipo por WhatsApp sin comprobante oficial en nuestra plataforma, abstente de pagar y contacta a tu facilitador o comité de la JAC.
            </p>
          </div>
        </div>
      )}

      {/* Estado: Pacto Encontrado y Verificado */}
      {!cargando && pactoActivo && (
        <article className="card overflow-hidden shadow-xl border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 print:shadow-none print:border-none">
          {/* Cabecera oficial del comprobante */}
          <div className="bg-brand-700 dark:bg-brand-900 px-6 py-5 text-white border-b border-brand-800 dark:border-brand-950 print:bg-white print:text-ink-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white">
                  <UI_ICONS.shieldCheck size={20} />
                </span>
                <div>
                  <span className="block font-extrabold text-xs uppercase tracking-widest text-emerald-200 dark:text-emerald-300">
                    Sello Oficial de Autenticidad
                  </span>
                  <h1 className="text-lg sm:text-xl font-extrabold text-white">
                    Pacto Vecinal de Trato Seguro
                  </h1>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-bold bg-white/20 dark:bg-ink-800/80 px-3 py-1 rounded-md border border-white/30 dark:border-white/10 block">
                  #{pactoActivo.codigo}
                </span>
                <span className="text-[11px] text-emerald-100/80 block mt-0.5">
                  Emitido: {formatDate(pactoActivo.created_at)}
                </span>
              </div>
            </div>

            {/* Insignia de estado */}
            <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getEstadoBadge(pactoActivo.status).clases}`}>
                <UI_ICONS.checkCircle size={14} />
                {getEstadoBadge(pactoActivo.status).texto}
              </span>
              <span className="text-xs text-white/90">
                Tope máximo de anticipo protegido: <strong>50%</strong>
              </span>
            </div>
          </div>

          {/* Cuerpo del comprobante */}
          <div className="p-6 sm:p-8 space-y-6 text-ink-900 dark:text-ink-100">
            {/* Las Partes */}
            <section aria-labelledby="partes-titulo" className="space-y-3">
              <h2 id="partes-titulo" className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Partes del Acuerdo Vecinal
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4 bg-cream-50/70 dark:bg-ink-800/40 space-y-2">
                  <span className="text-xs font-semibold text-brand-700 dark:text-brand-300 block">
                    Emprendedor / Taller Comunal
                  </span>
                  <p className="font-bold text-base text-ink-900 dark:text-white">
                    {pactoActivo.business.name}
                  </p>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    Oficio: <span className="font-medium capitalize">{pactoActivo.business.category}</span>
                  </p>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    Zona: {pactoActivo.business.barrio || 'Comuna de Cali'}
                  </p>
                  {pactoActivo.business.phone && (
                    <p className="text-xs text-ink-600 dark:text-ink-400">
                      Contacto: <span className="font-medium">{pactoActivo.business.phone}</span>
                    </p>
                  )}
                  {pactoActivo.business.id && (
                    <div className="pt-2">
                      <Link
                        to={`/negocio/${pactoActivo.business.id}`}
                        className="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                      >
                        Ver ficha del negocio <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4 bg-cream-50/70 dark:bg-ink-800/40 space-y-2">
                  <span className="text-xs font-semibold text-ink-600 dark:text-ink-400 block">
                    Vecino Solicitante (Cliente)
                  </span>
                  <p className="font-bold text-base text-ink-900 dark:text-white">
                    {pactoActivo.client.name}
                  </p>
                  {pactoActivo.client.phone_masked && (
                    <p className="text-xs text-ink-600 dark:text-ink-400">
                      Teléfono verificado: <span className="font-mono font-medium">{pactoActivo.client.phone_masked}</span>
                    </p>
                  )}
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    Modalidad acordada: <span className="font-medium">{pactoActivo.service_location_type === 'home_delivery' ? '🛵 A domicilio' : '🏠 En taller / local'}</span>
                  </p>
                  {pactoActivo.delivery_address && (
                    <p className="text-xs text-ink-600 dark:text-ink-400">
                      Dirección acordada: <span className="font-medium">{pactoActivo.delivery_address}</span>
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
              <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-4 bg-white dark:bg-ink-900 space-y-2">
                <p className="font-bold text-lg text-ink-900 dark:text-white">
                  {pactoActivo.title}
                </p>
                {pactoActivo.description && (
                  <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed italic">
                    "{pactoActivo.description}"
                  </p>
                )}
                {pactoActivo.scheduled_for && (
                  <div className="flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-400 pt-1">
                    <UI_ICONS.calendar size={14} className="text-brand-600" />
                    <span>Compromiso de entrega: <strong>{formatDate(pactoActivo.scheduled_for)}</strong></span>
                  </div>
                )}
              </div>
            </section>

            {/* Blindaje Económico: 50% máx */}
            <section aria-labelledby="economico-titulo" className="space-y-3">
              <h2 id="economico-titulo" className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Condiciones Económicas Protegidas
              </h2>
              <div className="rounded-xl border border-brand-200 dark:border-brand-900/60 bg-cream-50 dark:bg-ink-800/60 p-5 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ink-700 dark:text-ink-300">Presupuesto total del trabajo:</span>
                  <span className="text-lg font-bold text-ink-900 dark:text-white">
                    {formatCurrency(pactoActivo.precio_total)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm text-emerald-800 dark:text-emerald-300">
                  <span className="inline-flex items-center gap-1.5">
                    <UI_ICONS.checkCircle size={15} />
                    Anticipo acordado / entregado (máx. 50%):
                  </span>
                  <span className="font-bold">
                    {formatCurrency(pactoActivo.anticipo)}{' '}
                    <span className="text-xs font-normal">({pactoActivo.porcentaje_anticipo}%)</span>
                  </span>
                </div>

                <div className="border-t border-ink-200 dark:border-ink-700 pt-3 flex justify-between items-center text-base font-extrabold text-ink-900 dark:text-white">
                  <span className="text-brand-800 dark:text-brand-300">
                    Saldo protegido a pagar contra entrega:
                  </span>
                  <span className="text-xl text-brand-700 dark:text-brand-400">
                    {formatCurrency(pactoActivo.saldo_contra_entrega)}
                  </span>
                </div>

                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                  🛡️ <strong>Regla de oro del Trato Seguro:</strong> En ConectaComuna el saldo se paga únicamente cuando el trabajo ha sido terminado y entregado a entera satisfacción del cliente.
                </div>
              </div>
            </section>

            {/* Cláusula de Mediación Vecinal JAC */}
            <section aria-labelledby="jac-titulo" className="rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/70 dark:bg-teal-950/30 p-5 space-y-2">
              <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-bold text-sm">
                <UI_ICONS.handshake size={18} />
                <h3 id="jac-titulo">Cláusula de Respaldo Comunal y Mediación Vecinal</h3>
              </div>
              <p className="text-xs text-teal-900/90 dark:text-teal-200/90 leading-relaxed">
                Este trabajo se rige bajo los principios de buena fe y respeto vecinal. En caso de discrepancia sobre tiempos, materiales o acabado final, ambas partes acuerdan acudir a la mediación amistosa del Comité de Convivencia de la <strong>Junta de Acción Comunal (JAC)</strong> del barrio o a la red de <strong>Facilitadores Comunitarios</strong> antes de cualquier reclamación formal.
              </p>
            </section>

            {/* Código QR Verificable y Enlace Directo */}
            <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-cream-50/50 dark:bg-ink-800/30 p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-2 bg-white rounded-xl shadow-xs border border-ink-200 shrink-0">
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
                <h4 className="text-sm font-bold text-ink-900 dark:text-white">
                  Código QR de Verificación Pública
                </h4>
                <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
                  Cualquier vecino, cliente o líder de la JAC puede escanear este código con su teléfono para corroborar en tiempo real que este acuerdo es auténtico y está protegido por ConectaComuna.
                </p>
                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copiarEnlace}
                    className="text-xs border border-ink-200 dark:border-ink-700"
                  >
                    <UI_ICONS.copy size={14} />
                    {copiado ? '¡Enlace copiado!' : 'Copiar enlace directo'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Acciones */}
          <div className="p-5 bg-cream-50 dark:bg-ink-800/80 border-t border-ink-200 dark:border-ink-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-ink-300 dark:border-ink-700 text-ink-800 dark:text-ink-200 hover:bg-cream-100 dark:hover:bg-ink-700 transition-colors"
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
