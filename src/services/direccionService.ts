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

export const BARRIOS_COMUNA = [
  { nombre: 'Antonio Nariño', center: { lat: 3.4365, lng: -76.5255 } },
  { nombre: 'El Rodeo', center: { lat: 3.4401, lng: -76.5209 } },
  { nombre: 'Nueva Floresta', center: { lat: 3.4342, lng: -76.5281 } },
  { nombre: 'Centro Comuna 20', center: { lat: 3.4372, lng: -76.5225 } },
]

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

/** Último recurso cuando no hay nombre para unas coordenadas. */
function puntoSinNombre(coords: Coordinates): string {
  return `Punto (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
}

/**
 * Arma "Barrio, Ciudad" a partir de los campos que devuelve Nominatim.
 * La respuesta trae el mismo lugar bajo nombres distintos según el país y el
 * tipo de vía, por eso la cascada de alternativas.
 */
function etiquetarDireccion(
  address: Record<string, string> | undefined,
  respaldo: string,
): string {
  const a = address || {}
  const barrio =
    a.neighbourhood || a.suburb || a.residential || a.quarter || a.amenity || a.road || ''
  const rawCiudad =
    a.city || a.town || a.village || a.municipality || a.county || a.state || ''
  const ciudad = rawCiudad
    .replace(/^perímetro urbano\s+/gi, '')
    .replace(/\s+ciudad$/gi, '')
    .trim()

  if (barrio && ciudad && !barrio.toLowerCase().includes(ciudad.toLowerCase())) {
    return `${barrio}, ${ciudad}`
  }
  return barrio || ciudad || respaldo
}

/** Convierte el texto del usuario ("El Rodeo", "Calle 26 Bogotá", "Corferias") en puntos. */
export async function geocodificar(texto: string): Promise<UbicacionGeocodificada[]> {
  const q = texto.trim()
  if (!q) return []

  // Geocoder abierto de OpenStreetMap para Colombia
  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=json&limit=5&countrycodes=co&addressdetails=1&email=contacto@conectacomuna.co&q=${encodeURIComponent(q)}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ConectaComuna-Web/1.0 (contacto@conectacomuna.co)',
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = (await res.json()) as Array<{
        display_name: string
        lat: string
        lon: string
        address?: Record<string, string>
      }>
      if (Array.isArray(data) && data.length > 0) {
        // Nominatim devuelve el mismo lugar varias veces (el polígono y su
        // nodo, por ejemplo) y al simplificar la etiqueta quedan idénticos.
        const vistos = new Set<string>()
        return data
          .map((r) => ({
            etiqueta: etiquetarDireccion(r.address, r.display_name),
            center: { lat: Number(r.lat), lng: Number(r.lon) },
          }))
          .filter((hit) => {
            const clave = `${hit.etiqueta}|${hit.center.lat.toFixed(3)},${hit.center.lng.toFixed(3)}`
            if (vistos.has(clave)) return false
            vistos.add(clave)
            return true
          })
      }
    }
  } catch (err) {
    console.warn('Geocodificación externa no disponible, usando índice de barrios local:', err)
  }

  // Fallback local con barrios de la comuna si falla la red externa
  const low = q.toLowerCase()
  const fallbackHits = LUGARES_DEMO.filter((l) => l.etiqueta.toLowerCase().includes(low))
  return fallbackHits.slice(0, 5)
}

/** Convierte coordenadas geográficas en un barrio y ciudad legible en Colombia. */
export async function reverseGeocodificar(coords: Coordinates): Promise<UbicacionGeocodificada> {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=16&addressdetails=1&email=contacto@conectacomuna.co`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ConectaComuna-Web/1.0 (contacto@conectacomuna.co)',
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = (await res.json()) as {
        display_name?: string
        address?: Record<string, string>
      }
      return {
        etiqueta: etiquetarDireccion(data.address, data.display_name || puntoSinNombre(coords)),
        center: coords,
      }
    }
  } catch (err) {
    console.warn('Reverse geocodificación no disponible, usando coordenadas:', err)
  }

  return { etiqueta: puntoSinNombre(coords), center: coords }
}
