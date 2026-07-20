import { useState } from 'react'
import { searchPlace } from '../lib/geocode'
import { submitPlace } from '../lib/community'
import type { ServiceType } from '../types'
import { SERVICE_LABELS } from '../types'

const ALL_SERVICES: ServiceType[] = ['gravatten', 'latrin', 'vatten']

interface Props {
  onClose: () => void
  onSubmitted: () => void
}

type Status = 'idle' | 'submitting' | 'done' | 'error'

export default function SubmitForm({ onClose, onSubmitted }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [services, setServices] = useState<Set<ServiceType>>(new Set())
  const [fee, setFee] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

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
    if (!name.trim() || !address.trim()) {
      setError('Fyll i namn och adress.')
      return
    }
    if (services.size === 0) {
      setError('Välj minst en tjänst.')
      return
    }
    setStatus('submitting')
    try {
      // Geokoda adressen så förslaget får koordinater direkt
      const hits = await searchPlace(address)
      if (hits.length === 0) {
        setStatus('error')
        setError('Hittade inte adressen. Prova en mer exakt adress eller ort.')
        return
      }
      await submitPlace({
        name: name.trim(),
        address: address.trim(),
        services: [...services],
        fee: fee.trim() || undefined,
        description: description.trim() || undefined,
        lat: hits[0].lat,
        lon: hits[0].lon,
      })
      setStatus('done')
      onSubmitted()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Något gick fel. Försök igen.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Stäng">
          ×
        </button>

        {status === 'done' ? (
          <div className="submit-done">
            <h2 id="submit-title">Tack! 🙌</h2>
            <p>
              Ditt förslag är inskickat och dyker upp på kartan när det granskats.
              Du hjälper alla husbilsägare i Sverige.
            </p>
            <button type="button" className="primary-btn" onClick={onClose}>
              Klart
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="submit-title">Föreslå en plats</h2>
            <p className="modal-intro">
              Känner du till en tömnings- eller vattenplats som saknas? Fyll i så
              geokodas adressen och förslaget granskas innan det visas.
            </p>

            <label>
              Namn på platsen
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. Ställplats Storgatan"
                required
              />
            </label>

            <label>
              Adress eller plats
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="t.ex. Storgatan 5, Svenljunga"
                required
              />
            </label>

            <fieldset>
              <legend>Tjänster</legend>
              <div className="service-checks">
                {ALL_SERVICES.map((s) => (
                  <label key={s} className="service-check">
                    <input
                      type="checkbox"
                      checked={services.has(s)}
                      onChange={() => toggle(s)}
                    />
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

            <button type="submit" className="primary-btn" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Skickar …' : 'Skicka förslag'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
