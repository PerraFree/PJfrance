import { SUPABASE_ANON_KEY, SUPABASE_URL, communityEnabled } from '../config'

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
const JPEG_QUALITY = 0.72
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

/** Senaste godkända community-foto per plats-id. */
export async function fetchPhotos(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!communityEnabled) return map
  const res = await fetch(
    `${tableUrl}?status=eq.approved&select=station_id,url,created_at&order=created_at.desc&limit=3000`,
    { headers },
  )
  if (!res.ok) return map
  const rows = (await res.json()) as Array<{ station_id?: string; url?: string }>
  for (const r of rows) {
    // Nyast först – första förekomsten per plats är senaste fotot.
    if (r.station_id && r.url && !map.has(r.station_id)) map.set(r.station_id, r.url)
  }
  return map
}

/** Skalar ner en bild till max 1280px och komprimerar som JPEG. */
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
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Kunde inte bearbeta bilden.'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
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
  if (input.file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Bilden är för stor (max 3 MB).')
  }
  const blob = await resizeImage(input.file)
  const safeId = input.stationId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const path = `${safeId}/${Date.now()}.jpg`

  const uploadRes = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/jpeg' },
    body: blob,
  })
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '')
    throw new Error(`Kunde inte ladda upp bilden (${uploadRes.status}). ${text}`)
  }

  const url = `${base}/storage/v1/object/public/${BUCKET}/${path}`
  const insertRes = await fetch(tableUrl, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      station_id: input.stationId,
      station_name: input.stationName,
      url,
      status: 'approved',
    }),
  })
  if (!insertRes.ok) {
    const text = await insertRes.text().catch(() => '')
    throw new Error(`Kunde inte spara fotot (${insertRes.status}). ${text}`)
  }
  return url
}
