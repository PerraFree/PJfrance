import { useEffect, useRef } from 'react'

/**
 * Stänger dialogen med Escape, låser bakgrundsscroll och flyttar
 * fokus in i dialogen när den öppnas.
 */
export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLElement>('input, textarea, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return ref
}
