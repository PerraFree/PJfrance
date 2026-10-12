import { SUPABASE_ANON_KEY, SUPABASE_URL, communityEnabled } from '../config'
import { fetchWithTimeout } from './http'
import { restError } from './restError'

/**
 * Community-foton ("📷 Lägg till foto"). Publiceras direkt (ingen
 * granskningskö, beslut aug 2026) – olämpligt innehåll flaggas i stället via
 * "Rapportera fel". Bilder skalas ner klientsidan (max 1280px, JPEG) innan
 * uppladdning för snabbare uppladdning på mobildata och lägre lagringskostnad
 * (Supabase gratisnivå har begränsad lagring – hålls medvetet litet).
 */

const base = SUPABASE_URL.replace(/\/$/, '')
const tableUrl = `${base}/rest/v1/photos`
const BUCKET = 'place-photos'

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
}

const MAX_DIMENSION = 1280
/** Kvalitetssteg som provas i tur och ordning tills bilden ryms i bucketen. */
const JPEG_QUALITIES = [0.72, 0.6, 0.5, 0.4]
/** Bucketens gräns i supabase/schema.sql är 1 MB (1048576 byte); håll marginal. */
const MAX_RESIZED_BYTES = 1_000_000
/** Originalet får vara stort (mobilfoton är ofta 3–10 MB) – gränsen skyddar bara mot krasch. */
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024
/** Själva bilduppladdningen får längre tid än vanliga anrop (svag mobiltäckning). */
const UPLOAD_TIMEOUT_MS = 60_000

/**
 * Bara bilder i projektets egen bucket visas (säkerhetsfynd 1, okt 2026).
 * Databasens RLS-regel (supabase/schema.sql) är det riktiga skyddet; det här
 * är försvar på djupet så att en främmande URL aldrig renderas i appen även
 * om en rad skulle slinka in. Samma mönster som regexen i schema.sql.
 */
const OWN_PHOTO_RE = new RegExp(
  `^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/storage/v1/object/public/${BUCKET}/[A-Za-z0-9_-]+/[0-9]+\\.jpg$`,
)
export function isOwnPhotoUrl(url: string | undefined | null): url is string {
  return Boolean(communityEnabled && url && OWN_PHOTO_RE.test(url))
}

/** Senaste godkända community-foto per plats-id. */
export async function fetchPhotos(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!communityEnabled) return map
  const res = await fetchWithTimeout(
    `${tableUrl}?status=eq.approved&select=station_id,url,created_at&order=created_at.desc&limit=3000`,
    { headers },
  )
  if (!res.ok) return map
  const rows = (await res.json()) as Array<{ station_id?: string; url?: string }>
  for (const r of rows) {
    // Nyast först – första förekomsten per plats är senaste fotot.
    if (r.station_id && isOwnPhotoUrl(r.url) && !map.has(r.station_id)) map.set(r.station_id, r.url)
  }
  return map
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Kunde inte bearbeta bilden.'))),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Skalar ner en bild till max 1280px och komprimerar som JPEG. Sänker
 * kvaliteten stegvis tills resultatet är under 1 MB (bucketens gräns).
 */
function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Kunde inte bearbeta bilden.'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      void (async () => {
        try {
          for (const q of JPEG_QUALITIES) {
            const blob = await canvasToJpeg(canvas, q)
            if (blob.size <= MAX_RESIZED_BYTES) {
              resolve(blob)
              return
            }
          }
          reject(new Error('Bilden blev för stor även efter förminskning. Prova en annan bild.'))
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Kunde inte bearbeta bilden.'))
        }
      })()
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Kunde inte läsa bildfilen.'))
    }
    img.src = objectUrl
  })
}

export interface NewPhoto {
  stationId: string
  stationName: string
  file: File
}

/** Laddar upp ett foto och kopplar det till en plats. Syns direkt för alla. */
export async function submitPhoto(input: NewPhoto): Promise<string> {
  if (!communityEnabled) throw new Error('Crowdsourcing är inte konfigurerad.')
  if (!input.file.type.startsWith('image/')) {
    throw new Error('Filen måste vara en bild.')
  }
  // Originalet förminskas först (nedan); den här gränsen stoppar bara
  // orimligt stora filer som kan få telefonens minne att ta slut.
  if (input.file.size > MAX_ORIGINAL_BYTES) {
    throw new Error('Bilden är för stor (max 25 MB).')
  }
  const blob = await resizeImage(input.file)
  const safeId = input.stationId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const path = `${safeId}/${Date.now()}.jpg`

  const uploadRes = await fetchWithTimeout(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/jpeg' },
    body: blob,
  }, UPLOAD_TIMEOUT_MS)
  if (!uploadRes.ok) throw await restError(uploadRes, 'Kunde inte ladda upp bilden')

  const url = `${base}/storage/v1/object/public/${BUCKET}/${path}`
  const insertRes = await fetchWithTimeout(tableUrl, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      station_id: input.stationId,
      station_name: input.stationName,
      url,
      status: 'approved',
    }),
  })
  if (!insertRes.ok) throw await restError(insertRes, 'Kunde inte spara fotot')
  return url
}
