import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { businessService } from '@/services/businessService'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'
import type { EstadoReporte, MotivoReporte, ReporteComunitario } from '@/types'

const MOTIVOS: Record<MotivoReporte, string> = {
  direccion_falsa: 'La dirección no existe',
  anticipo_incumplido: 'Recibió anticipo y no cumplió',
  precios_enganosos: 'Precios engañosos',
  suplantacion: 'Suplantación de identidad',
  otro: 'Otro motivo',
}

interface Props {
  facilitadorId: string
}

/**
 * Bandeja de reportes vecinales para el facilitador. Revisar o descartar un
 * reporte recalcula el contador del negocio en la base, así que dos reportes
 * pendientes lo dejan bajo observación y resolverlos lo liberan.
 */
export function ModeracionReportesPanel({ facilitadorId }: Props) {
  const { data, loading: cargando, error: errorCarga, reload } = useAsync(
    () => businessService.listarReportes(),
    [],
  )
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState<string | null>(null)

  async function resolver(reporte: ReporteComunitario, estado: EstadoReporte) {
    setGuardando(reporte.id)
    try {
      await businessService.actualizarEstadoReporte(reporte.id, estado, facilitadorId, nota.trim() || undefined)
      setAbierto(null)
      setNota('')
      setErrorGuardado(null)
      reload()
    } catch {
      setErrorGuardado('No se pudo guardar la decisión. Revisa tu conexión.')
    } finally {
      setGuardando(null)
    }
  }

  const reportes = data ?? []
  const error = errorGuardado ?? (errorCarga ? 'No pudimos cargar los reportes. Intenta de nuevo.' : null)
  const pendientes = reportes.filter((r) => (r.estado ?? 'pendiente') === 'pendiente')
  const resueltos = reportes.filter((r) => (r.estado ?? 'pendiente') !== 'pendiente')

  return (
    <section aria-labelledby="moderacion-reportes" className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="moderacion-reportes" className="font-bold text-ink-900 flex items-center gap-2">
          <UI_ICONS.flag size={18} className="text-amber-600 shrink-0" />
          Reportes de vecinos
        </h2>
        {pendientes.length > 0 && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
            {pendientes.length} sin revisar
          </span>
        )}
      </div>

      <p className="text-sm text-ink-500">
        Cuando un negocio acumula dos reportes sin revisar, queda marcado como bajo observación
        para toda la comuna hasta que alguien del equipo lo revise.
      </p>

      {error && <p className="text-sm text-rose-700">{error}</p>}
      {cargando && <p className="text-sm text-ink-500">Cargando reportes…</p>}

      {!cargando && reportes.length === 0 && (
        <p className="text-sm text-ink-500">Por ahora no hay reportes. Buena señal.</p>
      )}

      {pendientes.map((r) => (
        <article key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-ink-900 truncate">
                {r.negocio?.name ?? 'Negocio sin nombre'}
              </p>
              <p className="text-sm text-amber-900">{MOTIVOS[r.motivo]}</p>
            </div>
            <time className="shrink-0 text-xs text-ink-500" dateTime={r.creado_en}>
              {new Date(r.creado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
            </time>
          </div>

          {r.descripcion && <p className="text-sm text-ink-700">{r.descripcion}</p>}

          {r.reportado_por?.full_name && (
            <p className="text-xs text-ink-500">Reportado por {r.reportado_por.full_name}</p>
          )}

          {abierto === r.id ? (
            <div className="space-y-2">
              <label htmlFor={`nota-${r.id}`} className="block text-xs font-medium text-ink-600">
                Nota de la revisión (opcional)
              </label>
              <textarea
                id={`nota-${r.id}`}
                rows={2}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: Visité el local, la dirección sí existe y el dueño atendió"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={guardando === r.id}
                  onClick={() => resolver(r, 'revisado')}
                >
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
          )}
        </article>
      ))}

      {resueltos.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-ink-700">
            Ya revisados ({resueltos.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {resueltos.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-ink-600">
                <UI_ICONS.checkCircle size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  {r.negocio?.name ?? 'Negocio'} · {MOTIVOS[r.motivo]} ·{' '}
                  <strong>{r.estado === 'descartado' ? 'descartado' : 'confirmado'}</strong>
                  {r.notas_moderacion ? ` · ${r.notas_moderacion}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
