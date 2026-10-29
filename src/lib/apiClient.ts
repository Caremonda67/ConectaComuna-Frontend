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

/** Espera por defecto. El chat la sube porque Render tarda en despertar. */
const ESPERA_POR_DEFECTO_MS = 12000

type OpcionesApi = RequestInit & { timeoutMs?: number }

export async function apiFetch<T>(endpoint: string, options: OpcionesApi = {}): Promise<T> {
  const { timeoutMs = ESPERA_POR_DEFECTO_MS, ...resto } = options
  const baseUrl = resolveBaseUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`

  const headers = new Headers(resto.headers || {})
  if (!headers.has('Content-Type') && !(resto.body instanceof FormData)) {
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
    ...resto,
    headers,
    // Sin reloj, una pestaña que perdió la red se queda esperando para siempre.
    signal: resto.signal ?? AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(errorBody.error || `Error ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

/**
 * Comprueba si el backend Express está alcanzable.
 * Un 200 no basta: si Vercel reescribe /api a index.html, la respuesta también
 * es 200 y con HTML. Se exige el cuerpo que devuelve /api/salud.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const baseUrl = resolveBaseUrl()
    const res = await fetch(`${baseUrl}/api/salud`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return false

    const cuerpo = await res.json()
    return cuerpo?.estado === 'ok'
  } catch {
    return false
  }
}
