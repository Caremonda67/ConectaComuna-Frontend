import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isDemoMode } from './env'

/**
 * Cliente único de Supabase.
 * - `persistSession` + `autoRefreshToken`: la sesión sobrevive al cierre del
 *   navegador, importante para usuarios que entran y salen desde el celular.
 * - `detectSessionInUrl`: necesario para magic links / OAuth.
 *
 * En modo demo devolvemos `null` y los servicios caen al adaptador mock.
 */
export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'conectacomuna.auth',
      },
      global: {
        headers: { 'x-client-info': 'conectacomuna-web' },
      },
    })

/** Úsalo dentro de servicios que exigen backend real. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}
