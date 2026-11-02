import { StrictMode } from 'react'
import { MotionConfig } from 'motion/react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/context/AuthContext'
import { AppRouter } from '@/router'
import { limpiarMarcaDeRecarga, recargarPorChunk } from '@/lib/chunkReload'
import './index.css'

// Vite avisa cuando un import dinámico no encuentra su archivo, que es lo que
// pasa en una pestaña abierta mientras se publica una versión nueva.
window.addEventListener('vite:preloadError', (event) => {
  if (recargarPorChunk()) event.preventDefault()
})

// Si la recarga funcionó, la marca se borra para que un fallo futuro pueda
// volver a intentarlo. La espera evita un ciclo si el archivo sigue faltando.
window.addEventListener('load', () => {
  window.setTimeout(limpiarMarcaDeRecarga, 10000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </MotionConfig>
  </StrictMode>,
)
