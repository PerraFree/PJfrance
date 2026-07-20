#!/usr/bin/env node
/**
 * Hämtar hela Sveriges tömnings- och vattenstationer och skriver
 * public/data/stations-seed.json som appen läser vid start.
 *
 * Källor:
 *  - OpenStreetMap via Overpass (hela Sverige, exkl. dricksvattenkranar
 *    som skulle göra filen onödigt stor – de hämtas live per kartvy)
 *  - Trafikverkets Parking-API om miljövariabeln TRV_API_KEY är satt
 *
 * Körs i CI före `vite build` (se .github/workflows/deploy.yml) och kan
 * köras lokalt: `node scripts/sync-stations.mjs`.
 *
 * OBS: tolkningslogiken speglar src/lib/overpass.ts och src/lib/trafikverket.ts.
 */
import { writeFile, mkdir } from 'node:fs/promises'

const OUT = new URL('../public/data/stations-seed.json', import.meta.url)

// ---------- OpenStreetMap ----------

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const OSM_QUERY = `
[out:json][timeout:300];
area["ISO3166-1"="SE"][admin_level=2]->.se;
(
  nwr["amenity"="sanitary_dump_station"](area.se);
  nwr["sanitary_dump_station"]["sanitary_dump_station"!="no"](area.se);
  nwr["amenity"="water_point"](area.se);
);
out center tags;
`

function isBoatStation(tags) {
  return (
    tags.waterway === 'sanitary_dump_station' ||
    'seamark:type' in tags ||
    tags['sanitary_dump_station:suction'] === 'yes' ||
    tags.boat === 'yes' ||
    tags.motorhome === 'no'
  )
}

function servicesFromTags(tags) {
  const services = new Set()
  if (tags.amenity === 'sanitary_dump_station') {
    services.add('gravatten')
    services.add('latrin')
  }
  const sds = tags.sanitary_dump_station
  if (sds && sds !== 'no') {
    services.add('gravatten')
    services.add('latrin')
  }
  if (tags['sanitary_dump_station:grey_water'] === 'no') services.delete('gravatten')
  if (tags['sanitary_dump_station:chemical_toilet'] === 'no') services.delete('latrin')
  if (tags.amenity === 'water_point' || tags.water_point === 'yes' || tags.drinking_water === 'yes') {
    services.add('vatten')
  }
  return [...services]
}

function placeKind(tags) {
  if (tags.highway === 'rest_area') return 'Rastplats'
  if (tags.highway === 'services') return 'Vägkrog/serviceområde'
  if (tags.tourism === 'caravan_site') return 'Ställplats/campingplats'
  if (tags.tourism === 'camp_site') return 'Camping'
  if (tags.leisure === 'marina' || tags.mooring) return 'Gästhamn/marina'
  if (tags.amenity === 'fuel') return 'Drivmedelsstation'
  if (tags.amenity === 'sanitary_dump_station') return 'Tömningsstation'
  if (tags.amenity === 'water_point') return 'Vattenpåfyllning'
  return undefined
}

async function fetchOsm() {
  let lastError
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(OSM_QUERY),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!res.ok) throw new Error(`${url} svarade ${res.status}`)
      const json = await res.json()
      const stations = []
      for (const el of json.elements ?? []) {
        const lat = el.lat ?? el.center?.lat
        const lon = el.lon ?? el.center?.lon
        if (lat === undefined || lon === undefined) continue
        const tags = el.tags ?? {}
        if (isBoatStation(tags)) continue
        const services = servicesFromTags(tags)
        if (services.length === 0) continue
        const kind = placeKind(tags)
        stations.push({
          id: `osm-${el.type}-${el.id}`,
          name: tags.name ?? kind ?? 'Tömningsstation',
          lat,
          lon,
          services,
          source: 'osm',
          description: tags.name && kind ? kind : undefined,
          fee: tags.fee === 'yes' ? (tags.charge ?? 'Avgift') : tags.fee === 'no' ? 'Gratis' : undefined,
          openingHours: tags.opening_hours,
          osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        })
      }
      return stations
    } catch (err) {
      lastError = err
      console.warn(`OSM-hämtning misslyckades via ${url}: ${err.message}`)
    }
  }
  throw lastError
}

// ---------- Trafikverket ----------

const LATRIN_RE = /latrin|sanit|dump|toalettöm/i
const WATER_RE = /f[äa]rskvatten|freshwater|drinking|dricksvatten/i

async function fetchTrafikverket(apiKey) {
  const body = `
    <REQUEST>
      <LOGIN authenticationkey="${apiKey}" />
      <QUERY objecttype="Parking" schemaversion="1.4">
        <FILTER><EQ name="Deleted" value="false" /></FILTER>
        <INCLUDE>Id</INCLUDE>
        <INCLUDE>Name</INCLUDE>
        <INCLUDE>Description</INCLUDE>
        <INCLUDE>Geometry.WGS84</INCLUDE>
        <INCLUDE>Equipment</INCLUDE>
      </QUERY>
    </REQUEST>`
  const res = await fetch('https://api.trafikinfo.trafikverket.se/v2/data.json', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body,
  })
  if (!res.ok) throw new Error(`Trafikverket svarade ${res.status}`)
  const json = await res.json()
  const parkings = json.RESPONSE?.RESULT?.[0]?.Parking ?? []
  const stations = []
  for (const p of parkings) {
    const m = p.Geometry?.WGS84?.match(/POINT\s*\(\s*([\d.,-]+)\s+([\d.,-]+)\s*\)/i)
    if (!m) continue
    const lon = parseFloat(m[1].replace(',', '.'))
    const lat = parseFloat(m[2].replace(',', '.'))
    const types = (p.Equipment ?? []).map((e) => e.Type ?? '')
    const hasLatrin = types.some((t) => LATRIN_RE.test(t))
    const hasWater = types.some((t) => WATER_RE.test(t))
    if (!hasLatrin && !hasWater) continue
    const services = []
    // Endast portabla toaletter enligt Trafikverket – inte gråvatten.
    if (hasLatrin) services.push('latrin')
    if (hasWater) services.push('vatten')
    stations.push({
      id: `tv-${p.Id ?? `${lat},${lon}`}`,
      name: p.Name ? `Rastplats ${p.Name}` : 'Rastplats',
      lat,
      lon,
      services,
      source: 'trafikverket',
      description: p.Description,
      fee: 'Gratis (Trafikverkets rastplats)',
    })
  }
  return stations
}

// ---------- Kör ----------

const stations = []

try {
  const osm = await fetchOsm()
  console.log(`OSM: ${osm.length} stationer`)
  stations.push(...osm)
} catch (err) {
  console.error(`OSM-hämtning misslyckades helt: ${err.message}`)
}

const trvKey = process.env.TRV_API_KEY
if (trvKey) {
  try {
    const tv = await fetchTrafikverket(trvKey)
    console.log(`Trafikverket: ${tv.length} rastplatser`)
    stations.push(...tv)
  } catch (err) {
    console.error(`Trafikverket-hämtning misslyckades: ${err.message}`)
  }
} else {
  console.log('TRV_API_KEY ej satt – hoppar över Trafikverket.')
}

if (stations.length === 0) {
  console.error('Ingen data hämtad – behåller befintlig seed-fil.')
  process.exit(1)
}

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
await writeFile(
  OUT,
  JSON.stringify({ updatedAt: new Date().toISOString(), stations }),
)
console.log(`Skrev ${stations.length} stationer till public/data/stations-seed.json`)
