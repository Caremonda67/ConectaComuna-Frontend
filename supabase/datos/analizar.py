import json, io, gzip

fc = json.load(io.open("comunas-crudo.geojson", encoding="utf-8"))

def anillos(f):
    g = f["geometry"]
    if g["type"] == "Polygon": return g["coordinates"]
    return [r for poly in g["coordinates"] for r in poly]

total_pts = sum(len(r) for f in fc["features"] for r in anillos(f))
crudo = json.dumps(fc, ensure_ascii=False)
print("22 comunas, puntos totales:", total_pts)
print("crudo         : %6.1f KB   gzip %5.1f KB" % (len(crudo.encode())/1024, len(gzip.compress(crudo.encode()))/1024))

# ---- Douglas-Peucker ----
def dp(pts, tol):
    if len(pts) < 3: return pts
    dmax, idx = 0.0, 0
    x1,y1 = pts[0]; x2,y2 = pts[-1]
    dx,dy = x2-x1, y2-y1
    norm = (dx*dx+dy*dy) ** .5
    for i in range(1, len(pts)-1):
        x,y = pts[i]
        d = abs(dy*x - dx*y + x2*y1 - y2*x1)/norm if norm else ((x-x1)**2+(y-y1)**2)**.5
        if d > dmax: dmax, idx = d, i
    if dmax > tol:
        return dp(pts[:idx+1], tol)[:-1] + dp(pts[idx:], tol)
    return [pts[0], pts[-1]]

def area(ring):
    s = 0.0
    for i in range(len(ring)-1):
        s += ring[i][0]*ring[i+1][1] - ring[i+1][0]*ring[i][1]
    return abs(s)/2

def simplificar(fc, tol, dec):
    out = {"type":"FeatureCollection","features":[]}
    for f in fc["features"]:
        g = f["geometry"]
        def ring(r):
            s = dp(r, tol)
            if len(s) < 4: s = r[::max(1,len(r)//8)] + [r[0]]
            return [[round(x,dec), round(y,dec)] for x,y in s]
        if g["type"] == "Polygon":
            ng = {"type":"Polygon","coordinates":[ring(r) for r in g["coordinates"]]}
        else:
            ng = {"type":"MultiPolygon","coordinates":[[ring(r) for r in p] for p in g["coordinates"]]}
        out["features"].append({"type":"Feature","properties":{"comuna":f["properties"]["comuna"]},"geometry":ng})
    return out

print()
print(" tol(grados)  dec   puntos    KB    gzip KB   error area medio")
for tol, dec in [(0.0002,4),(0.0005,4),(0.001,4),(0.002,3),(0.005,3)]:
    s = simplificar(fc, tol, dec)
    pts = sum(len(r) for f in s["features"] for r in anillos(f))
    txt = json.dumps(s, separators=(",",":"))
    errs = []
    for a,b in zip(fc["features"], s["features"]):
        aa = sum(area(r) for r in anillos(a)); bb = sum(area(r) for r in anillos(b))
        if aa: errs.append(abs(aa-bb)/aa*100)
    print(" %8.4f    %d  %6d  %6.1f  %7.1f   %5.2f%%  (max %.2f%%)" % (
        tol, dec, pts, len(txt.encode())/1024, len(gzip.compress(txt.encode()))/1024,
        sum(errs)/len(errs), max(errs)))
    io.open("comunas-tol%s.geojson" % tol, "w", encoding="utf-8").write(txt)
