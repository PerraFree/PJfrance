import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

/** Hämtar position via native-GPS på enhet, annars webbläsarens geolocation. */
export async function getPosition(): Promise<{ lat: number; lon: number }> {
  if (isNative) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const perm = await Geolocation.checkPermissions()
    if (perm.location !== 'granted') {
      const req = await Geolocation.requestPermissions()
      if (req.location !== 'granted') throw new Error('Platsåtkomst nekad')
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
    return { lat: pos.coords.latitude, lon: pos.coords.longitude }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation saknas'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => reject(err),
    )
  })
}

/** Delar via native-delningsdialog på enhet, annars Web Share / urklipp. */
export async function sharePlace(title: string, url: string): Promise<void> {
  const text = `${title} – Tömningskartan`
  if (isNative) {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title, text, url })
    return
  }
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return
    }
  } catch {
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    alert('Länk kopierad!')
  } catch {
    prompt('Kopiera länken:', url)
  }
}

/** Lätt haptisk feedback (endast på enhet). */
export async function tap(): Promise<void> {
  if (!isNative) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    /* haptik ej tillgänglig */
  }
}

/** Sätter statusfältets stil och döljer splash när appen är redo (native). */
export async function initNativeShell(): Promise<void> {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#1b5e20' })
  } catch {
    /* status bar ej tillgänglig (iOS hanterar via Info.plist) */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* ignorera */
  }
}
