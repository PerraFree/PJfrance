import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ServiceType, Station } from '../types'
import { SERVICE_COLORS, SERVICE_LABELS } from '../types'

const MIN_FETCH_ZOOM = 7

interface Props {
  stations: Station[]
  activeFilters: Set<ServiceType>
  flyTo: { lat: number; lon: number; zoom?: number } | null
  onBoundsChange: (bounds: L.LatLngBounds, zoom: number) => void
  canReport: boolean
  onReport: (station: { id: string; name: string }) => void
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
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

function popupHtml(station: Station, canReport: boolean): string {
  const services = station.services
    .map(
      (s) =>
        `<span class="badge" style="--badge:${SERVICE_COLORS[s]}">${SERVICE_LABELS[s]}</span>`,
    )
    .join('')
  const rows: string[] = []
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

export default function MapView({
  stations,
  activeFilters,
  flyTo,
  onBoundsChange,
  canReport,
  onReport,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const onReportRef = useRef(onReport)
  onReportRef.current = onReport

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: false }).setView([62.0, 15.0], 5)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsgivare',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const notify = () => onBoundsChange(map.getBounds(), map.getZoom())
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
      layerRef.current = null
    }
    // onBoundsChange är stabil via useCallback i App
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom ?? 12)
    }
  }, [flyTo])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()
    for (const station of stations) {
      if (!station.services.some((s) => activeFilters.has(s))) continue
      const primary = station.services.find((s) => activeFilters.has(s)) ?? station.services[0]
      L.marker([station.lat, station.lon], { icon: pinIcon(SERVICE_COLORS[primary]) })
        .bindPopup(popupHtml(station, canReport), { maxWidth: 300, className: 'station-popup' })
        .addTo(layer)
    }
  }, [stations, activeFilters, canReport])

  return <div ref={containerRef} className="map" />
}

export { MIN_FETCH_ZOOM }
