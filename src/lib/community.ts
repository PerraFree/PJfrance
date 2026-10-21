import { SUPABASE_ANON_KEY, SUPABASE_URL, communityEnabled } from '../config'
import { SERVICE_LABELS, type ServiceType, type Station } from '../types'
import { fetchWithTimeout } from './http'
import { restError } from './restError'

/**
 * Minimal PostgREST-klient mot Supabase – ingen extra dependency.
 * Tabellen `submissions` har RLS: anon får lägga in (status='pending')
 * och läsa godkända (status='approved'). Se docs/SUPABASE.md.
 */

const base = SUPABASE_URL.replace(/\/$/, '')
const restUrl = `${base}/rest/v1/submissions`
const reportsUrl = `${base}/rest/v1/reports`

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

export interface NewSubmission {
  name: string
  address: string
  services: ServiceType[]
  fee?: string
  description?: string
  lat: number
  lon: number
}

/** Skickar ett platsförslag för moderering. */
export async function submitPlace(place: NewSubmission): Promise<void> {
  if (!communityEnabled) throw new Error('Crowdsourcing är inte konfigurerad.')
  const res = await fetchWithTimeout(restUrl, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...place, status: 'pending' }),
  })
  if (!res.ok) throw await restError(res, 'Kunde inte skicka förslaget')
}

export interface NewReport {
  station_id: string
  station_name: string
  reason: string
  note?: string
}

/** Rapporterar ett fel på en befintlig plats (nedlagd, fel uppgifter m.m.). */
export async function submitReport(report: NewReport): Promise<void> {
  if (!communityEnabled) throw new Error('Crowdsourcing är inte konfigurerad.')
  const res = await fetchWithTimeout(reportsUrl, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...report, status: 'open' }),
  })
  if (!res.ok) throw await restError(res, 'Kunde inte skicka rapporten')
}

interface SubmissionRow {
  id: string
  name: string
  address: string
  services: ServiceType[]
  fee: string | null
  description: string | null
  lat: number
  lon: number
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Hämtar godkända community-platser att visa på kartan. */
export async function fetchApprovedPlaces(): Promise<Station[]> {
  if (!communityEnabled) return []
  const url =
    `${restUrl}?status=eq.approved&lat=not.is.null` +
    `&select=id,name,address,services,fee,description,lat,lon`
  const res = await fetchWithTimeout(url, { headers })
  if (!res.ok) throw new Error(`Kunde inte hämta community-platser (${res.status}).`)
  const rows = (await res.json()) as SubmissionRow[]
  // Bara kända tjänstekoder: en okänd kod (t.ex. en ny tjänst i databasen
  // när telefonen kör en äldre version) kraschade hela appen (granskning 14 okt 2026).
  const known = (x: unknown): x is ServiceType => typeof x === 'string' && Object.prototype.hasOwnProperty.call(SERVICE_LABELS, x)
  return rows
    .map((r) => ({ ...r, services: Array.isArray(r.services) ? r.services.filter(known) : [] }))
    .filter(
      (r) =>
        typeof r.lat === 'number' &&
        Number.isFinite(r.lat) &&
        typeof r.lon === 'number' &&
        Number.isFinite(r.lon) &&
        r.services.length > 0,
    )
    .map((r) => ({
      // Textfälten tvingas till text – ett icke-textvärde kraschade annars
      // hela appen (granskning 21 okt 2026; databasen har text i dag).
      id: `community-${r.id}`,
      name: str(r.name) || 'Inskickad plats',
      lat: r.lat,
      lon: r.lon,
      services: r.services,
      source: 'community' as const,
      description: str(r.description) || str(r.address) || undefined,
      fee: str(r.fee) || undefined,
    }))
}
