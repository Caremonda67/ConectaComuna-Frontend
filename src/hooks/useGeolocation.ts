import { useCallback, useEffect, useState } from 'react'
import { COMUNA_CENTER } from '@/lib/env'
import type { Coordinates } from '@/types'

type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported'

/**
 * Geolocalización con degradación elegante: si el usuario niega el permiso
 * o el GPS falla (muy común en gama baja), caemos al centro de la comuna
 * en vez de dejar la vista vacía.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<Coordinates>(COMUNA_CENTER)
  const [status, setStatus] = useState<GeoStatus>('idle')

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('granted')
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  useEffect(() => {
    // No pedimos permiso automáticamente en el primer render para no asustar
    // al usuario: solo si ya lo concedió antes.
    if (!('permissions' in navigator)) return
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((res) => {
        if (res.state === 'granted') request()
      })
      .catch(() => {})
  }, [request])

  return { position, status, request, isFallback: status !== 'granted' }
}
