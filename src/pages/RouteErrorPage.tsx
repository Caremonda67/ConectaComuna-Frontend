import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'
import { esErrorDeChunk, recargarPorChunk } from '@/lib/chunkReload'

/**
 * Último recurso cuando una ruta no alcanza a cargar. Si es un archivo viejo
 * de una versión anterior, intenta recargar una vez; si vuelve a fallar,
 * muestra este aviso en vez de la pantalla cruda de React Router.
 */
export default function RouteErrorPage() {
  const error = useRouteError()
  const esChunk = esErrorDeChunk(error)
  const detalle = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : null

  useEffect(() => {
    if (esChunk) recargarPorChunk()
  }, [esChunk])

  return (
    <main className="min-h-screen bg-cream-50 text-ink-900 flex items-center justify-center p-6">
      <section className="card w-full max-w-md p-6 space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
          <UI_ICONS.alert size={24} />
        </div>
        <h1 className="text-xl font-bold">
          {esChunk
            ? 'La página se actualizó mientras la tenías abierta'
            : 'Algo no cargó bien'}
        </h1>
        <p className="text-sm text-ink-600 leading-relaxed">
          {esChunk
            ? 'El navegador guardó una parte vieja de la aplicación y ya no encuentra ese archivo. Recarga para traer la versión nueva.'
            : 'No pudimos terminar de cargar esta pantalla. Intenta de nuevo; si sigue igual, revisa tu conexión.'}
        </p>
        {detalle && <p className="text-xs text-ink-500">{detalle}</p>}
        <div className="flex flex-col sm:flex-row justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Recargar</Button>
          <Button variant="secondary" onClick={() => window.location.assign('/')}>
            Volver al inicio
          </Button>
        </div>
      </section>
    </main>
  )
}
