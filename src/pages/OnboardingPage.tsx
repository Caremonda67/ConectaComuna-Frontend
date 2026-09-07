import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { profileService } from '@/services/profileService'
import { useNeighborhoodLocator } from '@/hooks/useNeighborhoodLocator'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { UI_ICONS } from '@/components/ui/icons'
import type { AccountType } from '@/types'

export default function OnboardingPage() {
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
      // Redirigir según el rol elegido
      if (formData.accountType === 'business') {
        navigate('/panel/negocio')
      } else if (formData.accountType === 'facilitador') {
        navigate('/panel/facilitador')
      } else {
        navigate('/panel')
      }
    } catch (e: any) {
      setError(e.message || 'Hubo un error al guardar tu perfil.')
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
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                  formData.accountType === type
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-ink-200 bg-white hover:bg-cream-100'
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
