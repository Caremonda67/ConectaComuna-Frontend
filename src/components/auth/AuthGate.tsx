import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SocialAuthButtons } from './SocialAuthButtons'
import { rememberAuthFrom } from '@/lib/authRedirect'

interface Props {
  open: boolean
  onClose: () => void
  from: string
  motivo: string
}

/**
 * Apartado que pide cuenta antes de contactar un negocio.
 * El directorio y la búsqueda por dirección siguen públicos.
 */
export function AuthGate({ open, onClose, from, motivo }: Props) {
  if (!open) return null

  const state = { from }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/40"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-titulo"
        className="relative z-10 w-full max-w-sm rounded-t-[18px] border border-ink-200 bg-white p-4 shadow-lg sm:rounded-[18px]"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="auth-gate-titulo" className="text-lg font-bold text-ink-900">
              Entra para contactar
            </h2>
            <p className="mt-1 text-sm text-ink-600">{motivo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-cream-200"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2">
          <Link
            to="/entrar"
            state={state}
            onClick={() => rememberAuthFrom(from)}
            className="block"
          >
            <Button type="button" fullWidth>
              Iniciar sesión
            </Button>
          </Link>
          <Link
            to="/registro"
            state={state}
            onClick={() => rememberAuthFrom(from)}
            className="block"
          >
            <Button type="button" variant="secondary" fullWidth>
              Crear cuenta
            </Button>
          </Link>
        </div>

        <div className="mt-4">
          <SocialAuthButtons from={from} />
        </div>
      </div>
    </div>
  )
}
