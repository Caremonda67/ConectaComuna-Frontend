import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isDemoMode } from '@/lib/env'
import { cn } from '@/lib/utils'
import { UI_ICONS } from '@/components/ui/icons'
import { Logo } from './Logo'
import { SiteFooter } from './SiteFooter'

/** Navegación principal del diseño (barra superior en escritorio). */
const topNav = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/explorar', label: 'Explorar servicios' },
  { to: '/panel/negocio', label: 'Publicar servicio' },
  { to: '/como-funciona', label: 'Cómo funciona' },
]

/** En móvil la navegación baja al alcance del pulgar. */
const bottomNav = [
  { to: '/', label: 'Inicio', icon: UI_ICONS.home, end: true },
  { to: '/explorar', label: 'Explorar', icon: UI_ICONS.search, end: false },
  { to: '/mapa', label: 'Mapa', icon: UI_ICONS.map, end: false },
  { to: '/panel', label: 'Panel', icon: UI_ICONS.dashboard, end: false },
]

export function AppLayout() {
  const { profile, isDual, activeRole, setActiveRole, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && profile) {
      if (!profile.onboarding_completado && location.pathname !== '/onboarding') {
        navigate('/onboarding')
        return
      }
      
      if (profile.account_type === 'business' && location.pathname !== '/verificacion') {
        const isVerified = localStorage.getItem("facial_verified_" + profile.id) === 'true'
        if (!isVerified) {
          navigate('/verificacion')
          return
        }
      }
    }
  }, [loading, profile, location.pathname, navigate])

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100">
      <a
        href="#contenido"
        className="sr-only-focusable absolute left-2 top-2 z-50 rounded bg-brand-600 px-3 py-2 text-white"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-20 border-b border-ink-200 bg-cream-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" aria-label="ConectaComuna, ir al inicio">
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

          <div className="flex items-center gap-2">
            {/* Rol dual: negocio o facilitador pueden alternar a cliente */}
            {isDual && profile && (
              <div
                role="group"
                aria-label="Cambiar de rol"
                className="flex rounded-full border border-ink-200 bg-white p-0.5 text-xs"
              >
                {(['client', profile.account_type] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={activeRole === role}
                    onClick={() => setActiveRole(role as any)}
                    className={cn(
                      'min-h-8 rounded-full px-2.5 font-medium transition-colors capitalize',
                      activeRole === role
                        ? 'bg-brand-100 text-brand-800'
                        : 'text-ink-500 hover:text-ink-900',
                    )}
                  >
                    {role === 'client' ? 'Cliente' : role === 'business' ? 'Negocio' : 'Facilitador'}
                  </button>
                ))}
              </div>
            )}

            {profile ? (
              <>
                <NavLink
                  to="/panel"
                  className="hidden min-h-9 items-center rounded-full border border-ink-200 bg-white px-3.5 text-sm font-medium text-ink-900 sm:inline-flex"
                >
                  Mi cuenta
                </NavLink>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut()
                    navigate('/')
                  }}
                  className="min-h-9 rounded-full px-2 text-sm font-medium text-ink-500 hover:text-ink-900"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/entrar"
                  className="hidden min-h-9 items-center rounded-full border border-ink-200 bg-white px-3.5 text-sm font-medium text-ink-900 sm:inline-flex"
                >
                  Iniciar sesión
                </NavLink>
                <NavLink
                  to="/registro"
                  className="inline-flex min-h-9 items-center rounded-full bg-brand-500 px-3.5 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Registrarse
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
        className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-white lg:hidden"
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
                      'flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium',
                      isActive ? 'text-brand-700' : 'text-ink-500',
                    )
                  }
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}


