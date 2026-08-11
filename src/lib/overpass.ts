import type { LatLngBounds } from 'leaflet'
import type { ServiceType, Station } from '../types'

// Flera speglar – om en är överbelastad (429/504) provas nästa.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

// Se säkringen i fetchOsmStations: pausar live-hämtning när alla speglar felar.
let failedFetches = 0
let backoffUntil = 0

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function servicesFromTags(tags: Record<string, string>): ServiceType[] {
  const services = new Set<ServiceType>()

  // Dedikerade tömningsstationer
  if (tags.amenity === 'sanitary_dump_station') {
    services.add('gravatten')
    services.add('latrin')
  }
  // Platser (rastplatser, campingar, gästhamnar, mackar …) som erbjuder tömning
  const sds = tags.sanitary_dump_station
  if (sds && sds !== 'no') {
    services.add('gravatten')
    services.add('latrin')
  }
  if (tags['sanitary_dump_station:grey_water'] === 'no') services.delete('gravatten')
  if (tags['sanitary_dump_station:chemical_toilet'] === 'no') services.delete('latrin')

  if (
    tags.amenity === 'water_point' ||
    tags.water_point === 'yes' ||
    tags.amenity === 'drinking_water' ||
    tags.drinking_water === 'yes'
  ) {
    services.add('vatten')
  }

  // Övernattning
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
  // Camp_sites som HETER "Ställplats …" utan ordet "camping" i namnet är i
  // praktiken en ren uppställningsplats, inte en campinganläggning – trots
  // OSM-taggen tourism=camp_site. Sådana ska bara få 'stallplats', aldrig
  // 'camping' (annars visas fel/dubbla märken, t.ex. "Gekås Ställplats").
  // Speglas i scripts/sync-stations.mjs.
  const nameIsPureStallplats =
    tags.tourism === 'camp_site' &&
    /st[äa]llplats|stellplatz|husbilsplats/i.test(tags.name ?? '') &&
    !/camping|camp\b/i.test(tags.name ?? '')
  if (nameIsPureStallplats && tags.access !== 'private' && tags.access !== 'no') {
    services.add('stallplats')
  }
  if (tags.tourism === 'camp_site' && !nameIsPureStallplats) {
    // En camping räknas som ställplats om den uttryckligen tar husbil/husvagn
    // eller har husbilsinfrastruktur (el, tömning). Rena tältplatser och
    // privata/stängda platser filtreras bort – för BÅDA tjänsterna.
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
  // Golfklubbar som uttryckligen tillåter husbil/husvagn
  if (
    tags.leisure === 'golf_course' &&
    (tags.caravan === 'yes' ||
      tags.caravan === 'designated' ||
      tags.motorhome === 'yes' ||
      tags.motorhome === 'designated')
  ) {
    services.add('stallplats')
  }

  // Gasol/LPG-påfyllning
  if (
    tags['fuel:lpg'] === 'yes' ||
    tags.shop === 'gas' ||
    tags['service:vehicle:lpg'] === 'yes'
  ) {
    services.add('gasol')
  }

  // Sopor: sopstationer, återvinningscentraler och platser (rastplatser,
  // ställplatser …) som uttryckligen har sopkärl/avfallshantering.
  // Glas-/pappersigloos (recycling_type=container) tas inte med – där får
  // man inte slänga hushållssopor.
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

/** Beskriver vilken sorts plats stationen ligger på, för namn och popup. */
function placeKind(tags: Record<string, string>): string | undefined {
  if (tags.highway === 'rest_area') return 'Rastplats'
  if (tags.highway === 'services') return 'Vägkrog/serviceområde'
  if (tags.tourism === 'caravan_site') return 'Ställplats för husbil'
  if (
    tags.tourism === 'camp_site' &&
    /st[äa]llplats|stellplatz|husbilsplats/i.test(tags.name ?? '') &&
    !/camping|camp\b/i.test(tags.name ?? '')
  )
    return 'Ställplats för husbil'
  if (tags.tourism === 'camp_site') return 'Camping'
  if (tags.leisure === 'golf_course') return 'Ställplats vid golfklubb'
  if (tags.amenity === 'parking') return 'Ställplats (parkering för husbil)'
  if (tags.leisure === 'marina' || tags.mooring) return 'Gästhamn/marina'
  if (tags.shop === 'gas') return 'Gasolförsäljning'
  if (tags.amenity === 'fuel') return 'Drivmedelsstation'
  if (tags.amenity === 'sanitary_dump_station') return 'Tömningsstation'
  if (tags.amenity === 'water_point') return 'Vattenpåfyllning'
  if (tags.amenity === 'drinking_water') return 'Dricksvatten'
  if (tags.amenity === 'recycling' && tags.recycling_type === 'centre')
    return 'Återvinningscentral'
  if (tags.amenity === 'waste_disposal') return 'Sopstation'
  return undefined
}

/**
 * Många svenska sanitary_dump_station i OSM är sugtömningsstationer för
 * fritidsbåtar ute i vattnet – oanvändbara för husbil/husvagn.
 */
function isBoatStation(tags: Record<string, string>): boolean {
  // OBS: motorhome=no exkluderas inte längre – en husvagns-/kassettplats som
  // inte tar just husbil är fortfarande relevant för appens användare.
  return (
    tags.waterway === 'sanitary_dump_station' ||
    'seamark:type' in tags ||
    tags['sanitary_dump_station:suction'] === 'yes' ||
    tags.boat === 'yes'
  )
}

function seasonFromTags(tags: Record<string, string>): Station['season'] {
  if (tags.seasonal === 'no') return 'year-round'
  if (tags.seasonal === 'yes') return 'seasonal'
  if (tags.opening_hours === '24/7') return 'year-round'
  return undefined
}

/** Foto-URL från OSM-taggar: wikimedia_commons (File:…) eller image (https).
 *  Speglas i scripts/sync-stations.mjs – ändra alltid båda. */
function imageFromTags(tags: Record<string, string>): string | undefined {
  const wm = tags.wikimedia_commons
  if (wm && /^File:/i.test(wm)) {
    return (
      'https://commons.wikimedia.org/wiki/Special:FilePath/' +
      encodeURIComponent(wm.replace(/^File:/i, '')) +
      '?width=480'
    )
  }
  const img = tags.image
  if (img && /^https?:\/\//i.test(img)) return img.replace(/^http:\/\//i, 'https://')
  return undefined
}

function toStation(el: OverpassElement): Station | null {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (lat === undefined || lon === undefined) return null
  const tags = el.tags ?? {}
  if (isBoatStation(tags)) return null
  const services = servicesFromTags(tags)
  if (services.length === 0) return null
  const kind = placeKind(tags)
  return {
    id: `osm-${el.type}-${el.id}`,
    name: tags.name ?? kind ?? 'Tömningsstation',
    lat,
    lon,
    services,
    source: 'osm',
    description: tags.name && kind ? kind : undefined,
    // fee=no på en gasolbutik/mack betyder inte gratis gasol (gasol är alltid
    // ett köp) – sätt aldrig "Gratis" på platser som bara har gasol.
    fee:
      tags.fee === 'yes'
        ? tags.charge ?? 'Avgift'
        : tags.fee === 'no' && !(services.length === 1 && services[0] === 'gasol')
          ? 'Gratis'
          : undefined,
    openingHours: tags.opening_hours,
    season: seasonFromTags(tags),
    image: imageFromTags(tags),
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    ...amenityFields(tags),
  }
}

/** Plockar ut allt som finns på platsen samt kontaktuppgifter ur OSM-taggar. */
function amenityFields(tags: Record<string, string>) {
  const facilities = facilitiesFromTags(tags)
  const payment = paymentFromTags(tags)
  return {
    facilities: facilities.length ? facilities : undefined,
    payment: payment.length ? payment : undefined,
    address: addressFromTags(tags),
    capacity:
      tags.capacity ?? tags['capacity:pitches'] ?? tags['capacity:caravans'] ?? tags['capacity:persons'],
    maxstay: tags.maxstay,
    operator: tags.operator,
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
  }
}

const yes = (v?: string) => v === 'yes' || v === 'designated' || v === 'customers'

/** Nycklar (matchar FACILITY_LABELS) för exakt vad som finns på platsen. */
export function facilitiesFromTags(tags: Record<string, string>): string[] {
  const f: string[] = []
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
  // shop=gas/fuel är LPG-/drivmedelskällan – inte en butik; shop=no är ingen butik.
  if (tags.shop && !['no', 'gas', 'fuel'].includes(tags.shop)) f.push('butik')
  if (yes(tags.lit)) f.push('belyst')
  if (yes(tags.wheelchair)) f.push('tillganglig')
  if (yes(tags.motorhome)) f.push('husbil')
  if (yes(tags.caravan) || yes(tags.caravans)) f.push('husvagn')
  if (yes(tags.tents)) f.push('talt')
  return f
}

export function paymentFromTags(tags: Record<string, string>): string[] {
  const p: string[] = []
  if (yes(tags['payment:cash']) || yes(tags['payment:coins'])) p.push('Kontant')
  if (
    yes(tags['payment:cards']) ||
    yes(tags['payment:credit_cards']) ||
    yes(tags['payment:debit_cards'])
  )
    p.push('Kort')
  if (yes(tags['payment:swish'])) p.push('Swish')
  if (yes(tags['payment:app'])) p.push('App')
  return p
}

/** Bygger en läsbar adress ur OSM:s addr-taggar (om de finns). */
function addressFromTags(tags: Record<string, string>): string | undefined {
  const street = tags['addr:street']
  const num = tags['addr:housenumber']
  const place =
    tags['addr:city'] ?? tags['addr:place'] ?? tags['addr:municipality'] ?? tags['addr:hamlet']
  const line1 = street ? `${street}${num ? ' ' + num : ''}` : ''
  const addr = [line1, place].filter(Boolean).join(', ')
  return addr || undefined
}

/** Hämtar stationer från OpenStreetMap inom kartvyns gränser. */
export async function fetchOsmStations(bounds: LatLngBounds): Promise<Station[]> {
  const bbox = [
    bounds.getSouth(),
    bounds.getWest(),
    bounds.getNorth(),
    bounds.getEast(),
  ].join(',')
  const query = `
    [out:json][timeout:25];
    (
      nwr["amenity"="sanitary_dump_station"](${bbox});
      nwr["sanitary_dump_station"]["sanitary_dump_station"!="no"](${bbox});
      nwr["amenity"="water_point"](${bbox});
      node["amenity"="drinking_water"](${bbox});
      nwr["tourism"="caravan_site"](${bbox});
      nwr["tourism"="camp_site"](${bbox});
      nwr["leisure"="golf_course"]["caravan"~"^(yes|designated)$"](${bbox});
      nwr["leisure"="golf_course"]["motorhome"~"^(yes|designated)$"](${bbox});
      nwr["amenity"="fuel"]["fuel:lpg"="yes"](${bbox});
      nwr["shop"="gas"](${bbox});
      nwr["amenity"="waste_disposal"](${bbox});
      nwr["amenity"="recycling"]["recycling_type"="centre"](${bbox});
      nwr["highway"="rest_area"](${bbox});
      nwr["amenity"="parking"]["motorhome"~"^(yes|designated)$"](${bbox});
      nwr["amenity"="parking"]["caravan"~"^(yes|designated)$"](${bbox});
    );
    out center tags;
  `
  // Kort timeout så en trög spegel inte får appen att kännas långsam.
  const withTimeout =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? () => AbortSignal.timeout(12_000)
      : () => undefined
  // Säkring: när Overpass är nere tuggade appen 3 speglar × 12 s vid VARJE
  // kartrörelse. Efter två helt misslyckade hämtningar pausas live-flödet i
  // fem minuter – seed-datan täcker hela Sverige under tiden.
  if (Date.now() < backoffUntil) throw new Error('Overpass pausad (backoff)')
  let lastError: unknown
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: withTimeout(),
      })
      if (!res.ok) throw new Error(`Overpass svarade ${res.status}`)
      const json = (await res.json()) as { elements: OverpassElement[] }
      failedFetches = 0
      return json.elements.map(toStation).filter((s): s is Station => s !== null)
    } catch (err) {
      lastError = err
    }
  }
  failedFetches++
  if (failedFetches >= 2) backoffUntil = Date.now() + 5 * 60_000
  throw lastError instanceof Error ? lastError : new Error('Overpass ej nåbar')
}
