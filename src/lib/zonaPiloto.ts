import { COMUNA_CENTER } from '@/lib/env'
import { distanceKm } from '@/lib/utils'
import type { Coordinates } from '@/types'

/**
 * Radio alrededor del centro de la comuna dentro del cual consideramos que el
 * usuario está en territorio del piloto. Cubre Cali y su área cercana (Yumbo,
 * Jamundí) sin llegar a Palmira.
 */
export const RADIO_PILOTO_KM = 35

/** Punto al que mandamos a quien quiere ver el piloto sin estar en Cali. */
export const PUNTO_PILOTO = {
  etiqueta: 'Centro de la Comuna, Cali',
  center: COMUNA_CENTER,
} as const

/**
 * Única respuesta a "¿este punto está en el piloto?". Antes cada pantalla lo
 * resolvía a su manera (unas por radio, el asistente por una caja de
 * coordenadas) y se contradecían en los bordes.
 */
export function estaEnZonaPiloto(center: Coordinates | null | undefined): boolean {
  if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
    return true
  }
  return distanceKm(center, COMUNA_CENTER) <= RADIO_PILOTO_KM
}

/** Complemento de `estaEnZonaPiloto`, para leer mejor en los estados vacíos. */
export function estaFueraDelPiloto(center: Coordinates | null | undefined): boolean {
  return !estaEnZonaPiloto(center)
}
