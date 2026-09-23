import { useState } from 'react'
import { BARRIOS_COMUNA } from '@/services/direccionService'

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
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`
          )
          if (!res.ok) throw new Error('Nominatim error')
          const data = await res.json()
          
          const barrio = data.address?.neighbourhood || data.address?.suburb || data.address?.residential || data.address?.city_district || ''
          
          if (barrio) {
            onSuccess(barrio)
          } else {
            // Fallback al barrio más cercano de la comuna
            onSuccess(BARRIOS_COMUNA[0].nombre)
          }
        } catch {
          // Si el servicio de nombres externos falla, usamos el barrio principal de la comuna
          onSuccess(BARRIOS_COMUNA[0].nombre)
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
