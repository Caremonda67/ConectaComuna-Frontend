import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

/**
 * Resuelve la URL base de la API.
 *
 * En el navegador, cuando se accede desde la red local (ej. celular en 192.168.x.x o 10.x.x)
 * o desde localhost en desarrollo, se utiliza una ruta relativa vacía ('') para que las peticiones
 * (/api/...) se envíen al mismo host que sirvió la app web y Vite las reenvíe por proxy al backend
 * (puerto 4000). De este modo un celular nunca intentará buscar "localhost:4000" dentro de sí mismo.
 */
function resolveBaseUrl(): string {
  if (typeof window !== 'undefined') {
    if (env.apiUrl && !env.apiUrl.includes('localhost') && !env.apiUrl.includes('127.0.0.1')) {
      return env.apiUrl.replace(/\/$/, '')
    }
    return ''
  }

  return env.apiUrl || 'http://localhost:4000'
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = resolveBaseUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`

  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.access_token) {
        headers.set('Authorization', `Bearer ${data.session.access_token}`)
      }
    }
  } catch {
    // Si no hay sesión continúa sin token
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(errorBody.error || `Error ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

/** Comprueba si el backend Express está alcanzable en la red. */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const baseUrl = resolveBaseUrl()
    const res = await fetch(`${baseUrl}/api/salud`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}
