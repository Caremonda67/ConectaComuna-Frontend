import { requireSupabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/env'
import { delay, mutateDb, readDb, uid } from './demoBackend'
import type { Coordinates, DireccionUsuario } from '@/types'

/** Punto geocodificado que el usuario puede elegir como centro de búsqueda. */
export interface UbicacionGeocodificada {
  etiqueta: string
  center: Coordinates
}

export interface DireccionInput {
  etiqueta: string
  direccionTexto: string
  barrio: string | null
  lat: number
  lng: number
}

/**
 * Catálogo local de lugares conocidos de la comuna para el modo demo.
 * No es un geocoder real: resuelve los nombres que la gente dice en la calle
 * ("El Rodeo", "Antonio Nariño") a un punto aproximado. En producción deja
 * paso a OSM Nominatim.
 */
const LUGARES_DEMO: UbicacionGeocodificada[] = [
  { etiqueta: 'El Rodeo', center: { lat: 3.4401, lng: -76.5209 } },
  { etiqueta: 'Antonio Nariño', center: { lat: 3.4365, lng: -76.5255 } },
  { etiqueta: 'Nueva Floresta', center: { lat: 3.4342, lng: -76.5281 } },
  { etiqueta: 'Centro de la Comuna 20', center: { lat: 3.4372, lng: -76.5225 } },
  { etiqueta: 'Parque Antonio Nariño', center: { lat: 3.4379, lng: -76.5247 } },
  { etiqueta: 'Iglesia El Rodeo', center: { lat: 3.4408, lng: -76.5204 } },
]

export const direccionService = {
  async listarPorUsuario(usuarioId: string): Promise<DireccionUsuario[]> {
    if (isDemoMode) {
      return delay(
        readDb()
          .direcciones.filter((d) => d.usuario_id === usuarioId)
          .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
      )
    }
    const { data, error } = await requireSupabase()
      .from('direcciones_usuario')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: true })
    if (error) throw error
    return (data ?? []) as DireccionUsuario[]
  },

  async crear(usuarioId: string, input: DireccionInput): Promise<DireccionUsuario> {
    if (isDemoMode) {
      const direccion: DireccionUsuario = {
        id: uid('dir'),
        usuario_id: usuarioId,
        etiqueta: input.etiqueta,
        direccion_texto: input.direccionTexto,
        barrio: input.barrio,
        lat: input.lat,
        lng: input.lng,
        creado_en: new Date().toISOString(),
      }
      mutateDb((d) => d.direcciones.push(direccion))
      return delay(direccion)
    }
    // RLS: insert permitido solo si `auth.uid() = usuario_id`.
    const { data, error } = await requireSupabase()
      .from('direcciones_usuario')
      .insert({
        usuario_id: usuarioId,
        etiqueta: input.etiqueta,
        direccion_texto: input.direccionTexto,
        barrio: input.barrio,
        lat: input.lat,
        lng: input.lng,
      })
      .select()
      .single()
    if (error) throw error
    return data as DireccionUsuario
  },

  async actualizar(
    id: string,
    input: Partial<DireccionInput>,
  ): Promise<DireccionUsuario> {
    if (isDemoMode) {
      const db = mutateDb((d) => {
        const d2 = d.direcciones.find((x) => x.id === id)
        if (d2) {
          if (input.etiqueta !== undefined) d2.etiqueta = input.etiqueta
          if (input.direccionTexto !== undefined)
            d2.direccion_texto = input.direccionTexto
          if (input.barrio !== undefined) d2.barrio = input.barrio
          if (input.lat !== undefined) d2.lat = input.lat
          if (input.lng !== undefined) d2.lng = input.lng
        }
      })
      const actualizada = db.direcciones.find((d) => d.id === id)
      if (!actualizada) throw new Error('Dirección no encontrada')
      return delay(actualizada)
    }
    const { data, error } = await requireSupabase()
      .from('direcciones_usuario')
      .update({
        etiqueta: input.etiqueta,
        direccion_texto: input.direccionTexto,
        barrio: input.barrio,
        lat: input.lat,
        lng: input.lng,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DireccionUsuario
  },

  async eliminar(id: string): Promise<void> {
    if (isDemoMode) {
      mutateDb((d) => {
        d.direcciones = d.direcciones.filter((x) => x.id !== id)
      })
      return delay(undefined, 200)
    }
    const { error } = await requireSupabase()
      .from('direcciones_usuario')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

/** Convierte el texto del usuario ("El Rodeo", "Calle 5 #4-20") en puntos. */
export async function geocodificar(texto: string): Promise<UbicacionGeocodificada[]> {
  const q = texto.trim()
  if (!q) return []
  if (isDemoMode) {
    const low = q.toLowerCase()
    const hits = LUGARES_DEMO.filter((l) => l.etiqueta.toLowerCase().includes(low))
    const ranked = [...hits].sort((a, b) => {
      const ia = a.etiqueta.toLowerCase().indexOf(low)
      const ib = b.etiqueta.toLowerCase().indexOf(low)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    return delay(ranked.slice(0, 5))
  }

  // Geocoder abierto de OpenStreetMap, sin API key. Acotado a Cali con `viewbox`
  // para no traer resultados de otro país con el mismo nombre.
  const viewbox = '-76.75,3.30,-76.40,3.55'
  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=json&limit=5&countrycodes=co&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error('No pudimos geolocalizar esa dirección. Prueba con el nombre de un barrio.')
  }
  const data = (await res.json()) as Array<{
    display_name: string
    lat: string
    lon: string
  }>
  return data.map((r) => ({
    etiqueta: r.display_name,
    center: { lat: Number(r.lat), lng: Number(r.lon) },
  }))
}