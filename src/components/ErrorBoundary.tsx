import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Fångar oväntade renderingsfel så att ett enstaka trasigt dataobjekt inte
 * släcker hela appen med en vit skärm. Visar ett enkelt återställningsläge.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Logga för felsökning; ingen extern rapportering.
    console.error('Oväntat fel i appen:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error" role="alert">
          <h1>Något gick fel</h1>
          <p>Appen stötte på ett oväntat fel. Läs gärna om sidan.</p>
          <button type="button" onClick={() => location.reload()}>
            Läs om
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
