import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { panelService } from '@/services/panelService'

/**
 * Reseñas de una o dos estrellas, para ver dónde hay un problema antes de que
 * llegue como PQR.
 *
 * Se muestra el texto pero NO quién la escribió. Las reseñas ya son públicas
 * en el directorio, así que el comentario no expone nada nuevo; el nombre de
 * quien la dejó sería información que el equipo no necesita para su trabajo, y
 * saberla cambia cómo se media un caso.
 */
export function ResenasNegativas() {
  const { data, loading, error } = useAsync(() => panelService.resenasNegativas(), [])

  return (
    <section className="card p-4">
      <h2 className="font-bold text-ink-900">Reseñas negativas</h2>
      <p className="mt-0.5 text-xs text-ink-600">
        De una o dos estrellas, las más recientes primero. No se muestra quién las
        escribió.
      </p>

      {loading && <p className="mt-3 text-sm text-ink-600">Cargando…</p>}
      {error && <p className="mt-3 text-sm text-ink-700">No se pudieron cargar. {error}</p>}

      {data && data.length === 0 && (
        <p className="mt-3 text-sm text-ink-600">
          Ninguna reseña de una o dos estrellas. Es buena señal, pero con pocos trabajos
          calificados tampoco dice mucho todavía.
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="mt-3 space-y-2">
          {data.map((r) => (
            <li key={r.reviewId} className="rounded-lg border border-ink-200 bg-cream-100 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Link
                  to={`/negocio/${r.negocioId}`}
                  className="font-semibold text-ink-900 underline decoration-ink-300 underline-offset-2"
                >
                  {r.negocio}
                </Link>
                <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
                  {r.rating} {r.rating === 1 ? 'estrella' : 'estrellas'}
                </span>
              </div>
              {r.comentario ? (
                <p className="mt-1 text-sm text-ink-800">«{r.comentario}»</p>
              ) : (
                <p className="mt-1 text-sm italic text-ink-600">Sin comentario escrito.</p>
              )}
              <p className="mt-1 text-xs text-ink-600">
                {new Date(r.creadaEn).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
