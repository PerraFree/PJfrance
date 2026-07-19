import { useCallback, useMemo, useRef, useState } from 'react'
import type L from 'leaflet'
import MapView, { MIN_FETCH_ZOOM } from './components/MapView'
import { OWN_STATIONS } from './data/stations'
import { searchPlace } from './lib/geocode'
import { fetchOsmStations } from './lib/overpass'
import type { ServiceType, Station } from './types'
import { SERVICE_COLORS, SERVICE_LABELS } from './types'

const ALL_SERVICES: ServiceType[] = ['gravatten', 'latrin', 'vatten']

export default function App() {
  const [osmStations, setOsmStations] = useState<Station[]>([])
  const [activeFilters, setActiveFilters] = useState<Set<ServiceType>>(
    new Set(ALL_SERVICES),
  )
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom?: number } | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Zooma in till en region för att hämta stationer.')
  const [loading, setLoading] = useState(false)
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>()
  const cacheRef = useRef(new Map<string, Station>())

  const stations = useMemo(
    () => [...OWN_STATIONS, ...osmStations],
    [osmStations],
  )

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds, zoom: number) => {
    clearTimeout(fetchTimer.current)
    if (zoom < MIN_FETCH_ZOOM) {
      setStatus('Zooma in till en region för att hämta stationer.')
      return
    }
    fetchTimer.current = setTimeout(async () => {
      setLoading(true)
      setStatus('Hämtar stationer från OpenStreetMap …')
      try {
        const fetched = await fetchOsmStations(bounds)
        const cache = cacheRef.current
        for (const s of fetched) cache.set(s.id, s)
        setOsmStations([...cache.values()])
        setStatus(`${cache.size} stationer inlästa (OpenStreetMap + eget register).`)
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
      setStatus(hit.name)
      setFlyTo({ lat: hit.lat, lon: hit.lon, zoom: 11 })
    } catch {
      setStatus('Sökningen misslyckades – försök igen.')
    }
  }

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setStatus('Din webbläsare stödjer inte platstjänster.')
      return
    }
    setStatus('Hämtar din position …')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyTo({ lat: pos.coords.latitude, lon: pos.coords.longitude, zoom: 11 })
        setStatus('Visar stationer nära dig.')
      },
      () => setStatus('Kunde inte hämta din position.'),
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          <img src="/icon.svg" alt="" width="28" height="28" /> Tömningskartan
        </h1>
        <form className="search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Sök ort, t.ex. Mora"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Sök ort"
          />
          <button type="submit">Sök</button>
          <button type="button" onClick={handleLocate} title="Visa min position">
            📍 Nära mig
          </button>
        </form>
        <div className="filters" role="group" aria-label="Filtrera tjänster">
          {ALL_SERVICES.map((service) => (
            <label
              key={service}
              className={activeFilters.has(service) ? 'filter active' : 'filter'}
              style={{ '--dot': SERVICE_COLORS[service] } as React.CSSProperties}
            >
              <input
                type="checkbox"
                checked={activeFilters.has(service)}
                onChange={() => toggleFilter(service)}
              />
              <span className="dot" /> {SERVICE_LABELS[service]}
            </label>
          ))}
        </div>
      </header>
      <MapView
        stations={stations}
        activeFilters={activeFilters}
        flyTo={flyTo}
        onBoundsChange={handleBoundsChange}
      />
      <footer className="statusbar" aria-live="polite">
        {loading ? '⏳ ' : ''}
        {status}
      </footer>
    </div>
  )
}
