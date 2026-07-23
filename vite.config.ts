import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Sätts till t.ex. /PJfrance/ vid deploy till GitHub Pages
  base: process.env.BASE_PATH ?? '/',
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
