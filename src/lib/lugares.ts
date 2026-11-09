import { geocodificar, type UbicacionGeocodificada } from '@/services/direccionService'

/**
 * Atajos de los barrios del piloto. No son un filtro: son caché, para que los
 * barrios que más se nombran en la demo respondan al instante y sigan
 * funcionando si la red falla. Cualquier otro lugar de Colombia se resuelve
 * contra el geocodificador.
 *
 * LAS OCHO COORDENADAS ANTERIORES ESTABAN MAL, entre 1 y 3,5 km cada una, y
 * ninguna caía en el barrio que decía su etiqueta. «Vallado» apuntaba a
 * Antonio Nariño, «Antonio Nariño» a Guayaquil, «Nueva Floresta» a Junín.
 * Estaban escritas a mano con cuatro decimales y nunca se comprobaron.
 *
 * No es cosmético: esta tabla pone el punto de un negocio cuando alguien
 * escribe su barrio, y de ahí sale la comuna que cuenta el panel. Un negocio
 * del piloto quedó guardado exactamente en el «Vallado» de arriba, o sea a un
 * kilómetro de su calle y en la comuna equivocada.
 *
 * Las de ahora salen de Nominatim y están comprobadas de ida y vuelta: se
 * busca el barrio, y el punto que devuelve se geocodifica al revés para
 * confirmar que cae en ese mismo barrio. Si alguna se cambia, hay que repetir
 * esa comprobación; a ojo no se ve que estén mal.
 */
export const ATAJOS_PILOTO: UbicacionGeocodificada[] = [
  { etiqueta: 'Antonio Nariño, Cali', center: { lat: 3.41442, lng: -76.50542 } }, // comuna 16
  { etiqueta: 'El Rodeo, Cali', center: { lat: 3.43599, lng: -76.50521 } }, // comuna 12
  { etiqueta: 'Nueva Floresta, Cali', center: { lat: 3.43854, lng: -76.49701 } }, // comuna 12
  { etiqueta: 'El Vallado, Cali', center: { lat: 3.40624, lng: -76.49942 } }, // comuna 15
  // Cali tiene San Judas Tadeo I y II; esta es la I, que es a la que
  // responde el geocodificador. Si en el barrio se refieren a la otra, hay
  // que desdoblar la entrada.
  { etiqueta: 'San Judas, Cali', center: { lat: 3.4088, lng: -76.52408 } }, // comuna 10
  { etiqueta: 'Ciudad Córdoba, Cali', center: { lat: 3.40116, lng: -76.50803 } }, // comuna 15
  { etiqueta: 'Mariano Ramos, Cali', center: { lat: 3.40361, lng: -76.51723 } }, // comuna 16
  { etiqueta: 'República de Israel, Cali', center: { lat: 3.40759, lng: -76.51338 } }, // comuna 16
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

