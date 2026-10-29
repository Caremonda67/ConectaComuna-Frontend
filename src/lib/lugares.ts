import { geocodificar, type UbicacionGeocodificada } from '@/services/direccionService'

/**
 * Atajos de los barrios del piloto. No son un filtro: son caché, para que los
 * barrios que más se nombran en la demo respondan al instante y sigan
 * funcionando si la red falla. Cualquier otro lugar de Colombia se resuelve
 * contra el geocodificador.
 */
const ATAJOS_PILOTO: UbicacionGeocodificada[] = [
  { etiqueta: 'Antonio Nariño, Cali', center: { lat: 3.4365, lng: -76.5255 } },
  { etiqueta: 'El Rodeo, Cali', center: { lat: 3.4401, lng: -76.5209 } },
  { etiqueta: 'Nueva Floresta, Cali', center: { lat: 3.4342, lng: -76.5281 } },
  { etiqueta: 'Vallado, Cali', center: { lat: 3.414, lng: -76.505 } },
  { etiqueta: 'San Judas, Cali', center: { lat: 3.4215, lng: -76.512 } },
  { etiqueta: 'Ciudad Córdoba, Cali', center: { lat: 3.418, lng: -76.508 } },
  { etiqueta: 'Mariano Ramos, Cali', center: { lat: 3.413, lng: -76.516 } },
  { etiqueta: 'República de Israel, Cali', center: { lat: 3.424, lng: -76.517 } },
]

/** Sin tildes y sin puntuación, para comparar "Ciudad Córdoba" con "ciudad cordoba". */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Convierte el nombre de un lugar en coordenadas. Sirve para cualquier barrio,
 * vereda, municipio o punto de referencia de Colombia, no solo para la comuna.
 */
export async function resolverLugar(nombre: string): Promise<UbicacionGeocodificada | null> {
  const buscado = normalizar(nombre)
  if (buscado.length < 3) return null

  // Se compara también sin el artículo inicial, porque la gente escribe
  // indistintamente "El Rodeo" o "Rodeo".
  const sinArticulo = buscado.replace(/^(el|la|los|las)\s+/, '')
  const atajo = ATAJOS_PILOTO.find((a) => {
    const barrio = normalizar(a.etiqueta.split(',')[0])
    const barrioSinArticulo = barrio.replace(/^(el|la|los|las)\s+/, '')
    return (
      buscado === barrio ||
      buscado === `${barrio} cali` ||
      sinArticulo === barrioSinArticulo ||
      sinArticulo === `${barrioSinArticulo} cali`
    )
  })
  if (atajo) return atajo

  try {
    const hits = await geocodificar(nombre)
    const hit = hits[0]
    if (!hit) return null

    // Nominatim a veces nombra el punto por el sector vecino: pedir "La
    // Candelaria, Bogotá" devolvía "Sagrado Corazón, Bogotá". La ciudad sirve,
    // el barrio no, así que se conserva como lo dijo la persona.
    const pedido = normalizar(nombre)
    const devuelto = normalizar(hit.etiqueta)
    if (!devuelto.includes(pedido.split(' ')[0])) {
      const partes = hit.etiqueta.split(',')
      const ciudad = partes.length > 1 ? partes[partes.length - 1].trim() : ''
      const comoLoDijo = nombre.trim().replace(/\s*,\s*$/, '')
      return {
        etiqueta: ciudad && !normalizar(comoLoDijo).includes(normalizar(ciudad))
          ? `${comoLoDijo}, ${ciudad}`
          : comoLoDijo,
        center: hit.center,
      }
    }
    return hit
  } catch {
    return null
  }
}

/** Los barrios del piloto, para ofrecerlos como atajo en la interfaz. */
export const BARRIOS_PILOTO = ATAJOS_PILOTO
