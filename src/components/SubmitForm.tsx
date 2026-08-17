import { useState } from 'react'
import { communityEnabled } from '../config'
import { submitPlace } from '../lib/community'
import { searchPlace } from '../lib/geocode'
import { useModal } from '../lib/useModal'
import { MY_PLACE_PREFIX } from '../lib/myplaces'
import { submitPhoto } from '../lib/photos'
import { reverseGeocode } from '../lib/reverse'
import type { ServiceType, Station } from '../types'
import { SERVICE_LABELS } from '../types'

const ALL_SERVICES: ServiceType[] = ['gravatten', 'latrin', 'vatten', 'gasol']

interface Props {
  onClose: () => void
  onAdd: (station: Station) => void
  /** Kartans mittpunkt – används om ingen adress anges. */
  mapCenter: { lat: number; lon: number } | null
  /** Anropas om ett foto laddades upp samtidigt (visas direkt för alla). */
  onPhotoUploaded: (stationId: string, url: string) => void
}

type Status = 'idle' | 'saving' | 'done' | 'error'

export default function SubmitForm({ onClose, onAdd, mapCenter, onPhotoUploaded }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [services, setServices] = useState<Set<ServiceType>>(new Set())
  const [fee, setFee] = useState('')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [photoError, setPhotoError] = useState('')
  const modalRef = useModal(onClose)

  const handlePhotoFile = (f: File | null) => {
    setPhotoFile(f)
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return f ? URL.createObjectURL(f) : ''
    })
  }

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
        // searchPlace avvisar när nätet är nere – skilj det från "ingen träff"
        let hits
        try {
          hits = await searchPlace(address.trim())
        } catch {
          setStatus('error')
          setError('Kunde inte slå upp adressen – kontrollera nätet och försök igen.')
          return
        }
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
      // Hybrid: skicka samtidigt in förslaget för granskning – godkänns det
      // visas platsen för ALLA. Blockerar inte den lokala sparningen.
      if (communityEnabled) {
        void (async () => {
          // Ingen adress angiven av användaren: slå upp ett riktigt ortsnamn
          // i stället för att visa rå koordinat-text i granskningsärendet.
          let submittedAddress = station.address
          if (!submittedAddress) {
            try {
              submittedAddress = (await reverseGeocode(lat, lon)) || undefined
            } catch {
              /* faller tillbaka på koordinater nedan */
            }
          }
          await submitPlace({
            name: station.name,
            address: submittedAddress ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
            services: station.services,
            fee: station.fee,
            description: station.description,
            lat,
            lon,
          })
        })().catch(() => {
          /* granskningskön är bäst-möjligt – platsen är ändå sparad lokalt */
        })
      }
      if (communityEnabled && photoFile) {
        setPhotoStatus('uploading')
        void submitPhoto({ stationId: station.id, stationName: station.name, file: photoFile })
          .then((url) => {
            onPhotoUploaded(station.id, url)
            setPhotoStatus('done')
          })
          .catch((err) => {
            // Fotot är trevligt att ha men inte kritiskt – platsen är ändå
            // sparad. Visa ändå felet så det inte försvinner spårlöst.
            setPhotoStatus('error')
            setPhotoError(err instanceof Error ? err.message : 'Okänt fel.')
          })
      }
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
            <p>
              Platsen är sparad och syns nu på kartan hos dig.
              {communityEnabled &&
                ' Den har också skickats in för granskning – godkänns den visas den för alla.'}
            </p>
            {photoStatus === 'uploading' && <p className="modal-intro">Laddar upp fotot …</p>}
            {photoStatus === 'error' && (
              <p className="form-error">Fotot kunde tyvärr inte laddas upp: {photoError}</p>
            )}
            <button type="button" className="primary-btn" onClick={onClose}>
              Klart
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="submit-title">Lägg till en plats</h2>
            <p className="modal-intro">
              Lägg till en plats som saknas. Den visas direkt på kartan hos dig
              {communityEnabled
                ? ' och skickas samtidigt in för granskning – godkänns den syns den för alla.'
                : '.'}
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

            {communityEnabled && (
              <label>
                Foto (valfritt)
                <label className="photo-picker">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="photo-preview" />
                  ) : (
                    <span className="photo-picker-placeholder">📷 Välj bild</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </label>
            )}

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
