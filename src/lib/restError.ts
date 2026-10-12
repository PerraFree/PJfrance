/**
 * Gör ett PostgREST-/Storage-fel läsbart för användaren. Databasen svarar med
 * JSON (`{"code":"P0001","message":"…"}`); våra egna regler (spamskydd, längd-
 * gränser – se supabase/schema.sql) skriver meddelandet på svenska, så det
 * visas rakt av – oavsett vilken spärr som slog till (per IP, per timme,
 * per dygn). Andra fel får ett generellt svenskt meddelande med statuskoden.
 */
export async function restError(res: Response, fallback: string): Promise<Error> {
  const text = await res.text().catch(() => '')
  let message = ''
  try {
    const j = JSON.parse(text) as { message?: unknown; code?: unknown }
    const msg = typeof j.message === 'string' ? j.message.trim() : ''
    // P0001 = raise exception i våra triggers; 23514 = check-constraint (längdgräns)
    if (j.code === 'P0001' && msg) message = msg
    else if (j.code === '23514') message = 'Texten är för lång. Korta ner och försök igen.'
    // Storage-API:t skickar vidare databasens fel utan PostgREST-koden.
    // Våra egna meddelanden är svenska; Postgres/Supabase egna är engelska.
    else if (msg && /[åäöÅÄÖ]/.test(msg)) message = msg
  } catch {
    /* inte JSON */
  }
  if (message) return new Error(message.slice(0, 300))
  if (res.status === 429) {
    return new Error('För många försök just nu – vänta en stund och försök igen.')
  }
  return new Error(`${fallback} – försök igen om en stund (fel ${res.status}).`)
}
