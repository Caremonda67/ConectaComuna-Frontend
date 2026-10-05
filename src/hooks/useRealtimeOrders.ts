import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'

/**
 * Se suscribe a cambios en la tabla `orders` filtrados por una columna
 * (ej: client_id o business_id) y dispara `onChange` para refrescar la lista.
 *
 * En modo demo no hace nada porque no hay Supabase real.
 */
export function useRealtimeOrders(
  column: 'client_id' | 'business_id',
  value: string | null | undefined,
  onUpdate: () => void,
) {
  useEffect(() => {
    const client = supabase
    if (isDemoMode || !client || !value) return

    const channel = client
      .channel(`orders:${column}:${value}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `${column}=eq.${value}`,
        },
        onUpdate,
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [column, value, onUpdate])
}
