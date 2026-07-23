import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { initNativeShell, isNative } from './lib/native'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
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
