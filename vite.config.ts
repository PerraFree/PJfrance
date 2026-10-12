import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy + referrer-policy som meta-taggar, BARA i
// produktionsbygget (dev-servern injicerar ett inline-skript som CSP:n skulle
// stoppa). GitHub Pages kan inte sätta egna HTTP-headers, därför meta.
// Ny extern tjänst i appen? Lägg värden här, annars blockeras den tyst –
// scripts/check-csp.mjs i deploy.yml stoppar bygget om en värd i src/ saknas.
// (Granskning 12 okt 2026: ingen CSP alls.)
export const CSP_HOSTS = {
  connect: [
    'https://*.supabase.co',
    'https://overpass-api.de',
    'https://overpass.kumi.systems',
    'https://overpass.private.coffee',
    'https://nominatim.openstreetmap.org',
    'https://photon.komoot.io',
    'https://router.project-osrm.org',
    'https://opendata-download-metfcst.smhi.se',
  ],
  img: [
    'https://*.supabase.co',
    'https://server.arcgisonline.com',
    'https://tile.openstreetmap.org',
    'https://*.tile.opentopomap.org',
    'https://upload.wikimedia.org',
    'https://commons.wikimedia.org',
  ],
}
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Leaflet sätter style-attribut
  `img-src 'self' data: blob: ${CSP_HOSTS.img.join(' ')}`,
  `connect-src 'self' ${CSP_HOSTS.connect.join(' ')}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function securityMeta(): Plugin {
  return {
    name: 'security-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
    ],
  }
}

export default defineConfig({
  // Serveras från domänens rot (tomningskartan.se) – BASE_PATH sätts till "/" i deploy.yml
  base: process.env.BASE_PATH ?? '/',
  define: {
    // Byggtidsstämpel som visas diskret i appen – gör det lätt att se om
    // mobilen kör senaste versionen eller en gammal cachad.
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    ),
  },
  plugins: [react(), securityMeta()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet', 'leaflet.markercluster'],
          openinghours: ['opening_hours'],
        },
      },
    },
  },
})
