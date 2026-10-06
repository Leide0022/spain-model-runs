"""Map background for the results viewer: country outlines (Natural Earth 1:50m via world-atlas),
Spain's autonomous communities and provinces (es-atlas), region names, cities, Soto de Ribera,
and a shaded-relief image (Natural Earth SR_LR, public domain) cropped to Iberia.

    python tools/build_basemap.py

Inputs in tools/inputs/: countries-50m.json (world-atlas 2.0.2), es_provinces.json (es-atlas 0.6.0)
and, only to rebuild the terrain image, SR_LR.zip (Natural Earth 10m shaded relief, 25 MB, not
kept in git; without it the image already in reference/basemap.js is reused).
Writes reference/basemap.js (window.BASEMAP). Projection: km, equirectangular around 40°N,
the same as scripts/publish_run.py in the model repo.
"""
import base64
import io
import json
import zipfile
from collections import Counter
from math import cos, radians
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "reference" / "basemap.js"
KX, KY = 111.32 * cos(radians(40.0)), 111.32
LON0, LON1, LAT0, LAT1 = -10.5, 5.5, 34.5, 45.0


def proj(lon, lat):
    return round(lon * KX, 1), round(-lat * KY, 1)


def decode(topo):
    sc, tr = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx; y += dy
            pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
        arcs.append(pts)
    return arcs


def geom_arcs(g):
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    for poly in polys:
        for ring in poly:
            for i in ring:
                yield i if i >= 0 else ~i


def path(pts, step=1.0):
    seg, last = [], None
    for lon, lat in pts:
        p = proj(lon, lat)
        if last is None or abs(p[0] - last[0]) + abs(p[1] - last[1]) > step:
            seg.append(p); last = p
    if pts:
        p = proj(*pts[-1])
        if seg[-1] != p:
            seg.append(p)
    return "M" + "L".join(f"{x:g},{y:g}" for x, y in seg) if len(seg) > 1 else ""


def inside(pts):
    return any(LON0 <= lon <= LON1 and LAT0 <= lat <= LAT1 for lon, lat in pts)


def internal_mesh(topo, obj):
    """Borders shared by two areas (no coastline), as one SVG path."""
    arcs = decode(topo)
    use = Counter(a for g in topo["objects"][obj]["geometries"] for a in set(geom_arcs(g)))
    return "".join(path(arcs[a]) for a, n in use.items() if n >= 2 and inside(arcs[a]))


def labels(topo, obj):
    arcs = decode(topo)
    out = []
    for g in topo["objects"][obj]["geometries"]:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        best = None
        for poly in polys:  # largest outer ring, by point count as a proxy
            pts = []
            for i in poly[0]:
                a = arcs[i] if i >= 0 else arcs[~i][::-1]
                pts.extend(a)
            if best is None or len(pts) > len(best):
                best = pts
        lon = sum(p[0] for p in best) / len(best); lat = sum(p[1] for p in best) / len(best)
        if LON0 <= lon <= LON1 and LAT0 <= lat <= LAT1:
            x, y = proj(lon, lat)
            out.append(dict(name=g["properties"]["name"], x=x, y=y))
    return out


# ---------------- country outlines (Natural Earth 1:50m via world-atlas TopoJSON) ----------------
topo = json.load(open(HERE / "inputs" / "countries-50m.json"))
sc, tr = topo["transform"]["scale"], topo["transform"]["translate"]
arcs = []
for arc in topo["arcs"]:
    x = y = 0
    pts = []
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
    arcs.append(pts)


def ring(ids):
    pts = []
    for i in ids:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a[1:] if pts else a)
    return pts


outline = {}
for g in topo["objects"]["countries"]["geometries"]:
    name = g["properties"].get("name")
    if name not in ["Spain", "Portugal", "France", "Andorra", "Morocco", "Algeria"]:
        continue
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    d = []
    for poly in polys:
        r = ring(poly[0])
        lons, lats = [p[0] for p in r], [p[1] for p in r]
        if max(lons) < LON0 or min(lons) > LON1 or max(lats) < LAT0 or min(lats) > LAT1:
            continue  # e.g. the Canary Islands, Corsica
        last = None
        seg = []
        for lon, lat in r:
            p = proj(lon, lat)
            if last is None or abs(p[0] - last[0]) + abs(p[1] - last[1]) > 2.0:
                seg.append(p); last = p
        if len(seg) > 3:
            d.append("M" + "L".join(f"{x:g},{y:g}" for x, y in seg) + "Z")
    outline[name] = "".join(d)


prov = json.load(open(HERE / "inputs" / "es_provinces.json", encoding="utf-8"))
regions_mesh = internal_mesh(prov, "autonomous_regions")
provinces_mesh = internal_mesh(prov, "provinces")
region_labels = labels(prov, "autonomous_regions")
# names as commonly written in English-language maps
RENAME = {"Comunidad de Madrid": "Madrid", "Comunitat Valenciana": "Valencia", "Región de Murcia": "Murcia",
          "Comunidad Foral de Navarra": "Navarra", "Principado de Asturias": "Asturias", "Illes Balears": "Balearic Is.",
          "Castilla y León": "Castilla y León", "Castilla-La Mancha": "Castilla-La Mancha", "País Vasco": "Basque Country",
          "Cataluña": "Catalonia", "Cataluña/Catalunya": "Catalonia", "País Vasco/Euskadi": "Basque Country",
          "Andalucía": "Andalusia"}
for r in region_labels:
    r["name"] = RENAME.get(r["name"], r["name"])
region_labels = [r for r in region_labels if not any(k in r["name"] for k in ("Ceuta", "Melilla", "Gibraltar"))]

# biggest cities (lon, lat), plus two in Portugal for orientation
CITIES = [("Madrid", -3.7038, 40.4168, 1), ("Barcelona", 2.1686, 41.3874, 1), ("Valencia", -0.3763, 39.4699, 1),
          ("Sevilla", -5.9845, 37.3891, 1), ("Zaragoza", -0.8891, 41.6488, 2), ("Málaga", -4.4214, 36.7213, 2),
          ("Murcia", -1.1307, 37.9922, 2), ("Palma", 2.6502, 39.5696, 2), ("Bilbao", -2.9350, 43.2630, 2),
          ("Alicante", -0.4810, 38.3452, 2), ("Córdoba", -4.7794, 37.8882, 3), ("Valladolid", -4.7245, 41.6523, 2),
          ("Vigo", -8.7207, 42.2406, 3), ("A Coruña", -8.4115, 43.3623, 2), ("Granada", -3.5986, 37.1773, 3),
          ("Oviedo", -5.8494, 43.3614, 2), ("Santander", -3.8099, 43.4623, 3), ("Pamplona", -1.6458, 42.8125, 3),
          ("San Sebastián", -1.9812, 43.3183, 3), ("Salamanca", -5.6635, 40.9701, 3), ("Badajoz", -6.9707, 38.8794, 3),
          ("Almería", -2.4637, 36.8340, 3), ("Tarragona", 1.2445, 41.1189, 3), ("Toledo", -4.0273, 39.8628, 3),
          ("León", -5.5671, 42.5987, 3), ("Cádiz", -6.2886, 36.5271, 3), ("Huelva", -6.9447, 37.2614, 3),
          ("Lisboa", -9.1393, 38.7223, 2), ("Porto", -8.6291, 41.1579, 2)]
cities = [dict(name=n, x=proj(lo, la)[0], y=proj(lo, la)[1], rank=r) for n, lo, la, r in CITIES]
# Soto de Ribera power station, Ribera de Arriba (Asturias); approximate location
soto = dict(name="Soto de Ribera", x=proj(-5.868, 43.307)[0], y=proj(-5.868, 43.307)[1])

# shaded relief, Natural Earth 1:10m low-res (1/60 degree per pixel, -180..180, 90..-90)
Image.MAX_IMAGE_PIXELS = None
if not (HERE / "inputs" / "SR_LR.zip").exists():
    old = json.loads(OUT.read_text(encoding="utf-8").split("=", 1)[1].strip().rstrip(";"))
    relief = old["relief"]
    print("SR_LR.zip not found: keeping the terrain image from", OUT.name)
else:
  with zipfile.ZipFile(HERE / "inputs" / "SR_LR.zip") as z:
      img = Image.open(io.BytesIO(z.read("SR_LR.tif")))
      img.load()
  px = lambda lon: int(round((lon + 180) * 60))
  py = lambda lat: int(round((90 - lat) * 60))
  crop = img.crop((px(LON0), py(LAT1), px(LON1), py(LAT0))).convert("L")
  buf = io.BytesIO()
  crop.save(buf, "JPEG", quality=80, optimize=True)
  x0, y0 = proj(LON0, LAT1)
  x1, y1 = proj(LON1, LAT0)
  relief = dict(href="data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode(),
                x=x0, y=y0, w=round(x1 - x0, 1), h=round(y1 - y0, 1))
  print("relief", crop.size, round(len(buf.getvalue()) / 1e3), "kB")

out = dict(outline=outline, regions=regions_mesh, provinces=provinces_mesh, region_labels=region_labels,
           cities=cities, soto=soto, relief=relief)
OUT.write_text("window.BASEMAP = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print(OUT.name, round(OUT.stat().st_size / 1e3), "kB;", len(region_labels), "region labels,", len(cities), "cities")
