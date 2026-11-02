interface LogoProps {
  className?: string
  /** Si es true, solo dibuja el isotipo sin el texto */
  iconOnly?: boolean
  /** Usar versión blanca (para fondos oscuros forzados) */
  variant?: 'green' | 'white'
  /**
   * Oculta el texto solo en pantallas de menos de 360px.
   *
   * Antes el corte estaba en 440px y eso dejaba el nombre fuera de **casi
   * todos los teléfonos**: iPhone SE mide 375, iPhone 13 mide 390, los Android
   * corrientes van de 360 a 412. El umbral estaba justo por encima de los
   * aparatos reales, así que la marca solo aparecía en computador.
   */
  hideTextOnMobile?: boolean
}

/**
 * Isotipo y logotipo oficial de ConectaComuna (El Pin de Confianza).
 */
export function Logo({
  className = '',
  iconOnly = false,
  variant = 'green',
  hideTextOnMobile = false,
}: LogoProps) {
  const isWhite = variant === 'white'

  return (
    <span className={`inline-flex items-center gap-2 sm:gap-2.5 ${className}`}>
      {isWhite ? (
        <img
          src="/brand/logo-pin-white.png"
          alt="ConectaComuna"
          width={26}
          height={34}
          className="h-7 w-auto sm:h-8 shrink-0 select-none object-contain"
          loading="eager"
          decoding="sync"
        />
      ) : (
        <>
          <img
            src="/brand/logo-pin.png"
            alt="ConectaComuna"
            width={26}
            height={34}
            className="h-7 w-auto sm:h-8 shrink-0 select-none object-contain dark:hidden"
            loading="eager"
            decoding="sync"
          />
          <img
            src="/brand/logo-pin-white.png"
            alt="ConectaComuna"
            width={26}
            height={34}
            className="h-7 w-auto sm:h-8 shrink-0 select-none object-contain hidden dark:block"
            loading="eager"
            decoding="sync"
          />
        </>
      )}

      {!iconOnly && (
        <span
          className={`${
            hideTextOnMobile ? 'hidden min-[360px]:inline' : 'inline'
          } text-[15px] min-[400px]:text-base sm:text-xl font-bold tracking-tight whitespace-nowrap ${
            isWhite ? 'text-white' : 'text-ink-900'
          }`}
        >
          Conecta<span className={isWhite ? 'text-brand-300' : 'text-brand-700'}>Comuna</span>
        </span>
      )}
    </span>
  )
}
