import { SUPABASE_ANON_KEY, SUPABASE_URL, communityEnabled } from '../config'
import { fetchPaged, fetchWithTimeout } from './http'
import { restError } from './restError'

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

/** Senaste bekräftelse (ISO) + antal bekräftelser för en plats. */
export interface VerificationInfo {
  latest: string
  count: number
}

/** Senaste verifieringsdatum + antal per plats-id. */
export async function fetchVerifications(): Promise<Map<string, VerificationInfo>> {
  const map = new Map<string, VerificationInfo>()
  if (!communityEnabled) return map
  // Sammanställningen per plats (vyn verification_summary) räknar ALLA rader –
  // förut lästes bara de 5 000 senaste, så spam kunde tränga undan riktiga
  // bekräftelser (granskning 12 okt 2026). Reserv: gamla sättet.
  // Sidvis (1 000 åt gången): Supabase returnerar högst 1 000 rader per anrop.
  const sum = await fetchPaged(`${base}/rest/v1/verification_summary?select=station_id,n,latest&order=station_id`, headers)
  if (sum) {
    const rows = sum as Array<{ station_id?: string; n?: number; latest?: string }>
    for (const r of rows) {
      if (r.station_id && r.latest && typeof r.n === 'number') map.set(r.station_id, { latest: r.latest, count: r.n })
    }
    return map
  }
  const res = await fetchWithTimeout(
    `${url}?select=station_id,created_at&order=created_at.desc&limit=5000`,
    { headers },
  )
  if (!res.ok) return map
  const rows = (await res.json()) as Array<{ station_id?: string; created_at?: string }>
  for (const r of rows) {
    if (!r.station_id || !r.created_at) continue
    // Raderna kommer nyast först – första förekomsten per plats är senaste.
    const prev = map.get(r.station_id)
    if (prev) prev.count++
    else map.set(r.station_id, { latest: r.created_at, count: 1 })
  }
  return map
}

/**
 * Skickar in en verifiering för en plats. Kastar ett Error med svensk text
 * om det misslyckas – felstatus från databasen (t.ex. spamspärren), nätfel
 * eller tidsgräns (20 s). Anroparen ska visa felet och INTE markera platsen
 * som bekräftad lokalt (markSelfVerified) förrän anropet lyckats.
 * Utan Supabase-konfiguration (communityEnabled = false) kastas ett fel utan
 * anrop (knappen visas då inte ändå – canVerify = communityEnabled).
 */
export async function submitVerification(stationId: string): Promise<void> {
  if (!communityEnabled) throw new Error('Bekräftelser är inte påslagna i den här versionen.')
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ station_id: stationId }),
  })
  if (!res.ok) throw await restError(res, 'Kunde inte spara verifieringen')
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
