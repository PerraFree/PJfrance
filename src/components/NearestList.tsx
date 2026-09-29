import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
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
  // "Allt valt" = användaren tryckte "Sök där jag är" utan något förval
  // (App slår då på alla kärnkategorier). Då ska listan visa ett URVAL per
  // kategori – 2 gråvatten, 2 latrin, 1 färskvatten, 1 sopor – i stället för
  // de fem närmaste rakt av, som i tätorter nästan alltid blev fem
  // gasolbutiker (Pers önskemål sep 2026).
  const allSelected = (['gravatten', 'latrin', 'vatten', 'sopor', 'gasol'] as ServiceType[]).every(
    (sv) => activeFilters.has(sv),
  )

  // Sopor är så vanligt förekommande (papperskorgar överallt) att det annars
  // svämmar över listan och tränger undan mer relevanta träffar – döljs när
  // det är ikryssat tillsammans med andra filter. Ensamt valt visas det.
  const listFilters = useMemo(() => {
    if (allSelected || activeFilters.size === 1) return activeFilters
    return new Set<ServiceType>([...activeFilters].filter((sv) => sv !== 'sopor'))
  }, [activeFilters, allSelected])

  const nearest = useMemo(() => {
    const sorted = stations
      .map((s) => ({ s, km: distanceKm(userLoc, s) }))
      .sort((a, b) => a.km - b.km)
    if (allSelected) {
      const quota: [ServiceType, number][] = [
        ['gravatten', 2],
        ['latrin', 2],
        ['vatten', 1],
        ['sopor', 1],
      ]
      const picked: { s: Station; km: number }[] = []
      const used = new Set<string>()
      for (const [cat, n] of quota) {
        const only = new Set<ServiceType>([cat])
        let count = 0
        for (const x of sorted) {
          if (count >= n) break
          if (used.has(x.s.id) || !stationIsActive(x.s, only, gasolFacilities)) continue
          picked.push(x)
          used.add(x.s.id)
          count++
        }
      }
      return picked.sort((a, b) => a.km - b.km)
    }
    // Bara de fem närmaste – fler blir rörigt, resten hittar man på kartan
    // (Pers beslut sep 2026; tidigare 12).
    return sorted.filter((x) => stationIsActive(x.s, listFilters, gasolFacilities)).slice(0, 5)
  }, [stations, listFilters, allSelected, gasolFacilities, userLoc])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Mobil: listan är en bottensheet som täckte kartan helt (Pers skärmbild
  // sep 2026). Nu kan den dras ner till en smal remsa (bara rubriken syns)
  // så att kartan och nålarna blir synliga, och dras upp igen. Tryck på en
  // plats i listan fäller ihop den automatiskt så nålen inte döljs.
  const [minimized, setMinimized] = useState(false)
  const isMobile = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 640px)').matches
  const touchStartY = useRef<number | null>(null)
  const touchLastY = useRef<number | null>(null)
  const onTouchStart = (e: TouchEvent<HTMLElement>) => {
    touchStartY.current = e.touches[0]?.clientY ?? null
    touchLastY.current = touchStartY.current
  }
  const onTouchMove = (e: TouchEvent<HTMLElement>) => {
    touchLastY.current = e.touches[0]?.clientY ?? touchLastY.current
  }
  const onTouchEnd = () => {
    if (touchStartY.current == null || touchLastY.current == null) return
    const dy = touchLastY.current - touchStartY.current
    touchStartY.current = null
    if (dy > 30) setMinimized(true)
    else if (dy < -30) setMinimized(false)
  }
  const pick = (s: Station) => {
    if (isMobile()) setMinimized(true)
    onPick(s)
  }

  return (
    <div
      className={`nearest${minimized ? ' minimized' : ''}`}
      role="dialog"
      aria-label="Platser närmast dig"
    >
      <button
        type="button"
        className="sheet-handle"
        aria-expanded={!minimized}
        aria-label={minimized ? 'Visa listan' : 'Fäll ihop listan'}
        onClick={() => setMinimized((v) => !v)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <span aria-hidden="true" />
      </button>
      <div
        className="nearest-head"
        onClick={() => {
          if (isMobile()) setMinimized((v) => !v)
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <h2>Närmaste platser</h2>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="Stäng listan"
        >
          ×
        </button>
      </div>
      {nearest.length === 0 && (
        <p className="nearest-empty">Inga platser i valda filter nära dig.</p>
      )}
      <ul>
        {nearest.map(({ s, km }) => (
          <li key={s.id}>
            <button type="button" onClick={() => pick(s)}>
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
