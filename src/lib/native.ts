import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

/**
 * Hämtar positionen – med tidsgräns: utan svar på frågan om platsåtkomst
 * eller utan GPS-fäste stod "Hämtar position …" kvar för evigt (granskning 6,
 * 12 okt 2026). Efter 25 s ges upp med ett vanligt fel.
 */
export function getPosition(): Promise<{ lat: number; lon: number }> {
  let timer = 0
  const limit = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Tidsgräns för position')), 25000)
  })
  return Promise.race([readPosition(), limit]).finally(() => window.clearTimeout(timer))
}

async function readPosition(): Promise<{ lat: number; lon: number }> {
  if (isNative) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const perm = await Geolocation.checkPermissions()
    if (perm.location !== 'granted') {
      const req = await Geolocation.requestPermissions()
      if (req.location !== 'granted') throw new Error('Platsåtkomst nekad')
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 })
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
      { timeout: 20000, maximumAge: 10000 },
    )
  })
}

/**
 * Delar via native-delningsdialog på enhet, annars Web Share / urklipp.
 * Returnerar 'copied' när länken lades i urklipp (dator utan delningsdialog)
 * så att anroparen kan visa ett kvitto i appen i stället för alert().
 */
export async function sharePlace(title: string, url: string): Promise<'shared' | 'copied' | 'other'> {
  const text = `${title} – Tömningskartan`
  if (isNative) {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title, text, url })
    return 'shared'
  }
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return 'shared'
    }
  } catch {
    return 'other'
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    prompt('Kopiera länken:', url)
    return 'other'
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
    // Ljus bakgrund + MÖRK text/ikoner. Förut mörkgrön bakgrund + Style.Dark
    // (vita ikoner) – men på nya Android (kant-till-kant) slår
    // setBackgroundColor inte igenom, så det blev vita ikoner på ljusgrått och
    // klockan/batteriet gick inte att läsa (emulatortest 12 okt 2026).
    // Style.Light = mörk text för ljus bakgrund.
    await StatusBar.setBackgroundColor({ color: '#f6f8f6' })
    await StatusBar.setStyle({ style: Style.Light })
  } catch {
    /* status bar ej tillgänglig (iOS hanterar via Info.plist) */
  }
  try {
    // Android-bakåtknappen: stäng dialog → platsruta → fäll ihop menyn →
    // annars avsluta appen. Utan lyssnare gjorde knappen ingenting.
    const [{ App }, { handleNativeBack }] = await Promise.all([
      import('@capacitor/app'),
      import('./backClose'),
    ])
    await App.addListener('backButton', () => {
      if (!handleNativeBack()) void App.exitApp()
    })
  } catch {
    /* @capacitor/app ej tillgänglig */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* ignorera */
  }
}
