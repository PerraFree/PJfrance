import { isNative } from './native'

/**
 * Bakåtknappen (webbläsaren, Android-telefonens bakåtgest och Android-appen)
 * ska stänga det som är öppet – dialog, sedan platsrutan – i stället för att
 * lämna sidan (granskning 12 okt 2026).
 *
 * Det som öppnas registrerar en stängfunktion här (senast öppnat överst).
 * Webben: så länge något är öppet finns EN extra historikpost; bakåt tar bort
 * den och stänger det översta. Stängs allt med krysset tas posten bort igen,
 * så att nästa bakåttryck beter sig som vanligt.
 * Android-appen: ingen historik används – handleNativeBack() anropas från
 * @capacitor/app:s backButton-händelse (se native.ts).
 */
const stack: (() => void)[] = []
let pushed = false
let ignorePops = 0
// Sista steget i Android-appen innan den avslutas: t.ex. fäll ihop menyn.
let fallback: (() => boolean) | null = null

const STATE = { tomningskartanBack: 1 }

if (typeof window !== 'undefined' && !isNative) {
  window.addEventListener('popstate', () => {
    // Vår egen history.back() (efter stängning med krysset) – inget att göra.
    if (ignorePops > 0) {
      ignorePops--
      return
    }
    if (!pushed) return
    pushed = false
    stack.pop()?.()
    // Fler saker öppna (t.ex. platsruta under en dialog): ny post för nästa tryck.
    if (stack.length > 0 && !pushed) {
      history.pushState(STATE, '')
      pushed = true
    }
  })
}

/** Registrera något öppet. Returnerar en funktion som anropas när det stängs. */
export function onBack(close: () => void): () => void {
  stack.push(close)
  if (!isNative && !pushed) {
    try {
      history.pushState(STATE, '')
      pushed = true
    } catch {
      /* t.ex. sandlådad iframe */
    }
  }
  let released = false
  return () => {
    if (released) return
    released = true
    const i = stack.lastIndexOf(close)
    if (i >= 0) stack.splice(i, 1)
    if (stack.length === 0 && pushed) {
      // Vänta en stund: öppnas något nytt direkt (t.ex. betygsdialogen när
      // platsrutan stängs) återanvänds posten. Annars hann history.back()
      // – vars mål bestäms när den anropas – ta bort fel post, och nästa
      // bakåttryck lämnade sidan.
      window.setTimeout(() => {
        if (stack.length > 0 || !pushed) return
        pushed = false
        ignorePops++
        history.back()
      }, 60)
    }
  }
}

/** Sista steget före "lämna appen" (Android): returnerar true om något gjordes. */
export function setBackFallback(fn: (() => boolean) | null): void {
  fallback = fn
}

/** Android-appens bakåtknapp. Returnerar false om appen ska avslutas. */
export function handleNativeBack(): boolean {
  const top = stack.pop()
  if (top) {
    top()
    return true
  }
  return fallback?.() ?? false
}
