import { useState } from 'react'
import { reverseGeocodificar } from '@/services/direccionService'

export function useNeighborhoodLocator(onSuccess: (barrio: string) => void, onError: (msg: string) => void) {
  const [loading, setLoading] = useState(false)

  const locate = () => {
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    const isSecure = typeof window !== 'undefined' && (window.isSecureContext || isLocalhost)

    if (!isSecure && !isLocalhost) {
      onError('El navegador restringe el GPS en redes locales sin HTTPS. Puedes tocar un barrio sugerido.')
      return
    }

    if (!navigator.geolocation) {
      onError('Tu navegador no soporta geolocalización. Elige un barrio sugerido.')
      return
    }

    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const geo = await reverseGeocodificar({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          if (geo.etiqueta && !geo.etiqueta.startsWith('Punto (')) {
            onSuccess(geo.etiqueta)
          } else {
            // Rellenar con un barrio de Cali sería peor que no rellenar: el
            // usuario terminaría con un barrio ajeno guardado en su perfil.
            onError('Ubicamos tu señal pero no pudimos nombrar el barrio. Escríbelo tú o elige uno sugerido.')
          }
        } catch {
          onError('El servicio de mapas no respondió. Escribe tu barrio o elige uno sugerido.')
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        setLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          onError('Permiso de GPS no concedido. Puedes elegir tu barrio sugerido.')
        } else {
          onError('No pudimos obtener tu señal de GPS. Puedes elegir tu barrio sugerido.')
        }
      },
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 5 * 60 * 1000 }
    )
  }

  return { locate, loading }
}
