import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ServiceType, Station } from '../types'
import { SERVICE_COLORS, SERVICE_LABELS } from '../types'

const MIN_FETCH_ZOOM = 8

interface Props {
  stations: Station[]
  activeFilters: Set<ServiceType>
  flyTo: { lat: number; lon: number; zoom?: number } | null
  onBoundsChange: (bounds: L.LatLngBounds, zoom: number) => void
}

function popupHtml(station: Station): string {
  const services = station.services
    .map(
      (s) =>
        `<span class="badge" style="background:${SERVICE_COLORS[s]}">${SERVICE_LABELS[s]}</span>`,
    )
    .join(' ')
  const rows: string[] = []
  if (station.description) rows.push(`<p>${station.description}</p>`)
  if (station.fee) rows.push(`<p><strong>Avgift:</strong> ${station.fee}</p>`)
  if (station.openingHours)
    rows.push(`<p><strong>Öppettider:</strong> ${station.openingHours}</p>`)
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`
  rows.push(
    `<p><a href="${nav}" target="_blank" rel="noopener">Vägbeskrivning</a>` +
      (station.osmUrl
        ? ` · <a href="${station.osmUrl}" target="_blank" rel="noopener">OpenStreetMap</a>`
        : '') +
      '</p>',
  )
  const sourceNote =
    station.source === 'osm' ? 'Källa: OpenStreetMap' : 'Källa: eget register'
  return `<div class="popup"><h3>${station.name}</h3><div class="badges">${services}</div>${rows.join('')}<p class="source">${sourceNote}</p></div>`
}

export default function MapView({ stations, activeFilters, flyTo, onBoundsChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

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

    return () => {
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
      L.circleMarker([station.lat, station.lon], {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: SERVICE_COLORS[primary],
        fillOpacity: 0.95,
      })
        .bindPopup(popupHtml(station), { maxWidth: 280 })
        .addTo(layer)
    }
  }, [stations, activeFilters])

  return <div ref={containerRef} className="map" />
}

export { MIN_FETCH_ZOOM }
