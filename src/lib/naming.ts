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

const GENERIC_VID_RE = new RegExp(`${GENERIC_NAME_RE.source.replace(/\$$/, '')} vid `)

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
    if (!best) return s
    // Härlett förebildsnamn: låna bara orten efter "vid" – annars "Sopstation
    // vid Sopstation vid Skeppsbron" (granskning 10–11, 12 okt 2026).
    const model = best as Station
    // Även grannar som HETER "Ställplats vid …" (registret) – annars "Ställplats
    // vid Ställplats vid Klässbol" (granskning 28 okt 2026). Samma i synken.
    const place = model.nameFrom === 'nearby' && model.name.includes(' vid ') ? model.name.slice(model.name.indexOf(' vid ') + 5) : model.name.replace(GENERIC_VID_RE, '')
    return { ...s, name: vidName(s.name, place), nameFrom: 'nearby' as const }
  })
}

/**
 * "Återvinningscentral" + "Brändkläppen Återvinningscentral" →
 * "Återvinningscentral vid Brändkläppen" – grannens namn upprepar inte första
 * ordet i det generiska namnet (77 dubbleringar, granskning 21 okt 2026).
 * Samma funktion finns i scripts/sync-stations.mjs – ändra båda.
 */
export function vidName(base: string, place: string): string {
  const letters = (w: string) => w.toLowerCase().replace(/[^\p{L}]/gu, '')
  const key = letters(base.split(/[\s,]/)[0])
  const baseWords = base.split(/\s+/).map(letters)
  const toks = place.split(/\s+/)
  const out: string[] = []
  let changed = false
  for (let i = 0; i < toks.length; i++) {
    // Hela det generiska namnet ("Ställplats för husbil, Osby")
    const seq = toks.slice(i, i + baseWords.length).map(letters)
    const whole = baseWords.length > 1 && seq.length === baseWords.length && seq.every((w, j) => w === baseWords[j])
    const t = letters(toks[i])
    const next = toks[i + (whole ? baseWords.length : 1)]
    const end = whole ? toks[i + baseWords.length - 1] : toks[i]
    const keyHit = key.length >= 5 && t.startsWith(key) && t.length - key.length <= 3
    const freeAfter = next === undefined || /[,)]$/.test(end) || /^[\p{Lu}\d(–-]/u.test(next)
    if (whole || (keyHit && freeAfter)) {
      // Genitiv före ordet ("Lysernas Ställplats") – behåll grannens namn som det är.
      if (out.length && /s$/i.test(out[out.length - 1]) && !/ss$/i.test(out[out.length - 1])) return `${base} vid ${place}`
      if (/,$/.test(end) && out.length) out[out.length - 1] += ','
      i += whole ? baseWords.length - 1 : 0
      changed = true
      continue
    }
    out.push(toks[i])
  }
  if (!changed) return `${base} vid ${place}`
  const kept = out.join(' ').replace(/\s*[–-]\s*(?=\(|$)/g, ' ').replace(/(\s+(&|och))+$/i, '').replace(/^[\s,–-]+|[\s,–&-]+$/g, '').replace(/\s{2,}/g, ' ').trim()
  return `${base} vid ${kept.length >= 3 ? kept : place}`
}
