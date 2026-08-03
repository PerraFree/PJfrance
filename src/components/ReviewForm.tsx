import { useState } from 'react'
import { submitReview } from '../lib/reviews'
import { useModal } from '../lib/useModal'

interface Props {
  stationId: string
  stationName: string
  onClose: () => void
  /** Anropas när omdömet sparats; published = betyget räknas direkt. */
  onSubmitted: (rating: number, published: boolean) => void
}

type Status = 'idle' | 'saving' | 'done-published' | 'done-pending' | 'error'

export default function ReviewForm({ stationId, stationName, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const modalRef = useModal(onClose)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Välj antal stjärnor först.')
      return
    }
    setError('')
    setStatus('saving')
    try {
      const result = await submitReview({ stationId, stationName, rating, comment })
      onSubmitted(rating, result === 'published')
      setStatus(result === 'published' ? 'done-published' : 'done-pending')
    } catch {
      setStatus('error')
      setError('Kunde inte spara – kontrollera nätet och försök igen.')
    }
  }

  const done = status === 'done-published' || status === 'done-pending'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Stäng">
          ×
        </button>

        {done ? (
          <div className="submit-done">
            <h2 id="review-title">Tack! ⭐</h2>
            <p>
              {status === 'done-published'
                ? 'Ditt betyg räknas nu in i platsens snitt.'
                : 'Ditt betyg och din kommentar visas så snart de granskats.'}
            </p>
            <button type="button" className="primary-btn" onClick={onClose}>
              Klart
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="review-title">Betygsätt platsen</h2>
            <p className="modal-intro">{stationName}</p>

            <div className="star-picker" role="radiogroup" aria-label="Betyg 1 till 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n <= rating ? 'star active' : 'star'}
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} av 5 stjärnor`}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>

            <label>
              Kommentar (valfritt)
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Hur var platsen? Rent, lätt att komma till, värt att veta …"
                rows={3}
                maxLength={500}
              />
            </label>
            <p className="modal-note">
              Betyget räknas direkt. Kommentarer granskas innan de visas.
            </p>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="primary-btn" disabled={status === 'saving'}>
              {status === 'saving' ? 'Sparar …' : 'Skicka omdöme'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
