import type { Coordinates } from '@/types'

/** Punto donde el usuario quiere buscar, elegido por GPS, texto o el mapa. */
export interface UbicacionElegida {
  etiqueta: string
  center: Coordinates
  origen: 'gps' | 'busqueda' | 'mapa'
}

const CLAVE = 'conectacomuna.ubicacion'
const EVENTO = 'conectacomuna:ubicacion'

/** Recuerda la última ubicación de búsqueda (estilo Rappi) en el dispositivo. */
export function guardarUbicacion(u: UbicacionElegida): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(u))
  } catch {
    // almacenamiento no disponible (modo privado); la elección vive en memoria
  }
  // El evento `storage` del navegador solo avisa a las otras pestañas, así que
  // sin esto el asistente cambiaba la zona y la página de abajo seguía igual.
  window.dispatchEvent(new CustomEvent<UbicacionElegida>(EVENTO, { detail: u }))
}

/** Avisa cuando la ubicación cambia desde cualquier parte de la app. */
export function alCambiarUbicacion(escucha: (u: UbicacionElegida) => void): () => void {
  const handler = (e: Event) => escucha((e as CustomEvent<UbicacionElegida>).detail)
  window.addEventListener(EVENTO, handler)
  return () => window.removeEventListener(EVENTO, handler)
}

/** Lee la ubicación guardada, validando lat/lng por si el storage está corrupto. */
export function leerUbicacion(): UbicacionElegida | null {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return null
    const u = JSON.parse(raw) as UbicacionElegida
    if (!u.center || !Number.isFinite(u.center.lat) || !Number.isFinite(u.center.lng)) {
      return null
    }
    return u
  } catch {
    return null
  }
}