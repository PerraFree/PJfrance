import type { Station } from '../types'

/**
 * Generiska platsnamn som synken/live-hämtningen sätter när OSM-objektet
 * saknar `name` ("Tömningsstation", "Ställplats för husbil" …). Per (sep
 * 2026): en tömning som ligger på Skeda Strand måste heta något med Skeda
 * Strand, inte bara "Tömningsstation". Samma lista finns i
 * scripts/sync-stations.mjs (GENERIC_NAME) – ändra ALLTID båda.
 */
export const GENERIC_NAME_RE =
  /^(Tömningsstation|Ställplats för husbil|Vattenpåfyllning|Sopstation|Återvinningscentral|Drivmedelsstation|Camping|Ställplats|Rastplats|Gasolförsäljning|Gästhamn\/marina|Dricksvatten|Vägkrog\/serviceområde)$/

export function isGenericName(name: string): boolean {
  return GENERIC_NAME_RE.test(name.trim())
}

function distKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Ger generiskt namngivna platser ett riktigt namn efter närmaste namngivna
 * plats inom `maxKm` (standard 250 m): "Tömningsstation vid Ställplats
 * Skeda Strand". Muterar inte indata – returnerar ny lista. Rutnätsindex så
 * det går fort även för ~6 000 platser.
 */
export function nameGenericByNearby(stations: Station[], maxKm = 0.25): Station[] {
  const CELL = 0.003
  const grid = new Map<string, Station[]>()
  const key = (lat: number, lon: number) => `${Math.round(lat / CELL)},${Math.round(lon / CELL)}`
  for (const s of stations) {
    if (isGenericName(s.name)) continue
    const k = key(s.lat, s.lon)
    const bucket = grid.get(k)
    if (bucket) bucket.push(s)
    else grid.set(k, [s])
  }
  return stations.map((s) => {
    if (!isGenericName(s.name)) return s
    const cx = Math.round(s.lat / CELL)
    const cy = Math.round(s.lon / CELL)
    let best: Station | null = null
    let bestKm = maxKm
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const n of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
          const km = distKm(n, s)
          if (km < bestKm) {
            best = n
            bestKm = km
          }
        }
      }
    }
    return best ? { ...s, name: `${s.name} vid ${best.name}` } : s
  })
}
