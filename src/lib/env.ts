/**
 * Configuración de entorno.
 *
 * El backend (Supabase + API) vive en otro repositorio. Mientras esas
 * credenciales no existan, la app arranca en MODO DEMO con datos locales,
 * de forma que el equipo de frontend/diseño no queda bloqueado.
 * Al definir VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY la app usa el backend real
 * sin cambiar una sola línea de UI.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  /** URL opcional del backend Express (endpoints que no van directo a Postgres). */
  apiUrl: import.meta.env.VITE_API_URL?.trim() ?? '',
}

export const isDemoMode = !env.supabaseUrl || !env.supabaseAnonKey

/** Centro aproximado de la Comuna (Cali, Colombia). Usado como fallback de geolocalización. */
export const COMUNA_CENTER = { lat: 3.4372, lng: -76.5225 }
export const DEFAULT_RADIUS_KM = 5
