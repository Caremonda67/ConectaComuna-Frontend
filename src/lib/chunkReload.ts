const CLAVE_RECARGA = 'cc_recarga_por_chunk'

/**
 * Vite parte la aplicación en archivos con un hash en el nombre. Cuando se
 * publica una versión nueva, esos nombres cambian. Una pestaña que quedó
 * abierta con el HTML viejo intenta bajar un archivo que ya no existe en el
 * despliegue actual y el navegador suelta "Failed to fetch dynamically
 * imported module".
 */
export function esErrorDeChunk(error: unknown): boolean {
  const texto = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '')
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk \d+ failed/i.test(
    texto,
  )
}

/**
 * Recarga una sola vez por pestaña. Si el archivo sigue sin aparecer, el
 * error boundary muestra el aviso en vez de entrar en un ciclo de recargas.
 */
export function recargarPorChunk(): boolean {
  try {
    if (sessionStorage.getItem(CLAVE_RECARGA) === '1') return false
    sessionStorage.setItem(CLAVE_RECARGA, '1')
  } catch {
    return false
  }

  window.location.reload()
  return true
}

export function limpiarMarcaDeRecarga(): void {
  try {
    sessionStorage.removeItem(CLAVE_RECARGA)
  } catch {
    // Si el navegador bloquea el almacenamiento, no hay marca que limpiar.
  }
}
