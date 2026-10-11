/**
 * Gör ett PostgREST-fel läsbart för användaren. Databasen svarar med JSON
 * (`{"code":"P0001","message":"…"}`); våra egna regler (spamskydd, längd-
 * gränser – se supabase/schema.sql) skriver meddelandet på svenska, så det
 * visas rakt av. Andra fel får ett generellt meddelande med statuskoden.
 */
export async function restError(res: Response, fallback: string): Promise<Error> {
  const text = await res.text().catch(() => '')
  let message = ''
  try {
    const j = JSON.parse(text) as { message?: string; code?: string }
    // P0001 = raise exception i våra triggers; 23514 = check-constraint (längdgräns)
    if (j.code === 'P0001' && j.message) message = j.message
    else if (j.code === '23514') message = 'Texten är för lång. Korta ner och försök igen.'
  } catch {
    /* inte JSON */
  }
  return new Error(message || `${fallback} (${res.status}).`)
}
