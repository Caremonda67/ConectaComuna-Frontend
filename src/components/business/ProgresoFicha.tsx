import { cn } from '@/lib/utils'

export interface PasoFicha {
  /** Ancla de la sección correspondiente. */
  id: string
  etiqueta: string
  listo: boolean
  /** Lo imprescindible para que la ficha sirva de algo. */
  esencial: boolean
}

/**
 * Resumen de cuánto le falta a la ficha.
 *
 * El formulario son seis secciones largas y, antes de esto, la única forma de
 * saber si faltaba algo era bajar hasta el final y recordarlo. Aquí lo que
 * falta se ve de un vistazo y cada pendiente es un botón que salta a su
 * sección: el formulario pasa de muro a lista de tareas.
 */
export function ProgresoFicha({ pasos }: { pasos: PasoFicha[] }) {
  const esenciales = pasos.filter((p) => p.esencial)
  const listos = esenciales.filter((p) => p.listo).length
  const total = esenciales.length
  const pendientes = pasos.filter((p) => !p.listo)
  const completa = listos === total
  const porcentaje = total === 0 ? 100 : Math.round((listos / total) * 100)

  function saltarA(id: string) {
    const destino = document.getElementById(id)
    if (!destino) return
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // El foco también se mueve: si solo se desplaza la página, quien navega
    // con teclado o lector de pantalla se queda donde estaba.
    const campo = destino.querySelector<HTMLElement>('input, textarea, select, button')
    campo?.focus({ preventScroll: true })
  }

  return (
    <section
      aria-labelledby="progreso-ficha"
      className={cn(
        'card p-4 space-y-3',
        completa ? 'border-brand-300 bg-brand-50' : 'border-ink-200',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="progreso-ficha" className="font-bold text-ink-900">
          {completa ? 'Tu ficha está lista para publicarse' : 'Así va tu ficha'}
        </h2>
        <span className="text-sm font-bold text-brand-700" aria-hidden="true">
          {listos} de {total}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={listos}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${listos} de ${total} datos esenciales completos`}
        className="h-2 w-full overflow-hidden rounded-full bg-cream-200"
      >
        <div
          className="h-full rounded-full bg-brand-700 transition-[width] duration-500 ease-out"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {completa ? (
        <p className="text-sm text-ink-600">
          Tienes lo imprescindible. Lo que queda es opcional y sirve para que te encuentren
          mejor.
        </p>
      ) : (
        <p className="text-sm text-ink-600">
          Toca lo que falta para ir directo a llenarlo.
        </p>
      )}

      {pendientes.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {pendientes.map((p) => (
            <li key={p.id + p.etiqueta}>
              <button
                type="button"
                onClick={() => saltarA(p.id)}
                className={cn(
                  'min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors',
                  p.esencial
                    ? 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/60'
                    : 'border-ink-200 bg-cream-100 text-ink-700 hover:bg-cream-200',
                )}
              >
                {p.etiqueta}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
