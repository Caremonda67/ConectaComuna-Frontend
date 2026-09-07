import { useState } from 'react'

export function useNeighborhoodLocator(onSuccess: (barrio: string) => void, onError: (msg: string) => void) {
  const [loading, setLoading] = useState(false)

  const locate = () => {
    if (!navigator.geolocation) {
      onError('Tu navegador no soporta geolocalización.')
      return
    }

    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`
          )
          const data = await res.json()
          
          const barrio = data.address?.neighbourhood || data.address?.suburb || data.address?.residential || data.address?.city_district || ''
          
          if (barrio) {
            onSuccess(barrio)
          } else {
            onError('No pudimos determinar el nombre de tu barrio con precisión. Por favor escríbelo manualmente.')
          }
        } catch (err) {
          onError('Error al obtener la dirección desde las coordenadas.')
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        setLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          onError('Debes dar permiso de ubicación para usar esta función.')
        } else {
          onError('No pudimos obtener tu ubicación.')
        }
      }
    )
  }

  return { locate, loading }
}
