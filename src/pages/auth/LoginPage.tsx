import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { isDemoMode } from '@/lib/env'

/**
 * react-hook-form + zod: validación en el cliente sin re-renderizar todo el
 * formulario en cada tecla (importante en gama baja) y con un esquema
 * reutilizable que documenta las reglas.
 */
const schema = z.object({
  email: z.string().email('Escribe un correo válido.'),
  password: z.string().min(6, 'Mínimo 6 caracteres.'),
})
type Values = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  async function onSubmit(values: Values) {
    setServerError(null)
    try {
      await signIn(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from ?? '/panel'
      navigate(from, { replace: true })
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.')
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-extrabold">Entrar</h1>
      <p className="text-sm text-ink-500">
        Ingresa para pedir servicios o administrar tu negocio.
      </p>

      {isDemoMode && (
        <div className="card-soft p-3 text-sm text-brand-800">
          Modo demo: usa <strong>user-cliente@demo.co</strong>,{' '}
          <strong>user-negocio@demo.co</strong> o <strong>user-unas@demo.co</strong> (Kelly) con cualquier contraseña.
          <div className="mt-2 text-xs">
            <button type="button" onClick={() => { window.localStorage.removeItem('conectacomuna.demo.v1'); window.location.reload(); }} className="underline font-semibold">
              🔄 Limpiar base de datos local (Reset)
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <TextField
          label="Correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {serverError && (
          <p role="alert" className="text-sm text-rose-700">
            {serverError}
          </p>
        )}
        <Button type="submit" fullWidth loading={isSubmitting}>
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-ink-500">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-semibold text-brand-700 underline">
          Regístrate
        </Link>
      </p>
    </div>
  )
}
