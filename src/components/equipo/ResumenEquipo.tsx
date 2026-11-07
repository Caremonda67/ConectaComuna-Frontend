import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { panelService } from '@/services/panelService'
import {
  type ConteoComuna,
  type Granularidad,
  type PuntoSerie,
  comunasConPresencia,
  inicioDePeriodo,
} from '@/lib/metricasPanel'
import { CardSkeletonList } from '@/components/ui/Skeleton'

/**
 * Las cifras del panel de equipo.
 *
 * Tres reglas de lectura que vienen de cómo se entiende un tablero, y que la
 * primera versión no cumplía:
 *
 * 1. **Un número solo no dice nada.** Cada cifra va con su comparación contra
 *    el periodo anterior y con la forma que trae, no suelta.
 * 2. **Hay que decir qué periodo se está mirando.** El selector manda sobre
 *    todo y el periodo en curso se marca como tal: comparar media semana con
 *    una semana entera es lo que hace que un tablero mienta sin querer.
 * 3. **Poco y ordenado.** Cuatro cifras de cabecera, tres de cobertura y los
 *    avisos aparte. Doce números iguales no se leen.
 *
 * Ninguno de estos números sale de una fila de cliente: Postgres devuelve
 * conteos y nada más.
 */

const PERIODOS: { valor: Granularidad; etiqueta: string; nombre: string }[] = [
  { valor: 'week', etiqueta: 'Semana', nombre: 'esta semana' },
  { valor: 'month', etiqueta: 'Mes', nombre: 'este mes' },
  { valor: 'year', etiqueta: 'Año', nombre: 'este año' },
]

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function nombrePeriodo(iso: string, g: Granularidad): string {
  const [a, m, d] = iso.split('-').map(Number)
  if (g === 'year') return String(a)
  if (g === 'month') return `${MESES[m - 1]} ${a}`
  return `semana del ${d} de ${MESES[m - 1]}`
}

/** Dibuja la forma de la serie en el ancho de una tarjeta. */
function Chispa({ valores, titulo }: { valores: number[]; titulo: string }) {
  if (valores.length < 2) return null
  const tope = Math.max(...valores, 1)
  const paso = 100 / (valores.length - 1)
  const puntos = valores
    .map((v, i) => `${(i * paso).toFixed(1)},${(22 - (v / tope) * 20).toFixed(1)}`)
    .join(' ')
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className="mt-2 h-5 w-full"
      role="img"
      aria-label={titulo}
    >
      <polyline
        points={puntos}
        fill="none"
        stroke="var(--color-brand-600)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Tarjeta({
  titulo,
  total,
  delta,
  deltaAnterior,
  nombrePeriodo: periodo,
  enCurso,
  serie,
  vacio,
  pie,
}: {
  titulo: string
  total: number
  delta: number
  deltaAnterior: number | null
  nombrePeriodo: string
  enCurso: boolean
  serie: number[]
  /** Qué decir cuando todavía no ha pasado nada de esto. */
  vacio: string
  /** Contexto que evita leer el número como si fuera otra cosa. */
  pie?: string
}) {
  const diferencia = deltaAnterior == null ? null : delta - deltaAnterior

  // Sin nada que contar, la comparación con el periodo anterior es ruido:
  // «0 en septiembre · igual que el anterior» parece un fallo, cuando lo que
  // pasa es que el piloto va empezando. Se dice en palabras.
  if (total === 0) {
    return (
      <div className="rounded-xl border border-ink-200 bg-cream-100 p-3">
        <p className="text-sm font-medium text-ink-700">{titulo}</p>
        <p className="mt-0.5 text-3xl font-bold tabular-nums leading-none text-ink-400">0</p>
        <p className="mt-1.5 text-xs text-ink-600">{vacio}</p>
        {pie && <p className="mt-1 text-xs text-ink-600">{pie}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-cream-100 p-3">
      <p className="text-sm font-medium text-ink-700">{titulo}</p>
      <p className="mt-0.5 text-3xl font-bold tabular-nums leading-none text-ink-900">
        {total}
      </p>
      <p className="mt-1.5 text-xs text-ink-700">
        <span className="font-semibold text-ink-900">
          {delta > 0 ? '+' : ''}
          {delta}
        </span>{' '}
        {periodo}
        {enCurso && <span className="text-ink-600"> (va corriendo)</span>}
      </p>
      {diferencia != null && (
        <p className="text-xs text-ink-600">
          {diferencia === 0
            ? 'igual que el anterior'
            : `${diferencia > 0 ? '▲' : '▼'} ${Math.abs(diferencia)} frente al anterior`}
        </p>
      )}
      {pie && <p className="mt-1 text-xs text-ink-600">{pie}</p>}
      <Chispa valores={serie} titulo={`Evolución de ${titulo.toLowerCase()}`} />
    </div>
  )
}

/** Una proporción con su barra: el número y de cuánto, nunca el número solo. */
function Proporcion({
  titulo,
  parte,
  total,
  unidad,
  nota,
}: {
  titulo: string
  parte: number
  total: number
  /** Qué son esos «de N». Sin decirlo, tres tarjetas con «de 22» al lado se
   *  leen como si el 22 fuera lo mismo en las tres, y no lo es. */
  unidad: string
  nota: string
}) {
  // «0 de 0» se lee como un error. Si no hay de qué, se dice que no hay.
  if (total === 0) {
    return (
      <div className="rounded-xl border border-ink-200 bg-cream-100 p-3">
        <p className="text-sm font-medium text-ink-700">{titulo}</p>
        <p className="mt-0.5 text-xl font-bold text-ink-400">Sin datos todavía</p>
        <p className="mt-2 text-xs text-ink-600">{nota}</p>
      </div>
    )
  }

  const pct = Math.round((parte / total) * 100)
  return (
    <div className="rounded-xl border border-ink-200 bg-cream-100 p-3">
      <p className="text-sm font-medium text-ink-700">{titulo}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-ink-900">
        {parte}{' '}
        <span className="text-sm font-normal text-ink-600">
          de {total} {unidad}
        </span>
      </p>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-300"
        role="img"
        aria-label={`${pct} por ciento`}
      >
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-600">{nota}</p>
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
  const actual = inicioDePeriodo(new Date(), granularidad)
  const tope = Math.max(
    ...datos.map((p) => Math.max(p.usuarios, p.negocios, p.clientesActivos)),
    1,
  )

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">
          Altas y actividad por periodo. Son altas del periodo, no acumulados.
        </caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink-600">
            <th scope="col" className="pb-2 font-semibold">Periodo</th>
            <th scope="col" className="pb-2 font-semibold">Usuarios nuevos</th>
            <th scope="col" className="pb-2 font-semibold">Negocios nuevos</th>
            <th scope="col" className="pb-2 font-semibold">Personas pidiendo</th>
            <th scope="col" className="pb-2 font-semibold">Trabajos</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((p) => (
            <tr key={p.periodo} className="border-t border-ink-200">
              <th scope="row" className="py-2 pr-3 text-left font-medium text-ink-800">
                {nombrePeriodo(p.periodo, granularidad)}
                {p.periodo === actual && (
                  <span className="ml-1 text-xs font-normal text-ink-600">· va corriendo</span>
                )}
              </th>
              {[p.usuarios, p.negocios, p.clientesActivos].map((v, i) => (
                <td key={i} className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    <span className="w-6 tabular-nums font-semibold text-ink-900">{v}</span>
                    <span
                      aria-hidden
                      className="h-2 rounded-full bg-brand-600"
                      style={{ width: `${Math.round((v / tope) * 100)}%`, minWidth: v ? 4 : 0 }}
                    />
                  </span>
                </td>
              ))}
              <td className="py-2 tabular-nums text-ink-800">
                {p.pedidosCompletados > 0 || p.pedidos > 0 ? (
                  <>
                    {p.pedidosCompletados} terminados
                    {p.pedidos > p.pedidosCompletados && (
                      <span className="text-ink-600"> de {p.pedidos}</span>
                    )}
                    {p.conTratoSeguro > 0 && (
                      <span className="text-ink-600"> · {p.conTratoSeguro} con Trato Seguro</span>
                    )}
                  </>
                ) : (
                  <span className="text-ink-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ResumenEquipo({
  comunas,
  errorComunas,
}: {
  comunas: ConteoComuna[] | null
  errorComunas?: string | null
}) {
  const [granularidad, setGranularidad] = useState<Granularidad>('month')
  const { data: resumen, loading, error } = useAsync(() => panelService.resumen(), [])
  const { data: serie } = useAsync(() => panelService.serie(granularidad), [granularidad])

  if (loading) return <CardSkeletonList count={1} />
  if (error || !resumen) {
    return (
      <section className="card p-4">
        <p className="text-sm text-ink-700">No se pudieron cargar las cifras. {error}</p>
      </section>
    )
  }

  const puntos = serie ?? []
  const ultimo = puntos.at(-1) ?? null
  const penultimo = puntos.length > 1 ? puntos[puntos.length - 2] : null
  const periodo = PERIODOS.find((p) => p.valor === granularidad)!
  const enCurso = ultimo?.periodo === inicioDePeriodo(new Date(), granularidad)
  // Si el último periodo con actividad no es el de hoy, la tarjeta tiene que
  // decir cuál es. Antes ponía «este mes» encima de los datos de octubre, que
  // es una forma silenciosa de mentir.
  const etiquetaPeriodo = !ultimo
    ? periodo.nombre
    : enCurso
      ? periodo.nombre
      : `en ${nombrePeriodo(ultimo.periodo, granularidad)}`
  const conPresencia = comunas ? comunasConPresencia(comunas) : null
  const avisos = resumen.pqrAbiertas + resumen.resenasNegativas

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 className="font-bold text-ink-900">Cómo va la red</h2>
          <p className="text-xs text-ink-600">
            Conteos: el panel no puede leer ningún pedido ni ningún dato de contacto.
          </p>
        </div>
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

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tarjeta
          titulo="Vecinos"
          vacio="ningún vecino registrado todavía"
          total={resumen.vecinos}
          pie={`${resumen.usuarios} cuentas en total, contando negocios y facilitadores`}
          delta={ultimo?.usuarios ?? 0}
          deltaAnterior={penultimo?.usuarios ?? null}
          nombrePeriodo={etiquetaPeriodo}
          enCurso={enCurso}
          serie={puntos.map((p) => p.usuarios)}
        />
        <Tarjeta
          titulo="Negocios activos"
          vacio="ningún negocio publicado todavía"
          total={resumen.negociosActivos}
          pie={
            resumen.facilitadores === 1
              ? '1 facilitador en la red'
              : `${resumen.facilitadores} facilitadores en la red`
          }
          delta={ultimo?.negocios ?? 0}
          deltaAnterior={penultimo?.negocios ?? null}
          nombrePeriodo={etiquetaPeriodo}
          enCurso={enCurso}
          serie={puntos.map((p) => p.negocios)}
        />
        <Tarjeta
          titulo="Personas pidiendo"
          vacio="todavía nadie ha pedido un servicio"
          total={resumen.clientesUnicos}
          delta={ultimo?.clientesActivos ?? 0}
          deltaAnterior={penultimo?.clientesActivos ?? null}
          nombrePeriodo={etiquetaPeriodo}
          enCurso={enCurso}
          serie={puntos.map((p) => p.clientesActivos)}
        />
        <Tarjeta
          titulo="Trabajos terminados"
          vacio="ningún trabajo cerrado todavía"
          total={resumen.pedidosCompletados}
          delta={ultimo?.pedidosCompletados ?? 0}
          deltaAnterior={penultimo?.pedidosCompletados ?? null}
          nombrePeriodo={etiquetaPeriodo}
          enCurso={enCurso}
          serie={puntos.map((p) => p.pedidosCompletados)}
        />
      </div>

      <h3 className="mt-5 font-semibold text-ink-900">Hasta dónde llegó</h3>
      <p className="text-xs text-ink-600">
        No cambia de una semana a otra: dice qué tanto terreno cubre el proyecto.
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Proporcion
          titulo="Comunas con presencia"
          parte={conPresencia ?? 0}
          // Sin el reparto por comuna no se sabe cuántas hay, y pintar un 0
          // es peor que no pintar nada: un cero inventado se lee como un dato.
          total={conPresencia == null ? 0 : 22}
          unidad="comunas de Cali"
          nota={
            conPresencia == null
              ? errorComunas
                ? `No se pudo calcular: ${errorComunas}`
                : 'Calculando el reparto por comuna…'
              : 'al menos un negocio registrado'
          }
        />
        <Proporcion
          titulo="Con sello en territorio"
          parte={resumen.negociosVerificados}
          total={resumen.negociosActivos}
          nota={
            resumen.facilitadoresActivos === 1
              ? '1 facilitador ha salido a verificar'
              : `${resumen.facilitadoresActivos} facilitadores han salido a verificar`
          }
          unidad="negocios activos"
        />
        <Proporcion
          titulo="Trabajos con Trato Seguro"
          parte={resumen.conTratoSeguro}
          total={resumen.pedidos}
          unidad="trabajos"
          nota="pactaron anticipo con comprobante"
        />
      </div>

      {avisos > 0 ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Por atender:</strong>{' '}
          {resumen.pqrAbiertas > 0 && (
            <>
              {resumen.pqrAbiertas} {resumen.pqrAbiertas === 1 ? 'reporte' : 'reportes'} sin
              resolver
            </>
          )}
          {resumen.pqrAbiertas > 0 && resumen.resenasNegativas > 0 && ' · '}
          {resumen.resenasNegativas > 0 && (
            <>
              {resumen.resenasNegativas}{' '}
              {resumen.resenasNegativas === 1 ? 'reseña negativa' : 'reseñas negativas'}
            </>
          )}
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-600">
          Nada por atender: ningún reporte abierto y ninguna reseña de una o dos estrellas.
        </p>
      )}

      <h3 className="mt-5 font-semibold text-ink-900">Altas por periodo</h3>
      <p className="mt-0.5 text-xs text-ink-600">
        Son <strong>altas de cada periodo</strong>, no acumulados. «Personas pidiendo» cuenta
        personas distintas, no trabajos.
      </p>
      <Serie datos={puntos} granularidad={granularidad} />
    </section>
  )
}
