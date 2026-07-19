import type { Station } from '../types'

const API_URL = 'https://api.trafikinfo.trafikverket.se/v2/data.json'
const STORAGE_KEY = 'tomningskartan.tvApiKey'

export function getTrafikverketKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setTrafikverketKey(key: string): void {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* privat läge m.m. */
  }
}

interface TvEquipment {
  Type?: string
  Accessibility?: string
}

interface TvParking {
  Id?: string
  Name?: string
  Description?: string
  Geometry?: { WGS84?: string }
  Equipment?: TvEquipment[]
  PhotoUrl?: string
}

/** "POINT (17.94 58.90)" → { lat, lon } */
function parseWgs84(wkt: string | undefined): { lat: number; lon: number } | null {
  const m = wkt?.match(/POINT\s*\(\s*([\d.,-]+)\s+([\d.,-]+)\s*\)/i)
  if (!m) return null
  const lon = parseFloat(m[1].replace(',', '.'))
  const lat = parseFloat(m[2].replace(',', '.'))
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null
  return { lat, lon }
}

const LATRIN_RE = /latrin|sanit|dump|toalettöm/i
const WATER_RE = /f[äa]rskvatten|freshwater|drinking|dricksvatten/i

function toStation(p: TvParking): Station | null {
  const pos = parseWgs84(p.Geometry?.WGS84)
  if (!pos) return null
  const equipment = p.Equipment ?? []
  const types = equipment.map((e) => e.Type ?? '')
  const hasLatrin = types.some((t) => LATRIN_RE.test(t))
  const hasWater = types.some((t) => WATER_RE.test(t))
  if (!hasLatrin && !hasWater) return null
  // Trafikverkets anläggningar är enbart avsedda för portabla toaletter
  // (kassett) – inte gråvatten eller fast tank.
  const services: Station['services'] = []
  if (hasLatrin) services.push('latrin')
  if (hasWater) services.push('vatten')
  return {
    id: `tv-${p.Id ?? `${pos.lat},${pos.lon}`}`,
    name: p.Name ? `Rastplats ${p.Name}` : 'Rastplats',
    lat: pos.lat,
    lon: pos.lon,
    services,
    source: 'trafikverket',
    description: p.Description,
    fee: 'Gratis (Trafikverkets rastplats)',
  }
}

/**
 * Hämtar Trafikverkets rastplatser med latrintömning/vatten.
 * Kräver en gratis API-nyckel från https://data.trafikverket.se
 * (objekttypen Parking innehåller rastplatserna med utrustningslista).
 */
export async function fetchTrafikverketStations(apiKey: string): Promise<Station[]> {
  const body = `
    <REQUEST>
      <LOGIN authenticationkey="${apiKey.replace(/[<>"&]/g, '')}" />
      <QUERY objecttype="Parking" schemaversion="1.4">
        <FILTER>
          <EQ name="Deleted" value="false" />
        </FILTER>
        <INCLUDE>Id</INCLUDE>
        <INCLUDE>Name</INCLUDE>
        <INCLUDE>Description</INCLUDE>
        <INCLUDE>Geometry.WGS84</INCLUDE>
        <INCLUDE>Equipment</INCLUDE>
      </QUERY>
    </REQUEST>`
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body,
  })
  if (!res.ok) throw new Error(`Trafikverket svarade ${res.status}`)
  const json = (await res.json()) as {
    RESPONSE?: { RESULT?: Array<{ Parking?: TvParking[] }> }
  }
  const parkings = json.RESPONSE?.RESULT?.[0]?.Parking ?? []
  return parkings.map(toStation).filter((s): s is Station => s !== null)
}
