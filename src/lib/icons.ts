import type { ServiceType } from '../types'
import { FACILITY_LABELS } from '../types'

/**
 * Rena linjeikoner (currentColor) i stället för emoji – ger ett professionellt,
 * konsekvent formspråk. Returnerar SVG-markup som används både i React-chips
 * (dangerouslySetInnerHTML) och i kartans popup-strängar.
 */

function svg(paths: string, extra = ''): string {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}${extra}</svg>`
}

const SERVICE_ICON: Record<ServiceType, string> = {
  // Gråvatten – droppe (avlopp)
  gravatten: svg('<path d="M12 3.5S6.5 9.8 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.8 12 3.5 12 3.5Z"/>'),
  // Latrin/toalett – toalett ovanifrån (spolkasse + sits med öppning)
  latrin: svg(
    '<rect x="8" y="3.3" width="8" height="3.6" rx="1"/><path d="M12 7c-3.6 0-5.6 2.7-5.6 6.6S8.4 20.2 12 20.2s5.6-2.7 5.6-6.6S15.6 7 12 7Z"/><ellipse cx="12" cy="13.2" rx="2.3" ry="3.3"/>',
  ),
  // Färskvatten – kran med droppe
  vatten: svg(
    '<path d="M4 8h7"/><path d="M11 8V5.5a1.5 1.5 0 0 1 1.5-1.5H19"/><path d="M6 8v1.5a3 3 0 0 0 6 0V8"/><path d="M9 12.5v2"/>',
    '<path d="M9 16.5c-1 1-1 2.2 0 3 1-.8 1-2 0-3Z" fill="currentColor" stroke="none"/>',
  ),
  // Ställplats – husbil
  stallplats: svg(
    '<path d="M3 15V9a2 2 0 0 1 2-2h10l4 4v4"/><path d="M3 15h1.5M9 15h5.5M18.5 15H21"/><path d="M13 7v3.2h3"/>',
    '<circle cx="7" cy="15.4" r="1.7"/><circle cx="17" cy="15.4" r="1.7"/>',
  ),
  // Camping – tält
  camping: svg(
    '<path d="M3 19h18"/><path d="M4.5 19 12 6.5 19.5 19"/><path d="M12 6.5V19"/><path d="M12 19 8 13.2"/>',
  ),
  // Gasol/LPG – låga
  gasol: svg(
    '<path d="M12 3c.6 2.6 2.2 4.6 3.7 6C17.2 10.5 18 12 18 14a6 6 0 1 1-12 0c0-1 .4-2 1-2.6A2.4 2.4 0 0 0 9.5 13 2.5 2.5 0 0 0 12 15.5 2.5 2.5 0 0 0 11 10c-1-1-1.4-2.6-1-4.2Z"/>',
  ),
}

export function serviceIcon(service: ServiceType): string {
  return SERVICE_ICON[service]
}

export function facilityChip(key: string): string {
  const label = FACILITY_LABELS[key] ?? key
  return `<span class="amenity">${label}</span>`
}
