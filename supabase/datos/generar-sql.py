"""Genera datos/comunas-insert.sql y sus cuatro partes desde el GeoJSON.

Correr desde supabase/:  python datos/generar-sql.py

No se escribe a mano: 22 poligonos son 170 KB y copiarlos a mano es pedir un
error silencioso. Si un dia llega la capa oficial del DAPM, se reemplaza el
GeoJSON y se vuelve a correr esto.

El st_setsrid explicito NO es decorativo. st_geomfromgeojson puede devolver la
geometria sin sistema de coordenadas, y la columna es
geography(multipolygon, 4326): sin el, el cast falla, los 22 inserts no entran
y la tabla queda vacia sin que nada mas se queje. Paso.
"""
import io
import json

fc = json.load(io.open("datos/comunas-cali-completo.geojson", encoding="utf-8"))

bloques = []
for f in sorted(fc["features"], key=lambda f: f["properties"]["comuna"]):
    n = f["properties"]["comuna"]
    osm = f["properties"].get("osm_id", "null")
    geo = json.dumps(f["geometry"], separators=(",", ":"))
    assert "'" not in geo, "comilla simple en la geometria: romperia el literal SQL"
    bloques.append(
        "insert into public.comunas_cali (comuna, osm_id, geom) values\n"
        "  (%d, %s, extensions.st_multi(extensions.st_setsrid(\n"
        "    extensions.st_geomfromgeojson('%s'), 4326))::extensions.geography)\n"
        "on conflict (comuna) do update\n"
        "  set geom = excluded.geom, osm_id = excluded.osm_id, actualizado_en = now();\n"
        % (n, osm, geo)
    )

assert len(bloques) == 22, len(bloques)
io.open("datos/comunas-insert.sql", "w", encoding="utf-8").write("\n".join(bloques))

# Partido en cuatro, porque el editor de Supabase se atraganta con 162 KB.
for i in range(0, 22, 6):
    trozo = bloques[i : i + 6]
    nombre = "datos/comunas-insert-parte%d.sql" % (i // 6 + 1)
    io.open(nombre, "w", encoding="utf-8").write("\n".join(trozo))
    print("%s  comunas %d-%d" % (nombre, i + 1, i + len(trozo)))

print("comunas-insert.sql: 22 comunas")
