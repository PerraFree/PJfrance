import { useEffect, useState } from 'react'

const KEY = 'tomningskartan.introSeen'

export default function IntroHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
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
        <strong>Föreslå en plats</strong> om något saknas. Ställplatser och
        campingar visas när de erbjuder någon av tjänsterna.
      </p>
      <button type="button" onClick={dismiss}>
        Kom igång
      </button>
    </div>
  )
}
