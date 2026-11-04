"""Genera la parte de datos de migracion-comunas-postgis.sql desde el GeoJSON.

No se escribe a mano: 22 poligonos son 170 KB y copiarlos a mano es pedir un
error silencioso. Si un dia llega la capa oficial del DAPM, se reemplaza el
GeoJSON y se vuelve a correr esto.
"""
import json, io

fc = json.load(io.open("datos/comunas-cali-completo.geojson", encoding="utf-8"))
partes = []
for f in sorted(fc["features"], key=lambda f: f["properties"]["comuna"]):
    n = f["properties"]["comuna"]
    osm = f["properties"].get("osm_id", "null")
    geo = json.dumps(f["geometry"], separators=(",", ":"))
    assert "'" not in geo, "comilla simple en la geometria: romperia el literal SQL"
    partes.append(
        "insert into public.comunas_cali (comuna, osm_id, geom) values\n"
        "  (%d, %s, extensions.st_multi(extensions.st_geomfromgeojson('%s'))::extensions.geography)\n"
        "on conflict (comuna) do update\n"
        "  set geom = excluded.geom, osm_id = excluded.osm_id, actualizado_en = now();\n"
        % (n, osm, geo)
    )
io.open("datos/comunas-insert.sql", "w", encoding="utf-8").write("\n".join(partes))
print("generado:", len(partes), "comunas")
