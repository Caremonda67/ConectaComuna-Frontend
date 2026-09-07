import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { CardSkeletonList } from '@/components/ui/Skeleton'

/** Protege rutas privadas y recuerda a dónde iba el usuario tras el login. */
export function ProtectedRoute({
  children,
  requireBusiness = false,
}: {
  children: ReactNode
  requireBusiness?: boolean
}) {
  const { loading, userId, profile } = useAuth()
  const location = useLocation()

  if (loading) return <CardSkeletonList count={3} />
  if (!userId) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />

  // Guardia de Onboarding: Si el usuario no tiene un perfil completo (especialmente el rol),
  // lo redirigimos a completar sus datos antes de entrar al panel.
  if (!profile || !profile.full_name || !profile.account_type) {
    return <Navigate to="/onboarding" replace />
  }

  if (requireBusiness && profile?.account_type !== 'business') {
    return <Navigate to="/panel" replace />
  }
  return <>{children}</>
}
