import { useState } from 'react'
import { searchPlace } from '../lib/geocode'
import { useModal } from '../lib/useModal'
import { MY_PLACE_PREFIX } from '../lib/myplaces'
import type { ServiceType, Station } from '../types'
import { SERVICE_LABELS } from '../types'

const ALL_SERVICES: ServiceType[] = ['gravatten', 'latrin', 'vatten', 'gasol']

interface Props {
  onClose: () => void
  onAdd: (station: Station) => void
  /** Kartans mittpunkt – används om ingen adress anges. */
  mapCenter: { lat: number; lon: number } | null
}

type Status = 'idle' | 'saving' | 'done' | 'error'

export default function SubmitForm({ onClose, onAdd, mapCenter }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [services, setServices] = useState<Set<ServiceType>>(new Set())
  const [fee, setFee] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const modalRef = useModal(onClose)

  const toggle = (s: ServiceType) => {
    setServices((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Fyll i ett namn på platsen.')
      return
    }
    if (services.size === 0) {
      setError('Välj minst en tjänst.')
      return
    }
    setStatus('saving')
    try {
      let lat: number | undefined
      let lon: number | undefined
      if (address.trim()) {
        const hits = await searchPlace(address.trim())
        if (hits.length === 0) {
          setStatus('error')
          setError('Hittade inte adressen. Prova en mer exakt adress, eller lämna tom för att använda kartans mittpunkt.')
          return
        }
        lat = hits[0].lat
        lon = hits[0].lon
      } else if (mapCenter) {
        lat = mapCenter.lat
        lon = mapCenter.lon
      }
      if (lat === undefined || lon === undefined) {
        setStatus('error')
        setError('Ange en adress eller flytta kartan till platsen först.')
        return
      }
      const station: Station = {
        id: `${MY_PLACE_PREFIX}${Date.now()}`,
        name: name.trim(),
        lat,
        lon,
        services: [...services],
        source: 'egen',
        address: address.trim() || undefined,
        fee: fee.trim() || undefined,
        description: description.trim() || undefined,
      }
      onAdd(station)
      setStatus('done')
    } catch {
      setStatus('error')
      setError('Något gick fel. Försök igen.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-title"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Stäng">
          ×
        </button>

        {status === 'done' ? (
          <div className="submit-done">
            <h2 id="submit-title">Tillagd! 📍</h2>
            <p>Platsen är sparad och syns nu på kartan. Den finns kvar i din webbläsare.</p>
            <button type="button" className="primary-btn" onClick={onClose}>
              Klart
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="submit-title">Lägg till en plats</h2>
            <p className="modal-intro">
              Lägg till en plats som saknas. Den sparas i din webbläsare och visas direkt
              på kartan – bara du ser den.
            </p>

            <label>
              Namn på platsen
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. Tömning vid Storgatan"
                required
              />
            </label>

            <label>
              Adress eller ort (valfritt)
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Lämna tom för att använda kartans mittpunkt"
              />
            </label>

            <fieldset>
              <legend>Tjänster</legend>
              <div className="service-checks">
                {ALL_SERVICES.map((s) => (
                  <label key={s} className="service-check">
                    <input type="checkbox" checked={services.has(s)} onChange={() => toggle(s)} />
                    {SERVICE_LABELS[s]}
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              Avgift (valfritt)
              <input
                type="text"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="t.ex. Gratis eller 50 kr"
              />
            </label>

            <label>
              Kommentar (valfritt)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Öppettider, körbeskrivning, tips …"
                rows={2}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="primary-btn" disabled={status === 'saving'}>
              {status === 'saving' ? 'Sparar …' : 'Lägg till plats'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
