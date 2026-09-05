import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService, type SignUpInput } from '@/services/authService'
import { profileService } from '@/services/profileService'
import { businessService } from '@/services/businessService'
import type { ActiveRole, Business, Profile } from '@/types'

interface AuthContextValue {
  loading: boolean
  userId: string | null
  email: string | null
  profile: Profile | null
  business: Business | null
  /** Rol con el que el usuario está navegando (dual = puede alternar). */
  activeRole: ActiveRole
  isDual: boolean
  setActiveRole: (role: ActiveRole) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

const ROLE_KEY = 'conectacomuna.activeRole'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(
    () => (localStorage.getItem(ROLE_KEY) as ActiveRole | null) ?? 'client',
  )

  const loadUser = useCallback(async () => {
    const session = await authService.getSession()
    if (!session) {
      setUserId(null)
      setEmail(null)
      setProfile(null)
      setBusiness(null)
      return
    }
    setUserId(session.userId)
    setEmail(session.email)
    const p = await profileService.getById(session.userId)
    setProfile(p)
    // Un perfil de negocio puede aún no haber creado su ficha: eso lo
    // aprovechamos para el onboarding asistido del perfil.
    setBusiness(p?.account_type === 'business' ? await businessService.getByOwner(session.userId) : null)
    if (p?.account_type === 'business' && !localStorage.getItem(ROLE_KEY)) {
      setActiveRoleState('business')
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        await loadUser()
      } finally {
        if (alive) setLoading(false)
      }
    })()
    const unsubscribe = authService.onAuthStateChange(() => {
      void loadUser()
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [loadUser])

  const setActiveRole = useCallback((role: ActiveRole) => {
    localStorage.setItem(ROLE_KEY, role)
    setActiveRoleState(role)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const isDual = profile?.account_type === 'business'
    return {
      loading,
      userId,
      email,
      profile,
      business,
      isDual,
      // Un cliente puro nunca puede quedar en rol negocio.
      activeRole: isDual ? activeRole : 'client',
      setActiveRole,
      async signIn(mail, password) {
        await authService.signIn(mail, password)
        await loadUser()
      },
      async signUp(input) {
        await authService.signUp(input)
        setActiveRole(input.accountType === 'business' ? 'business' : 'client')
        await loadUser()
      },
      async signOut() {
        await authService.signOut()
        localStorage.removeItem(ROLE_KEY)
        setUserId(null)
        setProfile(null)
        setBusiness(null)
        setActiveRoleState('client')
      },
      refresh: loadUser,
    }
  }, [loading, userId, email, profile, business, activeRole, setActiveRole, loadUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
