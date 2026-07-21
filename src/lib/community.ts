import { SUPABASE_ANON_KEY, SUPABASE_URL, communityEnabled } from '../config'
import type { ServiceType, Station } from '../types'

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
  const res = await fetch(restUrl, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...place, status: 'pending' }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Kunde inte skicka förslaget (${res.status}). ${text}`)
  }
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
  const res = await fetch(reportsUrl, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...report, status: 'open' }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Kunde inte skicka rapporten (${res.status}). ${text}`)
  }
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

/** Hämtar godkända community-platser att visa på kartan. */
export async function fetchApprovedPlaces(): Promise<Station[]> {
  if (!communityEnabled) return []
  const url =
    `${restUrl}?status=eq.approved&lat=not.is.null` +
    `&select=id,name,address,services,fee,description,lat,lon`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Kunde inte hämta community-platser (${res.status}).`)
  const rows = (await res.json()) as SubmissionRow[]
  return rows.map((r) => ({
    id: `community-${r.id}`,
    name: r.name,
    lat: r.lat,
    lon: r.lon,
    services: r.services,
    source: 'community' as const,
    description: r.description ?? r.address,
    fee: r.fee ?? undefined,
  }))
}
