import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type L from 'leaflet'
import MapView, { MIN_FETCH_ZOOM } from './components/MapView'
import Toolbox from './components/Toolbox'
import { OWN_STATIONS } from './data/stations'
import { searchPlace } from './lib/geocode'
import type { Restriction } from './lib/lowbridges'
import { fetchRestrictions } from './lib/lowbridges'
import { fetchOsmStations } from './lib/overpass'
import type { ParkedPosition } from './lib/parking'
import { loadParked } from './lib/parking'
import { isSeasonClosed } from './lib/season'
import { fetchForecast, minNightTemps } from './lib/smhi'
import type { SunSpot } from './lib/sunfinder'
import { findSun } from './lib/sunfinder'
import { loadVehicle, saveVehicle } from './lib/vehicle'
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

  const [toolboxOpen, setToolboxOpen] = useState(false)
  const [vehicle, setVehicle] = useState(loadVehicle)
  const [parked, setParked] = useState<ParkedPosition | null>(loadParked)
  const [showRestrictions, setShowRestrictions] = useState(false)
  const [restrictions, setRestrictions] = useState<Restriction[]>([])
  const [hideSeasonClosed, setHideSeasonClosed] = useState(false)
  const [sunSpots, setSunSpots] = useState<SunSpot[]>([])
  const [sunLoading, setSunLoading] = useState(false)
  const [frostWarning, setFrostWarning] = useState('')
  const lastBoundsRef = useRef<{ bounds: L.LatLngBounds; zoom: number } | null>(null)
  const mapCenterRef = useRef({ lat: 62.0, lon: 15.0 })

  const stations = useMemo(() => {
    const all = [...OWN_STATIONS, ...osmStations]
    return hideSeasonClosed ? all.filter((s) => !isSeasonClosed(s.openingHours)) : all
  }, [osmStations, hideSeasonClosed])

  // Frostvakt: kolla nattemperaturen vid den parkerade bilen när appen öppnas
  useEffect(() => {
    if (!parked) {
      setFrostWarning('')
      return
    }
    let cancelled = false
    fetchForecast(parked.lat, parked.lon)
      .then((forecast) => {
        if (cancelled) return
        const frost = minNightTemps(forecast).find((n) => n.temp <= 0)
        setFrostWarning(
          frost
            ? `❄️ Frostvakt: ner mot ${frost.temp.toFixed(0)} °C i natt/kommande nätter där bilen står – töm eller värm vattensystemet!`
            : '',
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [parked])

  const loadRestrictions = useCallback(
    async (bounds: L.LatLngBounds, zoom: number) => {
      if (zoom < MIN_FETCH_ZOOM) {
        setRestrictions([])
        return
      }
      try {
        setRestrictions(await fetchRestrictions(bounds, vehicle.height, vehicle.weight))
      } catch {
        // Overpass överbelastad – behåll det som redan visas
      }
    },
    [vehicle.height, vehicle.weight],
  )

  const handleBoundsChange = useCallback(
    (bounds: L.LatLngBounds, zoom: number) => {
      const c = bounds.getCenter()
      mapCenterRef.current = { lat: c.lat, lon: c.lng }
      lastBoundsRef.current = { bounds, zoom }
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
        if (showRestrictions) void loadRestrictions(bounds, zoom)
      }, 600)
    },
    [showRestrictions, loadRestrictions],
  )

  const toggleFilter = (service: ServiceType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(service)) next.delete(service)
      else next.add(service)
      return next
    })
  }

  const toggleRestrictions = () => {
    const next = !showRestrictions
    setShowRestrictions(next)
    if (!next) {
      setRestrictions([])
    } else if (lastBoundsRef.current) {
      const { bounds, zoom } = lastBoundsRef.current
      if (zoom < MIN_FETCH_ZOOM) {
        setStatus('Zooma in för att se höjd-/viktbegränsningar för ditt fordon.')
      } else {
        void loadRestrictions(bounds, zoom)
      }
    }
  }

  const handleSunSearch = async () => {
    if (sunSpots.length > 0) {
      setSunSpots([])
      return
    }
    setSunLoading(true)
    setStatus('Kollar solchanserna inom körbart avstånd (SMHI) …')
    try {
      const spots = await findSun(mapCenterRef.current.lat, mapCenterRef.current.lon)
      setSunSpots(spots)
      const best = [...spots].sort((a, b) => b.score - a.score)[0]
      setStatus(
        best && best.score > 0
          ? `Solchans: bästa läget har ${Math.round(best.score * 100)} % sol närmaste två dagarna.`
          : 'Solchans: tyvärr mest moln överallt i närheten just nu.',
      )
    } catch {
      setStatus('Kunde inte hämta solprognosen just nu.')
    } finally {
      setSunLoading(false)
    }
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
          <label className={hideSeasonClosed ? 'filter active' : 'filter'}>
            <input
              type="checkbox"
              checked={hideSeasonClosed}
              onChange={() => setHideSeasonClosed((v) => !v)}
            />
            🗓️ Dölj säsongsstängt
          </label>
          <label className={showRestrictions ? 'filter active' : 'filter'}>
            <input type="checkbox" checked={showRestrictions} onChange={toggleRestrictions} />
            ⚠️ Låga broar ({vehicle.height} m)
          </label>
          <button
            type="button"
            className={sunSpots.length > 0 ? 'filter active as-btn' : 'filter as-btn'}
            onClick={handleSunSearch}
            disabled={sunLoading}
          >
            {sunLoading ? '⏳' : '☀️'} Solchans
          </button>
          <button
            type="button"
            className="filter as-btn"
            onClick={() => setToolboxOpen((v) => !v)}
          >
            🧰 Verktyg
          </button>
        </div>
      </header>
      {frostWarning && (
        <div className="frost-banner" role="alert">
          {frostWarning}
          <button className="btn tiny" onClick={() => setFrostWarning('')} aria-label="Stäng">
            ✕
          </button>
        </div>
      )}
      <div className="map-wrap">
        <MapView
          stations={stations}
          activeFilters={activeFilters}
          flyTo={flyTo}
          onBoundsChange={handleBoundsChange}
          restrictions={restrictions}
          sunSpots={sunSpots}
        />
        <Toolbox
          open={toolboxOpen}
          onClose={() => setToolboxOpen(false)}
          vehicle={vehicle}
          onVehicleChange={(v) => {
            setVehicle(v)
            saveVehicle(v)
          }}
          parked={parked}
          onParkedChange={setParked}
          mapCenter={mapCenterRef.current}
        />
      </div>
      <footer className="statusbar" aria-live="polite">
        {loading ? '⏳ ' : ''}
        {status}
      </footer>
    </div>
  )
}
