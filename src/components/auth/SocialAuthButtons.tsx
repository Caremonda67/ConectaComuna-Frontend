import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { isDemoMode } from '@/lib/env'
import { rememberAuthFrom } from '@/lib/authRedirect'
import type { SocialProvider } from '@/services/authService'

const GoogleIcon = () => (
  <svg className="mr-3 h-5 w-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.28 3.31v2.77h3.69c2.15-1.98 3.38-4.74 3.38-8.05z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.69-2.77c-.99.66-2.26 1.06-3.59 1.06-2.73 0-5.05-1.85-5.86-4.33H2.18v2.84C3.94 21.33 7.8 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M6.14 13.54c-.24-.69-.38-1.44-.38-2.24s.14-1.55.38-2.24V7.13H2.18C1.33 8.54 1 10.13 1 12s1.33 3.46 2.18 4.87l3.96-2.63z"
    />
    <path
      fill="#EA4335"
      d="M12 8.45c1.49 0 2.82.51 3.85 1.45l2.83-2.83C17.46 5.46 14.94 4 12 4 7.8 4 4.18 6.77 2.18 10.2l3.96 3.31c.81-2.48 2.13-4.33 3.86-5.65z"
    />
  </svg>
)

const FacebookIcon = () => (
  <svg className="mr-3 h-5 w-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#1877F2"
      d="M24 12.073C24 5.445 18.627 0 12 0S0 5.445 0 12.073V24H6.125V12.073C6.125 10.52 7.5 9.273 9.125 9.273C10.125 9.273 10.625 9.773 10.625 10.773V12.073H8.125V24H12V12.073C12 12.073 12.125 12.073 12.25 12.073V10.773C12.75 10.773 13.25 11.273 13.25 12.073V24H18.125V12.073C18.125 5.445 12.75 0 6.125 0"
      fillRule="evenodd"
      clipRule="evenodd"
    />
    <path
      fill="#fff"
      d="M12 0C5.373 0 0 5.373 0 12.073V24H6.125V12.073C6.125 10.52 7.5 9.273 9.125 9.273C10.125 9.273 10.625 9.773 10.625 10.773V12.073H8.125V24H12V12.073C12 12.073 12.125 12.073 12.25 12.073V10.773C12.75 10.773 13.25 11.273 13.25 12.073V24H18.125V12.073C18.125 5.445 12.75 0 6.125 0"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
)

interface Props {
  /** Ruta a la que volver cuando el proveedor redirija. */
  from?: string
}

export function SocialAuthButtons({ from }: Props) {
  const { signInWithOAuth } = useAuth()
  const [busy, setBusy] = useState<SocialProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function entrar(provider: SocialProvider) {
    setError(null)
    if (from) rememberAuthFrom(from)
    setBusy(provider)
    try {
      await signInWithOAuth(provider, from)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos abrir el inicio con redes.')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-ink-400">
        O entra con
      </p>
      <Button
        type="button"
        variant="secondary"
        fullWidth
        loading={busy === 'google'}
        disabled={busy !== null}
        onClick={() => void entrar('google')}
      >
        <div className="flex items-center justify-center">
          <GoogleIcon />
          Google
        </div>
      </Button>
      <Button
        type="button"
        variant="secondary"
        fullWidth
        loading={busy === 'facebook'}
        disabled={busy !== null}
        onClick={() => void entrar('facebook')}
      >
        <div className="flex items-center justify-center">
          <FacebookIcon />
          Facebook
        </div>
      </Button>
      {isDemoMode && (
        <p className="text-xs text-ink-500">
          En modo demo estos botones no abren Google ni Facebook. Usa un correo de prueba
          o conecta Supabase y activa los proveedores (ver nota de login social en el vault).
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}
