import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/hooks/usePageMeta'
import { profileService } from '@/services/profileService'
import { useNeighborhoodLocator } from '@/hooks/useNeighborhoodLocator'
import { BARRIOS_COMUNA } from '@/services/direccionService'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { UI_ICONS } from '@/components/ui/icons'
import type { AccountType } from '@/types'

export default function OnboardingPage() {
  usePageMeta({
    title: 'Completa tu perfil · ConectaComuna',
    description: 'Completa tus datos para empezar a usar ConectaComuna en tu barrio.',
  })

  const navigate = useNavigate()
  const { userId, profile, refresh } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    neighborhood: profile?.neighborhood ?? '',
    accountType: profile?.account_type ?? 'client',
  })

  const { locate: handleGetLocation, loading: loadingLocation } = useNeighborhoodLocator(
    (barrio) => {
      setFormData((prev) => ({ ...prev, neighborhood: barrio }))
      setError(null)
    },
    (msg) => setError(msg)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      setError('Sesión no encontrada. Por favor, inicia sesión de nuevo.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await profileService.update(userId, {
        full_name: formData.fullName,
        phone: formData.phone,
        neighborhood: formData.neighborhood,
        account_type: formData.accountType,
        onboarding_completado: true,
      })
      await refresh()
      const destino =
        formData.accountType === 'business'
          ? '/panel/negocio'
          : formData.accountType === 'facilitador'
            ? '/panel/facilitador'
            : '/panel'
      navigate(destino)
    } catch (e: unknown) {
      console.error('Error guardando perfil:', e)
      if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
        setError((e as { message: string }).message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Hubo un error al guardar tu perfil.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const Handshake = UI_ICONS.handshake

  return (
    <div className="mx-auto max-w-md space-y-6 py-8 px-4">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <Handshake size={32} />
        </div>
        <h1 className="text-2xl font-bold text-ink-900">¡Bienvenido a Conecta Comuna!</h1>
        <p className="text-sm text-ink-600">
          Para empezar, cuéntanos un poco más sobre ti y elige cómo quieres usar la plataforma.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 card p-6">
        <TextField
          label="Nombre completo"
          placeholder="Ej. Luis Pérez"
          value={formData.fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fullName: e.target.value })}
          required
        />

        <TextField
          label="Teléfono de contacto"
          placeholder="Ej. 3001234567"
          value={formData.phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
        />

        <div className="space-y-2">
          <TextField
            label="Tu barrio"
            placeholder="Ej. El Rodeo"
            value={formData.neighborhood}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, neighborhood: e.target.value })}
          />
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={loadingLocation}
            className="flex items-center text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
          >
            {loadingLocation ? (
              <span className="mr-2 animate-pulse">⏳ Obteniendo ubicación...</span>
            ) : (
              <>
                <UI_ICONS.map size={16} className="mr-1" />
                Usar mi ubicación actual
              </>
            )}
          </button>
          {error && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-xs text-ink-500 w-full">O elige tu barrio:</span>
              {BARRIOS_COMUNA.map((b) => (
                <button
                  key={b.nombre}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, neighborhood: b.nombre }))
                    setError(null)
                  }}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 active:scale-95 transition-transform"
                >
                  📍 {b.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-ink-700">
            ¿Cómo quieres usar la app?
          </label>
          <div className="grid grid-cols-1 gap-2">
            {(['client', 'business', 'facilitador'] as AccountType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, accountType: type })}
                className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer select-none ${
                  formData.accountType === type
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 shadow-xs'
                    : 'border-ink-200 bg-white dark:bg-cream-50 hover:bg-cream-100 dark:hover:bg-cream-200 hover:border-ink-300'
                }`}
              >
                <div>
                  <p className="font-semibold capitalize text-ink-900">
                    {type === 'client' ? 'Cliente / Vecino' : type === 'business' ? 'Emprendedor' : 'Facilitador'}
                  </p>
                  <p className="text-xs text-ink-500">
                    {type === 'client'
                      ? 'Quiero buscar y contratar servicios en mi barrio.'
                      : type === 'business'
                        ? 'Quiero registrar mi negocio y ofrecer mis productos.'
                        : 'Quiero ayudar a otros emprendedores a digitalizarse.'}
                  </p>
                </div>
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${formData.accountType === type ? 'border-brand-500 bg-brand-500' : 'border-ink-300'}`}>
                  {formData.accountType === type && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button type="submit" fullWidth loading={submitting} className="mt-4">
          Completar mi perfil
        </Button>
      </form>
    </div>
  )
}
