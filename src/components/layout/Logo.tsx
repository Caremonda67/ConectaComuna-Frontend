interface LogoProps {
  className?: string
  /** Si es true, solo dibuja el isotipo sin el texto */
  iconOnly?: boolean
  /** Usar versión blanca (para fondos oscuros) */
  variant?: 'green' | 'white'
}

/**
 * Isotipo y logotipo oficial de ConectaComuna (El Pin de Confianza).
 *
 * Utiliza los activos oficiales de marca provistos para máxima nitidez y fidelidad.
 */
export function Logo({ className = '', iconOnly = false, variant = 'green' }: LogoProps) {
  const isWhite = variant === 'white'
  const iconSrc = isWhite ? '/brand/logo-pin-white.png' : '/brand/logo-pin.png'

  return (
    <span className={`inline-flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <img
        src={iconSrc}
        alt="ConectaComuna"
        width={26}
        height={34}
        className="h-7 w-auto sm:h-8 shrink-0 select-none object-contain"
        loading="eager"
        decoding="sync"
      />

      {!iconOnly && (
        <span
          className={`text-base sm:text-xl font-bold tracking-tight whitespace-nowrap ${
            isWhite ? 'text-white' : 'text-ink-900'
          }`}
        >
          Conecta<span className={isWhite ? 'text-brand-300' : 'text-brand-700'}>Comuna</span>
        </span>
      )}
    </span>
  )
}
