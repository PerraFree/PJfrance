import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type L from 'leaflet'
import MapView, { MIN_FETCH_ZOOM } from './components/MapView'
import SubmitForm from './components/SubmitForm'
import ReportForm from './components/ReportForm'
import NearestList from './components/NearestList'
import IntroHint from './components/IntroHint'
import { communityEnabled } from './config'
import { OWN_STATIONS } from './data/stations'
import { fetchApprovedPlaces } from './lib/community'
import { searchPlace } from './lib/geocode'
import { fetchOsmStations } from './lib/overpass'
import { getPosition, tap } from './lib/native'
import { serviceIcon } from './lib/icons'
import {
  fetchTrafikverketStations,
  getTrafikverketKey,
  setTrafikverketKey,
} from './lib/trafikverket'
import type { ServiceType, Station } from './types'
import { SERVICE_LABELS } from './types'

const ALL_SERVICES: ServiceType[] = [
  'gravatten',
  'latrin',
  'vatten',
  'stallplats',
  'camping',
  'gasol',
]

const FREE_RE = /gratis|free|ingår|kostnadsfri|utan avgift/i
function isFree(s: Station): boolean {
  return s.source === 'trafikverket' || (s.fee ? FREE_RE.test(s.fee) : false)
}

/** Slår ihop stationer som ligger på (nästan) samma plats; mer tillförlitliga källor vinner. */
function dedupe(stations: Station[]): Station[] {
  const priority = { egen: 0, kommun: 1, trafikverket: 2, community: 3, osm: 4 }
  const byCell = new Map<string, Station>()
  const sorted = [...stations].sort((a, b) => priority[a.source] - priority[b.source])
  for (const s of sorted) {
    const key = `${s.lat.toFixed(3)},${s.lon.toFixed(3)}`
    const existing = byCell.get(key)
    if (!existing) {
      byCell.set(key, s)
    } else {
      const merged = new Set([...existing.services, ...s.services])
      byCell.set(key, { ...existing, services: [...merged] })
    }
  }
  return [...byCell.values()]
}

export default function App() {
  const [osmStations, setOsmStations] = useState<Station[]>([])
  const [tvStations, setTvStations] = useState<Station[]>([])
  const [activeFilters, setActiveFilters] = useState<Set<ServiceType>>(
    new Set(ALL_SERVICES),
  )
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom?: number } | null>(null)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Zooma in eller sök på en ort för att hämta stationer.')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [tvKey, setTvKey] = useState(getTrafikverketKey)
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>()
  const cacheRef = useRef(new Map<string, Station>())

  const [seedStations, setSeedStations] = useState<Station[]>([])
  const [seedUpdated, setSeedUpdated] = useState<string | null>(null)
  const [freeOnly, setFreeOnly] = useState(false)
  const [communityStations, setCommunityStations] = useState<Station[]>([])
  const [showSubmit, setShowSubmit] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null)
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null)
  const [showNearest, setShowNearest] = useState(false)

  const stations = useMemo(
    () =>
      dedupe([
        ...OWN_STATIONS,
        ...communityStations,
        ...tvStations,
        ...osmStations,
        ...seedStations,
      ]),
    [osmStations, tvStations, seedStations, communityStations],
  )

  const shownStations = useMemo(
    () => (freeOnly ? stations.filter(isFree) : stations),
    [stations, freeOnly],
  )

  // Antal per kategori (utifrån det som är inläst)
  const counts = useMemo(() => {
    const c: Record<ServiceType, number> = {
      gravatten: 0,
      latrin: 0,
      vatten: 0,
      stallplats: 0,
      camping: 0,
      gasol: 0,
    }
    for (const s of shownStations) for (const sv of s.services) c[sv]++
    return c
  }, [shownStations])

  const loadCommunity = useCallback(() => {
    if (!communityEnabled) return
    fetchApprovedPlaces()
      .then((places) => setCommunityStations(places))
      .catch(() => {
        /* community-lagret är valfritt */
      })
  }, [])

  // Grunddata för hela Sverige, förhämtad vid bygget (scripts/sync-stations.mjs)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/stations-seed.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { stations?: Station[]; updatedAt?: string } | null) => {
        if (json?.stations?.length) {
          setSeedStations(json.stations)
          if (json.updatedAt) setSeedUpdated(json.updatedAt)
          setStatus(`${json.stations.length} platser i hela Sverige inlästa.`)
        }
      })
      .catch(() => {
        /* seed saknas i dev – livehämtning täcker upp */
      })
  }, [])

  // Delad plats-länk (?at=lat,lon,zoom) – flyg dit vid start
  useEffect(() => {
    const at = new URLSearchParams(location.search).get('at')
    if (!at) return
    const [lat, lon, zoom] = at.split(',').map(Number)
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      setFlyTo({ lat, lon, zoom: Number.isNaN(zoom) ? 15 : zoom })
    }
  }, [])

  // Godkända community-platser (crowdsourcing)
  useEffect(() => {
    loadCommunity()
  }, [loadCommunity])

  // Trafikverkets rastplatser hämtas en gång för hela landet när nyckel finns
  useEffect(() => {
    if (!tvKey) {
      setTvStations([])
      return
    }
    let cancelled = false
    fetchTrafikverketStations(tvKey)
      .then((result) => {
        if (cancelled) return
        setTvStations(result)
        setStatus(`${result.length} rastplatser hämtade från Trafikverket.`)
      })
      .catch(() => {
        if (cancelled) return
        setStatus('Kunde inte hämta från Trafikverket – kontrollera API-nyckeln.')
      })
    return () => {
      cancelled = true
    }
  }, [tvKey])

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds, zoom: number) => {
    clearTimeout(fetchTimer.current)
    if (zoom < MIN_FETCH_ZOOM) {
      setStatus('Zooma in eller sök på en ort för att hämta stationer.')
      return
    }
    fetchTimer.current = setTimeout(async () => {
      setLoading(true)
      setStatus('Hämtar stationer …')
      try {
        const fetched = await fetchOsmStations(bounds)
        const cache = cacheRef.current
        for (const s of fetched) cache.set(s.id, s)
        setOsmStations([...cache.values()])
        setStatus(`${cache.size} stationer från OpenStreetMap i minnet.`)
      } catch {
        setStatus('Kunde inte hämta data just nu – försök igen om en stund.')
      } finally {
        setLoading(false)
      }
    }, 600)
  }, [])

  const toggleFilter = (service: ServiceType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(service)) next.delete(service)
      else next.add(service)
      return next
    })
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setStatus(`Söker efter ”${query}” …`)
    try {
      const results = await searchPlace(query)
      if (results.length === 0) {
        setStatus('Ingen ort hittades – prova en annan sökning.')
        return
      }
      const hit = results[0]
      setStatus(hit.name.split(',').slice(0, 2).join(','))
      setFlyTo({ lat: hit.lat, lon: hit.lon, zoom: 11 })
    } catch {
      setStatus('Sökningen misslyckades – försök igen.')
    }
  }

  const handleLocate = async () => {
    setStatus('Hämtar din position …')
    void tap()
    try {
      const loc = await getPosition()
      setUserLoc(loc)
      setFlyTo({ ...loc, zoom: 11 })
      setShowNearest(true)
      setStatus('Visar platser nära dig – avstånd visas i varje plats.')
    } catch {
      setStatus('Kunde inte hämta din position.')
    }
  }

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault()
    const input = (e.currentTarget as HTMLFormElement).elements.namedItem(
      'tvkey',
    ) as HTMLInputElement
    const value = input.value.trim()
    setTrafikverketKey(value)
    setTvKey(value)
    setShowSettings(false)
    if (!value) setStatus('Trafikverket-nyckeln borttagen.')
  }

  return (
    <div className="app">
      <IntroHint />
      <MapView
        stations={shownStations}
        activeFilters={activeFilters}
        flyTo={flyTo}
        userLoc={userLoc}
        focus={focus}
        onBoundsChange={handleBoundsChange}
        canReport={communityEnabled}
        onReport={setReportTarget}
      />

      <div className="panel">
        <header className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="34" height="34" />
          <div>
            <h1>Tömningskartan</h1>
            <p>Ställplatser · tömning · vatten · gasol – för husbil &amp; husvagn</p>
          </div>
          <button
            type="button"
            className="settings-btn"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            aria-label="Datakällor och inställningar"
            title="Datakällor"
          >
            ⚙
          </button>
        </header>

        <form className="search" onSubmit={handleSearch} role="search">
          <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"
              fill="currentColor"
            />
          </svg>
          <input
            type="search"
            placeholder="Sök ort, t.ex. Mora"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Sök ort"
          />
          <button type="submit">Sök</button>
        </form>

        <div className="filters" role="group" aria-label="Filtrera tjänster">
          {ALL_SERVICES.map((service) => (
            <button
              key={service}
              type="button"
              className={activeFilters.has(service) ? 'chip active' : 'chip'}
              data-service={service}
              aria-pressed={activeFilters.has(service)}
              onClick={() => toggleFilter(service)}
            >
              <span
                className="chip-ic"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: serviceIcon(service) }}
              />
              {SERVICE_LABELS[service]}
              {counts[service] > 0 && <span className="chip-count">{counts[service]}</span>}
            </button>
          ))}
        </div>

        <div className="filter-extras">
          <button
            type="button"
            className={freeOnly ? 'free-toggle active' : 'free-toggle'}
            aria-pressed={freeOnly}
            onClick={() => setFreeOnly((v) => !v)}
          >
            Endast gratis
          </button>
          <span className="stats">
            {shownStations.length.toLocaleString('sv-SE')} platser
            {seedUpdated && ` · uppdaterad ${new Date(seedUpdated).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`}
          </span>
        </div>

        {showSettings && (
          <form className="settings" onSubmit={handleSaveKey}>
            <p>
              <strong>Trafikverkets rastplatser</strong> (~205 st med gratis
              latrintömning) hämtas med en kostnadsfri API-nyckel från{' '}
              <a href="https://data.trafikverket.se" target="_blank" rel="noopener noreferrer">
                data.trafikverket.se
              </a>
              . Nyckeln sparas bara i din webbläsare.
            </p>
            <div className="settings-row">
              <input
                name="tvkey"
                type="text"
                defaultValue={tvKey}
                placeholder="API-nyckel för Trafikverket"
                aria-label="API-nyckel för Trafikverket"
              />
              <button type="submit">Spara</button>
            </div>
          </form>
        )}

        {communityEnabled && (
          <button
            type="button"
            className="submit-place-btn"
            onClick={() => setShowSubmit(true)}
          >
            Föreslå en plats som saknas
          </button>
        )}
      </div>

      <button className="locate-btn" type="button" onClick={handleLocate} aria-label="Visa min position">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2zM12 19a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"
            fill="currentColor"
          />
        </svg>
      </button>

      <div className={loading ? 'status loading' : 'status'} aria-live="polite">
        {loading && <span className="spinner" aria-hidden="true" />}
        {status}
      </div>

      {showSubmit && (
        <SubmitForm
          onClose={() => setShowSubmit(false)}
          onSubmitted={loadCommunity}
        />
      )}

      {reportTarget && (
        <ReportForm
          stationId={reportTarget.id}
          stationName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}

      {userLoc && !showNearest && (
        <button
          className="nearest-toggle"
          type="button"
          onClick={() => setShowNearest(true)}
        >
          Närmast dig
        </button>
      )}

      {userLoc && showNearest && (
        <NearestList
          stations={shownStations}
          activeFilters={activeFilters}
          userLoc={userLoc}
          onPick={(s) => {
            setFlyTo({ lat: s.lat, lon: s.lon, zoom: 14 })
            setFocus({ id: s.id, nonce: performance.now() })
          }}
          onClose={() => setShowNearest(false)}
        />
      )}
    </div>
  )
}
