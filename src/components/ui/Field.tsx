import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full min-h-11 rounded-[10px] border border-ink-200 bg-white dark:bg-cream-50 px-3 py-2 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 disabled:bg-cream-200 dark:disabled:bg-cream-200/50'

interface FieldProps {
  label: string
  error?: string
  hint?: string
}

/** Campos con label real, `aria-describedby` y errores anunciados por lectores. */
export const TextField = forwardRef<
  HTMLInputElement,
  FieldProps & InputHTMLAttributes<HTMLInputElement>
>(function TextField({ label, error, hint, className, ...rest }, ref) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(base, error && 'border-rose-400', className)}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
})

/**
 * Contraseña con un botón para verla.
 *
 * Sin esto no hay forma de comprobar lo que se escribió, y en un teclado de
 * celular con autocorrector eso significa intentarlo a ciegas una y otra vez.
 *
 * El botón dice "Mostrar" y "Ocultar" con palabras, no con un ojo tachado:
 * nuestro usuario objetivo no tiene por qué conocer ese símbolo, y una
 * palabra se lee igual de rápido.
 */
export const PasswordField = forwardRef<
  HTMLInputElement,
  FieldProps & InputHTMLAttributes<HTMLInputElement>
>(function PasswordField({ label, error, hint, className, ...rest }, ref) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-ink-900">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          /* `aria-pressed` para que un lector de pantalla anuncie si está
             activo; el texto ya dice la acción. */
          aria-pressed={visible}
          aria-controls={id}
          className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline cursor-pointer"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      <input
        {...rest}
        type={visible ? 'text' : 'password'}
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(base, error && 'border-rose-400', className)}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
})

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextAreaField({ label, error, hint, className, ...rest }, ref) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <textarea
        {...rest}
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(base, 'min-h-24', error && 'border-rose-400', className)}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
})

export const SelectField = forwardRef<
  HTMLSelectElement,
  FieldProps & SelectHTMLAttributes<HTMLSelectElement>
>(function SelectField({ label, error, hint, className, children, ...rest }, ref) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <select
        {...rest}
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(base, error && 'border-rose-400', className)}
      >
        {children}
      </select>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
})
