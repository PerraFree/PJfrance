import { useState } from 'react'
import { submitReport } from '../lib/community'

interface Props {
  stationId: string
  stationName: string
  onClose: () => void
}

const REASONS = [
  { value: 'stangd', label: 'Nedlagd eller stängd' },
  { value: 'fel_plats', label: 'Ligger på fel plats' },
  { value: 'fel_uppgifter', label: 'Fel uppgifter (tjänster, avgift …)' },
  { value: 'annat', label: 'Annat' },
]

type Status = 'idle' | 'submitting' | 'done' | 'error'

export default function ReportForm({ stationId, stationName, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!reason) {
      setError('Välj vad som är fel.')
      return
    }
    setStatus('submitting')
    try {
      await submitReport({
        station_id: stationId,
        station_name: stationName,
        reason,
        note: note.trim() || undefined,
      })
      setStatus('done')
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
        aria-labelledby="report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Stäng">
          ×
        </button>

        {status === 'done' ? (
          <div className="submit-done">
            <h2 id="report-title">Tack för hjälpen! 🙏</h2>
            <p>Rapporten är skickad och granskas. Du gör kartan bättre för alla.</p>
            <button type="button" className="primary-btn" onClick={onClose}>
              Klart
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="report-title">Rapportera fel</h2>
            <p className="modal-intro">
              <strong>{stationName}</strong>
            </p>

            <fieldset>
              <legend>Vad är fel?</legend>
              <div className="reason-list">
                {REASONS.map((r) => (
                  <label key={r.value} className="reason-option">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              Kommentar (valfritt)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Beskriv gärna vad som stämmer i stället …"
                rows={2}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="primary-btn" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Skickar …' : 'Skicka rapport'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
