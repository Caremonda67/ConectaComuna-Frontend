/**
 * Servicio de autenticación.
 *
 * Decisión: el `account_type` NO se guarda solo en `auth.users.user_metadata`
 * (el usuario podría manipularlo), sino en la tabla `profiles`, que es la que
 * gobiernan las políticas RLS. El metadata solo se usa como semilla que un
 * trigger `handle_new_user()` copia a `profiles` al registrarse.
 */
import { requireSupabase, supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import type { AccountType, Profile } from '@/types'

export interface SignUpInput {
  email: string
  password: string
  fullName: string
  phone?: string
  neighborhood?: string
  accountType: AccountType
}

export interface AuthSession {
  userId: string
  email: string
}

export type SocialProvider = 'google' | 'facebook'

export const authService = {
  async getSession(): Promise<AuthSession | null> {
    if (isDemoMode) {
      const db = readDb()
      if (!db.sessionUserId) return null
      const profile = db.profiles.find((p) => p.id === db.sessionUserId)
      return profile ? { userId: profile.id, email: `${profile.id}@demo.co` } : null
    }
    const { data, error } = await requireSupabase().auth.getSession()
    if (error) throw error
    if (!data.session) return null
    return {
      userId: data.session.user.id,
      email: data.session.user.email ?? '',
    }
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    if (isDemoMode) {
      const db = readDb()
      const profile = db.profiles.find((p) => `${p.id}@demo.co` === email)
      
      if (!profile) {
        throw new Error('Ese correo demo no existe. Usa user-unas@demo.co, user-negocio@demo.co o user-cliente@demo.co')
      }
      
      mutateDb((d) => {
        d.sessionUserId = profile.id
      })
      return delay({ userId: profile.id, email })
    }
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw new Error(translateAuthError(error.message))
    return { userId: data.user.id, email: data.user.email ?? email }
  },

  async signUp(input: SignUpInput): Promise<AuthSession> {
    if (isDemoMode) {
      const id = uid('user')
      const profile: Profile = {
        id,
        full_name: input.fullName,
        phone: input.phone ?? null,
        avatar_url: null,
        account_type: input.accountType,
        neighborhood: input.neighborhood ?? null,
        onboarding_completado: true,
        created_at: new Date().toISOString(),
      }
      mutateDb((d) => {
        d.profiles.push(profile)
        d.sessionUserId = id
      })
      return delay({ userId: id, email: input.email })
    }

    const { data, error } = await requireSupabase().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          phone: input.phone ?? null,
          neighborhood: input.neighborhood ?? null,
          account_type: input.accountType,
          onboarding_completado: true,
        },
      },
    })
    if (error) throw new Error(translateAuthError(error.message))
    if (!data.user) throw new Error('No se pudo crear la cuenta.')
    return { userId: data.user.id, email: data.user.email ?? input.email }
  },

  /**
   * Abre el flujo OAuth de Supabase (Google / Facebook).
   * Hay que tener el proveedor encendido en el dashboard y las URLs de
   * redirección registradas. Ver vault/PLAN-LOGIN-SOCIAL.md.
   */
  async signInWithOAuth(provider: SocialProvider, returnTo?: string): Promise<void> {
    if (isDemoMode) {
      throw new Error(
        'El inicio con Google o Facebook pide Supabase real. En demo entra con un correo de prueba.',
      )
    }
    const redirectTo = `${window.location.origin}${returnTo && returnTo.startsWith('/') ? returnTo : '/entrar'}`
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) throw new Error(translateAuthError(error.message))
  },

  async signOut(): Promise<void> {
    if (isDemoMode) {
      mutateDb((d) => {
        d.sessionUserId = null
      })
      return
    }
    const { error } = await requireSupabase().auth.signOut()
    if (error) throw error
  },

  /** Suscripción a cambios de sesión (login en otra pestaña, refresh token, etc.). */
  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void {
    if (isDemoMode || !supabase) return () => {}
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session ? { userId: session.user.id, email: session.user.email ?? '' } : null)
    })
    return () => data.subscription.unsubscribe()
  },
}

/** Mensajes de Supabase en inglés → español claro para el usuario final. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered')) return 'Ese correo ya tiene una cuenta.'
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('email')) return 'Revisa el correo ingresado.'
  return 'No pudimos completar la operación. Intenta de nuevo.'
}
