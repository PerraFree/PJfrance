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
import { loadFavorites, saveFavorites } from './lib/favorites'
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
import { SERVICE_LABELS, FACILITY_LABELS } from './types'

const ALL_SERVICES: ServiceType[] = [
  'gravatten',
  'latrin',
  'vatten',
  'stallplats',
  'camping',
  'gasol',
]

/** Faciliteter man kan filtrera på (de mest efterfrågade av husbilsfolk). */
const FILTERABLE_FACILITIES = [
  'el',
  'dricksvatten',
  'dusch',
  'wc',
  'tvatt',
  'wifi',
  'avfall',
  'hund',
  'restaurang',
  'tillganglig',
]

const FREE_RE = /gratis|free|ingår|kostnadsfri|utan avgift/i
function isFree(s: Station): boolean {
  return s.source === 'trafikverket' || (s.fee ? FREE_RE.test(s.fee) : false)
}

const SOURCE_PRIORITY: Record<Station['source'], number> = {
  egen: 0,
  kommun: 1,
  trafikverket: 2,
  community: 3,
  osm: 4,
}

/** Meter mellan två punkter (haversine). */
function distMeters(a: Station, b: Station): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

const MERGE_FIELDS: (keyof Station)[] = [
  'address',
  'fee',
  'openingHours',
  'operator',
  'phone',
  'website',
  'capacity',
  'maxstay',
  'description',
  'payment',
  'osmUrl',
  'season',
]

/** Fyller på det som redan behållits (högre prioritet) med det som saknas från en dubblett. */
function mergeInto(target: Station, s: Station): void {
  target.services = [...new Set([...target.services, ...s.services])]
  const fac = [...new Set([...(target.facilities ?? []), ...(s.facilities ?? [])])]
  target.facilities = fac.length ? fac : undefined
  for (const k of MERGE_FIELDS) {
    if (target[k] == null && s[k] != null) (target[k] as unknown) = s[k]
  }
}

/**
 * Slår ihop stationer som ligger inom ~100 m av varandra – oavsett om de
 * hamnar i samma rutnätscell – så att samma fysiska plats bara får en pin.
 * Mer tillförlitliga källor vinner och kompletteras med detaljer från övriga.
 */
function dedupe(stations: Station[]): Station[] {
  const sorted = [...stations].sort(
    (a, b) => (SOURCE_PRIORITY[a.source] ?? 9) - (SOURCE_PRIORITY[b.source] ?? 9),
  )
  const CELL = 0.003 // ~200–330 m; grannceller täcker 100 m-radien
  const grid = new Map<string, Station[]>()
  const kept: Station[] = []
  for (const s of sorted) {
    const cx = Math.round(s.lat / CELL)
    const cy = Math.round(s.lon / CELL)
    let merged = false
    for (let dx = -1; dx <= 1 && !merged; dx++) {
      for (let dy = -1; dy <= 1 && !merged; dy++) {
        const bucket = grid.get(`${cx + dx},${cy + dy}`)
        if (!bucket) continue
        for (const ex of bucket) {
          if (distMeters(ex, s) <= 100) {
            mergeInto(ex, s)
            merged = true
            break
          }
        }
      }
    }
    if (!merged) {
      const copy: Station = {
        ...s,
        services: [...s.services],
        facilities: s.facilities ? [...s.facilities] : undefined,
      }
      const key = `${cx},${cy}`
      const bucket = grid.get(key)
      if (bucket) bucket.push(copy)
      else grid.set(key, [copy])
      kept.push(copy)
    }
  }
  return kept
}

export default function App() {
  const [osmStations, setOsmStations] = useState<Station[]>([])
  const [tvStations, setTvStations] = useState<Station[]>([])
  // Inget förvalt – användaren väljer själv vad hen vill hitta.
  const [activeFilters, setActiveFilters] = useState<Set<ServiceType>>(new Set())
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom?: number } | null>(null)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Zooma in eller sök på en ort för att hämta stationer.')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [tvKey, setTvKey] = useState(getTrafikverketKey)
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>()
  const cacheRef = useRef(new Map<string, Station>())
  const reqIdRef = useRef(0)

  const [seedStations, setSeedStations] = useState<Station[]>([])
  const [seedUpdated, setSeedUpdated] = useState<string | null>(null)
  const [freeOnly, setFreeOnly] = useState(false)
  const [communityStations, setCommunityStations] = useState<Station[]>([])
  const [showSubmit, setShowSubmit] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null)
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null)
  const [showNearest, setShowNearest] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [locating, setLocating] = useState(false)
  const [facilityFilters, setFacilityFilters] = useState<Set<string>>(new Set())
  const [showFacilityFilter, setShowFacilityFilter] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
  const [favOnly, setFavOnly] = useState(false)
  const [yearRoundOnly, setYearRoundOnly] = useState(false)
  const dataCountRef = useRef(0)

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveFavorites(next)
      return next
    })
  }, [])

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

  useEffect(() => {
    dataCountRef.current = stations.length
  }, [stations])

  const shownStations = useMemo(() => {
    let list = freeOnly ? stations.filter(isFree) : stations
    if (favOnly) list = list.filter((s) => favorites.has(s.id))
    if (yearRoundOnly) {
      list = list.filter(
        (s) => s.season === 'year-round' || s.openingHours === '24/7',
      )
    }
    if (facilityFilters.size) {
      list = list.filter((s) => {
        const have = new Set(s.facilities ?? [])
        for (const need of facilityFilters) if (!have.has(need)) return false
        return true
      })
    }
    return list
  }, [stations, freeOnly, favOnly, favorites, yearRoundOnly, facilityFilters])

  // Antal synliga pins med hänsyn till aktiva kategorifilter (för tomt-läge)
  const visibleCount = useMemo(
    () => shownStations.filter((s) => s.services.some((sv) => activeFilters.has(sv))).length,
    [shownStations, activeFilters],
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
      // Seed-datan täcker hela Sverige, så visa inte en missvisande "zooma in"-text.
      setStatus(
        dataCountRef.current > 0
          ? `${dataCountRef.current.toLocaleString('sv-SE')} platser i hela Sverige`
          : 'Zooma in eller sök på en ort för att hämta stationer.',
      )
      return
    }
    fetchTimer.current = setTimeout(async () => {
      const reqId = ++reqIdRef.current
      setLoading(true)
      setStatus('Hämtar stationer …')
      try {
        const fetched = await fetchOsmStations(bounds)
        if (reqId !== reqIdRef.current) return // en nyare hämtning har startat
        const cache = cacheRef.current
        for (const s of fetched) cache.set(s.id, s)
        // Håll cachen rimlig under långa sessioner (behåll de senaste).
        const CACHE_CAP = 4000
        if (cache.size > CACHE_CAP) {
          for (const key of [...cache.keys()].slice(0, cache.size - CACHE_CAP)) {
            cache.delete(key)
          }
        }
        setOsmStations([...cache.values()])
        setStatus(`${cache.size} stationer från OpenStreetMap i minnet.`)
      } catch {
        if (reqId !== reqIdRef.current) return
        // Seed-datan täcker hela Sverige, så en misslyckad live-uppdatering
        // är inte kritisk – visa ett lugnt meddelande i stället för ett fel.
        setStatus('Visar sparade platser – live-uppdatering från OpenStreetMap gick inte just nu.')
      } finally {
        if (reqId === reqIdRef.current) setLoading(false)
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

  const toggleFacility = (key: string) => {
    setFacilityFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    // 1) Matcha först en namngiven plats i datat (t.ex. "Borås Golfklubb").
    const ql = q.toLowerCase()
    const named = shownStations.find((s) => s.name.toLowerCase().includes(ql))
    if (named && q.length >= 3) {
      setFlyTo({ lat: named.lat, lon: named.lon, zoom: 14 })
      setFocus({ id: named.id, nonce: Date.now() })
      setStatus(named.name)
      return
    }
    // 2) Annars ortsökning via Nominatim.
    setStatus(`Söker efter ”${q}” …`)
    try {
      const results = await searchPlace(q)
      if (results.length === 0) {
        setStatus('Ingen träff – prova en ort eller ett platsnamn.')
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
    if (locating) return
    setLocating(true)
    setStatus('Hämtar din position …')
    void tap()
    try {
      const loc = await getPosition()
      setUserLoc(loc)
      setFlyTo({ ...loc, zoom: 11 })
      setShowNearest(true)
      // Har inget valts ännu? Visa alla kategorier så man genast ser vad som finns nära.
      setActiveFilters((prev) => (prev.size === 0 ? new Set(ALL_SERVICES) : prev))
      setStatus('Visar platser nära dig – avstånd visas i varje plats.')
    } catch {
      setStatus('Kunde inte hämta din position.')
    } finally {
      setLocating(false)
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

  // PWA-genväg "Nära mig" (manifestets shortcut ?nara=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('nara') === '1') void handleLocate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        favoriteIds={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {loading && <div className="loading-bar" aria-hidden="true" />}

      <div className={collapsed ? 'panel collapsed' : 'panel'}>
        <header className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="34" height="34" />
          <div>
            <h1>Tömningskartan</h1>
            <p>Ställplatser · tömning · vatten · gasol – för husbil &amp; husvagn</p>
          </div>
          {!collapsed && (
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
          )}
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Visa filter' : 'Fäll ihop panelen'}
            title={collapsed ? 'Visa filter' : 'Fäll ihop'}
          >
            {collapsed ? '▾' : '▴'}
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
            placeholder="Sök ort eller plats, t.ex. Mora"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Sök ort eller plats"
          />
          <button type="submit">Sök</button>
        </form>

        <button
          type="button"
          className={locating ? 'here-btn busy' : 'here-btn'}
          onClick={handleLocate}
          disabled={locating}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
            <path
              d="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2zM12 19a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"
              fill="currentColor"
            />
          </svg>
          {locating ? 'Hämtar din position …' : 'Sök där jag är'}
        </button>

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
          <button
            type="button"
            className={yearRoundOnly ? 'free-toggle active' : 'free-toggle'}
            aria-pressed={yearRoundOnly}
            onClick={() => setYearRoundOnly((v) => !v)}
          >
            Öppet året runt
          </button>
          <button
            type="button"
            className={favOnly ? 'free-toggle active' : 'free-toggle'}
            aria-pressed={favOnly}
            onClick={() => setFavOnly((v) => !v)}
            title="Visa bara dina sparade platser"
          >
            ★ Favoriter
            {favorites.size > 0 && <span className="fac-count">{favorites.size}</span>}
          </button>
        </div>
        <div className="filter-extras">
          <span className="stats">
            {shownStations.length.toLocaleString('sv-SE')} platser
            {seedUpdated && ` · uppdaterad ${new Date(seedUpdated).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`}
          </span>
        </div>

        <div className="facility-filter">
          <button
            type="button"
            className={showFacilityFilter ? 'facility-toggle open' : 'facility-toggle'}
            aria-expanded={showFacilityFilter}
            onClick={() => setShowFacilityFilter((v) => !v)}
          >
            Filtrera på vad som finns
            {facilityFilters.size > 0 && <span className="fac-count">{facilityFilters.size}</span>}
            <span className="chev" aria-hidden="true">{showFacilityFilter ? '▴' : '▾'}</span>
          </button>
          {showFacilityFilter && (
            <div className="facility-chips" role="group" aria-label="Filtrera på faciliteter">
              {FILTERABLE_FACILITIES.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={facilityFilters.has(key) ? 'fac-chip active' : 'fac-chip'}
                  aria-pressed={facilityFilters.has(key)}
                  onClick={() => toggleFacility(key)}
                >
                  {FACILITY_LABELS[key] ?? key}
                </button>
              ))}
              {facilityFilters.size > 0 && (
                <button
                  type="button"
                  className="fac-clear"
                  onClick={() => setFacilityFilters(new Set())}
                >
                  Rensa
                </button>
              )}
            </div>
          )}
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

      {visibleCount === 0 && dataCountRef.current > 0 && (
        <div className="map-empty" role="status">
          {favOnly && favorites.size === 0
            ? 'Du har inga sparade platser än – tryck ★ Spara i en plats för att lägga till den här.'
            : activeFilters.size === 0
              ? 'Vad letar du efter? Välj en eller flera kategorier ovan för att visa platser.'
              : facilityFilters.size > 0
                ? 'Inga platser matchar valda faciliteter – prova att ta bort något villkor.'
                : 'Inga platser i valda filter här.'}
        </div>
      )}

      <button
        className={locating ? 'locate-btn busy' : 'locate-btn'}
        type="button"
        onClick={handleLocate}
        disabled={locating}
        aria-label="Visa platser nära mig"
      >
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
