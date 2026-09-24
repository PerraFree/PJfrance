import { useEffect, useMemo } from 'react'
import type { GasolFacility, ServiceType, Station } from '../types'
import {
  SERVICE_COLORS,
  SERVICE_LABELS,
  UNVERIFIED_COLOR,
  stationIsActive,
  unverifiedServicesOf,
} from '../types'
import type { RouteHit } from '../lib/route'

interface Props {
  hits: RouteHit[]
  label: string
  distanceKm: number
  straight: boolean
  activeFilters: Set<ServiceType>
  gasolFacilities: Set<GasolFacility>
  onPick: (station: Station) => void
  onClose: () => void
}

function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
}

/** Lista över platser längs vägen, i färdriktningen. Samma utseende som "Närmaste platser". */
export default function RouteList({
  hits,
  label,
  distanceKm,
  straight,
  activeFilters,
  gasolFacilities,
  onPick,
  onClose,
}: Props) {
  // Sopor döljs här av samma skäl som i närmaste-listan (svämmar över).
  const listFilters = useMemo(
    () => new Set<ServiceType>([...activeFilters].filter((sv) => sv !== 'sopor')),
    [activeFilters],
  )
  const rows = useMemo(
    () => hits.filter((h) => stationIsActive(h.station, listFilters, gasolFacilities)).slice(0, 80),
    [hits, listFilters, gasolFacilities],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="nearest route-list" role="dialog" aria-label="Platser längs vägen">
      <div className="nearest-head">
        <h2>
          Längs vägen {label}
          <span className="route-meta">
            {' '}
            · {Math.round(distanceKm)} km{straight ? ' (fågelvägen)' : ''} · {rows.length} platser
          </span>
        </h2>
        <button type="button" onClick={onClose} aria-label="Rensa rutten">
          ×
        </button>
      </div>
      {rows.length === 0 && (
        <p className="nearest-empty">Inga platser i valda filter nära vägen – prova större avstånd.</p>
      )}
      <ul>
        {rows.map(({ station: s, alongKm, sideKm }) => {
          const claimed = unverifiedServicesOf(s).filter((sv) => listFilters.has(sv))
          const unverified = s.unverified || (claimed.length > 0 && !s.services.some((sv) => listFilters.has(sv)))
          return (
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
                  {claimed.slice(0, 2).map((sv) => (
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
                  {unverified && <span className="nearest-unverified"> · obekräftad</span>}
                  <span className="route-side">{fmtKm(sideKm)} från vägen</span>
                </span>
                <span className="nearest-km" title="Km från start längs vägen">
                  km {Math.round(alongKm)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
