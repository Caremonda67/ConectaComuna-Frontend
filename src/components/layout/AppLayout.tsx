import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isDemoMode } from '@/lib/env'
import { cn } from '@/lib/utils'
import { UI_ICONS } from '@/components/ui/icons'
import type { ActiveRole } from '@/types'
import { Logo } from './Logo'
import { SiteFooter } from './SiteFooter'

export function AppLayout() {
  const { profile, isDual, activeRole, setActiveRole, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
            <Logo />
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
            {/* Botón de accesibilidad: lectura cómoda para personas mayores */}
            <button
              type="button"
              onClick={() => setLargeText((v) => !v)}
              title={largeText ? 'Modo lectura cómoda activo (clic para tamaño estándar)' : 'Activar letra grande para lectura cómoda'}
              aria-label={largeText ? 'Desactivar letra grande' : 'Activar letra grande para lectura cómoda'}
              aria-pressed={largeText}
              className={cn(
                'min-h-7 min-w-7 sm:min-h-8 sm:min-w-8 px-1 sm:px-1.5 rounded-full border text-[10px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center justify-center',
                largeText
                  ? 'border-brand-500 bg-brand-100 text-brand-900 shadow-sm'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-cream-200',
              )}
            >
              {largeText ? 'A−' : 'A+'}
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
                        'relative z-10 min-h-6 sm:min-h-7 rounded-full px-2 sm:px-3 font-semibold transition-colors capitalize cursor-pointer select-none flex items-center justify-center text-center',
                        isSelected ? 'text-white' : 'text-ink-600 hover:text-ink-900',
                      )}
                    >
                      {role === 'client' ? (
                        'Cliente'
                      ) : role === 'business' ? (
                        'Negocio'
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
                  className="hidden min-h-9 items-center rounded-full border border-ink-200 bg-white px-3 text-sm font-medium text-ink-900 sm:inline-flex"
                >
                  Mi cuenta
                </NavLink>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut()
                    navigate('/')
                  }}
                  className="min-h-7 sm:min-h-8 rounded-full px-1.5 sm:px-2 text-[11px] sm:text-sm font-medium text-ink-500 hover:text-ink-900"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/entrar"
                  className="inline-flex min-h-7 sm:min-h-9 items-center rounded-full border border-ink-200 bg-white px-2 sm:px-3 text-xs sm:text-sm font-medium text-ink-800 hover:bg-cream-200 transition-colors"
                >
                  <span className="sm:hidden">Entrar</span>
                  <span className="hidden sm:inline">Iniciar sesión</span>
                </NavLink>
                <NavLink
                  to="/registro"
                  className="inline-flex min-h-7 sm:min-h-9 items-center rounded-full bg-brand-500 px-2 sm:px-3.5 text-xs sm:text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                >
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur-xs lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {bottomNav.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors select-none',
                      isActive ? 'text-brand-700 font-semibold' : 'text-ink-500 hover:text-ink-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-500 transition-all duration-200"
                        />
                      )}
                      <Icon
                        aria-hidden="true"
                        size={20}
                        strokeWidth={isActive ? 2.2 : 1.75}
                        className={cn('transition-transform duration-200', isActive && 'scale-110')}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}


