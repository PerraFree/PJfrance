import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Sätts till t.ex. /PJfrance/ vid deploy till GitHub Pages
  base: process.env.BASE_PATH ?? '/',
  define: {
    // Byggtidsstämpel som visas diskret i appen – gör det lätt att se om
    // mobilen kör senaste versionen eller en gammal cachad.
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(
      new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    ),
  },
  plugins: [react()],
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
