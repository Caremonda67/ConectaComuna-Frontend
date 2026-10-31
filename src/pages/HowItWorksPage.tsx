import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Button } from '@/components/ui/Button'
import { UI_ICONS, type LucideIcon } from '@/components/ui/icons'
import { ORDER_STATUS_LABEL, cn } from '@/lib/utils'
import { useRotacion } from '@/hooks/useRotacion'

interface Paso {
  icon: LucideIcon
  title: string
  description: string
}

/**
 * La página explicaba cuatro pasos genéricos (Explora, Conecta, Acuerda,
 * Califica) que servían para cualquier directorio. Hoy la aplicación tiene dos
 * lados con recorridos distintos, un comprobante verificable y una máquina de
 * estados real, así que lo que se cuenta aquí es eso y no una idea general.
 */
const BUSCA: Paso[] = [
  {
    icon: UI_ICONS.search,
    title: 'Busca el oficio',
    description:
      'Por categoría, por cercanía a tu barrio o preguntándole al asistente, que también te escucha por voz.',
  },
  {
    icon: UI_ICONS.whatsapp,
    title: 'Escribe directo',
    description:
      'Hablas por WhatsApp con la persona que hace el trabajo. ConectaComuna no cobra comisión ni se mete en medio del trato.',
  },
  {
    icon: UI_ICONS.shieldCheck,
    title: 'Dejen constancia del acuerdo',
    description:
      'El precio y el alcance quedan por escrito y el anticipo nunca pasa del 50%. Les queda un código de Trato Seguro que cualquiera puede verificar.',
  },
  {
    icon: UI_ICONS.star,
    title: 'Califica al terminar',
    description:
      'Tu reseña entra en el promedio del negocio, que se recalcula solo. Nadie escribe esas cifras a mano.',
  },
]

const OFRECE: Paso[] = [
  {
    icon: UI_ICONS.store,
    title: 'Publica tu oficio',
    description:
      'Nombre, categoría, fotos, horario y tu punto en el mapa. Funciona en cualquier barrio o municipio de Colombia, no solo en la comuna del piloto.',
  },
  {
    icon: UI_ICONS.inbox,
    title: 'Recibe los pedidos',
    description:
      'Llegan a tu panel en el momento en que alguien los hace, sin que tengas que recargar la pantalla.',
  },
  {
    icon: UI_ICONS.dashboard,
    title: 'Lleva el trabajo por estados',
    description:
      'Cada pedido avanza de uno en uno y el cambio lo valida la base de datos, no la pantalla: nadie puede saltarse un paso.',
  },
  {
    icon: UI_ICONS.person,
    title: 'Gana reputación en territorio',
    description:
      'Un facilitador de la red visita tu taller y firma el sello. Nadie puede sellarse a sí mismo: el sistema lo impide.',
  },
]

const ESTADOS = ['pending', 'accepted', 'in_progress', 'completed'] as const

function ListaDePasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {pasos.map((s, i) => (
        <li key={s.title} className="card p-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700"
          >
            <s.icon size={22} strokeWidth={1.75} />
          </span>
          <h3 className="mt-3 font-bold">
            <span className="text-brand-700">{i + 1}.</span> {s.title}
          </h3>
          <p className="mt-1 text-sm text-ink-500">{s.description}</p>
        </li>
      ))}
    </ol>
  )
}

export default function HowItWorksPage() {
  usePageMeta({
    title: 'Cómo Funciona · ConectaComuna',
    description:
      'Cómo funciona ConectaComuna paso a paso: busca oficios de tu barrio, contacta directo por WhatsApp y respalda el acuerdo con un comprobante de Trato Seguro verificable.',
  })

  const { profile } = useAuth()
  const encendido = useRotacion(ESTADOS.length, 1100)

  const destination = profile
    ? profile.account_type === 'client'
      ? '/panel'
      : '/panel/negocio'
    : '/registro'

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold leading-tight">
          Así de fácil es <span className="text-brand-600">conectar en tu comuna</span>
        </h1>
        <p className="mt-2 text-ink-500">
          ConectaComuna es un directorio de oficios y pequeños negocios de barrio. Tiene dos
          lados: el de quien necesita un trabajo y el de quien lo hace. Sin comisiones ni
          intermediarios.
        </p>
      </header>

      <section aria-labelledby="busca" className="space-y-4">
        <h2 id="busca" className="text-xl font-bold">
          Si necesitas un servicio
        </h2>
        <ListaDePasos pasos={BUSCA} />
      </section>

      <section aria-labelledby="ofrece" className="space-y-4">
        <h2 id="ofrece" className="text-xl font-bold">
          Si ofreces tu oficio
        </h2>
        <ListaDePasos pasos={OFRECE} />
      </section>

      {/* Los estados salen de la misma constante que pinta las insignias en el
          panel: si mañana cambia la máquina de estados, esta página no miente. */}
      <section aria-labelledby="estados" className="card p-6 space-y-3">
        <h2 id="estados" className="text-lg font-bold">
          El recorrido de un pedido
        </h2>
        <p className="text-sm text-ink-500">
          Las dos partes ven el mismo estado al mismo tiempo, y solo se avanza de uno en uno:
        </p>
        <ol className="flex flex-wrap items-center gap-2 pt-1">
          {ESTADOS.map((estado, i) => (
            <li key={estado} className="flex items-center gap-2">
              {/* Se encienden en orden: así la fila se lee como una secuencia y
                  no como cuatro etiquetas sueltas. Con movimiento reducido el
                  índice se queda en 0 y simplemente no avanza. */}
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-semibold transition-colors duration-500',
                  // `brand-700` es verde oscuro en claro pero verde claro en
                  // oscuro: la escala no es un espejo. Con blanco encima da
                  // 5,13:1 en claro y 1,68:1 en oscuro, así que en oscuro el
                  // texto tiene que ser el tono oscuro de la escala (9,71:1).
                  i === encendido
                    ? 'border-brand-700 bg-brand-700 text-white dark:text-brand-50'
                    : 'border-brand-200 bg-brand-50 text-brand-800',
                )}
              >
                {ORDER_STATUS_LABEL[estado]}
              </span>
              {i < ESTADOS.length - 1 && (
                <UI_ICONS.chevronRight
                  aria-hidden="true"
                  size={16}
                  className="shrink-0 text-ink-400"
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Sección destacada de Trato Seguro Comunal */}
      <section className="card p-6 border-brand-200 bg-brand-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white dark:text-brand-50 shadow-xs">
            <UI_ICONS.shieldCheck size={26} strokeWidth={2} />
          </span>
          <div className="space-y-1">
            <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800 border border-brand-200">
              Pacto de confianza local
            </span>
            <h2 className="text-xl font-bold text-ink-900">Trato Seguro Comunal</h2>
            <p className="text-xs sm:text-sm text-ink-600 max-w-xl leading-relaxed">
              Pago contra entrega, anticipo máximo del 50%, precio por escrito y verificación
              presencial en el barrio. El comprobante lleva un código que cualquiera puede
              consultar sin tener cuenta, y si algo sale mal el equipo revisa el caso con las dos
              partes.
            </p>
          </div>
        </div>
        <Link to="/trato-seguro" className="shrink-0 w-full sm:w-auto">
          <Button variant="secondary" fullWidth className="border-brand-200 hover:bg-brand-100">
            Ver los 5 acuerdos
          </Button>
        </Link>
      </section>

      <section className="card-soft flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-bold">¿Ofreces un servicio?</h2>
          <p className="text-sm text-ink-700">
            Publica tu oficio y conecta con personas de tu comuna.
          </p>
        </div>
        <Link to={destination}>
          <Button>Publicar servicio</Button>
        </Link>
      </section>
    </div>
  )
}
