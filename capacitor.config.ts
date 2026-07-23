import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'se.tomningskartan.app',
  appName: 'Tömningskartan',
  webDir: 'dist',
  backgroundColor: '#f4f7f4',
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: '#1b5e20',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
}

export default config
