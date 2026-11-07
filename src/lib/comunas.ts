import { COMUNAS_CALI } from './comunasCali'

/**
 * En qué comuna de Cali cae un punto.
 *
 * En producción esto lo hace Postgres con PostGIS (`public.comuna_de_punto`,
 * en `migracion-comunas-postgis.sql`) y el resultado queda guardado en
 * `businesses.comuna`. Esta copia existe para el **modo demostración**, que no
 * tiene base de datos: sin ella el panel de equipo no se podría probar ni
 * mostrar si falla el internet de la sede.
 *
 * Las dos versiones no dan exactamente el mismo resultado en todos los casos:
 * aquí se usan las siluetas simplificadas (~22 m de tolerancia), así que un
 * negocio justo sobre el límite entre dos comunas puede caer en la vecina.
 * Para contar negocios por comuna eso no cambia nada; para un dato oficial, la
 * fuente es Postgres.
 *
 * Devuelve `null` si el punto no está en ninguna comuna —un negocio de Bogotá,
 * por ejemplo—. Quien llame debe contarlo como «sin clasificar», nunca
 * esconderlo.
 */
export function comunaDePunto(lat: number, lng: number): number | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  for (const silueta of COMUNAS_CALI) {
    for (const anillo of silueta.anillos) {
      if (puntoEnAnillo(lng, lat, anillo)) return silueta.comuna
    }
  }
  return null
}

/**
 * Lanzamiento de rayo: se cuenta cuántas veces un rayo horizontal hacia el
 * este cruza el borde. Impar = dentro.
 *
 * El `(yi > y) !== (yj > y)` deja fuera el extremo superior de cada segmento a
 * propósito: así un punto a la misma altura que un vértice se cuenta una vez y
 * no dos, que es el error clásico de esta función.
 */
function puntoEnAnillo(x: number, y: number, anillo: readonly [number, number][]): boolean {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dentro = !dentro
    }
  }
  return dentro
}
