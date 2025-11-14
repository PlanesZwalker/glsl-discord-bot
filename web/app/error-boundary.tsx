'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// Global error handler for chunk loading errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('chunk') || event.message?.includes('ChunkLoadError') || 
        event.filename?.includes('_next/static/chunks')) {
      console.error('Chunk loading error detected:', event)
      // Reload after a short delay to allow for retry
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  })

  // Handle unhandled promise rejections (chunk loading can fail as promises)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    if (reason?.message?.includes('chunk') || reason?.message?.includes('ChunkLoadError') ||
        reason?.stack?.includes('_next/static/chunks')) {
      console.error('Chunk loading promise rejection:', reason)
      event.preventDefault() // Prevent default error handling
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  })
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log chunk loading errors specifically
    if (error.message?.includes('chunk') || error.message?.includes('ChunkLoadError')) {
      console.error('Chunk loading error detected:', error)
      // Try to reload the page after a short delay
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      }, 1000)
    } else {
      console.error('Error caught by boundary:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // If it's a chunk loading error, show a reload message
      if (this.state.error?.message?.includes('chunk') || this.state.error?.message?.includes('ChunkLoadError')) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-white mb-4">Loading Error</h1>
              <p className="text-gray-300 mb-4">A resource failed to load. Reloading the page...</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Now
              </button>
            </div>
          </div>
        )
      }

      // For other errors, use the fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

