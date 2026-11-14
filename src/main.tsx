import React from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

class AppErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean; errorMessage: string }> {
  state = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Leadflow encountered an unexpected rendering error.', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <main className="app-crash-screen" role="alert"><div><div className="brand-mark">LF</div><h1>Leadflow couldn’t load this page</h1><p>Something went wrong while rendering the application. Your data has not been changed.</p>{import.meta.env.DEV && <p className="app-crash-detail"><strong>Development error:</strong> {this.state.errorMessage}</p>}<button className="button button-primary" onClick={() => window.location.reload()}>Reload app</button></div></main>
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  </AppErrorBoundary>,
)
