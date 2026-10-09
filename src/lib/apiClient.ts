import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = env.apiUrl || (import.meta.env.DEV ? 'http://localhost:4000' : '')
  if (!baseUrl) {
    throw new Error('API no configurada')
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl.replace(/\/$/, '')}${cleanEndpoint}`

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
    const baseUrl = env.apiUrl || (import.meta.env.DEV ? 'http://localhost:4000' : '')
    if (!baseUrl) return false
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/salud`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}
