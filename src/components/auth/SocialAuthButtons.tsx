import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { isDemoMode } from '@/lib/env'
import { rememberAuthFrom } from '@/lib/authRedirect'
import type { SocialProvider } from '@/services/authService'

const GoogleIcon = () => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
    alt="Google"
    className="mr-3 h-5 w-5 shrink-0 object-contain" 
  />
)

const FacebookIcon = () => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" 
    alt="Facebook"
    className="mr-3 h-5 w-5 shrink-0 object-contain" 
  />
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
        <GoogleIcon />
        Google
      </Button>
      <Button
        type="button"
        variant="secondary"
        fullWidth
        loading={busy === 'facebook'}
        disabled={busy !== null}
        onClick={() => void entrar('facebook')}
      >
        <FacebookIcon />
        Facebook
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
