import { useEffect, useState } from 'react'

const KEY = 'tomningskartan.introSeen'

export default function IntroHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Öppnad via en delad platslänk: platsrutan är det viktiga – välkomsten
    // täckte förut halva den (granskning 6, 12 okt 2026). Visas nästa besök.
    if (new URLSearchParams(location.search).has('at')) return
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch {
      /* privat läge */
    }
  }, [])

  if (!show) return null

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignorera */
    }
    setShow(false)
  }

  return (
    <div className="intro" role="dialog" aria-label="Välkommen">
      <p>
        <strong>Välkommen!</strong> Här hittar du platser för att tömma gråvatten
        &amp; latrin och fylla på färskvatten och gasol i hela Sverige.{' '}
        <strong>Välj vad du letar efter</strong> med kategoriknapparna, använd{' '}
        <strong>Sök där jag är</strong> för de närmaste platserna, och{' '}
        <strong>Lägg till en plats</strong> om något saknas. Ställplatser och
        campingar visas när de erbjuder någon av tjänsterna.
      </p>
      <button type="button" onClick={dismiss}>
        Kom igång
      </button>
    </div>
  )
}
