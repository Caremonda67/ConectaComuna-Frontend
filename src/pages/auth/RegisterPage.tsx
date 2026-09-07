import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNeighborhoodLocator } from '@/hooks/useNeighborhoodLocator'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { takeAuthFrom } from '@/lib/authRedirect'
import { cn } from '@/lib/utils'
import type { AccountType } from '@/types'
import { UI_ICONS, type LucideIcon } from '@/components/ui/icons'

const schema = z.object({
  fullName: z.string().min(3, 'Escribe tu nombre completo.'),
  email: z.string().email('Escribe un correo válido.'),
  password: z.string().min(6, 'Mínimo 6 caracteres.'),
  phone: z
    .string()
    .regex(/^3\d{9}$/, 'Celular colombiano de 10 dígitos (ej: 3001234567).')
    .optional()
    .or(z.literal('')),
  neighborhood: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromState = (location.state as { from?: string } | null)?.from
  const [accountType, setAccountType] = useState<AccountType>('client')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const { locate: handleGetLocation, loading: loadingLocation } = useNeighborhoodLocator(
    (barrio) => {
      setValue('neighborhood', barrio)
      setServerError(null)
    },
    (msg) => setServerError(msg)
  )

  async function onSubmit(values: Values) {
    setServerError(null)
    try {
      await signUp({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone || undefined,
        neighborhood: values.neighborhood || undefined,
        accountType,
      })
      const from = fromState ?? takeAuthFrom('')
      let to = '/panel'
      if (accountType === 'business') to = '/panel/negocio'
      if (accountType === 'facilitador') to = '/panel/facilitador'
      if (from && accountType === 'client') to = from
      navigate(to, { replace: true })
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No pudimos crear tu cuenta.')
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-extrabold">Crear cuenta</h1>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-700">
          ¿Cómo vas a usar ConectaComuna?
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <TypeCard
            active={accountType === 'client'}
            onClick={() => setAccountType('client')}
            icon={UI_ICONS.person}
            title="Cliente"
            description="Busco servicios"
          />
          <TypeCard
            active={accountType === 'business'}
            onClick={() => setAccountType('business')}
            icon={UI_ICONS.tools}
            title="Negocio"
            description="Ofrezco mi oficio"
          />
          <TypeCard
            active={accountType === 'facilitador'}
            onClick={() => setAccountType('facilitador')}
            icon={UI_ICONS.person}
            title="Facilitador"
            description="Apoyo a negocios"
          />
        </div>
      </fieldset>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <TextField
          label="Nombre completo"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Celular (opcional)"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          hint="Sirve para que te contacten por WhatsApp."
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="space-y-2">
          <TextField
            label="Barrio (opcional)"
            error={errors.neighborhood?.message}
            {...register('neighborhood')}
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

        {serverError && (
          <p role="alert" className="text-sm text-rose-700">
            {serverError}
          </p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting}>
          Crear cuenta
        </Button>
        <p className="text-xs text-ink-500">
          Si eres cliente, después puedes activar tu negocio sin crear otra cuenta.
        </p>
      </form>

      <SocialAuthButtons from={fromState} />

      <p className="text-center text-sm text-ink-500">
        ¿Ya tienes cuenta?{' '}
        <Link
          to="/entrar"
          state={fromState ? { from: fromState } : undefined}
          className="font-semibold text-brand-700 underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  )
}

function TypeCard({
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-[14px] border-2 p-3 text-left',
        active ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mb-2 flex h-9 w-9 items-center justify-center rounded-full',
          active ? 'bg-brand-500 text-white' : 'bg-cream-200 text-ink-700',
        )}
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-ink-500">{description}</p>
    </button>
  )
}
