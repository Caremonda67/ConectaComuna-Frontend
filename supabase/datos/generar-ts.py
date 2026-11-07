"""Genera src/lib/comunasCali.ts desde el GeoJSON simplificado.

Lo que viaja al navegador. Tolerancia 0,0002 grados (~22 m) y 4 decimales:
0,30% de error de area de media y 3,8 KB comprimidos, contra 171,7 KB del
archivo de precision completa que se queda en Postgres.
"""
import json, io

fc = json.load(io.open("supabase/datos/comunas-cali-simplificado.geojson", encoding="utf-8"))
filas = []
for f in sorted(fc["features"], key=lambda f: f["properties"]["comuna"]):
    g = f["geometry"]
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    # Solo el anillo exterior: ninguna comuna de Cali tiene huecos y el mapa
    # se dibuja con la silueta.
    anillos = [p[0] for p in polys]
    txt = ",".join(
        "[" + ",".join("[%g,%g]" % (x, y) for x, y in anillo) + "]" for anillo in anillos
    )
    filas.append("  { comuna: %d, anillos: [%s] }," % (f["properties"]["comuna"], txt))

cab = '''/**
 * Siluetas de las 22 comunas de Cali, para dibujar el mapa del panel de equipo.
 *
 * GENERADO. No editar a mano: sale de supabase/datos/generar-ts.py a partir de
 * supabase/datos/comunas-cali-simplificado.geojson.
 *
 * Fuente: OpenStreetMap, contribuidores. Licencia ODbL — hay que atribuirla
 * donde se muestre el mapa.
 *
 * Simplificado con Douglas-Peucker a 0,0002 grados (~22 m) y 4 decimales:
 * 0,30% de error de area de media, invisible en un mapa de 22 poligonos, y
 * 3,8 KB comprimidos. Los poligonos de precision completa viven solo en
 * Postgres (tabla comunas_cali) y nunca viajan al telefono.
 *
 * Cada anillo es una lista de pares [lng, lat], en ese orden, como en GeoJSON.
 */
export interface SiluetaComuna {
  comuna: number
  anillos: [number, number][][]
}

export const COMUNAS_CALI: SiluetaComuna[] = [
'''
io.open("src/lib/comunasCali.ts", "w", encoding="utf-8").write(
    cab + "\n".join(filas) + "\n] as SiluetaComuna[]\n"
)
print("ok")
