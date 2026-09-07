import { useAuth } from '@/hooks/useAuth'
import ClientDashboard from '@/pages/client/ClientDashboard'
import BusinessDashboard from '@/pages/business/BusinessDashboard'
import FacilitatorDashboard from '@/pages/FacilitatorDashboard'

/**
 * Punto único de entrada al panel: decide la vista según el rol activo.
 * Así el usuario dual usa la misma ruta y solo alterna el switch del header.
 */
export default function DashboardPage() {
  const { profile, activeRole } = useAuth()
  
  if (profile?.account_type === 'facilitador') {
    return <FacilitatorDashboard />
  }
  
  return activeRole === 'business' ? <BusinessDashboard /> : <ClientDashboard />
}
