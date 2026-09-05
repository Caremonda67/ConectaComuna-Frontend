import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'

const steps = [
  {
    icon: UI_ICONS.search,
    title: 'Explora',
    description: 'Busca el servicio que necesitas por categoría o cercanía en tu comuna.',
  },
  {
    icon: UI_ICONS.handshake,
    title: 'Conecta',
    description: 'Contacta directamente con quien ofrece el servicio, sin intermediarios.',
  },
  {
    icon: UI_ICONS.calendar,
    title: 'Acuerda',
    description: 'Coordina los detalles, el precio y la fecha del trabajo.',
  },
  {
    icon: UI_ICONS.star,
    title: 'Califica',
    description: 'Comparte tu experiencia y ayuda a que otros vecinos decidan mejor.',
  },
]

/** Bloque 7 del diseño: explicación del flujo en cuatro pasos. */
export default function HowItWorksPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-xl">
        <h1 className="text-3xl font-extrabold leading-tight">
          Así de fácil es{' '}
          <span className="text-brand-600">conectar en tu comuna</span>
        </h1>
        <p className="mt-2 text-ink-500">
          Sin comisiones ni intermediarios: tú hablas directo con la persona que ofrece el
          servicio.
        </p>
      </header>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="card p-5">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700"
            >
              <s.icon size={22} strokeWidth={1.75} />
            </span>
            <h2 className="mt-3 font-bold">
              <span className="text-brand-600">{i + 1}.</span> {s.title}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{s.description}</p>
          </li>
        ))}
      </ol>

      <section className="card-soft flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-bold">¿Ofreces un servicio?</h2>
          <p className="text-sm text-ink-700">
            Publica tu oficio y conecta con personas de tu comuna.
          </p>
        </div>
        <Link to="/registro">
          <Button>Publicar servicio</Button>
        </Link>
      </section>
    </div>
  )
}
