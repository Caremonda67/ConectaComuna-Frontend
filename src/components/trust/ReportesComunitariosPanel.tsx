import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { businessService } from '@/services/businessService'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'
import type { EstadoReporte, MotivoReporte, ReporteComunitario } from '@/types'
import { RowSkeletonList } from '@/components/ui/Skeleton'

const MOTIVOS: Record<MotivoReporte, string> = {
  direccion_falsa: 'La dirección no existe',
  anticipo_incumplido: 'Recibió anticipo y no cumplió',
  precios_enganosos: 'Precios engañosos',
  suplantacion: 'Suplantación de identidad',
  otro: 'Otro motivo',
}

const ESTADO: Record<EstadoReporte, { texto: string; clase: string }> = {
  pendiente: {
    texto: 'Sin revisar',
    clase: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200',
  },
  revisado: {
    texto: 'Confirmado',
    clase: 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200',
  },
  descartado: {
    texto: 'Descartado',
    clase: 'bg-cream-200 text-ink-700 dark:bg-cream-300 dark:text-ink-800',
  },
}

type Modo = 'equipo' | 'acompanante' | 'dueno'

interface Props {
  modo: Modo
  usuarioId: string
  negocioId?: string
}

/**
 * Reportes vecinales. El equipo de Conecta Comuna decide si un reporte se
 * confirma o se descarta; el negocio y su facilitador solo ven los casos de
 * sus propios negocios y pueden contar su versión.
 */
export function ReportesComunitariosPanel({ modo, usuarioId, negocioId }: Props) {
  const { data, loading: cargando, error: errorCarga, reload } = useAsync(
    () => businessService.listarReportes(negocioId, modo === 'equipo'),
    [modo, negocioId],
  )
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState<string | null>(null)

  async function resolver(reporte: ReporteComunitario, estado: EstadoReporte) {
    setGuardando(reporte.id)
    try {
      await businessService.actualizarEstadoReporte(reporte.id, estado, nota.trim() || undefined)
      setAbierto(null)
      setNota('')
      setErrorAccion(null)
      reload()
    } catch {
      setErrorAccion('No se pudo guardar la decisión. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setGuardando(null)
    }
  }

  const reportes = data ?? []
  const pendientes = reportes.filter((r) => (r.estado ?? 'pendiente') === 'pendiente')
  const cerrados = reportes.filter((r) => (r.estado ?? 'pendiente') !== 'pendiente')
  const error = errorAccion ?? (errorCarga ? 'No pudimos cargar los reportes. Intenta de nuevo.' : null)
  const esEquipo = modo === 'equipo'

  return (
    <section aria-labelledby="reportes-titulo" className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="reportes-titulo" className="font-bold text-ink-900 flex items-center gap-2">
          <UI_ICONS.flag size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          {esEquipo
            ? 'Reportes de la comuna'
            : modo === 'dueno'
              ? 'Reportes sobre tu negocio'
              : 'Reportes de tus negocios'}
        </h2>
        {pendientes.length > 0 && (
          <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/70 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
            {pendientes.length} sin revisar
          </span>
        )}
      </div>

      <p className="text-sm text-ink-600 leading-relaxed">
        {esEquipo
          ? 'Dos reportes confirmados dejan el negocio bajo observación para toda la comuna. Al descartarlos recupera su estado anterior.'
          : modo === 'dueno'
            ? 'Si un cliente tuvo un inconveniente o reclamo, puedes dar tu versión aquí. El equipo de Conecta Comuna revisará las dos partes antes de tomar una decisión.'
            : 'Solo aparecen los reportes de los negocios que apadrinas. La decisión la toma el equipo de Conecta Comuna; aquí puedes dejar la versión del negocio.'}
      </p>

      {error && <p className="text-sm text-rose-700">{error}</p>}
      {cargando && <RowSkeletonList count={2} />}

      {!cargando && reportes.length === 0 && (
        <p className="text-sm text-ink-500">
          {esEquipo
            ? 'No hay reportes abiertos. Buena señal.'
            : modo === 'dueno'
              ? 'Tu negocio no tiene reportes abiertos. ¡Excelente reputación vecinal!'
              : 'Tus negocios no tienen reportes. Buena señal.'}
        </p>
      )}

      {pendientes.map((r) => (
        <article
          key={r.id}
          className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/40 p-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/negocio/${r.negocio_id}`}
                className="font-semibold text-ink-900 hover:underline truncate block"
              >
                {r.negocio?.name ?? 'Negocio sin nombre'}
              </Link>
              <p className="text-sm text-amber-900 dark:text-amber-200">{MOTIVOS[r.motivo]}</p>
            </div>
            <time className="shrink-0 text-xs text-ink-500" dateTime={r.creado_en}>
              {new Date(r.creado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
            </time>
          </div>

          {r.descripcion && <p className="text-sm text-ink-700">{r.descripcion}</p>}

          {esEquipo && r.reportado_por?.full_name && (
            <p className="text-xs text-ink-500">Reportado por {r.reportado_por.full_name}</p>
          )}

          <HiloRespuestas
            reporte={r}
            usuarioId={usuarioId}
            onEnviada={reload}
          />

          {esEquipo &&
            (abierto === r.id ? (
              <div className="space-y-2">
                <label htmlFor={`nota-${r.id}`} className="block text-xs font-medium text-ink-600">
                  Nota de la revisión (opcional)
                </label>
                <textarea
                  id={`nota-${r.id}`}
                  rows={2}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: Visité el local, la dirección existe y el dueño atendió"
                  className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-cream-50 text-ink-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" loading={guardando === r.id} onClick={() => resolver(r, 'revisado')}>
                    <UI_ICONS.check size={15} />
                    Confirmar el reporte
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={guardando === r.id}
                    onClick={() => resolver(r, 'descartado')}
                  >
                    Descartar, no procede
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAbierto(null); setNota('') }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { setAbierto(r.id); setNota('') }}>
                Revisar este reporte
              </Button>
            ))}
        </article>
      ))}

      {cerrados.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-ink-700">
            Ya revisados ({cerrados.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {cerrados.map((r) => {
              const estado = ESTADO[r.estado ?? 'pendiente']
              return (
                <li key={r.id} className="rounded-lg border border-ink-200 dark:border-ink-700 p-2.5 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${estado.clase}`}>
                      {estado.texto}
                    </span>
                    <span className="text-ink-700">
                      {r.negocio?.name ?? 'Negocio'} · {MOTIVOS[r.motivo]}
                    </span>
                  </div>
                  {r.notas_moderacion && <p className="text-xs text-ink-500">{r.notas_moderacion}</p>}
                  <HiloRespuestas reporte={r} usuarioId={usuarioId} onEnviada={reload} />
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}

/** Versión de la otra parte. Cualquiera con acceso al caso puede leerla. */
function HiloRespuestas({
  reporte,
  usuarioId,
  onEnviada,
}: {
  reporte: ReporteComunitario
  usuarioId: string
  onEnviada: () => void
}) {
  const [escribiendo, setEscribiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const respuestas = reporte.respuestas ?? []

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      await businessService.responderReporte(reporte.id, usuarioId, texto)
      setTexto('')
      setEscribiendo(false)
      setError(null)
      onEnviada()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la respuesta.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-2">
      {respuestas.length > 0 && (
        <ul className="space-y-1.5 border-l-2 border-ink-200 dark:border-ink-700 pl-3">
          {respuestas.map((r) => (
            <li key={r.id} className="text-xs text-ink-700">
              <span className="font-semibold">{r.autor?.full_name ?? 'Alguien del caso'}:</span>{' '}
              {r.mensaje}
            </li>
          ))}
        </ul>
      )}

      {escribiendo ? (
        <form onSubmit={enviar} className="space-y-1.5">
          <label htmlFor={`respuesta-${reporte.id}`} className="sr-only">
            Tu respuesta al reporte
          </label>
          <textarea
            id={`respuesta-${reporte.id}`}
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cuenta qué pasó desde el lado del negocio"
            className="w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-cream-50 text-ink-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {error && <p className="text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={enviando} disabled={texto.trim().length < 5}>
              Enviar respuesta
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setEscribiendo(false); setTexto(''); setError(null) }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEscribiendo(true)}
          className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline"
        >
          {respuestas.length > 0 ? 'Responder de nuevo' : 'Responder a este reporte'}
        </button>
      )}
    </div>
  )
}
