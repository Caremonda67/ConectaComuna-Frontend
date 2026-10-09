import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { orderService } from '@/services/orderService'
import { businessService } from '@/services/businessService'
import { useRealtimeOrders } from './useRealtimeOrders'
import { isDemoMode } from '@/lib/env'

export function usePendingOrdersCount() {
  const { profile, activeRole } = useAuth()
  const [businessPendingCount, setBusinessPendingCount] = useState(0)
  const [clientPendingCount, setClientPendingCount] = useState(0)
  const [businessId, setBusinessId] = useState<string | null>(null)

  const profileId = profile?.id
  const accountType = profile?.account_type

  const refreshCounts = useCallback(async () => {
    if (!profileId) return

    try {
      let bId = businessId
      if (!bId && accountType === 'business') {
        const biz = await businessService.getByOwner(profileId)
        if (biz) {
          bId = biz.id
          setBusinessId(biz.id)
        }
      }

      const clientCount = await orderService.countPendingAsClient(profileId)
      setClientPendingCount(clientCount)

      if (bId) {
        const bizCount = await orderService.countPendingAsBusiness(bId)
        setBusinessPendingCount(bizCount)
      }
    } catch {
      // Ignorar fallas transitorias de red
    }
  }, [profileId, accountType, businessId])

  useEffect(() => {
    let active = true

    async function initialLoad() {
      if (!profileId) return
      try {
        let bId = businessId
        if (!bId && accountType === 'business') {
          const biz = await businessService.getByOwner(profileId)
          if (!active) return
          if (biz) {
            bId = biz.id
            setBusinessId(biz.id)
          }
        }

        const clientCount = await orderService.countPendingAsClient(profileId)
        if (!active) return
        setClientPendingCount(clientCount)

        if (bId) {
          const bizCount = await orderService.countPendingAsBusiness(bId)
          if (!active) return
          setBusinessPendingCount(bizCount)
        }
      } catch {
        // Ignorar fallas transitorias
      }
    }

    initialLoad()

    return () => {
      active = false
    }
  }, [profileId, accountType, businessId])

  // Escuchar cuando el usuario revisa su panel o muta la base local
  useEffect(() => {
    const handleUpdate = () => {
      void refreshCounts()
    }
    window.addEventListener('conectacomuna:orders-seen', handleUpdate)
    if (isDemoMode) {
      window.addEventListener('conectacomuna:db-updated', handleUpdate)
      window.addEventListener('storage', handleUpdate)
    }
    return () => {
      window.removeEventListener('conectacomuna:orders-seen', handleUpdate)
      if (isDemoMode) {
        window.removeEventListener('conectacomuna:db-updated', handleUpdate)
        window.removeEventListener('storage', handleUpdate)
      }
    }
  }, [refreshCounts])

  // Tiempo real con Supabase
  useRealtimeOrders('client_id', profileId, refreshCounts)
  useRealtimeOrders('business_id', businessId, refreshCounts)

  const businessPending = profileId ? businessPendingCount : 0
  const clientPending = profileId ? clientPendingCount : 0
  const activeCount = activeRole === 'business' ? businessPending : clientPending

  return {
    businessPendingCount: businessPending,
    clientPendingCount: clientPending,
    activeCount,
    refreshCounts,
  }
}
