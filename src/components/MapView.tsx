import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import type { ServiceType, Station } from '../types'
import { SERVICE_COLORS, SERVICE_ICONS, SERVICE_LABELS } from '../types'
import { openNow } from '../lib/openingHours'
import { reverseGeocode } from '../lib/reverse'
import { sharePlace as nativeShare } from '../lib/native'
import { facilityChip } from '../lib/icons'
import { MY_PLACE_PREFIX } from '../lib/myplaces'
import { markSelfVerified, selfVerifiedRecently } from '../lib/verify'
import type { StationReviews } from '../lib/reviews'

// Seed-datan täcker hela Sverige, så live-hämtning behövs bara när man zoomat
// in nära (för färsk detalj). Håller "Hämtar stationer …" borta vid ort-zoom.
const MIN_FETCH_ZOOM = 12
const VIEW_KEY = 'tomningskartan.view'

interface Props {
  stations: Station[]
  activeFilters: Set<ServiceType>
  flyTo: { lat: number; lon: number; zoom?: number } | null
  userLoc: { lat: number; lon: number } | null
  focus: { id: string; nonce: number } | null
  onBoundsChange: (bounds: L.LatLngBounds, zoom: number) => void
  canReport: boolean
  onReport: (station: { id: string; name: string }) => void
  favoriteIds: Set<string>
  onToggleFavorite: (id: string) => void
  onDeleteMyPlace: (id: string) => void
  /** Senaste "stämmer fortfarande"-datum (ISO) per plats-id. */
  verifications: Map<string, string>
  onVerify: (id: string) => void
  canVerify: boolean
  /** Godkända betyg/kommentarer per plats-id. */
  reviews: Map<string, StationReviews>
  onRate: (station: { id: string; name: string }) => void
  canRate: boolean
  /** Anropas när en plats-popup öppnas – panelen kan då minimeras. */
  onStationPopupOpen?: () => void
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Släpper bara igenom säkra länkscheman (http/https/tel). Skyddar mot t.ex.
 * javascript:-URL:er som kan komma från extern OSM-data.
 */
function safeUrl(value: string | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (/^(https?:|tel:)/i.test(v)) return v
  if (/^www\./i.test(v)) return `https://${v}`
  return null
}

function facilityList(station: Station): string {
  const keys = station.facilities ?? []
  if (keys.length === 0) return ''
  const chips = keys.map((k) => facilityChip(k)).join('')
  return `<div class="facilities"><p class="facilities-h">Finns här</p><div class="amenities">${chips}</div></div>`
}

/** Avstånd fågelvägen i km (haversine). */
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

function pinIcon(color: string, glyph: string): L.DivIcon {
  const svg = `
    <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 1C8.7 1 2 7.7 2 16c0 10.5 12.2 24.2 14.1 26.3a1.2 1.2 0 0 0 1.8 0C19.8 40.2 32 26.5 32 16 32 7.7 25.3 1 17 1z"
            fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="17" cy="16" r="8.5" fill="#ffffff"/>
      <text x="17" y="20.5" font-size="11" text-anchor="middle">${glyph}</text>
    </svg>`
  return L.divIcon({
    className: 'pin',
    html: svg,
    iconSize: [34, 44],
    iconAnchor: [17, 43],
    popupAnchor: [0, -38],
  })
}

/** 'year-round' från datan, annars härledd ur 24/7-öppettider. */
function stationSeason(station: Station): Station['season'] {
  return station.season ?? (station.openingHours === '24/7' ? 'year-round' : undefined)
}

/** "idag", "för 5 dagar sedan" eller datum – för verifieringsraden. */
function fmtVerified(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'idag'
  if (days === 1) return 'igår'
  if (days < 30) return `för ${days} dagar sedan`
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function starRow(avg: number): string {
  const filled = Math.round(avg)
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

function popupHtml(
  station: Station,
  canReport: boolean,
  userLoc: { lat: number; lon: number } | null,
  isFav: boolean,
  verifiedAt: string | undefined,
  canVerify: boolean,
  review: StationReviews | undefined,
  canRate: boolean,
): string {
  const services = station.services
    .map(
      (s) =>
        `<span class="badge" style="--badge:${SERVICE_COLORS[s]}">${SERVICE_ICONS[s]} ${SERVICE_LABELS[s]}</span>`,
    )
    .join('')
  const season = stationSeason(station)
  const seasonBadge =
    season === 'year-round'
      ? '<span class="badge season">Öppet året runt</span>'
      : season === 'seasonal'
        ? '<span class="badge season seasonal">Säsongsöppet</span>'
        : ''
  const rows: string[] = []
  // Var ligger platsen + avstånd på samma rad ("Växjö · 4,2 km").
  // Adress om den finns, annars fylls orten i när popupen öppnas.
  let distSuffix = ''
  if (userLoc) {
    const km = distanceKm(userLoc, station)
    const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
    distSuffix = ` · ${dist}`
  }
  if (station.address) {
    rows.push(`<p class="loc">📍 ${esc(station.address)}${distSuffix}</p>`)
  } else {
    rows.push(
      `<p class="loc"><span class="loc-slot" data-lat="${station.lat}" data-lon="${station.lon}">📍 Hämtar plats …</span>${distSuffix}</p>`,
    )
  }
  // Avgift och öppettider som två tydliga rutor (à la platskort).
  const cards: string[] = []
  if (station.fee) {
    // "Gratis" på en plats som även har gasol avser tömning/vatten – gasol
    // är alltid ett köp. Förtydliga så ingen läser det som gratis gasol.
    const gratisMedGasol =
      /gratis|free|ingår|kostnadsfri|utan avgift/i.test(station.fee) &&
      station.services.includes('gasol')
    const feeText = gratisMedGasol ? `${station.fee} (gäller ej gasolköp)` : station.fee
    cards.push(
      `<div class="info-card"><span class="info-label">Avgift</span><span class="info-value">${esc(feeText)}</span></div>`,
    )
  }
  if (station.openingHours) {
    // Öppet-nu-status fylls i asynkront när popupen öppnas (se popupopen nedan)
    cards.push(
      `<div class="info-card"><span class="info-label">Öppettider</span><span class="info-value">${esc(station.openingHours)} <span class="open-now-slot" data-oh="${escapeAttr(station.openingHours)}"></span></span></div>`,
    )
  }
  if (cards.length) rows.push(`<div class="info-cards">${cards.join('')}</div>`)
  if (station.description) rows.push(`<p class="desc">${esc(station.description)}</p>`)
  rows.push(facilityList(station))
  if (station.payment?.length)
    rows.push(`<p class="meta"><strong>Betalning</strong>${esc(station.payment.join(', '))}</p>`)
  if (station.capacity)
    rows.push(`<p class="meta"><strong>Platser</strong>${esc(station.capacity)}</p>`)
  if (station.maxstay)
    rows.push(`<p class="meta"><strong>Max övernattning</strong>${esc(station.maxstay)}</p>`)
  if (station.operator)
    rows.push(`<p class="meta"><strong>Drivs av</strong>${esc(station.operator)}</p>`)
  const contact: string[] = []
  const phone = station.phone ? safeUrl(`tel:${station.phone.replace(/[^\d+]/g, '')}`) : null
  if (phone) contact.push(`<a href="${escapeAttr(phone)}">📞 Ring</a>`)
  const website = safeUrl(station.website)
  if (website)
    contact.push(
      `<a href="${escapeAttr(website)}" target="_blank" rel="noopener">🌐 Webbplats</a>`,
    )
  if (contact.length) rows.push(`<p class="contact">${contact.join(' · ')}</p>`)
  // Magra platser (bara koordinat + kategori) märks upp så användaren vet.
  const sparse =
    !station.facilities?.length &&
    !station.fee &&
    !station.openingHours &&
    !website &&
    !phone &&
    !station.operator &&
    !station.capacity &&
    !station.description
  if (sparse) {
    rows.push(
      `<p class="sparse">ℹ Begränsad information – hjälp gärna till att komplettera via “Rapportera fel”.</p>`,
    )
  }
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`
  const coords = `${station.lat.toFixed(5)}, ${station.lon.toFixed(5)}`
  // OSM-länken togs bort ur popupen – den förvirrade mer än den hjälpte.
  // Källtexten ("Källa: OpenStreetMap") finns kvar längst ner.
  const links =
    `<div class="links"><a class="primary" href="${nav}" target="_blank" rel="noopener">Vägbeskrivning →</a>` +
    `<button type="button" class="share-btn" data-lat="${station.lat}" data-lon="${station.lon}" data-name="${escapeAttr(station.name)}">Dela</button>` +
    '</div>'
  const verifyBtn = canVerify
    ? selfVerifiedRecently(station.id)
      ? `<button type="button" class="verify-btn done" disabled>✓ Du har bekräftat</button>`
      : `<button type="button" class="verify-btn" data-verify-id="${escapeAttr(station.id)}">✓ Stämmer fortfarande</button>`
    : ''
  const rateBtn = canRate
    ? `<button type="button" class="rate-btn" data-rate-id="${escapeAttr(station.id)}" data-rate-name="${escapeAttr(station.name)}">★ Betygsätt</button>`
    : ''
  const actions =
    `<div class="pop-actions">` +
    verifyBtn +
    rateBtn +
    `<button type="button" class="fav-btn${isFav ? ' active' : ''}" data-fav-id="${escapeAttr(station.id)}" aria-pressed="${isFav}">${isFav ? '★ Sparad' : '☆ Spara'}</button>` +
    `<button type="button" class="copy-btn" data-coords="${escapeAttr(coords)}">⧉ Kopiera koordinater</button>` +
    `</div>`
  const sourceNote =
    station.source === 'osm'
      ? 'Källa: OpenStreetMap'
      : station.source === 'trafikverket'
        ? 'Källa: Trafikverket'
        : station.source === 'kommun'
          ? 'Källa: kommunens webbplats'
          : station.source === 'community'
            ? 'Inskickad av en användare'
            : 'Källa: eget register'
  const isMine = station.id.startsWith(MY_PLACE_PREFIX)
  const report =
    canReport && !isMine
      ? `<button type="button" class="report-btn" data-station-id="${escapeAttr(station.id)}" data-station-name="${escapeAttr(station.name)}">⚠ Rapportera fel</button>`
      : ''
  const del = isMine
    ? `<button type="button" class="delete-btn" data-del-id="${escapeAttr(station.id)}">🗑 Ta bort plats</button>`
    : ''
  const sourceLine = isMine ? 'Din egen plats' : sourceNote
  const verifiedLine = verifiedAt
    ? `<p class="verified-line">✓ Bekräftad av användare ${fmtVerified(verifiedAt)}</p>`
    : ''
  const avg = review && review.count > 0 ? review.sum / review.count : 0
  const ratingLine =
    review && review.count > 0
      ? `<p class="rating-line"><span class="stars">${starRow(avg)}</span> ${avg.toFixed(1)} · ${review.count} ${review.count === 1 ? 'omdöme' : 'omdömen'}</p>`
      : ''
  const commentBlock =
    review && review.comments.length
      ? `<div class="pop-comments">${review.comments
          .map(
            (c) =>
              `<p class="pop-comment">“${esc(c.comment)}” <span class="pc-meta">★ ${c.rating}</span></p>`,
          )
          .join('')}</div>`
      : ''
  const accent = SERVICE_COLORS[station.services[0]] ?? 'var(--green-700)'
  // Foto av platsen (om källan har ett) – laddas lätt och tas bort om URL:en är död.
  const photo =
    station.image && /^https:\/\//i.test(station.image)
      ? `<img class="popup-photo" src="${escapeAttr(station.image)}" alt="" loading="lazy" onerror="this.remove()">`
      : ''
  return `<div class="popup" style="--accent:${accent}">${photo}<h3>${esc(station.name)}</h3><div class="badges">${services}${seasonBadge}</div>${ratingLine}${verifiedLine}${rows.join('')}${commentBlock}${links}${actions}<p class="source">${sourceLine}</p>${report}${del}</div>`
}

function readSavedView(): { lat: number; lon: number; zoom: number } | null {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (typeof v.lat === 'number' && typeof v.lon === 'number' && typeof v.zoom === 'number') {
      return v
    }
  } catch {
    /* ignorera trasigt värde */
  }
  return null
}

const SHARE_BASE = 'https://perrafree.github.io/PJfrance/'

function sharePlace(name: string, lat: number, lon: number) {
  // På webben pekar länken på appens URL; i native-appen på den publika webben.
  const base = location.protocol.startsWith('http')
    ? `${location.origin}${location.pathname}`
    : SHARE_BASE
  const url = `${base}?at=${lat.toFixed(5)},${lon.toFixed(5)},16`
  void nativeShare(name, url)
}

export default function MapView({
  stations,
  activeFilters,
  flyTo,
  userLoc,
  focus,
  onBoundsChange,
  canReport,
  onReport,
  favoriteIds,
  onToggleFavorite,
  onDeleteMyPlace,
  verifications,
  onVerify,
  canVerify,
  reviews,
  onRate,
  canRate,
  onStationPopupOpen,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const markersById = useRef<Map<string, L.Marker>>(new Map())
  const onReportRef = useRef(onReport)
  onReportRef.current = onReport
  const onStationPopupOpenRef = useRef(onStationPopupOpen)
  onStationPopupOpenRef.current = onStationPopupOpen
  const onToggleFavoriteRef = useRef(onToggleFavorite)
  onToggleFavoriteRef.current = onToggleFavorite
  const onDeleteMyPlaceRef = useRef(onDeleteMyPlace)
  onDeleteMyPlaceRef.current = onDeleteMyPlace
  const verificationsRef = useRef(verifications)
  verificationsRef.current = verifications
  const onVerifyRef = useRef(onVerify)
  onVerifyRef.current = onVerify
  const canVerifyRef = useRef(canVerify)
  canVerifyRef.current = canVerify
  const reviewsRef = useRef(reviews)
  reviewsRef.current = reviews
  const onRateRef = useRef(onRate)
  onRateRef.current = onRate
  const canRateRef = useRef(canRate)
  canRateRef.current = canRate
  const favoritesRef = useRef(favoriteIds)
  favoritesRef.current = favoriteIds
  const stationsRef = useRef(stations)
  stationsRef.current = stations
  const activeFiltersRef = useRef(activeFilters)
  activeFiltersRef.current = activeFilters
  const canReportRef = useRef(canReport)
  canReportRef.current = canReport
  const userLocRef = useRef(userLoc)
  userLocRef.current = userLoc
  const pendingFocusRef = useRef<{ id: string; expires: number } | null>(null)
  const focusingRef = useRef(false)
  const popupOpenRef = useRef(false)
  const rebuildPendingRef = useRef(false)

  /**
   * Auto-panoreringsmarginaler som håller popupen fri från panelen – topp-
   * panel på desktop, bottensheet på mobil. Beräknas färskt varje gång en
   * popup ska öppnas (panelen kan ha fällts ut/ihop sedan markören byggdes).
   */
  const computePopupPadding = () => {
    const panelRect = document.querySelector('.panel')?.getBoundingClientRect()
    const vh = window.innerHeight || 800
    let padTopLeft = L.point(16, 260)
    let padBottomRight = L.point(16, 116)
    if (panelRect) {
      if (panelRect.top > vh / 2) {
        // Bottensheet: håll popupen ovanför arket.
        padTopLeft = L.point(16, 64)
        padBottomRight = L.point(16, Math.round(vh - panelRect.top) + 16)
      } else {
        padTopLeft = L.point(16, Math.round(panelRect.bottom) + 14)
      }
    }
    return { padTopLeft, padBottomRight }
  }
  const refreshPopupPadding = (marker: L.Marker) => {
    const popup = marker.getPopup()
    if (!popup) return
    const { padTopLeft, padBottomRight } = computePopupPadding()
    popup.options.autoPanPaddingTopLeft = padTopLeft
    popup.options.autoPanPaddingBottomRight = padBottomRight
  }

  /**
   * Bygger bara markörer i (och nära) den synliga kartvyn, med ett tak – i
   * stället för hela Sveriges ~2800 platser. Det är skillnaden mellan ~1,3 s
   * och ~30 ms markörbygge på mobil. Öppnar även ett väntande fokus.
   */
  const rebuildMarkers = useCallback(() => {
    const map = mapRef.current
    const cluster = clusterRef.current
    if (!map || !cluster) return
    // Riv inte markörerna mitt under en pågående fokus-zoom (skulle göra
    // markörreferensen ogiltig så att popupen inte öppnas). Kom ihåg att en
    // ombyggnad behövs så att vyn inte blir stående med gamla markörer.
    if (focusingRef.current) {
      rebuildPendingRef.current = true
      return
    }
    // Riv aldrig en ÖPPEN popup – t.ex. när kartans auto-panorering efter
    // popup-öppning triggar moveend. Ombyggnaden körs när popupen stängts.
    if (popupOpenRef.current) {
      rebuildPendingRef.current = true
      return
    }
    cluster.clearLayers()
    markersById.current.clear()
    const active = activeFiltersRef.current
    if (active.size === 0) return
    const bounds = map.getBounds().pad(0.5)
    const center = map.getCenter()
    let list = stationsRef.current.filter(
      (s) => bounds.contains([s.lat, s.lon]) && s.services.some((sv) => active.has(sv)),
    )
    const CAP = 600
    if (list.length > CAP) {
      list = list
        .map((s) => ({ s, d: (s.lat - center.lat) ** 2 + (s.lon - center.lng) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, CAP)
        .map((x) => x.s)
    }
    const { padTopLeft, padBottomRight } = computePopupPadding()
    const canReportNow = canReportRef.current
    const userLocNow = userLocRef.current
    const markers = list.map((station) => {
      const primary = station.services.find((s) => active.has(s)) ?? station.services[0]
      const marker = L.marker([station.lat, station.lon], {
        icon: pinIcon(SERVICE_COLORS[primary], SERVICE_ICONS[primary]),
      })
      // Registreras FÖRE bindPopup så att marginalerna hinner uppdateras
      // innan Leaflet öppnar popupen på klicket.
      marker.on('click', () => refreshPopupPadding(marker))
      marker.bindPopup(
        () =>
          popupHtml(
            station,
            canReportNow,
            userLocNow,
            favoritesRef.current.has(station.id),
            verificationsRef.current.get(station.id),
            canVerifyRef.current,
            reviewsRef.current.get(station.id),
            canRateRef.current,
          ),
        {
          maxWidth: 300,
          className: 'station-popup',
          autoPanPaddingTopLeft: padTopLeft,
          autoPanPaddingBottomRight: padBottomRight,
        },
      )
      markersById.current.set(station.id, marker)
      return marker
    })
    cluster.addLayers(markers)
    if (pendingFocusRef.current) {
      // Ett fokus som aldrig hittar sin markör (t.ex. filtret stängdes av
      // under flygningen) får inte ligga kvar och kapa kartan senare.
      if (performance.now() > pendingFocusRef.current.expires) {
        pendingFocusRef.current = null
      } else {
        const m = markersById.current.get(pendingFocusRef.current.id)
        if (m) {
          pendingFocusRef.current = null
          refreshPopupPadding(m)
          // Spärra ombyggnad tills fokus-zoomen lagt sig, öppna sedan popupen
          // och kör ev. uppskjuten ombyggnad när popupen ändå är stängd.
          focusingRef.current = true
          window.setTimeout(() => {
            focusingRef.current = false
            if (rebuildPendingRef.current && !popupOpenRef.current) {
              rebuildPendingRef.current = false
              rebuildMarkers()
            }
          }, 1500)
          cluster.zoomToShowLayer(m, () => m.openPopup())
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const saved = readSavedView()
    // closePopupOnClick: false – popupen stängs bara med krysset (eller när en
    // annan plats öppnas), inte av ett råkat kartklick.
    const map = L.map(containerRef.current, { zoomControl: false, closePopupOnClick: false }).setView(
      saved ? [saved.lat, saved.lon] : [62.0, 15.0],
      saved ? saved.zoom : 5,
    )
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const osmAttr =
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsgivare'
    // Ljus, avskalad baskarta – gör de färgade markörerna framträdande
    const ljus = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { attribution: `${osmAttr}, &copy; <a href="https://carto.com/attributions">CARTO</a>`, maxZoom: 20 },
    )
    const standard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: osmAttr,
      maxZoom: 19,
    })
    const satellit = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri, Maxar, Earthstar Geographics', maxZoom: 19 },
    )
    const terrang = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenTopoMap (CC-BY-SA), &copy; OpenStreetMap-bidragsgivare',
      maxZoom: 17,
    })
    ljus.addTo(map)
    // Nere till vänster – fri yta som aldrig hamnar bakom panelen (uppe) eller
    // krockar med zoom/lokaliseringsknapparna (nere till höger).
    L.control
      .layers(
        { Ljus: ljus, Detaljerad: standard, Satellit: satellit, Terräng: terrang },
        {},
        { position: 'bottomleft', collapsed: true },
      )
      .addTo(map)

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      chunkedLoading: true,
    })
    map.addLayer(cluster)
    clusterRef.current = cluster
    mapRef.current = map

    const notify = () => {
      onBoundsChange(map.getBounds(), map.getZoom())
      rebuildMarkers() // rendera om markörer för den nya vyn
      const c = map.getCenter()
      try {
        localStorage.setItem(
          VIEW_KEY,
          JSON.stringify({ lat: c.lat, lon: c.lng, zoom: map.getZoom() }),
        )
      } catch {
        /* privat läge m.m. */
      }
    }
    map.on('moveend', notify)
    notify()

    // Klick i popup (event-delegering): rapportera fel + dela
    const onPopupClick = (e: Event) => {
      const target = e.target as HTMLElement
      const report = target.closest('.report-btn') as HTMLElement | null
      if (report) {
        const id = report.dataset.stationId
        const name = report.dataset.stationName
        if (id && name) {
          map.closePopup()
          onReportRef.current({ id, name })
        }
        return
      }
      const del = target.closest('.delete-btn') as HTMLElement | null
      if (del) {
        const id = del.dataset.delId
        if (id) {
          map.closePopup()
          onDeleteMyPlaceRef.current(id)
        }
        return
      }
      const share = target.closest('.share-btn') as HTMLElement | null
      if (share) {
        const { lat, lon, name } = share.dataset
        if (lat && lon && name) sharePlace(name, parseFloat(lat), parseFloat(lon))
        return
      }
      const fav = target.closest('.fav-btn') as HTMLButtonElement | null
      if (fav) {
        const id = fav.dataset.favId
        if (id) {
          const nowFav = !fav.classList.contains('active')
          onToggleFavoriteRef.current(id)
          fav.classList.toggle('active', nowFav)
          fav.setAttribute('aria-pressed', String(nowFav))
          fav.textContent = nowFav ? '★ Sparad' : '☆ Spara'
        }
        return
      }
      const rate = target.closest('.rate-btn') as HTMLElement | null
      if (rate) {
        const id = rate.dataset.rateId
        const name = rate.dataset.rateName
        if (id && name) {
          map.closePopup()
          onRateRef.current({ id, name })
        }
        return
      }
      const verify = target.closest('.verify-btn') as HTMLButtonElement | null
      if (verify && !verify.disabled) {
        const id = verify.dataset.verifyId
        if (id) {
          markSelfVerified(id)
          onVerifyRef.current(id)
          verify.disabled = true
          verify.classList.add('done')
          verify.textContent = '✓ Tack!'
          // Uppdatera/injicera bekräftelseraden i den öppna popupen
          const pop = verify.closest('.popup')
          const line = pop?.querySelector('.verified-line')
          if (line) line.textContent = '✓ Bekräftad av användare idag'
          else
            pop
              ?.querySelector('.badges')
              ?.insertAdjacentHTML(
                'afterend',
                '<p class="verified-line">✓ Bekräftad av användare idag</p>',
              )
        }
        return
      }
      const copy = target.closest('.copy-btn') as HTMLButtonElement | null
      if (copy) {
        const coords = copy.dataset.coords ?? ''
        const confirmCopied = () => {
          copy.textContent = '✓ Kopierat!'
          window.setTimeout(() => {
            copy.textContent = '⧉ Kopiera koordinater'
          }, 1600)
        }
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(coords).then(confirmCopied, () => {
            window.prompt('Kopiera koordinater:', coords)
          })
        } else {
          // Osäker kontext (http) eller äldre webbläsare – visa för manuell kopiering.
          window.prompt('Kopiera koordinater:', coords)
        }
      }
    }
    const container = map.getContainer()
    container.addEventListener('click', onPopupClick)

    // Popupen ska stanna tills användaren själv stänger den: flagga öppen
    // popup så att markör-ombyggnad väntar, och kör ombyggnaden vid stängning.
    map.on('popupclose', () => {
      popupOpenRef.current = false
      if (rebuildPendingRef.current) {
        rebuildPendingRef.current = false
        window.setTimeout(() => rebuildMarkers(), 80)
      }
    })

    // Fyll i öppet-nu och ortsnamn asynkront när en popup öppnas
    map.on('popupopen', (e) => {
      const popup = (e as L.PopupEvent).popup
      // Bara plats-popuper ska pausa markörbygget – "Din position"-bubblan
      // får inte frysa kartan när man panorerar vidare.
      if (popup.options.className === 'station-popup') {
        popupOpenRef.current = true
        onStationPopupOpenRef.current?.()
      }
      const el = popup.getElement()
      if (!el) return

      const ohSlot = el.querySelector<HTMLElement>('.open-now-slot')
      const oh = ohSlot?.dataset.oh
      if (ohSlot && oh) {
        void openNow(oh).then((state) => {
          if (state === 'open') ohSlot.outerHTML = '<span class="open-now open">Öppet nu</span>'
          else if (state === 'closed')
            ohSlot.outerHTML = '<span class="open-now closed">Stängt nu</span>'
        })
      }

      const locSlot = el.querySelector<HTMLElement>('.loc-slot')
      if (locSlot && locSlot.dataset.lat && locSlot.dataset.lon) {
        void reverseGeocode(
          parseFloat(locSlot.dataset.lat),
          parseFloat(locSlot.dataset.lon),
        ).then((place) => {
          locSlot.textContent = place ? `📍 ${place}` : '📍 Plats på kartan'
        })
      }
    })

    return () => {
      container.removeEventListener('click', onPopupClick)
      map.remove()
      mapRef.current = null
      clusterRef.current = null
      userMarkerRef.current = null
    }
    // onBoundsChange är stabil via useCallback i App
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (flyTo && mapRef.current) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (reduce) mapRef.current.setView([flyTo.lat, flyTo.lon], flyTo.zoom ?? 12)
      else mapRef.current.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom ?? 12)
    }
  }, [flyTo])

  // "Du är här"-markör
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }
    if (userLoc) {
      userMarkerRef.current = L.circleMarker([userLoc.lat, userLoc.lon], {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#1976d2',
        fillOpacity: 1,
      })
        .bindPopup('Din position', { className: 'user-popup' })
        .addTo(map)
    }
  }, [userLoc])

  // Byter användaren filter medan en popup är öppen stängs den – annars kan
  // kartan visa markörer som inte längre matchar filtren (ombyggnaden skjuts
  // ju upp så länge en popup är öppen). Ett filterbyte är ett aktivt val, så
  // att popupen stängs är väntat – till skillnad från panorering/datahämtning
  // som aldrig ska stänga den.
  const prevFiltersRef = useRef(activeFilters)
  useEffect(() => {
    if (prevFiltersRef.current !== activeFilters) {
      prevFiltersRef.current = activeFilters
      if (popupOpenRef.current) mapRef.current?.closePopup()
    }
  }, [activeFilters])

  // Rendera om markörer när data, filter, favoriter eller position ändras.
  useEffect(() => {
    rebuildMarkers()
  }, [stations, activeFilters, canReport, userLoc, rebuildMarkers])

  // Fokusera en plats (från närmaste-listan/sök): markören kanske inte finns
  // förrän kartan flugit dit och byggt om – då öppnar rebuildMarkers fokuset.
  useEffect(() => {
    if (!focus) return
    // Stäng ev. öppen popup så ombyggnaden inte skjuts upp av den.
    popupOpenRef.current = false
    mapRef.current?.closePopup()
    // Fokus gäller i högst 10 s – hittas markören inte inom den tiden (t.ex.
    // för att filtret ändrats) glöms det i stället för att slå till senare.
    pendingFocusRef.current = { id: focus.id, expires: performance.now() + 10_000 }
    rebuildMarkers()
  }, [focus, rebuildMarkers])

  return <div ref={containerRef} className="map" />
}

export { MIN_FETCH_ZOOM }
