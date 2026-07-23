import type { LatLngBounds } from 'leaflet'
import type { ServiceType, Station } from '../types'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

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
  if (tags.tourism === 'camp_site') services.add('camping')

  // Gasol/LPG-påfyllning
  if (
    tags['fuel:lpg'] === 'yes' ||
    tags.shop === 'gas' ||
    tags['service:vehicle:lpg'] === 'yes'
  ) {
    services.add('gasol')
  }

  return [...services]
}

/** Beskriver vilken sorts plats stationen ligger på, för namn och popup. */
function placeKind(tags: Record<string, string>): string | undefined {
  if (tags.highway === 'rest_area') return 'Rastplats'
  if (tags.highway === 'services') return 'Vägkrog/serviceområde'
  if (tags.tourism === 'caravan_site') return 'Ställplats för husbil'
  if (tags.tourism === 'camp_site') return 'Camping'
  if (tags.leisure === 'marina' || tags.mooring) return 'Gästhamn/marina'
  if (tags.shop === 'gas') return 'Gasolförsäljning'
  if (tags.amenity === 'fuel') return 'Drivmedelsstation'
  if (tags.amenity === 'sanitary_dump_station') return 'Tömningsstation'
  if (tags.amenity === 'water_point') return 'Vattenpåfyllning'
  if (tags.amenity === 'drinking_water') return 'Dricksvatten'
  return undefined
}

/**
 * Många svenska sanitary_dump_station i OSM är sugtömningsstationer för
 * fritidsbåtar ute i vattnet – oanvändbara för husbil/husvagn.
 */
function isBoatStation(tags: Record<string, string>): boolean {
  return (
    tags.waterway === 'sanitary_dump_station' ||
    'seamark:type' in tags ||
    tags['sanitary_dump_station:suction'] === 'yes' ||
    tags.boat === 'yes' ||
    tags.motorhome === 'no'
  )
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
    fee: tags.fee === 'yes' ? tags.charge ?? 'Avgift' : tags.fee === 'no' ? 'Gratis' : undefined,
    openingHours: tags.opening_hours,
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    ...amenityFields(tags),
  }
}

/** Plockar ut bekvämligheter och kontaktuppgifter ur OSM-taggar. */
function amenityFields(tags: Record<string, string>) {
  const amenities = {
    el: 'power_supply' in tags && tags.power_supply !== 'no',
    dusch: tags.shower === 'yes',
    wc: tags.toilets === 'yes' || tags.toilet === 'yes',
    wifi: ['yes', 'wlan', 'wifi'].includes(tags.internet_access ?? ''),
    hund: tags.dog === 'yes' || tags.dog === 'leashed',
  }
  const hasAmenity = Object.values(amenities).some(Boolean)
  return {
    amenities: hasAmenity ? amenities : undefined,
    capacity: tags.capacity,
    operator: tags.operator,
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
  }
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
    [out:json][timeout:60];
    (
      nwr["amenity"="sanitary_dump_station"](${bbox});
      nwr["sanitary_dump_station"]["sanitary_dump_station"!="no"](${bbox});
      nwr["amenity"="water_point"](${bbox});
      node["amenity"="drinking_water"](${bbox});
      nwr["tourism"="caravan_site"](${bbox});
      nwr["tourism"="camp_site"](${bbox});
      nwr["amenity"="fuel"]["fuel:lpg"="yes"](${bbox});
      nwr["shop"="gas"](${bbox});
    );
    out center tags;
  `
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) throw new Error(`Overpass svarade ${res.status}`)
  const json = (await res.json()) as { elements: OverpassElement[] }
  return json.elements
    .map(toStation)
    .filter((s): s is Station => s !== null)
}
