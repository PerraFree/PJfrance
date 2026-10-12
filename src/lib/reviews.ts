import { SUPABASE_ANON_KEY, SUPABASE_URL, communityEnabled } from '../config'
import { fetchPaged, fetchWithTimeout } from './http'
import { restError } from './restError'

/**
 * Betyg & kommentarer. Stjärnbetyg utan text publiceras direkt (inget att
 * moderera); kommentarer med text får status 'pending' och granskas via
 * GitHub-ärendeflödet (se .github/workflows/bevaka-platsforslag.yml).
 */

const base = SUPABASE_URL.replace(/\/$/, '')
const url = `${base}/rest/v1/reviews`

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

export interface ReviewComment {
  rating: number
  comment: string
  created_at: string
}

export interface StationReviews {
  sum: number
  count: number
  comments: ReviewComment[]
}

/** Godkända omdömen, aggregerade per plats (snitt + senaste kommentarer). */
export async function fetchReviews(): Promise<Map<string, StationReviews>> {
  const map = new Map<string, StationReviews>()
  if (!communityEnabled) return map
  // Snittbetyget från sammanställningen (vyn review_summary, ALLA rader) –
  // förut räknades bara de 5 000 senaste, så spam kunde tränga undan riktiga
  // betyg (granskning 12 okt 2026). Kommentarerna granskas av Per innan de
  // publiceras och hämtas separat. Reserv: gamla sättet.
  // Sidvis (1 000 åt gången): Supabase returnerar högst 1 000 rader per anrop.
  const sum = await fetchPaged(`${base}/rest/v1/review_summary?select=station_id,sum,n&order=station_id`, headers)
  if (sum) {
    const rows = sum as Array<{ station_id?: string; sum?: number; n?: number }>
    for (const r of rows) {
      if (r.station_id && typeof r.sum === 'number' && typeof r.n === 'number' && r.n > 0) {
        map.set(r.station_id, { sum: r.sum, count: r.n, comments: [] })
      }
    }
    const cres = await fetchWithTimeout(
      `${url}?status=eq.approved&comment=neq.&select=station_id,rating,comment,created_at&order=created_at.desc&limit=3000`,
      { headers },
    )
    if (cres.ok) {
      const crows = (await cres.json()) as Array<{ station_id?: string; rating?: number; comment?: string | null; created_at?: string }>
      for (const r of crows) {
        const entry = r.station_id ? map.get(r.station_id) : undefined
        if (!entry || !r.comment || typeof r.rating !== 'number' || entry.comments.length >= 2) continue
        entry.comments.push({ rating: r.rating, comment: r.comment, created_at: r.created_at ?? '' })
      }
    }
    return map
  }
  const res = await fetchWithTimeout(
    `${url}?status=eq.approved&select=station_id,rating,comment,created_at&order=created_at.desc&limit=5000`,
    { headers },
  )
  if (!res.ok) return map
  const rows = (await res.json()) as Array<{
    station_id?: string
    rating?: number
    comment?: string | null
    created_at?: string
  }>
  for (const r of rows) {
    if (!r.station_id || typeof r.rating !== 'number') continue
    let entry = map.get(r.station_id)
    if (!entry) {
      entry = { sum: 0, count: 0, comments: [] }
      map.set(r.station_id, entry)
    }
    entry.sum += r.rating
    entry.count++
    if (r.comment && entry.comments.length < 2) {
      entry.comments.push({
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at ?? '',
      })
    }
  }
  return map
}

/**
 * Skickar in ett omdöme. Utan kommentar publiceras det direkt ('published');
 * med kommentar hamnar det i granskningskön ('pending').
 */
export async function submitReview(input: {
  stationId: string
  stationName: string
  rating: number
  comment?: string
}): Promise<'published' | 'pending'> {
  const comment = input.comment?.trim() ?? ''
  const status = comment ? 'pending' : 'approved'
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      station_id: input.stationId,
      station_name: input.stationName,
      rating: input.rating,
      comment: comment || null,
      status,
    }),
  })
  if (!res.ok) throw await restError(res, 'Kunde inte spara omdömet')
  return status === 'approved' ? 'published' : 'pending'
}
