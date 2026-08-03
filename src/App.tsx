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
import { loadMyPlaces, saveMyPlaces } from './lib/myplaces'
import { fetchVerifications, submitVerification } from './lib/verify'
import { fetchReviews, type StationReviews } from './lib/reviews'
import ReviewForm from './components/ReviewForm'
import { searchPlace } from './lib/geocode'
import { fetchOsmStations } from './lib/overpass'
import { getPosition, tap } from './lib/native'
import { serviceIcon } from './lib/icons'
import type { ServiceType, Station } from './types'
import { SERVICE_LABELS, FACILITY_LABELS } from './types'

/**
 * Valbara kategorier = det man faktiskt åker till en plats för: tömma
 * gråvatten/latrin, fylla färskvatten eller gasol. Ställplats och camping är
 * inte egna filter – de visas som märkning på platser som erbjuder ovanstående.
 */
const ALL_SERVICES: ServiceType[] = ['gravatten', 'latrin', 'vatten', 'gasol']

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
  // Inget förvalt – användaren väljer själv vad hen vill hitta.
  const [activeFilters, setActiveFilters] = useState<Set<ServiceType>>(new Set())
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom?: number } | null>(null)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Zooma in eller sök på en ort för att hämta stationer.')
  const [loading, setLoading] = useState(false)
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
  // På mobil startar panelen som en hopfälld bottensheet (karta i fokus).
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 640px)').matches,
  )
  const [locating, setLocating] = useState(false)
  const [facilityFilters, setFacilityFilters] = useState<Set<string>>(new Set())
  const [showMore, setShowMore] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
  const [favOnly, setFavOnly] = useState(false)
  const [yearRoundOnly, setYearRoundOnly] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchAbortRef = useRef<AbortController | null>(null)
  const dataCountRef = useRef(0)
  const activeFiltersRef = useRef(activeFilters)
  activeFiltersRef.current = activeFilters
  const mapCenterRef = useRef<{ lat: number; lon: number } | null>(null)

  const [myPlaces, setMyPlaces] = useState<Station[]>(loadMyPlaces)
  const [verifications, setVerifications] = useState<Map<string, string>>(new Map())

  // Senaste "stämmer fortfarande"-datum per plats (delas av alla användare)
  useEffect(() => {
    fetchVerifications()
      .then(setVerifications)
      .catch(() => {
        /* valfritt lager */
      })
  }, [])

  const [reviews, setReviews] = useState<Map<string, StationReviews>>(new Map())
  const [rateTarget, setRateTarget] = useState<{ id: string; name: string } | null>(null)

  // Godkända betyg & kommentarer (delas av alla)
  useEffect(() => {
    fetchReviews()
      .then(setReviews)
      .catch(() => {
        /* valfritt lager */
      })
  }, [])

  const handleReviewed = useCallback((stationId: string, rating: number, published: boolean) => {
    if (!published) return
    setReviews((prev) => {
      const next = new Map(prev)
      const e = next.get(stationId) ?? { sum: 0, count: 0, comments: [] }
      next.set(stationId, { ...e, sum: e.sum + rating, count: e.count + 1 })
      return next
    })
  }, [])

  const handleVerify = useCallback((id: string) => {
    void submitVerification(id).catch(() => {
      /* bäst-möjligt – det lokala kvittot visas ändå */
    })
    setVerifications((prev) => {
      const next = new Map(prev)
      next.set(id, new Date().toISOString())
      return next
    })
  }, [])

  const addMyPlace = useCallback((station: Station) => {
    setMyPlaces((prev) => {
      const next = [...prev, station]
      saveMyPlaces(next)
      return next
    })
    setActiveFilters((prev) => new Set([...prev, ...station.services]))
    setFlyTo({ lat: station.lat, lon: station.lon, zoom: 14 })
  }, [])

  const deleteMyPlace = useCallback((id: string) => {
    setMyPlaces((prev) => {
      const next = prev.filter((p) => p.id !== id)
      saveMyPlaces(next)
      return next
    })
  }, [])

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
        ...myPlaces,
        ...OWN_STATIONS,
        ...communityStations,
        ...osmStations,
        ...seedStations,
      ]),
    [osmStations, seedStations, communityStations, myPlaces],
  )

  useEffect(() => {
    dataCountRef.current = stations.length
  }, [stations])

  // När grunddatan laddats: visa det DEDUPLICERADE antalet (samma siffra som
  // panelen), så statusraden och panelen aldrig visar olika antal.
  useEffect(() => {
    if (seedStations.length > 0) {
      setStatus(`${stations.length.toLocaleString('sv-SE')} platser tillgängliga`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedStations])

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
          // Antalet visas via effekten nedan – med DEDUPLICERAT antal så det
          // stämmer med panelens siffra (inte råantalet före sammanslagning).
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

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds, zoom: number) => {
    clearTimeout(fetchTimer.current)
    const c = bounds.getCenter()
    mapCenterRef.current = { lat: c.lat, lon: c.lng }
    // Inget valt = inget att visa; hämta då inte live (undviker onödig spinner).
    if (activeFiltersRef.current.size === 0) return
    if (zoom < MIN_FETCH_ZOOM) {
      // Seed-datan täcker hela Sverige, så visa inte en missvisande "zooma in"-text.
      setStatus(
        dataCountRef.current > 0
          ? `${dataCountRef.current.toLocaleString('sv-SE')} platser tillgängliga`
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
        // Radera först så att nyss sedda stationer flyttas sist (senast = nyast).
        for (const s of fetched) {
          cache.delete(s.id)
          cache.set(s.id, s)
        }
        // Håll cachen rimlig under långa sessioner (vräk de äldst sedda).
        const CACHE_CAP = 4000
        if (cache.size > CACHE_CAP) {
          for (const key of [...cache.keys()].slice(0, cache.size - CACHE_CAP)) {
            cache.delete(key)
          }
        }
        setOsmStations([...cache.values()])
        setStatus(`${dataCountRef.current.toLocaleString('sv-SE')} platser tillgängliga`)
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

  // Antal aktiva sekundärfilter (visas som räknare på "Fler filter").
  const secondaryCount =
    (freeOnly ? 1 : 0) + (yearRoundOnly ? 1 : 0) + (favOnly ? 1 : 0) + facilityFilters.size

  const clearSecondaryFilters = () => {
    setFreeOnly(false)
    setYearRoundOnly(false)
    setFavOnly(false)
    setFacilityFilters(new Set())
  }

  // Har inget valts ännu? Slå på alla kategorier så sökträffen faktiskt syns.
  const ensureCategories = () =>
    setActiveFilters((prev) => (prev.size === 0 ? new Set(ALL_SERVICES) : prev))

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    // 1) Matcha först en namngiven plats i datat som faktiskt går att välja.
    const ql = q.toLowerCase()
    const named =
      q.length >= 3
        ? shownStations.find(
            (s) =>
              s.services.some((sv) => ALL_SERVICES.includes(sv)) &&
              s.name.toLowerCase().includes(ql),
          )
        : undefined
    if (named) {
      // Slå på just den träffens kategori(er) så pinnen faktiskt visas,
      // även om användaren redan smalnat av filtren.
      setActiveFilters(
        (prev) => new Set([...prev, ...named.services.filter((s) => ALL_SERVICES.includes(s))]),
      )
      setFlyTo({ lat: named.lat, lon: named.lon, zoom: 14 })
      setFocus({ id: named.id, nonce: Date.now() })
      setStatus(named.name)
      setCollapsed(true) // ge kartan plats efter sökning
      return
    }
    // 2) Annars ortsökning (Nominatim + Photon parallellt, avbrytbar).
    searchAbortRef.current?.abort()
    const ac = new AbortController()
    searchAbortRef.current = ac
    setSearching(true)
    setStatus(`Söker efter ”${q}” …`)
    try {
      const results = await searchPlace(q, ac.signal)
      if (ac.signal.aborted) return
      if (results.length === 0) {
        setStatus('Ingen träff – prova en ort eller ett platsnamn.')
        return
      }
      const hit = results[0]
      ensureCategories()
      setStatus(hit.name.split(',').slice(0, 2).join(','))
      setFlyTo({ lat: hit.lat, lon: hit.lon, zoom: 11 })
      setCollapsed(true) // ge kartan plats efter sökning
    } catch {
      if (!ac.signal.aborted) {
        setStatus('Sökningen misslyckades – kontrollera nätet och försök igen.')
      }
    } finally {
      if (searchAbortRef.current === ac) {
        searchAbortRef.current = null
        setSearching(false)
      }
    }
  }

  const cancelSearch = () => {
    searchAbortRef.current?.abort()
    searchAbortRef.current = null
    setSearching(false)
    setStatus('Sökning avbruten.')
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
      setCollapsed(true) // ge kartan plats
      setStatus('Visar platser nära dig – avstånd visas i varje plats.')
    } catch {
      setStatus('Kunde inte hämta din position.')
    } finally {
      setLocating(false)
    }
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
        onDeleteMyPlace={deleteMyPlace}
        verifications={verifications}
        onVerify={handleVerify}
        canVerify={communityEnabled}
        reviews={reviews}
        onRate={(s) => setRateTarget(s)}
        canRate={communityEnabled}
      />

      {loading && <div className="loading-bar" aria-hidden="true" />}

      <div className={collapsed ? 'panel collapsed' : 'panel'}>
        <header className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="34" height="34" />
          <div>
            <h1>Tömningskartan</h1>
            <p>Tömning · latrin · färskvatten · gasol – för husbil &amp; husvagn</p>
          </div>
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
          {searching ? (
            <button key="cancel" type="button" className="cancel-btn" onClick={cancelSearch}>
              Avbryt
            </button>
          ) : (
            <button key="search" type="submit">
              Sök
            </button>
          )}
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

        <div className="more-filters">
          <div className="more-filters-head">
            <button
              type="button"
              className={showMore ? 'more-toggle open' : 'more-toggle'}
              aria-expanded={showMore}
              onClick={() => setShowMore((v) => !v)}
            >
              Fler filter
              {secondaryCount > 0 && <span className="fac-count">{secondaryCount}</span>}
              <span className="chev" aria-hidden="true">
                {showMore ? '▴' : '▾'}
              </span>
            </button>
            <span className="stats">
              {shownStations.length.toLocaleString('sv-SE')} platser
              {seedUpdated &&
                ` · uppd. ${new Date(seedUpdated).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`}
            </span>
          </div>

          {showMore && (
            <div className="more-filters-body">
              <div className="toggle-row">
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

              <p className="filter-sub">Har på platsen</p>
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
              </div>

              {secondaryCount > 0 && (
                <button type="button" className="fac-clear" onClick={clearSecondaryFilters}>
                  Rensa alla filter
                </button>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="submit-place-btn"
          onClick={() => setShowSubmit(true)}
        >
          ➕ Lägg till en plats
        </button>
      </div>

      {visibleCount === 0 && stations.length > 0 && (
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
          onAdd={addMyPlace}
          mapCenter={mapCenterRef.current}
        />
      )}

      {reportTarget && (
        <ReportForm
          stationId={reportTarget.id}
          stationName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}

      {rateTarget && (
        <ReviewForm
          stationId={rateTarget.id}
          stationName={rateTarget.name}
          onClose={() => setRateTarget(null)}
          onSubmitted={(rating, published) => handleReviewed(rateTarget.id, rating, published)}
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
