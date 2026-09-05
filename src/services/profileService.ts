import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { delay, mutateDb, readDb } from './demoBackend'
import type { Profile } from '@/types'

export const profileService = {
  async getById(userId: string): Promise<Profile | null> {
    if (isDemoMode) {
      return delay(readDb().profiles.find((p) => p.id === userId) ?? null, 200)
    }
    // RLS: "profiles_select_public" permite leer perfiles; la escritura queda
    // limitada a `auth.uid() = id`.
    const { data, error } = await requireSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    return data as Profile | null
  },

  async update(userId: string, patch: Partial<Profile>): Promise<Profile> {
    if (isDemoMode) {
      const db = mutateDb((d) => {
        const i = d.profiles.findIndex((p) => p.id === userId)
        if (i >= 0) d.profiles[i] = { ...d.profiles[i], ...patch }
      })
      return delay(db.profiles.find((p) => p.id === userId)!)
    }
    const { data, error } = await requireSupabase()
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data as Profile
  },

  /** Un cliente que quiere ofrecer servicios pasa a cuenta dual. */
  async upgradeToBusiness(userId: string): Promise<Profile> {
    return profileService.update(userId, { account_type: 'business' })
  },
}
