// Besöksräkning via GoatCounter (Per 31 okt 2026): ingen cookie, inget
// sparat om besökaren, så ingen samtyckesruta behövs. En bildpixel per
// sidvisning räcker – inget externt skript laddas (CSP: bara img-src).
// Räknar bara på tomningskartan.se (inte dev eller Android-appen). Den som
// öppnar ?admin=1 räknas aldrig mer i den webbläsaren (Pers egna besök);
// ?statistik=pa slår på räkningen igen.
const ENDPOINT = 'https://tomningskartan.goatcounter.com/count'
const SKIP_KEY = 'tomningskartan.ejStatistik'

export function countVisit(): void {
  if (location.hostname !== 'tomningskartan.se') return
  try {
    const params = new URLSearchParams(location.search)
    if (params.get('admin') === '1') {
      localStorage.setItem(SKIP_KEY, '1')
      return
    }
    if (params.get('statistik') === 'pa') localStorage.removeItem(SKIP_KEY)
    if (localStorage.getItem(SKIP_KEY)) return
    const q = new URLSearchParams({
      // Delade länkar (?at=) räknas för sig, annars bara startsidan
      p: params.has('at') ? '/delad-lank' : location.pathname || '/',
      r: document.referrer,
      s: `${screen.width},${screen.height},${window.devicePixelRatio || 1}`,
      rnd: Math.random().toString(36).slice(2),
    })
    new Image().src = `${ENDPOINT}?${q}`
  } catch {
    /* statistik är aldrig viktigare än appen */
  }
}
