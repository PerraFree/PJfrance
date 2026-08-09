#!/usr/bin/env node
/**
 * Hämtar hela Sveriges tömnings- och vattenstationer och skriver
 * public/data/stations-seed.json som appen läser vid start.
 *
 * Källor:
 *  - OpenStreetMap via Overpass (hela Sverige, exkl. dricksvattenkranar
 *    som skulle göra filen onödigt stor – de hämtas live per kartvy)
 *  - Trafikverkets Parking-API om miljövariabeln TRV_API_KEY är satt
 *  - Kurerat register i scripts/curated-places.json: kommunala platser,
 *    privata campingar, golfklubbar med ställplats m.m. som saknas eller är
 *    fel-taggade i OSM. Adressen (query) geokodas via Nominatim här i CI, eller
 *    ange lat/lon direkt. Rika fält (facilities, capacity, payment, website …)
 *    tas med om de anges. Lägg till nya platser genom att fylla på JSON-filen.
 *
 * Körs i CI före `vite build` (se .github/workflows/deploy.yml) och kan
 * köras lokalt: `node scripts/sync-stations.mjs`.
 *
 * OBS: tolkningslogiken speglar src/lib/overpass.ts och src/lib/trafikverket.ts.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises'

const OUT = new URL('../public/data/stations-seed.json', import.meta.url)
const CURATED = new URL('./curated-places.json', import.meta.url)

// ---------- OpenStreetMap ----------

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

// Overpass/OSM:s användningspolicy kräver en identifierande User-Agent
const USER_AGENT = 'Tomningskartan-sync/0.1 (+https://github.com/PerraFree/PJfrance)'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const OSM_QUERY = `
[out:json][timeout:600];
area["ISO3166-1"="SE"][admin_level=2]->.se;
(
  nwr["amenity"="sanitary_dump_station"](area.se);
  nwr["sanitary_dump_station"]["sanitary_dump_station"!="no"](area.se);
  nwr["amenity"="water_point"](area.se);
  nwr["tourism"="caravan_site"](area.se);
  nwr["tourism"="camp_site"](area.se);
  nwr["leisure"="golf_course"]["caravan"~"^(yes|designated)$"](area.se);
  nwr["leisure"="golf_course"]["motorhome"~"^(yes|designated)$"](area.se);
  nwr["amenity"="fuel"]["fuel:lpg"="yes"](area.se);
  nwr["shop"="gas"](area.se);
  nwr["amenity"="waste_disposal"](area.se);
  nwr["amenity"="recycling"]["recycling_type"="centre"](area.se);
  nwr["highway"="rest_area"](area.se);
  nwr["amenity"="parking"]["motorhome"~"^(yes|designated)$"](area.se);
  nwr["amenity"="parking"]["caravan"~"^(yes|designated)$"](area.se);
);
out center tags;
`

function isBoatStation(tags) {
  // motorhome=no exkluderas inte längre (husvagns-/kassettplats kan ändå vara relevant).
  return (
    tags.waterway === 'sanitary_dump_station' ||
    'seamark:type' in tags ||
    tags['sanitary_dump_station:suction'] === 'yes' ||
    tags.boat === 'yes'
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
  if (tags.tourism === 'caravan_site') services.add('stallplats')
  // Parkeringar där husbil/husvagn uttryckligen är tillåten = ställplats
  // (vanlig taggning för kommunala och föreningsdrivna ställplatser).
  if (
    tags.amenity === 'parking' &&
    (tags.motorhome === 'yes' ||
      tags.motorhome === 'designated' ||
      tags.caravan === 'yes' ||
      tags.caravan === 'designated') &&
    tags.access !== 'private' &&
    tags.access !== 'no'
  ) {
    services.add('stallplats')
  }
  if (tags.tourism === 'camp_site') {
    const openToPublic = tags.access !== 'private' && tags.access !== 'no'
    const notTentOnly = tags.tents !== 'only'
    const husbilOk =
      tags.motorhome === 'yes' ||
      tags.motorhome === 'designated' ||
      tags.caravan === 'yes' ||
      tags.caravan === 'designated' ||
      tags.caravans === 'yes' ||
      'power_supply' in tags ||
      tags.sanitary_dump_station === 'yes' ||
      tags.amenity === 'sanitary_dump_station'
    if (notTentOnly && openToPublic) services.add('camping')
    if (husbilOk && notTentOnly && openToPublic) services.add('stallplats')
  }
  if (
    tags.leisure === 'golf_course' &&
    (tags.caravan === 'yes' ||
      tags.caravan === 'designated' ||
      tags.motorhome === 'yes' ||
      tags.motorhome === 'designated')
  ) {
    services.add('stallplats')
  }
  if (tags['fuel:lpg'] === 'yes' || tags.shop === 'gas' || tags['service:vehicle:lpg'] === 'yes') {
    services.add('gasol')
  }
  // Sopor: sopstationer, återvinningscentraler och rastplatser med sopkärl.
  // Glas-/pappersigloos (recycling_type=container) tas inte med.
  if (
    tags.amenity === 'waste_disposal' ||
    tags.waste_disposal === 'yes' ||
    (tags.amenity === 'recycling' && tags.recycling_type === 'centre') ||
    (tags.highway === 'rest_area' && (tags.waste_basket === 'yes' || tags.bin === 'yes'))
  ) {
    services.add('sopor')
  }
  return [...services]
}

function placeKind(tags) {
  if (tags.highway === 'rest_area') return 'Rastplats'
  if (tags.highway === 'services') return 'Vägkrog/serviceområde'
  if (tags.tourism === 'caravan_site') return 'Ställplats för husbil'
  if (tags.tourism === 'camp_site') return 'Camping'
  if (tags.leisure === 'golf_course') return 'Ställplats vid golfklubb'
  if (tags.amenity === 'parking') return 'Ställplats (parkering för husbil)'
  if (tags.leisure === 'marina' || tags.mooring) return 'Gästhamn/marina'
  if (tags.shop === 'gas') return 'Gasolförsäljning'
  if (tags.amenity === 'fuel') return 'Drivmedelsstation'
  if (tags.amenity === 'sanitary_dump_station') return 'Tömningsstation'
  if (tags.amenity === 'water_point') return 'Vattenpåfyllning'
  if (tags.amenity === 'recycling' && tags.recycling_type === 'centre')
    return 'Återvinningscentral'
  if (tags.amenity === 'waste_disposal') return 'Sopstation'
  return undefined
}

async function fetchOsm() {
  let lastError
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      console.log('Nytt varv över speglarna om 30 s …')
      await sleep(30_000)
    }
    for (const url of OVERPASS_MIRRORS) {
      try {
        return await fetchOsmFrom(url)
      } catch (err) {
        lastError = err
        console.warn(`OSM-hämtning misslyckades via ${url}: ${err.message}`)
        await sleep(5_000)
      }
    }
  }
  throw lastError
}

async function fetchOsmFrom(url) {
  const res = await fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(OSM_QUERY),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(360_000),
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
      season: seasonFromTags(tags),
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      ...amenityFields(tags),
    })
  }
  return stations
}

function seasonFromTags(tags) {
  if (tags.seasonal === 'no') return 'year-round'
  if (tags.seasonal === 'yes') return 'seasonal'
  if (tags.opening_hours === '24/7') return 'year-round'
  return undefined
}

const yes = (v) => v === 'yes' || v === 'designated' || v === 'customers'

/** Nycklar för exakt vad som finns på platsen (matchar FACILITY_LABELS i appen). */
function facilitiesFromTags(tags) {
  const f = []
  if (yes(tags['sanitary_dump_station:grey_water'])) f.push('gravatten_tomning')
  if (yes(tags['sanitary_dump_station:chemical_toilet'])) f.push('kassett_tomning')
  if (yes(tags['sanitary_dump_station:black_water'])) f.push('svartvatten_tomning')
  if (yes(tags.drinking_water) || tags.amenity === 'drinking_water') f.push('dricksvatten')
  if ('power_supply' in tags && tags.power_supply !== 'no') f.push('el')
  if (yes(tags.shower)) f.push('dusch')
  if (yes(tags.toilets) || yes(tags.toilet)) f.push('wc')
  if (yes(tags.laundry) || yes(tags.washing_machine)) f.push('tvatt')
  if (yes(tags.waste_disposal) || tags.amenity === 'recycling' || 'waste_basket' in tags)
    f.push('avfall')
  if (['yes', 'wlan', 'terminal'].includes(tags.internet_access ?? '')) f.push('wifi')
  if (tags.dog === 'yes' || tags.dog === 'leashed') f.push('hund')
  if (yes(tags.bbq) || yes(tags.fireplace)) f.push('grill')
  if (yes(tags.playground) || tags.leisure === 'playground') f.push('lekplats')
  if (yes(tags.restaurant) || tags.amenity === 'restaurant') f.push('restaurang')
  if (tags.shop && !['no', 'gas', 'fuel'].includes(tags.shop)) f.push('butik')
  if (yes(tags.lit)) f.push('belyst')
  if (yes(tags.wheelchair)) f.push('tillganglig')
  if (yes(tags.motorhome)) f.push('husbil')
  if (yes(tags.caravan) || yes(tags.caravans)) f.push('husvagn')
  if (yes(tags.tents)) f.push('talt')
  return f
}

function paymentFromTags(tags) {
  const p = []
  if (yes(tags['payment:cash']) || yes(tags['payment:coins'])) p.push('Kontant')
  if (yes(tags['payment:cards']) || yes(tags['payment:credit_cards']) || yes(tags['payment:debit_cards'])) p.push('Kort')
  if (yes(tags['payment:swish'])) p.push('Swish')
  if (yes(tags['payment:app'])) p.push('App')
  return p
}

/** Plockar ut allt som finns på platsen samt kontaktuppgifter ur OSM-taggar. */
function amenityFields(tags) {
  const out = {}
  const facilities = facilitiesFromTags(tags)
  if (facilities.length) out.facilities = facilities
  const payment = paymentFromTags(tags)
  if (payment.length) out.payment = payment
  const street = tags['addr:street']
  const place = tags['addr:city'] || tags['addr:place'] || tags['addr:municipality'] || tags['addr:hamlet']
  const line1 = street ? `${street}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}` : ''
  const addr = [line1, place].filter(Boolean).join(', ')
  if (addr) out.address = addr
  const cap = tags.capacity || tags['capacity:pitches'] || tags['capacity:caravans'] || tags['capacity:persons']
  if (cap) out.capacity = cap
  if (tags.maxstay) out.maxstay = tags.maxstay
  if (tags.operator) out.operator = tags.operator
  if (tags.phone || tags['contact:phone']) out.phone = tags.phone ?? tags['contact:phone']
  if (tags.website || tags['contact:website'])
    out.website = tags.website ?? tags['contact:website']
  return out
}

// ---------- Trafikverket ----------

// Bredare mönster så att inga varianter av Trafikverkets utrustningsnamn
// missas ("Latrintömning", "Toalettömning", "Tömningsstation", "Sanitet" …).
const LATRIN_RE = /latrin|sanit|dump|töm/i
const WATER_RE = /f[äa]rskvatten|s[öo]tvatten|freshwater|drinking|dricksvatten|tappst[äa]lle|vattenp[åa]fyllning/i
const WASTE_RE = /sop|avfall|återvinning|waste|refuse/i

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
    signal: AbortSignal.timeout(120_000),
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
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue
    const types = (p.Equipment ?? []).map((e) => e.Type ?? '')
    const hasLatrin = types.some((t) => LATRIN_RE.test(t))
    const hasWater = types.some((t) => WATER_RE.test(t))
    const hasWaste = types.some((t) => WASTE_RE.test(t))
    if (!hasLatrin && !hasWater && !hasWaste) continue
    const services = []
    // Endast portabla toaletter enligt Trafikverket – inte gråvatten.
    if (hasLatrin) services.push('latrin')
    if (hasWater) services.push('vatten')
    if (hasWaste) services.push('sopor')
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

// ---------- Kommunala platser (geokodas via Nominatim) ----------

async function geocode(query) {
  // 1) Nominatim (exakta adresser)
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=se&q=' +
      encodeURIComponent(query)
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'sv' },
      signal: AbortSignal.timeout(30_000),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.length) return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) }
    }
  } catch {
    /* prova reserven */
  }
  // 2) Photon (Komoot) – bättre på namn som "Ginstavallen" utan gatuadress
  const purl =
    'https://photon.komoot.io/api/?limit=1&bbox=10.5,55.0,24.5,69.2&q=' + encodeURIComponent(query)
  const pres = await fetch(purl, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  })
  if (!pres.ok) throw new Error(`Photon svarade ${pres.status}`)
  const pjson = await pres.json()
  const hit = (pjson.features ?? []).find(
    (f) => f.properties?.countrycode === 'SE' && f.geometry?.coordinates,
  )
  if (!hit) return null
  const [lon, lat] = hit.geometry.coordinates
  return { lat, lon }
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function fetchCurated() {
  let entries
  try {
    entries = JSON.parse(await readFile(CURATED, 'utf8'))
  } catch {
    return []
  }
  const stations = []
  for (const [i, e] of entries.entries()) {
    // Hoppa över trasiga poster så de aldrig kan krascha appens dedupe.
    if (!Array.isArray(e.services) || e.services.length === 0 || !e.name) {
      console.warn(`Register: hoppar över post utan namn/tjänster (#${i})`)
      continue
    }
    try {
      // Ange lat/lon direkt i posten för att hoppa över geokodning.
      const pos =
        typeof e.lat === 'number' && typeof e.lon === 'number'
          ? { lat: e.lat, lon: e.lon }
          : await geocode(e.query)
      if (!pos) {
        console.warn(`Register: kunde inte geokoda "${e.query}" (${e.name})`)
        continue
      }
      // Rimlighetskontroll: om posten anger nearLat/nearLon (ungefärligt läge för
      // rätt ort) kasseras platsen när geokodningen hamnar för långt bort.
      // Hellre bortfall än felplacering (jfr Åmål-i-Skåne-incidenten).
      if (typeof e.nearLat === 'number' && typeof e.nearLon === 'number') {
        const km = distanceKm(pos.lat, pos.lon, e.nearLat, e.nearLon)
        const maxKm = typeof e.maxKm === 'number' ? e.maxKm : 30
        if (km > maxKm) {
          console.warn(
            `Register: "${e.name}" geokodades ${km.toFixed(0)} km från förväntat läge (max ${maxKm}) – hoppar över`,
          )
          continue
        }
      }
      const station = {
        id: `curated-${i}-${(e.query ?? e.name).replace(/\s+/g, '-').toLowerCase()}`,
        name: e.name,
        lat: pos.lat,
        lon: pos.lon,
        services: e.services,
        source: e.source ?? 'kommun',
        description: e.description,
        fee: e.fee,
        // Källänken visas som "Webbplats" (inte "OpenStreetMap").
        website: e.website ?? e.url,
      }
      // Valfria, rika fält – tas bara med om de anges i posten.
      for (const key of [
        'facilities',
        'capacity',
        'maxstay',
        'payment',
        'address',
        'operator',
        'phone',
        'openingHours',
        'season',
      ]) {
        if (e[key] !== undefined) station[key] = e[key]
      }
      stations.push(station)
    } catch (err) {
      console.warn(`Register: hämtning misslyckades för "${e.query ?? e.name}": ${err.message}`)
    }
    // Nominatims policy: max 1 anrop/sekund (bara när geokodning behövs)
    if (!(typeof e.lat === 'number' && typeof e.lon === 'number')) await sleep(1200)
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

try {
  const curated = await fetchCurated()
  console.log(`Register: ${curated.length} platser`)
  stations.push(...curated)
} catch (err) {
  console.error(`Register-geokodning misslyckades: ${err.message}`)
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
