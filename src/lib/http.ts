/**
 * Gemensam fetch med tidsgräns för alla Supabase-anrop.
 *
 * Utan tidsgräns kan ett svar som aldrig kommer lämna "Skickar …" på skärmen
 * för evigt. Vi använder AbortController + setTimeout i stället för
 * AbortSignal.timeout(), eftersom den senare saknas i äldre Android-WebView
 * (Capacitor, minSdk 24) och Safari < 16; AbortController finns överallt.
 *
 * Fel översätts till enkel svenska:
 * - tidsgränsen nås          → "Servern svarade inte – försök igen."
 * - nätfel (fetch kastar TypeError, t.ex. "Failed to fetch"/"Load failed")
 *                            → "Kunde inte skicka – kontrollera nätet och försök igen."
 * Svar med felstatus (4xx/5xx) kastas INTE här – anroparen läser dem med
 * restError() så att databasens svenska meddelande kommer fram.
 */

export const DEFAULT_TIMEOUT_MS = 20_000

export const TIMEOUT_MESSAGE = 'Servern svarade inte – försök igen.'
export const NETWORK_MESSAGE = 'Kunde inte skicka – kontrollera nätet och försök igen.'

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  // Timern får löpa vidare efter att svarshuvudet kommit, så att även en
  // svarskropp som fastnar (res.json()/res.text()) avbryts. Att avbryta ett
  // redan färdigläst svar gör ingenting.
  setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (err) {
    throw friendlyFetchError(err, timedOut)
  }
}

/** Översätter fel från fetch (nätfel, avbrott) till ett svenskt Error. */
export function friendlyFetchError(err: unknown, timedOut = false): Error {
  if (timedOut || (err instanceof DOMException && err.name === 'AbortError')) {
    return new Error(TIMEOUT_MESSAGE)
  }
  if (err instanceof TypeError) return new Error(NETWORK_MESSAGE)
  return err instanceof Error ? err : new Error(NETWORK_MESSAGE)
}

/**
 * Text att visa för användaren när ett inskick misslyckats. Våra egna fel
 * (restError, fetchWithTimeout) är redan svenska; allt annat (t.ex. ett
 * oväntat engelskt fel från webbläsaren) blir ett generellt råd.
 */
export function userMessage(err: unknown): string {
  if (err instanceof TypeError) return NETWORK_MESSAGE
  if (err instanceof Error && err.message && !/^(Failed to fetch|Load failed|NetworkError)/i.test(err.message)) {
    return err.message
  }
  return NETWORK_MESSAGE
}

/**
 * Hämtar alla rader från en PostgREST-vy sida för sida (Supabase ger högst
 * 1 000 rader per anrop – annars tappades platser tyst). Returnerar null om
 * första sidan misslyckas (anroparen faller då tillbaka på gamla sättet).
 */
export async function fetchPaged(url: string, headersInit?: HeadersInit, page = 1000, maxPages = 50): Promise<unknown[] | null> {
  const out: unknown[] = []
  for (let i = 0; i < maxPages; i++) {
    const res = await fetchWithTimeout(`${url}&limit=${page}&offset=${i * page}`, { headers: headersInit })
    if (!res.ok) return i === 0 ? null : out
    const rows = (await res.json()) as unknown[]
    out.push(...rows)
    if (rows.length < page) break
  }
  return out
}
