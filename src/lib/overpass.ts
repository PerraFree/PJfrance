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
  if (tags.amenity === 'sanitary_dump_station') {
    services.add('gravatten')
    services.add('latrin')
    if (tags['sanitary_dump_station:grey_water'] === 'no') services.delete('gravatten')
    if (tags['sanitary_dump_station:chemical_toilet'] === 'no') services.delete('latrin')
  }
  if (tags.amenity === 'water_point' || tags.water_point === 'yes' || tags.drinking_water === 'yes') {
    services.add('vatten')
  }
  return [...services]
}

function toStation(el: OverpassElement): Station | null {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (lat === undefined || lon === undefined) return null
  const tags = el.tags ?? {}
  const services = servicesFromTags(tags)
  if (services.length === 0) return null
  return {
    id: `osm-${el.type}-${el.id}`,
    name:
      tags.name ??
      (tags.amenity === 'water_point' ? 'Vattenpåfyllning' : 'Tömningsstation'),
    lat,
    lon,
    services,
    source: 'osm',
    fee: tags.fee === 'yes' ? tags.charge ?? 'Avgift' : tags.fee === 'no' ? 'Gratis' : undefined,
    openingHours: tags.opening_hours,
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
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
    [out:json][timeout:25];
    (
      nwr["amenity"="sanitary_dump_station"](${bbox});
      nwr["amenity"="water_point"](${bbox});
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
