import json, io, time, urllib.request
fc = json.load(io.open("comunas-crudo.geojson", encoding="utf-8"))
UA = "ConectaComuna/1.0 (proyecto academico Fedesoft)"

def dentro(lng, lat, geom):
    polys = [geom["coordinates"]] if geom["type"]=="Polygon" else geom["coordinates"]
    for poly in polys:
        ext = poly[0]; d = False
        j = len(ext)-1
        for i in range(len(ext)):
            xi,yi = ext[i]; xj,yj = ext[j]
            if ((yi>lat) != (yj>lat)) and (lng < (xj-xi)*(lat-yi)/(yj-yi)+xi): d = not d
            j = i
        if d: return True
    return False

def comuna_de(lat, lng):
    for f in fc["features"]:
        if dentro(lng, lat, f["geometry"]): return f["properties"]["comuna"]
    return None

barrios = {
    "Antonio Nariño": (3.4365,-76.5255), "El Rodeo": (3.4401,-76.5209),
    "Nueva Floresta": (3.4342,-76.5281), "Vallado / El Vallado": (3.414,-76.505),
    "San Judas": (3.4215,-76.512), "Ciudad Córdoba": (3.418,-76.508),
    "Mariano Ramos": (3.413,-76.516), "República de Israel": (3.424,-76.517),
}
for nombre in ["El Retiro, Cali", "La Floresta, Cali"]:
    u = "https://nominatim.openstreetmap.org/search?q=%s&format=jsonv2&limit=1" % urllib.parse.quote(nombre)
    r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent":UA}), timeout=60))
    if r: barrios[nombre.split(",")[0]] = (float(r[0]["lat"]), float(r[0]["lon"]))
    time.sleep(1.1)

print("%-24s %-22s %s" % ("barrio","coordenada","comuna calculada"))
for b,(la,lo) in barrios.items():
    print("%-24s %-22s %s" % (b, "%.4f, %.4f"%(la,lo), comuna_de(la,lo) or "FUERA DE TODA COMUNA"))
