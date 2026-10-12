/**
 * Giltigt kartläge? Används för delade länkar (?at=lat,lon,zoom) och för det
 * sparade läget i localStorage. Utan kontroll kraschade `?at=59.3` hela appen
 * (longitud undefined) och `?at=,,` sparade 0,0 zoom 0 som startläge till
 * nästa gång (granskning 12 okt 2026). Ramen är Sverige med lite marginal.
 */
export function validView(lat: unknown, lon: unknown, zoom?: unknown): { lat: number; lon: number; zoom: number } | null {
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < 54 || lat > 70.5 || lon < 9 || lon > 25.5) return null
  const z = typeof zoom === 'number' && Number.isFinite(zoom) ? Math.round(zoom) : 15
  return { lat, lon, zoom: Math.min(19, Math.max(4, z)) }
}

/** Tolkar "lat,lon[,zoom]" från en delad länk. Tomma fält räknas som saknade. */
export function parseAt(at: string): { lat: number; lon: number; zoom: number } | null {
  const parts = at.split(',').map((p) => (p.trim() === '' ? NaN : Number(p)))
  if (parts.length < 2) return null
  return validView(parts[0], parts[1], Number.isNaN(parts[2]) ? undefined : parts[2])
}
