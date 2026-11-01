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

  // El facilitador tambien es un vecino: puede pedirle un arreglo a la modista
  // de su cuadra. Antes esta pantalla le devolvia su panel de facilitador
  // pasara lo que pasara, asi que podia contratar en rol Cliente y despues no
  // tenia donde ver el pedido. El conmutador decide, como en los demas roles.
  if (profile?.account_type === 'facilitador') {
    return activeRole === 'facilitador' ? <FacilitatorDashboard /> : <ClientDashboard />
  }

  return activeRole === 'business' ? <BusinessDashboard /> : <ClientDashboard />
}
