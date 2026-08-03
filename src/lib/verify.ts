import { SUPABASE_ANON_KEY, SUPABASE_URL, communityEnabled } from '../config'

/**
 * "Stämmer fortfarande"-verifieringar. Delas av alla användare via Supabase
 * (tabellen `verifications`, se docs/SUPABASE.md). Vi visar senaste datumet
 * per plats – det bygger förtroende: "någon tömde här nyligen".
 */

const base = SUPABASE_URL.replace(/\/$/, '')
const url = `${base}/rest/v1/verifications`

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

/** Senaste verifieringsdatum (ISO) per plats-id. */
export async function fetchVerifications(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!communityEnabled) return map
  const res = await fetch(
    `${url}?select=station_id,created_at&order=created_at.desc&limit=5000`,
    { headers },
  )
  if (!res.ok) return map
  const rows = (await res.json()) as Array<{ station_id?: string; created_at?: string }>
  for (const r of rows) {
    // Raderna kommer nyast först – första förekomsten per plats är senaste.
    if (r.station_id && r.created_at && !map.has(r.station_id)) {
      map.set(r.station_id, r.created_at)
    }
  }
  return map
}

/** Skickar in en verifiering för en plats. */
export async function submitVerification(stationId: string): Promise<void> {
  if (!communityEnabled) return
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ station_id: stationId }),
  })
  if (!res.ok) throw new Error(`Kunde inte spara verifieringen (${res.status}).`)
}

// ---- Egna verifieringar (lokalt) – hindrar dubbelklick/spam ----

const SELF_KEY = 'tomningskartan.verified'
const RECENT_DAYS = 30

function loadSelf(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SELF_KEY)
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

/** Har den här användaren redan bekräftat platsen de senaste 30 dagarna? */
export function selfVerifiedRecently(stationId: string): boolean {
  const iso = loadSelf()[stationId]
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < RECENT_DAYS * 86_400_000
}

export function markSelfVerified(stationId: string): void {
  try {
    const obj = loadSelf()
    obj[stationId] = new Date().toISOString()
    localStorage.setItem(SELF_KEY, JSON.stringify(obj))
  } catch {
    /* privat läge */
  }
}
