import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import type { ServiceType, Station } from '../types'
import { SERVICE_COLORS, SERVICE_LABELS } from '../types'

const MIN_FETCH_ZOOM = 7
const VIEW_KEY = 'tomningskartan.view'

interface Props {
  stations: Station[]
  activeFilters: Set<ServiceType>
  flyTo: { lat: number; lon: number; zoom?: number } | null
  userLoc: { lat: number; lon: number } | null
  onBoundsChange: (bounds: L.LatLngBounds, zoom: number) => void
  canReport: boolean
  onReport: (station: { id: string; name: string }) => void
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
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
  if (station.description) rows.push(`<p class="desc">${station.description}</p>`)
  if (station.fee) rows.push(`<p class="meta"><strong>Avgift</strong>${station.fee}</p>`)
  if (station.openingHours)
    rows.push(`<p class="meta"><strong>Öppettider</strong>${station.openingHours}</p>`)
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`
  const links =
    `<div class="links"><a class="primary" href="${nav}" target="_blank" rel="noopener">Vägbeskrivning →</a>` +
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
  return `<div class="popup"><h3>${station.name}</h3><div class="badges">${services}</div>${rows.join('')}${links}<p class="source">${sourceNote}</p>${report}</div>`
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

export default function MapView({
  stations,
  activeFilters,
  flyTo,
  userLoc,
  onBoundsChange,
  canReport,
  onReport,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
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
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsgivare',
      maxZoom: 19,
    }).addTo(map)

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

    // Klick på "Rapportera fel" i en popup (event-delegering)
    const onPopupClick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.report-btn') as HTMLElement | null
      if (!btn) return
      const id = btn.dataset.stationId
      const name = btn.dataset.stationName
      if (id && name) {
        map.closePopup()
        onReportRef.current({ id, name })
      }
    }
    const container = map.getContainer()
    container.addEventListener('click', onPopupClick)

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
      mapRef.current.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom ?? 12)
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
    const markers: L.Marker[] = []
    for (const station of stations) {
      if (!station.services.some((s) => activeFilters.has(s))) continue
      const primary = station.services.find((s) => activeFilters.has(s)) ?? station.services[0]
      markers.push(
        L.marker([station.lat, station.lon], { icon: pinIcon(SERVICE_COLORS[primary]) }).bindPopup(
          popupHtml(station, canReport, userLoc),
          { maxWidth: 300, className: 'station-popup' },
        ),
      )
    }
    cluster.addLayers(markers)
  }, [stations, activeFilters, canReport, userLoc])

  return <div ref={containerRef} className="map" />
}

export { MIN_FETCH_ZOOM }
