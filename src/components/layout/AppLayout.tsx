import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { isDemoMode } from '@/lib/env'
import { cn } from '@/lib/utils'
import { UI_ICONS } from '@/components/ui/icons'
import { usePendingOrdersCount } from '@/hooks/usePendingOrdersCount'
import type { ActiveRole } from '@/types'
import { Logo } from './Logo'
import { SiteFooter } from './SiteFooter'

export function AppLayout() {
  const { profile, isDual, activeRole, setActiveRole, signOut, loading } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { businessPendingCount, activeCount } = usePendingOrdersCount()
  const navigate = useNavigate()
  const location = useLocation()
  const prefersReduced = useReducedMotion()

  const topNav = [
    { to: '/', label: 'Inicio', end: true },
    { to: '/explorar', label: 'Explorar oficios', end: false },
    { to: '/mapa', label: 'Mapa comunal', end: false },
    {
      to: profile
        ? profile.account_type === 'client'
          ? '/panel'
          : '/panel/negocio'
        : '/registro',
      label: 'Publicar servicio',
      end: false,
    },
    { to: '/como-funciona', label: 'Cómo funciona', end: false },
  ]

  const bottomNav = profile
    ? [
        { to: '/', label: 'Inicio', icon: UI_ICONS.home, end: true },
        { to: '/explorar', label: 'Explorar', icon: UI_ICONS.search, end: false },
        { to: '/mapa', label: 'Mapa', icon: UI_ICONS.map, end: false },
        { to: '/panel', label: 'Mi cuenta', icon: UI_ICONS.dashboard, end: false },
      ]
    : [
        { to: '/', label: 'Inicio', icon: UI_ICONS.home, end: true },
        { to: '/explorar', label: 'Explorar', icon: UI_ICONS.search, end: false },
        { to: '/mapa', label: 'Mapa', icon: UI_ICONS.map, end: false },
        { to: '/entrar', label: 'Ingresar', icon: UI_ICONS.user, end: false },
      ]

  const activeBottomIndex = bottomNav.findIndex((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  )

  const [largeText, setLargeText] = useState(() => {
    try {
      return localStorage.getItem('cc_large_text') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (largeText) {
      document.documentElement.classList.add('large-text-mode')
      try {
        localStorage.setItem('cc_large_text', 'true')
      } catch {}
    } else {
      document.documentElement.classList.remove('large-text-mode')
      try {
        localStorage.removeItem('cc_large_text')
      } catch {}
    }
  }, [largeText])

  // Al cambiar de ruta, restablecemos el scroll al inicio de la página para que la
  // nueva pantalla se aprecie completa desde arriba y no conserve la posición previa.
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!loading && profile) {
      if (!profile.onboarding_completado) {
        if (location.pathname !== '/onboarding') {
          navigate('/onboarding')
        }
        return
      }
    }
  }, [loading, profile, location.pathname, navigate])

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100 overflow-x-clip">
      <a
        href="#contenido"
        className="sr-only-focusable absolute left-2 top-2 z-50 rounded bg-brand-600 px-3 py-2 text-white"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-ink-200 bg-cream-100/95 backdrop-blur overflow-x-clip">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3">
          <NavLink to="/" aria-label="ConectaComuna, ir al inicio" className="shrink-0 min-w-0">
            <Logo hideTextOnMobile />
          </NavLink>

          <nav aria-label="Navegación principal" className="hidden lg:block">
            <ul className="flex items-center gap-6">
              {topNav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'text-sm font-medium transition-colors',
                        isActive ? 'text-brand-700' : 'text-ink-700 hover:text-brand-700',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Alternador de modo claro / oscuro */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Modo oscuro activo (clic para cambiar a claro)' : 'Cambiar a modo oscuro'}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-pressed={isDark}
              className={cn(
                'group relative min-h-7 min-w-7 sm:min-h-8 sm:min-w-8 p-1 sm:p-1.5 rounded-full border text-xs cursor-pointer flex items-center justify-center shadow-2xs overflow-hidden',
                'transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-105 active:scale-90 active:translate-y-0',
                isDark
                  ? 'border-brand-500/50 bg-cream-200 text-amber-300 hover:bg-cream-300 hover:border-amber-400/80 hover:shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                  : 'border-ink-200 bg-white text-ink-700 hover:bg-cream-200 hover:border-brand-400 hover:shadow-[0_0_10px_rgba(111,178,87,0.25)]',
              )}
            >
              <span
                key={isDark ? 'dark' : 'light'}
                className="flex items-center justify-center animate-icon-pop"
              >
                {isDark ? (
                  <UI_ICONS.sun size={15} className="text-amber-400 shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)] transition-transform duration-300 group-hover:rotate-45" />
                ) : (
                  <UI_ICONS.moon size={15} className="text-ink-700 shrink-0 transition-transform duration-300 group-hover:-rotate-12" />
                )}
              </span>
            </button>

            {/* Botón de accesibilidad: lectura cómoda para personas mayores */}
            <button
              type="button"
              onClick={() => setLargeText((v) => !v)}
              title={largeText ? 'Modo lectura cómoda activo (clic para tamaño estándar)' : 'Activar letra grande para lectura cómoda'}
              aria-label={largeText ? 'Desactivar letra grande' : 'Activar letra grande para lectura cómoda'}
              aria-pressed={largeText}
              className={cn(
                'min-h-7 min-w-7 sm:min-h-8 sm:min-w-8 px-1 sm:px-1.5 rounded-full border text-[10px] sm:text-xs font-bold cursor-pointer flex items-center justify-center select-none',
                'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 active:scale-90 active:translate-y-0',
                largeText
                  ? 'border-brand-500 bg-brand-100 dark:bg-brand-900/60 text-brand-900 dark:text-brand-200 shadow-xs ring-1 ring-brand-400/50'
                  : 'border-ink-200 bg-white dark:bg-cream-50 text-ink-600 hover:bg-cream-200 dark:hover:bg-cream-200 hover:border-brand-400',
              )}
            >
              <span className={cn('transition-transform duration-200 inline-block', largeText && 'scale-110')}>
                {largeText ? 'A−' : 'A+'}
              </span>
            </button>

            {/* Rol dual: negocio o facilitador pueden alternar a cliente */}
            {isDual && profile && (
              <div
                role="group"
                aria-label="Cambiar de rol"
                className="relative grid grid-cols-2 rounded-full border border-ink-200 bg-cream-100 p-0.5 text-[10px] sm:text-xs shrink-0 shadow-2xs overflow-hidden"
              >
                {/* Indicador deslizante seguro 100% contenido en el switch, sin bugs de salto fuera de pantalla */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-brand-500 shadow-xs transition-all duration-200 ease-out pointer-events-none',
                    activeRole === 'client' ? 'left-0.5' : 'left-[calc(50%+1px)]',
                  )}
                />

                {(['client', profile.account_type] as const).map((role) => {
                  const isSelected = activeRole === role
                  return (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setActiveRole(role as ActiveRole)}
                      className={cn(
                        'relative z-10 min-h-6 sm:min-h-7 rounded-full px-2 sm:px-3 font-semibold capitalize cursor-pointer select-none flex items-center justify-center text-center',
                        'transition-all duration-200 active:scale-95',
                        isSelected ? 'text-white' : 'text-ink-600 hover:text-ink-900 hover:scale-[1.02]',
                      )}
                    >
                      {role === 'client' ? (
                        'Cliente'
                      ) : role === 'business' ? (
                        <span className="inline-flex items-center gap-1">
                          Negocio
                          {businessPendingCount > 0 && (
                            <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-extrabold text-white animate-notification-badge">
                              {businessPendingCount > 9 ? '9+' : businessPendingCount}
                            </span>
                          )}
                        </span>
                      ) : (
                        <>
                          <span className="sm:hidden">Facil.</span>
                          <span className="hidden sm:inline">Facilitador</span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {profile ? (
              <>
                <NavLink
                  to="/panel"
                  className="hidden min-h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white dark:bg-cream-50 px-3 text-sm font-medium text-ink-900 sm:inline-flex transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-xs active:translate-y-0 active:scale-95"
                >
                  <span>Mi cuenta</span>
                  {activeCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white shadow-2xs animate-notification-badge">
                      {activeCount > 99 ? '99+' : activeCount}
                    </span>
                  )}
                </NavLink>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut()
                    navigate('/')
                  }}
                  className="min-h-7 sm:min-h-8 rounded-full px-1.5 sm:px-2 text-[11px] sm:text-sm font-medium text-ink-500 hover:text-rose-600 dark:hover:text-rose-400 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/entrar"
                  className="inline-flex min-h-7 sm:min-h-9 items-center rounded-full border border-ink-200 bg-white dark:bg-cream-50 px-2 sm:px-3 text-xs sm:text-sm font-medium text-ink-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:text-brand-800 dark:hover:text-brand-300 hover:shadow-xs active:translate-y-0 active:scale-95"
                >
                  <span>Ingresar</span>
                </NavLink>
                <NavLink
                  to="/registro"
                  className="group relative inline-flex min-h-7 sm:min-h-9 items-center rounded-full bg-brand-500 px-2 sm:px-3.5 text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md hover:shadow-brand-500/25 active:translate-y-0 active:scale-95 overflow-hidden"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                  />
                  <span className="sm:hidden">Registro</span>
                  <span className="hidden sm:inline">Registrarse</span>
                </NavLink>
              </>
            )}
          </div>
        </div>

        {isDemoMode && (
          <p className="bg-brand-50 px-4 py-1 text-center text-xs text-brand-800">
            Modo demo: datos locales. Configura las variables de Supabase para conectar el
            backend.
          </p>
        )}
      </header>

      <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 lg:pb-10">
        <Outlet />
      </main>

      <SiteFooter />

      <nav
        aria-label="Navegación rápida"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 dark:bg-cream-100/95 backdrop-blur-md lg:hidden"
      >
        <div className="relative mx-auto max-w-md">
          {/* Indicador superior deslizante: barra de acento minimalista y fluida */}
          {activeBottomIndex !== -1 && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 flex justify-center z-20"
              style={{ width: `${100 / bottomNav.length}%` }}
              animate={{
                x: `${activeBottomIndex * 100}%`,
              }}
              initial={false}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : {
                      type: 'spring',
                      stiffness: 450,
                      damping: 35,
                      mass: 0.7,
                    }
              }
            >
              <span className="h-[3px] w-9 rounded-full bg-brand-500 dark:bg-brand-400 shadow-[0_1px_8px_rgba(111,178,87,0.7)]" />
            </motion.div>
          )}

          {/* Pastilla de fondo suave que acompaña el desplazamiento del apartado activo */}
          {activeBottomIndex !== -1 && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1.5 p-1 z-0"
              style={{ width: `${100 / bottomNav.length}%` }}
              animate={{
                x: `${activeBottomIndex * 100}%`,
              }}
              initial={false}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : {
                      type: 'spring',
                      stiffness: 450,
                      damping: 35,
                      mass: 0.7,
                    }
              }
            >
              <div className="h-full w-full rounded-xl bg-brand-500/10 dark:bg-brand-400/15" />
            </motion.div>
          )}

          <ul className="relative z-10 grid grid-cols-4">
            {bottomNav.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-all duration-150 active:scale-95 select-none',
                        isActive
                          ? 'text-brand-700 dark:text-brand-300 font-semibold'
                          : 'text-ink-500 dark:text-ink-600 hover:text-ink-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="relative">
                          <Icon
                            aria-hidden="true"
                            size={20}
                            strokeWidth={isActive ? 2.2 : 1.75}
                            className={cn(
                              'transition-transform duration-200 group-hover:scale-110',
                              isActive && 'scale-110',
                            )}
                          />
                          {item.to === '/panel' && activeCount > 0 && (
                            <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold text-white ring-2 ring-white dark:ring-ink-900 animate-notification-badge">
                              {activeCount > 9 ? '9+' : activeCount}
                            </span>
                          )}
                        </div>
                        <span className="leading-none">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </div>
  )
}


