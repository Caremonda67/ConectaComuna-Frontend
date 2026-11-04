import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { panelService } from '@/services/panelService'
import type { Granularidad, PuntoSerie } from '@/lib/metricasPanel'
import { CardSkeletonList } from '@/components/ui/Skeleton'

/**
 * Las cifras del panel de equipo.
 *
 * Ninguno de estos números sale de una fila de cliente: Postgres devuelve
 * conteos y nada más. Por eso el panel puede decir «37 clientes tomaron
 * servicios en octubre» sin poder leer un solo pedido.
 */

const PERIODOS: { valor: Granularidad; etiqueta: string }[] = [
  { valor: 'week', etiqueta: 'Semana' },
  { valor: 'month', etiqueta: 'Mes' },
  { valor: 'year', etiqueta: 'Año' },
]

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** `2026-11-02` se lee distinto según lo que agrupe. */
function nombrePeriodo(iso: string, g: Granularidad): string {
  const [a, m, d] = iso.split('-').map(Number)
  if (g === 'year') return String(a)
  if (g === 'month') return `${MESES[m - 1]} ${a}`
  return `semana del ${d} de ${MESES[m - 1]}`
}

function Cifra({
  valor,
  titulo,
  nota,
  alerta,
}: {
  valor: number
  titulo: string
  nota?: string
  alerta?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        alerta && valor > 0
          ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40'
          : 'border-ink-200 bg-cream-100'
      }`}
    >
      <p className="text-2xl font-bold tabular-nums text-ink-900">{valor}</p>
      <p className="text-sm font-medium text-ink-800">{titulo}</p>
      {nota && <p className="mt-0.5 text-xs text-ink-600">{nota}</p>}
    </div>
  )
}

function Serie({ datos, granularidad }: { datos: PuntoSerie[]; granularidad: Granularidad }) {
  if (datos.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink-600">
        Todavía no hay actividad registrada en ningún periodo.
      </p>
    )
  }

  // La barra se escala contra el periodo más alto, no contra un máximo fijo.
  const tope = Math.max(...datos.map((p) => Math.max(p.usuarios, p.negocios, p.clientesActivos)), 1)

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <caption className="sr-only">
          Altas y actividad por periodo. Son altas del periodo, no acumulados.
        </caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink-600">
            <th scope="col" className="pb-2 font-semibold">Periodo</th>
            <th scope="col" className="pb-2 font-semibold">Usuarios</th>
            <th scope="col" className="pb-2 font-semibold">Negocios</th>
            <th scope="col" className="pb-2 font-semibold">Tomando servicios</th>
            <th scope="col" className="pb-2 font-semibold">Pedidos</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((p) => (
            <tr key={p.periodo} className="border-t border-ink-200">
              <th scope="row" className="py-2 pr-3 text-left font-medium text-ink-800">
                {nombrePeriodo(p.periodo, granularidad)}
              </th>
              {[p.usuarios, p.negocios, p.clientesActivos].map((v, i) => (
                <td key={i} className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold text-ink-900 w-6">{v}</span>
                    <span
                      aria-hidden
                      className="h-2 rounded-full bg-brand-600"
                      style={{ width: `${Math.round((v / tope) * 100)}%`, minWidth: v ? 4 : 0 }}
                    />
                  </span>
                </td>
              ))}
              <td className="py-2 tabular-nums text-ink-800">
                {p.pedidos}
                {p.pedidosCompletados > 0 && (
                  <span className="text-ink-600"> · {p.pedidosCompletados} terminados</span>
                )}
                {p.conTratoSeguro > 0 && (
                  <span className="text-ink-600"> · {p.conTratoSeguro} con Trato Seguro</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ResumenEquipo() {
  const [granularidad, setGranularidad] = useState<Granularidad>('month')
  const { data: resumen, loading, error } = useAsync(() => panelService.resumen(), [])
  const { data: serie } = useAsync(() => panelService.serie(granularidad), [granularidad])

  if (loading) return <CardSkeletonList count={1} />
  if (error || !resumen) {
    return (
      <section className="card p-4">
        <p className="text-sm text-ink-700">
          No se pudieron cargar las cifras. {error}
        </p>
      </section>
    )
  }

  return (
    <section className="card p-4">
      <h2 className="font-bold text-ink-900">Cómo va la red</h2>
      <p className="mt-0.5 text-xs text-ink-600">
        Estos números son conteos: el panel no puede leer ningún pedido ni ningún dato de
        contacto de un vecino.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Cifra valor={resumen.usuarios} titulo="Usuarios" nota="total registrados" />
        <Cifra
          valor={resumen.negociosActivos}
          titulo="Negocios activos"
          nota={`${resumen.negocios} registrados en total`}
        />
        <Cifra
          valor={resumen.negociosVerificados}
          titulo="Con sello"
          nota="verificados en territorio"
        />
        <Cifra valor={resumen.pqrAbiertas} titulo="PQR abiertas" nota="sin resolver" alerta />
        <Cifra
          valor={resumen.resenasNegativas}
          titulo="Reseñas negativas"
          nota="de 1 o 2 estrellas"
          alerta
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-ink-900">Altas por periodo</h3>
        <div
          role="group"
          aria-label="Agrupar por"
          className="ml-auto inline-flex rounded-full border border-ink-200 p-0.5"
        >
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              onClick={() => setGranularidad(p.valor)}
              aria-pressed={granularidad === p.valor}
              className={`min-h-9 rounded-full px-3 text-sm font-medium transition-colors ${
                granularidad === p.valor
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-700 hover:bg-cream-200'
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-ink-600">
        Son <strong>altas de cada periodo</strong>, no acumulados. «Tomando servicios»
        cuenta personas distintas, no pedidos.
      </p>

      <Serie datos={serie ?? []} granularidad={granularidad} />
    </section>
  )
}
