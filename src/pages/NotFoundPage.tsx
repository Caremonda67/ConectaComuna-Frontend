import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { UI_ICONS } from '@/components/ui/icons'

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Página no encontrada | ConectaComuna'
  }, [])

  return (
    <div className="py-12 flex justify-center items-center">
      <div className="w-full max-w-md">
        <EmptyState
          icon={UI_ICONS.compass}
          title="No encontramos esa página"
          description="Revisa el enlace o utiliza los accesos directos para volver a navegar por la comuna."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link to="/">
                <Button variant="primary">Volver al inicio</Button>
              </Link>
              <Link to="/explorar">
                <Button variant="secondary">Explorar oficios</Button>
              </Link>
            </div>
          }
        />
      </div>
    </div>
  )
}
