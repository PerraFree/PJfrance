import { useEffect, useMemo } from 'react'
import type { GasolFacility, ServiceType, Station } from '../types'
import {
  SERVICE_COLORS,
  SERVICE_LABELS,
  UNVERIFIED_COLOR,
  stationIsActive,
  unverifiedServicesOf,
} from '../types'

interface Props {
  stations: Station[]
  activeFilters: Set<ServiceType>
  gasolFacilities: Set<GasolFacility>
  userLoc: { lat: number; lon: number }
  onPick: (station: Station) => void
  onClose: () => void
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function NearestList({
  stations,
  activeFilters,
  gasolFacilities,
  userLoc,
  onPick,
  onClose,
}: Props) {
  // Sopor är så vanligt förekommande (papperskorgar överallt) att det annars
  // svämmar över listan och tränger undan mer relevanta träffar – döljs här
  // oavsett om filtret är ikryssat.
  const listFilters = useMemo(
    () => new Set<ServiceType>([...activeFilters].filter((sv) => sv !== 'sopor')),
    [activeFilters],
  )

  const nearest = useMemo(() => {
    return stations
      .filter((s) => stationIsActive(s, listFilters, gasolFacilities))
      .map((s) => ({ s, km: distanceKm(userLoc, s) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 12)
  }, [stations, listFilters, gasolFacilities, userLoc])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="nearest" role="dialog" aria-label="Platser närmast dig">
      <div className="nearest-head">
        <h2>Närmaste platser</h2>
        <button type="button" onClick={onClose} aria-label="Stäng listan">
          ×
        </button>
      </div>
      {nearest.length === 0 && (
        <p className="nearest-empty">Inga platser i valda filter nära dig.</p>
      )}
      <ul>
        {nearest.map(({ s, km }) => (
          <li key={s.id}>
            <button type="button" onClick={() => onPick(s)}>
              <span className="dots">
                {s.services
                  .filter((sv) => listFilters.has(sv))
                  .slice(0, 4)
                  .map((sv) => (
                    <span
                      key={sv}
                      className="dot"
                      style={{ background: s.unverified ? UNVERIFIED_COLOR : SERVICE_COLORS[sv] }}
                      title={SERVICE_LABELS[sv]}
                    />
                  ))}
                {unverifiedServicesOf(s)
                  .filter((sv) => listFilters.has(sv))
                  .slice(0, 2)
                  .map((sv) => (
                    <span
                      key={`u-${sv}`}
                      className="dot"
                      style={{ background: UNVERIFIED_COLOR }}
                      title={`${SERVICE_LABELS[sv]} (obekräftad)`}
                    />
                  ))}
              </span>
              <span className="nearest-name">
                {s.name}
                {(s.unverified || unverifiedServicesOf(s).some((sv) => listFilters.has(sv))) && (
                  <span className="nearest-unverified"> · obekräftad</span>
                )}
              </span>
              <span className="nearest-km">
                {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`}
              </span>
            </button>
          </li>
        ))}
        {nearest.length === 0 && <li className="nearest-empty">Inga platser i valda filter.</li>}
      </ul>
    </div>
  )
}
