import { useCallback, useEffect, useState } from 'react'
import { COMUNA_CENTER } from '@/lib/env'
import type { Coordinates } from '@/types'

export type GeoStatus =
  | 'idle'
  | 'locating'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'insecure_context'
  | 'timeout'

/**
 * Geolocalización con degradación elegante: si el usuario niega el permiso,
 * no tiene GPS o navega por HTTP en red local, caemos al centro de la comuna
 * o permitimos selección rápida sin dejar la pantalla en blanco ni tirar errores fatales.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<Coordinates>(COMUNA_CENTER)
  const [status, setStatus] = useState<GeoStatus>('idle')

  const request = useCallback(() => {
    // Si se navega por IP en red local sin HTTPS, el navegador bloquea el GPS por especificación W3C
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    const isSecure = typeof window !== 'undefined' && (window.isSecureContext || isLocalhost)

    if (!isSecure && !isLocalhost) {
      setStatus('insecure_context')
      return
    }

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
      (err) => {
        if (err.code === err.TIMEOUT) {
          setStatus('timeout')
        } else {
          setStatus('denied')
        }
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  useEffect(() => {
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
