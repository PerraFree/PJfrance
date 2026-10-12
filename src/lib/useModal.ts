import { useEffect, useRef } from 'react'
import { onBack } from './backClose'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Stänger dialogen med Escape och bakåtknappen, låser bakgrundsscroll,
 * flyttar fokus in i dialogen, håller kvar Tab-fokus inuti den (fokusfälla)
 * och återställer fokus till det som var aktivt innan dialogen öppnades.
 *
 * Escape fångas FÖRST (window, fångstfas) och stoppas där – annars hann
 * ruttlistans/närmaste-listans egna Escape-lyssnare rensa rutten medan
 * dialogen stod kvar (granskning 12 okt 2026).
 * onClose läses via en ref så att effekten bara körs när dialogen öppnas –
 * App skickar en ny funktion vid varje omrendering.
 */
export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const close = () => onCloseRef.current()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey, true)
    const release = onBack(close)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLElement>('input, textarea, button')?.focus()
    return () => {
      window.removeEventListener('keydown', onKey, true)
      release()
      document.body.style.overflow = prevOverflow
      // Återställ fokus till knappen som öppnade dialogen.
      opener?.focus?.()
    }
  }, [])

  return ref
}
