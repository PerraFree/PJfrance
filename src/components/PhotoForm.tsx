import { useState } from 'react'
import { submitPhoto } from '../lib/photos'
import { useModal } from '../lib/useModal'

interface Props {
  stationId: string
  stationName: string
  onClose: () => void
  onUploaded: (stationId: string, url: string) => void
}

type Status = 'idle' | 'uploading' | 'done' | 'error'

export default function PhotoForm({ stationId, stationName, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const modalRef = useModal(onClose)

  const handleFile = (f: File | null) => {
    setError('')
    setFile(f)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return f ? URL.createObjectURL(f) : ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!file) {
      setError('Välj en bild först.')
      return
    }
    setStatus('uploading')
    try {
      const url = await submitPhoto({ stationId, stationName, file })
      onUploaded(stationId, url)
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
        aria-labelledby="photo-title"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Stäng">
          ×
        </button>

        {status === 'done' ? (
          <div className="submit-done">
            <h2 id="photo-title">Tack! 📷</h2>
            <p>Fotot syns nu på kartan för alla.</p>
            <button type="button" className="primary-btn" onClick={onClose}>
              Klart
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="photo-title">Lägg till foto</h2>
            <p className="modal-intro">
              <strong>{stationName}</strong>
            </p>

            <label className="photo-picker">
              {preview ? (
                <img src={preview} alt="" className="photo-preview" />
              ) : (
                <span className="photo-picker-placeholder">📷 Välj bild</span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="modal-intro">
              Fotot syns direkt för alla – ladda bara upp bilder du själv har rätt att dela.
            </p>

            {error && <p className="form-error">{error}</p>}

            <button
              type="submit"
              className="primary-btn"
              disabled={status === 'uploading' || !file}
            >
              {status === 'uploading' ? 'Laddar upp …' : 'Ladda upp foto'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
