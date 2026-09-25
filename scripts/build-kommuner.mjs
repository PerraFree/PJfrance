// Hämtar Sveriges kommungränser (förenklade polygoner) och skriver
// scripts/kommuner.json – används av sync-stations.mjs för att ge varje plats
// rätt kommun (punkt-i-polygon) i stället för "närmaste kommuncentrum".
//
// Körs i GitHub Actions (.github/workflows/hamta-kommungranser.yml) eftersom
// sandboxen saknar nätverk. Källor: Overpass (id + namn för admin_level=7)
// och Nominatim lookup med polygon_threshold (serverförenklad geometri,
// ~1–3 MB totalt). Behöver bara köras om när kommungränser ändras (sällan).
import { writeFile } from 'node:fs/promises'

const OUT = new URL('./kommuner.json', import.meta.url)
const USER_AGENT = 'Tomningskartan-sync/0.1 (+https://github.com/PerraFree/PJfrance)'
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const QUERY = `
[out:json][timeout:180];
area["ISO3166-1"="SE"][admin_level=2]->.se;
relation["boundary"="administrative"]["admin_level"="7"](area.se);
out tags center;
`

async function fetchRelations() {
  let lastError
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(QUERY),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(180_000),
      })
      if (!res.ok) throw new Error(`${url} svarade ${res.status}`)
      const json = await res.json()
      const rels = (json.elements ?? [])
        .filter((e) => e.type === 'relation' && e.tags?.name)
        .map((e) => ({ id: e.id, name: e.tags.name.replace(/ kommun$/i, '').trim(), center: e.center }))
      if (rels.length < 250) throw new Error(`bara ${rels.length} kommuner`)
      return rels
    } catch (err) {
      lastError = err
      console.warn(`Overpass ${url}: ${err.message}`)
    }
  }
  throw lastError
}

/** Nominatim lookup, max 50 id:n per anrop, med serverförenklad polygon. */
async function fetchPolygons(rels) {
  const out = new Map()
  for (let i = 0; i < rels.length; i += 40) {
    const batch = rels.slice(i, i + 40)
    const ids = batch.map((r) => `R${r.id}`).join(',')
    const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=${ids}&format=json&polygon_geojson=1&polygon_threshold=0.0015`
    let json = null
    for (let attempt = 0; attempt < 3 && !json; attempt++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(120_000) })
        if (!res.ok) throw new Error(`Nominatim svarade ${res.status}`)
        json = await res.json()
      } catch (err) {
        console.warn(`lookup ${i}: ${err.message} – försöker igen`)
        await sleep(5000)
      }
    }
    for (const r of json ?? []) {
      const g = r.geojson
      if (!g || !r.osm_id) continue
      if (g.type === 'Polygon') out.set(Number(r.osm_id), [g.coordinates])
      else if (g.type === 'MultiPolygon') out.set(Number(r.osm_id), g.coordinates)
    }
    console.log(`lookup ${i + batch.length}/${rels.length} → ${out.size} polygoner`)
    await sleep(1500)
  }
  return out
}

const round = (n) => Math.round(n * 1e4) / 1e4
const rels = await fetchRelations()
console.log(`Kommuner från Overpass: ${rels.length}`)
const polys = await fetchPolygons(rels)
const kommuner = []
let missing = 0
for (const r of rels) {
  const p = polys.get(r.id)
  const entry = { name: r.name, osmId: r.id, center: r.center ? [round(r.center.lon), round(r.center.lat)] : null }
  if (p) {
    // [ [ outer, hole, ... ], ... ] med [lon, lat], avrundat till 4 decimaler (~10 m)
    entry.polygons = p.map((poly) => poly.map((ring) => ring.map(([lon, lat]) => [round(lon), round(lat)])))
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
    for (const poly of entry.polygons) for (const [lon, lat] of poly[0]) {
      if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
    }
    entry.bbox = [minLon, minLat, maxLon, maxLat]
  } else {
    missing++
  }
  kommuner.push(entry)
}
kommuner.sort((a, b) => a.name.localeCompare(b.name, 'sv'))
const body = JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'OpenStreetMap via Overpass + Nominatim (polygon_threshold 0.0015)', kommuner })
await writeFile(OUT, body)
console.log(`Skrev ${kommuner.length} kommuner (${missing} utan polygon) → scripts/kommuner.json, ${(body.length / 1e6).toFixed(1)} MB`)
