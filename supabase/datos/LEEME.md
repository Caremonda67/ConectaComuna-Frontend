# Polígonos de las 22 comunas de Cali

Descargados el **3 de noviembre de 2026** para el mapa del panel de equipo
(ver `vault/PANEL-ADMINISTRADOR.md`).

## De dónde salieron

El portal oficial de la Alcaldía, `datos.cali.gov.co`, estaba **caído** ese día
con un aviso de «Suspensión temporal de servicios web» (HTTP 403), y la entrada
de `datos.gov.co` para «Comunas de Santiago de Cali» (`dx2g-2mhm`) es solo un
enlace a ese portal, no un recurso descargable. La capa oficial además se
publica en RAR con shapefile dentro.

Así que las geometrías vienen de **OpenStreetMap**, consultadas vía Nominatim
(`search?polygon_geojson=1`), una comuna por petición respetando el límite de
1 req/s y con User-Agent identificable, igual que `direccionService.ts`.

- **Fuente:** OpenStreetMap, contribuidores.
- **Licencia:** ODbL. **Hay que atribuirla** donde se muestre el mapa.
- Las 22 comunas se resolvieron todas, cada una como una relación
  `boundary=administrative` con nombre exacto `Comuna N`. Los `osm_id` quedan
  guardados en las propiedades del archivo completo, para poder reauditar.

**Pendiente:** cuando el portal de la Alcaldía vuelva, reemplazar por la capa
oficial del DAPM y comparar. Para un jurado, «polígono oficial del municipio»
pesa más que «OpenStreetMap», aunque la geometría sea prácticamente la misma.

## Los dos archivos, y por qué son dos

| Archivo | Para qué | Puntos | Tamaño | gzip |
|---|---|---|---|---|
| `comunas-cali-completo.geojson` | **Postgres.** Precisión completa para calcular en qué comuna cae cada negocio | 6.711 | 171,7 KB | 42,9 KB |
| `comunas-cali-simplificado.geojson` | **El navegador.** Solo para dibujar el mapa | 902 | 17,8 KB | **3,8 KB** |

El simplificado usa Douglas-Peucker con tolerancia 0,0002° (≈ 22 m) y
coordenadas a 4 decimales. El error de área es **0,30% de media y 0,71% en el
peor caso**, invisible en un mapa de 22 polígonos.

**El teléfono nunca descarga los polígonos de precisión completa.** El cálculo
de «este negocio está en la comuna 15» pasa en la base; el navegador solo recibe
la silueta para pintar.

## Verificación hecha

El punto-en-polígono se probó contra barrios cuya comuna se conoce:

| Barrio | Comuna calculada |
|---|---|
| El Vallado | 15 |
| Ciudad Córdoba | 15 |
| Mariano Ramos | 16 |
| República de Israel | 16 |

Las cuatro coinciden con la división real, así que los polígonos sirven.

**Hallazgo aparte, y hay que mirarlo:** los atajos de barrio de
`src/lib/lugares.ts` están desviados hasta 2–3 km y varios caen en una comuna
que no es la suya (ese mismo `El Vallado` del atajo cae en la 16). No rompen
nada hoy —son caché de búsqueda, no dato maestro— pero **la comuna de un
negocio debe calcularse desde el punto que su dueño marcó en el mapa**, nunca
desde el nombre del barrio. Nominatim tampoco es fiable barrio por barrio: para
«Antonio Nariño» devuelve un punto en la zona del Vallado.

Los scripts `analizar.py` (tamaños y simplificación) y `ubicar.py`
(punto-en-polígono) se dejan aquí para poder repetir las medidas.
