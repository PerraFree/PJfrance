import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './styles.css'
import { initNativeShell, isNative } from './lib/native'

// Skydd mot att sajten bäddas in i en främmande sida (klickkapning). GitHub
// Pages kan inte skicka X-Frame-Options/frame-ancestors, och CSP i meta-tagg
// stöder inte frame-ancestors (granskning 12 okt 2026).
if (window.top !== window.self && !isNative) {
  try {
    window.top!.location.href = window.location.href
  } catch {
    document.documentElement.style.display = 'none'
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Native app-skal (statusfält, splash) – ingen effekt i webbläsaren
void initNativeShell()

// Service worker används bara på webben, inte i native-appen
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline-stöd är inte kritiskt */
    })
  })
}
