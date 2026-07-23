import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import type { Amenities, ServiceType, Station } from '../types'
import { SERVICE_COLORS, SERVICE_LABELS } from '../types'
import { openNow } from '../lib/openingHours'
import { sharePlace as nativeShare } from '../lib/native'
import { amenityChip } from '../lib/icons'

const MIN_FETCH_ZOOM = 7
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

const AMENITY_KEYS: (keyof Amenities)[] = ['el', 'dusch', 'wc', 'wifi', 'hund']

function amenityChips(amenities: Amenities | undefined): string {
  if (!amenities) return ''
  const chips = AMENITY_KEYS.filter((k) => amenities[k])
    .map((k) => amenityChip(k))
    .join('')
  return chips ? `<div class="amenities">${chips}</div>` : ''
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

function pinIcon(color: string): L.DivIcon {
  const svg = `
    <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 1C8.7 1 2 7.7 2 16c0 10.5 12.2 24.2 14.1 26.3a1.2 1.2 0 0 0 1.8 0C19.8 40.2 32 26.5 32 16 32 7.7 25.3 1 17 1z"
            fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="17" cy="16" r="6" fill="#ffffff"/>
    </svg>`
  return L.divIcon({
    className: 'pin',
    html: svg,
    iconSize: [34, 44],
    iconAnchor: [17, 43],
    popupAnchor: [0, -38],
  })
}

function popupHtml(
  station: Station,
  canReport: boolean,
  userLoc: { lat: number; lon: number } | null,
): string {
  const services = station.services
    .map(
      (s) =>
        `<span class="badge" style="--badge:${SERVICE_COLORS[s]}">${SERVICE_LABELS[s]}</span>`,
    )
    .join('')
  const rows: string[] = []
  if (userLoc) {
    const km = distanceKm(userLoc, station)
    const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
    rows.push(`<p class="dist">📍 ${dist} härifrån (fågelvägen)</p>`)
  }
  if (station.description) rows.push(`<p class="desc">${esc(station.description)}</p>`)
  rows.push(amenityChips(station.amenities))
  if (station.fee) rows.push(`<p class="meta"><strong>Avgift</strong>${esc(station.fee)}</p>`)
  if (station.capacity)
    rows.push(`<p class="meta"><strong>Platser</strong>${esc(station.capacity)}</p>`)
  if (station.openingHours) {
    // Öppet-nu-status fylls i asynkront när popupen öppnas (se popupopen nedan)
    rows.push(
      `<p class="meta"><strong>Öppettider</strong>${esc(station.openingHours)} <span class="open-now-slot" data-oh="${escapeAttr(station.openingHours)}"></span></p>`,
    )
  }
  if (station.operator)
    rows.push(`<p class="meta"><strong>Drivs av</strong>${esc(station.operator)}</p>`)
  const contact: string[] = []
  if (station.phone)
    contact.push(`<a href="tel:${escapeAttr(station.phone)}">📞 Ring</a>`)
  if (station.website)
    contact.push(
      `<a href="${escapeAttr(station.website)}" target="_blank" rel="noopener">🌐 Webbplats</a>`,
    )
  if (contact.length) rows.push(`<p class="contact">${contact.join(' · ')}</p>`)
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`
  const links =
    `<div class="links"><a class="primary" href="${nav}" target="_blank" rel="noopener">Vägbeskrivning →</a>` +
    `<button type="button" class="share-btn" data-lat="${station.lat}" data-lon="${station.lon}" data-name="${escapeAttr(station.name)}">Dela</button>` +
    (station.osmUrl
      ? `<a href="${station.osmUrl}" target="_blank" rel="noopener">OpenStreetMap</a>`
      : '') +
    '</div>'
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
  const report = canReport
    ? `<button type="button" class="report-btn" data-station-id="${escapeAttr(station.id)}" data-station-name="${escapeAttr(station.name)}">⚠ Rapportera fel</button>`
    : ''
  const accent = SERVICE_COLORS[station.services[0]] ?? 'var(--green-700)'
  return `<div class="popup" style="--accent:${accent}"><h3>${esc(station.name)}</h3><div class="badges">${services}</div>${rows.join('')}${links}<p class="source">${sourceNote}</p>${report}</div>`
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
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const markersById = useRef<Map<string, L.Marker>>(new Map())
  const onReportRef = useRef(onReport)
  onReportRef.current = onReport

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const saved = readSavedView()
    const map = L.map(containerRef.current, { zoomControl: false }).setView(
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
    L.control
      .layers(
        { Ljus: ljus, Detaljerad: standard, Satellit: satellit, Terräng: terrang },
        {},
        { position: 'topright', collapsed: true },
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
      const share = target.closest('.share-btn') as HTMLElement | null
      if (share) {
        const { lat, lon, name } = share.dataset
        if (lat && lon && name) sharePlace(name, parseFloat(lat), parseFloat(lon))
      }
    }
    const container = map.getContainer()
    container.addEventListener('click', onPopupClick)

    // Fyll i "öppet nu"-status asynkront när en popup öppnas (lat-laddar opening_hours)
    map.on('popupopen', (e) => {
      const el = (e as L.PopupEvent).popup.getElement()
      const slot = el?.querySelector<HTMLElement>('.open-now-slot')
      const oh = slot?.dataset.oh
      if (!slot || !oh) return
      void openNow(oh).then((state) => {
        if (state === 'open') slot.outerHTML = '<span class="open-now open">Öppet nu</span>'
        else if (state === 'closed')
          slot.outerHTML = '<span class="open-now closed">Stängt nu</span>'
      })
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
        .bindPopup('Din position')
        .addTo(map)
    }
  }, [userLoc])

  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return
    cluster.clearLayers()
    markersById.current.clear()
    const markers: L.Marker[] = []
    for (const station of stations) {
      if (!station.services.some((s) => activeFilters.has(s))) continue
      const primary = station.services.find((s) => activeFilters.has(s)) ?? station.services[0]
      const marker = L.marker([station.lat, station.lon], {
        icon: pinIcon(SERVICE_COLORS[primary]),
      }).bindPopup(() => popupHtml(station, canReport, userLoc), {
        maxWidth: 300,
        className: 'station-popup',
      })
      markersById.current.set(station.id, marker)
      markers.push(marker)
    }
    cluster.addLayers(markers)
  }, [stations, activeFilters, canReport, userLoc])

  // Fokusera en plats från närmaste-listan: zooma in ur klustret och öppna popupen
  useEffect(() => {
    const cluster = clusterRef.current
    if (!focus || !cluster) return
    const marker = markersById.current.get(focus.id)
    if (!marker) return
    cluster.zoomToShowLayer(marker, () => marker.openPopup())
  }, [focus])

  return <div ref={containerRef} className="map" />
}

export { MIN_FETCH_ZOOM }
