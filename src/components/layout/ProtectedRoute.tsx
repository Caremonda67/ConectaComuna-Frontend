import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { CardSkeletonList } from '@/components/ui/Skeleton'

/** Protege rutas privadas y recuerda a dónde iba el usuario tras el login. */
export function ProtectedRoute({
  children,
  requireBusiness = false,
  requireFacilitador = false,
  allowIncompleteProfile = false,
}: {
  children: ReactNode
  requireBusiness?: boolean
  /** Solo para el panel del facilitador: gestiona negocios ajenos y responde reportes. */
  requireFacilitador?: boolean
  allowIncompleteProfile?: boolean
}) {
  const { loading, userId, profile } = useAuth()
  const location = useLocation()

  if (loading) return <CardSkeletonList count={3} />
  if (!userId) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />

  // Guardia de Onboarding: si el usuario no tiene perfil completo o no ha finalizado
  // el onboarding (como en altas con Google que entran con rol por defecto),
  // se le orienta a /onboarding para confirmar rol, teléfono y barrio.
  const faltaOnboarding =
    !allowIncompleteProfile &&
    (!profile ||
      !profile.full_name ||
      !profile.account_type ||
      profile.onboarding_completado === false)

  if (faltaOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  if (requireBusiness && profile?.account_type !== 'business' && profile?.account_type !== 'facilitador') {
    return <Navigate to="/panel" replace />
  }

  if (requireFacilitador && profile?.account_type !== 'facilitador') {
    return <Navigate to="/panel" replace />
  }
  return <>{children}</>
}
