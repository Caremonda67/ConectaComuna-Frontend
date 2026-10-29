import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { usePageMeta } from '@/hooks/usePageMeta'
import { businessService } from '@/services/businessService'
import { ReportesComunitariosPanel } from '@/components/trust/ReportesComunitariosPanel'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { UI_ICONS } from '@/components/ui/icons'

/**
 * Mesa de trabajo del equipo que sostiene la comuna. No es un rol del producto:
 * solo las cuentas de la lista corta pueden entrar y decidir sobre un reporte.
 */
export default function EquipoPage() {
  usePageMeta({
    title: 'Mesa de reportes · ConectaComuna',
    description: 'Revisión de los reportes vecinales que llegan a la comuna.',
  })

  const { userId } = useAuth()
  const { data: esEquipo, loading } = useAsync(() => businessService.esEquipoConecta(), [userId])

  if (loading) return <CardSkeletonList count={2} />
  if (!esEquipo || !userId) return <Navigate to="/panel" replace />

  return (
    <div className="space-y-6">
      <header className="border-b border-ink-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Equipo Conecta Comuna</p>
        <h1 className="mt-1 text-2xl font-bold">Mesa de reportes</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">
          Aquí llegan los reportes de toda la red. Confirma solo lo que puedas comprobar:
          dos reportes confirmados dejan el negocio bajo observación y se le quita el sello público.
        </p>
      </header>

      <ReportesComunitariosPanel modo="equipo" usuarioId={userId} />

      <section className="card p-4 bg-cream-100 border-ink-200">
        <h2 className="font-bold text-ink-900 flex items-center gap-2">
          <UI_ICONS.handshake size={18} className="text-teal-700 shrink-0" />
          Cómo se maneja un caso
        </h2>
        <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-ink-700">
          <li>Lee el reporte y la versión que dejó el negocio o su facilitador.</li>
          <li>Si puedes, habla con las dos partes antes de decidir. La nota de revisión queda guardada.</li>
          <li>Confirma si el hecho se comprobó; descarta si no. El contador del negocio se recalcula solo.</li>
          <li>Si el caso lo amerita, comparte el número del negocio con la red de facilitadores del barrio
            para que acompañen la conversación.</li>
        </ol>
      </section>
    </div>
  )
}
