import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

const ACUERDOS = [
  {
    numero: 1,
    titulo: 'Pago contra entrega o servicio terminado',
    resumen: 'Paga cuando veas el trabajo listo. Si se necesitan materiales, pacten un anticipo razonable con recibo.',
    detalle:
      'Evita transferir el valor total por adelantado a personas que no conozcas en persona. En oficios que exigen comprar materiales antes (como telas para modistería, cerraduras nuevas o pintura), acuerden un anticipo máximo del 50% y pide copia o foto de la factura del almacén.',
    icon: UI_ICONS.handshake,
    badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60',
  },
  {
    numero: 2,
    titulo: 'Precio y alcance claros desde el primer mensaje',
    resumen: 'Deja por escrito en WhatsApp el valor total, qué incluye y para qué fecha queda listo.',
    detalle:
      'Antes de autorizar el trabajo, pide confirmación escrita: ¿el precio incluye mano de obra y repuestos?, ¿cuánto tarda?, ¿hay costo por revisión o visita a domicilio? Tener el acuerdo en el chat evita malos entendidos al momento de cobrar.',
    icon: UI_ICONS.message,
    badgeColor: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800/60',
  },
  {
    numero: 3,
    titulo: 'Puntos de encuentro y visitas seguras',
    resumen: 'Para entregas de ropa o artículos, acuerda sitios concurridos del barrio. En visitas, confirma la identidad.',
    detalle:
      'Si vas a llevar prendas, calzado o electrodomésticos para reparación, acude directamente a la dirección publicada del taller o acuerden un punto visible y transitado (el parque, la panadería o la estación del MÍO). Si el servicio es a domicilio, avisa a alguien en tu casa sobre la visita.',
    icon: UI_ICONS.map,
    badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60',
  },
  {
    numero: 4,
    titulo: 'Cumplimiento y aviso oportuno de imprevistos',
    resumen: 'Si una máquina falla o la tela tarda, la sinceridad salva la clientela.',
    detalle:
      'El compromiso del trabajador es entregar a tiempo y con calidad. Pero los imprevistos pasan en cualquier taller: si surge una demora, avisar al cliente con anticipación demuestra seriedad y respeto por el tiempo del vecino.',
    icon: UI_ICONS.calendar,
    badgeColor: 'bg-brand-100 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 border-brand-300 dark:border-brand-800/60',
  },
  {
    numero: 5,
    titulo: 'Garantía del oficio y diálogo vecinal',
    resumen: 'Si algo no quedó a gusto, la primera vía siempre es conversar con calma para hacer el ajuste.',
    detalle:
      'Todo trabajo bien hecho merece respaldo. Si una costura quedó ajustada o una chapa presenta dificultad, habla de inmediato con la persona que lo hizo. En el barrio la reputación se construye respondiendo con buena actitud.',
    icon: UI_ICONS.shieldCheck,
    badgeColor: 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800/60',
  },
]

const CONSEJOS_CLIENTE = [
  'Pide fotos de trabajos anteriores o revisa las opiniones de otros vecinos en la ficha.',
  'Pregunta con claridad si los materiales y el transporte están incluidos en el presupuesto.',
  'Verifica el estado del trabajo con la persona antes de entregar el pago final.',
  'Califica y deja un comentario sincero en la plataforma: tus palabras ayudan a que buenos oficios del barrio prosperen.',
]

const CONSEJOS_EMPRENDEDOR = [
  'Fija tarifas justas y transparentes; no varíes el cobro según quién te escriba.',
  'Explica qué garantía das si algo no queda a gusto del cliente.',
  'Si te retrasas por causas de fuerza mayor, avisa antes de la hora fijada.',
  'Trata con respeto y paciencia, en especial a personas mayores o vecinos sin experiencia digital.',
]

const FAQS = [
  {
    q: '¿ConectaComuna cobra alguna comisión por los contactos o ventas?',
    a: 'No. El contacto es 100% directo y gratuito. Todo el dinero del trabajo va completo a las manos del emprendedor.',
  },
  {
    q: '¿Qué significa el distintivo "Verificado en territorio"?',
    a: 'Indica que un facilitador o líder comunitario visitó físicamente el taller o punto de atención en la comuna, validando la identidad del emprendedor y la existencia de su oficio.',
  },
  {
    q: '¿Qué hago si una persona incumple o me cobra algo no pactado?',
    a: 'Primero, revisa el mensaje inicial de WhatsApp donde acordaron el precio. Si la persona se niega a responder, utiliza el botón "Reportar" ubicado en su perfil para que el equipo de moderación revise el caso.',
  },
  {
    q: '¿Puedo pedir apoyo a un facilitador para comunicarme?',
    a: 'Sí. Los facilitadores de ConectaComuna acompañan a emprendedores y vecinos con poca experiencia digital para facilitar el contacto respetuoso.',
  },
]

export default function TratoSeguroPage() {
  const { profile } = useAuth()
  const [rolPestana, setRolPestana] = useState<'cliente' | 'emprendedor'>('cliente')

  usePageMeta({
    title: 'Trato Seguro Comunal',
    description: 'Pautas de confianza vecinal: anticipos con tope del 50%, precios claros y acuerdos respetados.',
  })

  const destination = profile
    ? profile.account_type === 'client'
      ? '/panel'
      : '/panel/negocio'
    : '/registro'

  return (
    <div className="mx-auto max-w-4xl space-y-10 py-2 sm:py-4">
      {/* Cabecera */}
      <header className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors"
        >
          <span aria-hidden="true">←</span> Volver al inicio
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800 border border-brand-200">
            <UI_ICONS.shieldCheck size={14} className="text-brand-700" />
            Pacto vecinal de confianza
          </span>
          <span className="text-xs text-ink-500">Uso ético y protección local</span>
        </div>

        <h1 className="text-3xl font-extrabold sm:text-4xl text-ink-900 leading-tight">
          Trato Seguro Comunal
        </h1>
        <p className="max-w-2xl text-base text-ink-600 sm:text-lg leading-relaxed">
          En ConectaComuna creemos en la palabra de la gente del barrio. Este pacto reúne pautas
          claras de respeto, acuerdos de pago y convivencia para que cada trabajo se haga con
          tranquilidad y sin intermediarios.
        </p>
      </header>

      {/* Los 5 acuerdos */}
      <section aria-labelledby="acuerdos-titulo" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-xs">
            <UI_ICONS.checkCircle size={20} />
          </div>
          <div>
            <h2 id="acuerdos-titulo" className="text-xl font-bold text-ink-900">
              Los 5 acuerdos del Trato Seguro
            </h2>
            <p className="text-xs text-ink-500">
              Compromisos sencillos que aplican tanto a clientes como a trabajadores locales.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ACUERDOS.map((acuerdo) => {
            const Icon = acuerdo.icon
            return (
              <article
                key={acuerdo.numero}
                className="card flex flex-col justify-between p-5 transition-shadow hover:shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border',
                        acuerdo.badgeColor,
                      )}
                    >
                      {acuerdo.numero}
                    </span>
                    <span className="text-ink-400">
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink-900 leading-snug">
                    {acuerdo.titulo}
                  </h3>
                  <p className="text-xs font-medium text-brand-800 bg-brand-50 p-2 rounded-lg border border-brand-200">
                    {acuerdo.resumen}
                  </p>
                  <p className="text-xs text-ink-600 leading-relaxed">{acuerdo.detalle}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* Pestañas: Consejos prácticos por rol */}
      <section aria-labelledby="consejos-titulo" className="card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-ink-100 pb-4">
          <div>
            <h2 id="consejos-titulo" className="text-lg font-bold text-ink-900">
              Pautas según cómo uses la plataforma
            </h2>
            <p className="text-xs text-ink-500">
              Recomendaciones prácticas para cuidar tu experiencia en el barrio.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Seleccionar rol para recomendaciones"
            className="inline-flex rounded-xl bg-cream-200 p-1 border border-ink-200"
          >
            <button
              role="tab"
              aria-selected={rolPestana === 'cliente'}
              onClick={() => setRolPestana('cliente')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95',
                rolPestana === 'cliente'
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'text-ink-700 hover:text-ink-900 hover:scale-[1.02]',
              )}
            >
              Soy cliente
            </button>
            <button
              role="tab"
              aria-selected={rolPestana === 'emprendedor'}
              onClick={() => setRolPestana('emprendedor')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95',
                rolPestana === 'emprendedor'
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'text-ink-700 hover:text-ink-900 hover:scale-[1.02]',
              )}
            >
              Ofrezco un servicio
            </button>
          </div>
        </div>

        <div>
          {rolPestana === 'cliente' ? (
            <ul className="space-y-3">
              {CONSEJOS_CLIENTE.map((consejo, i) => (
                <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-ink-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold mt-0.5 border border-brand-200">
                    ✓
                  </span>
                  <span>{consejo}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {CONSEJOS_EMPRENDEDOR.map((consejo, i) => (
                <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-ink-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold mt-0.5 border border-brand-200">
                    ✓
                  </span>
                  <span>{consejo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Qué significan las insignias de confianza */}
      <section aria-labelledby="insignias-titulo" className="space-y-4">
        <h2 id="insignias-titulo" className="text-xl font-bold text-ink-900">
          Señales de confianza en las fichas
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-4 space-y-2 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
              <UI_ICONS.shieldCheck size={18} />
              <span>Verificado en territorio</span>
            </div>
            <p className="text-xs text-ink-600">
              Un facilitador comprobó presencialmente que el taller o negocio existe físicamente en
              la comuna.
            </p>
          </div>

          <div className="card p-4 space-y-2 border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-semibold text-sm">
              <UI_ICONS.star size={18} />
              <span>Reseñas de la comunidad</span>
            </div>
            <p className="text-xs text-ink-600">
              Calificaciones de vecinos que ya contrataron el servicio. Reflejan cumplimiento y
              trato recibido.
            </p>
          </div>

          <div className="card p-4 space-y-2 border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/30">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-semibold text-sm">
              <UI_ICONS.person size={18} />
              <span>Acompañamiento facilitador</span>
            </div>
            <p className="text-xs text-ink-600">
              Apoyo a personas mayores o artesanos que requieren ayuda para coordinar su catálogo
              digital.
            </p>
          </div>
        </div>
      </section>

      {/* Qué hacer si surge un desacuerdo */}
      <section aria-labelledby="resolucion-titulo" className="card p-6 space-y-4 bg-cream-50 dark:bg-cream-100/50">
        <div className="flex items-center gap-2 text-ink-900">
          <UI_ICONS.alert size={20} className="text-amber-600 dark:text-amber-400" />
          <h2 id="resolucion-titulo" className="text-lg font-bold">
            ¿Qué hacer si surge un problema o desacuerdo?
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-xs text-ink-700">
          <div className="rounded-xl bg-white dark:bg-cream-100 p-3.5 border border-ink-100 dark:border-ink-200 space-y-1">
            <strong className="block text-ink-900 font-semibold">1. Conversar con calma</strong>
            <p className="text-ink-600">
              Revisa lo hablado en el chat inicial. Casi siempre los desacuerdos se deben a una
              confusión de horarios o especificaciones.
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-cream-100 p-3.5 border border-ink-100 dark:border-ink-200 space-y-1">
            <strong className="block text-ink-900 font-semibold">2. Pedir la garantía</strong>
            <p className="text-ink-600">
              Pide amablemente la corrección del trabajo en un plazo prudente. Un buen oficio
              responde siempre por su labor.
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-cream-100 p-3.5 border border-ink-100 dark:border-ink-200 space-y-1">
            <strong className="block text-ink-900 font-semibold">3. Reportar en la app</strong>
            <p className="text-ink-600">
              Si detectas engaño o negativa injustificada, usa el botón "Reportar negocio" o
              escríbenos a la línea comunitaria de WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section aria-labelledby="faqs-titulo" className="space-y-3">
        <div className="flex items-center gap-2">
          <UI_ICONS.helpCircle size={20} className="text-brand-700" />
          <h2 id="faqs-titulo" className="text-xl font-bold text-ink-900">
            Preguntas sobre seguridad comunitaria
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="card p-4 space-y-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">{faq.q}</h3>
              <p className="text-xs text-ink-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pie de acción */}
      <section className="card-soft flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Conectemos con confianza en el barrio</h2>
          <p className="text-xs sm:text-sm text-ink-600 mt-0.5">
            Explora los oficios cercanos o publica tu servicio respaldado por el Trato Seguro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/explorar">
            <Button variant="secondary">Explorar oficios</Button>
          </Link>
          <Link to={destination}>
            <Button>Publicar servicio</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
