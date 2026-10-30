import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { delay, mutateDb, readDb } from './demoBackend'
import type { Profile } from '@/types'

export const profileService = {
  /**
   * Perfil completo de quien tiene la sesión. El teléfono no es legible para
   * terceros: sale por la función mi_perfil(), que filtra por auth.uid().
   */
  async getMine(userId: string): Promise<Profile | null> {
    if (isDemoMode) {
      return delay(readDb().profiles.find((p) => p.id === userId) ?? null, 200)
    }

    const sb = requireSupabase()
    const { data, error } = await sb.rpc('mi_perfil').maybeSingle()
    if (!error) return data as Profile | null

    // Transición: mi_perfil() llega con migracion-perfiles-privados-v2.sql.
    // Mientras esa migración no esté aplicada, se lee la fila propia como antes
    // para que nadie se quede sin poder entrar a su cuenta.
    const anterior = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (anterior.error) throw anterior.error
    return anterior.data as Profile | null
  },

  async update(userId: string, patch: Partial<Profile>): Promise<Profile> {
    if (isDemoMode) {
      const db = mutateDb((d) => {
        const i = d.profiles.findIndex((p) => p.id === userId)
        if (i >= 0) d.profiles[i] = { ...d.profiles[i], ...patch }
      })
      return delay(db.profiles.find((p) => p.id === userId)!)
    }
    // 1. Intentar UPDATE primero (permite parches parciales sin violar restricciones NOT NULL de otras columnas)
    // Solo se pide la llave de vuelta: pedir la fila entera exigiría permiso de
    // lectura sobre columnas que ya no son legibles (el teléfono).
    const { data: updated, error: updateError } = await requireSupabase()
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('id')
      .maybeSingle()

    if (updateError) throw updateError

    // 2. Si la fila no existía aún (ej: primer onboarding), crear mediante upsert
    if (!updated) {
      const { error } = await requireSupabase()
        .from('profiles')
        .upsert({ id: userId, ...patch })
        .select('id')
        .single()
      if (error) throw error
    }

    const perfil = await profileService.getMine(userId)
    if (!perfil) throw new Error('No pudimos leer el perfil recién guardado')
    return perfil
  },

  /** Un cliente que quiere ofrecer servicios pasa a cuenta dual. */
  async upgradeToBusiness(userId: string): Promise<Profile> {
    return profileService.update(userId, { account_type: 'business' })
  },
}
