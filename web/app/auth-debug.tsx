'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

// Composant pour déboguer les erreurs d'authentification côté client
// Doit être utilisé à l'intérieur de SessionProvider
export function AuthDebug() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Log toutes les erreurs d'authentification
    const originalError = console.error
    console.error = function(...args: any[]) {
      const message = args.join(' ')
      if (message.includes('auth') || message.includes('OAuth') || message.includes('Discord') || message.includes('NextAuth')) {
        console.log('🔍 [Auth Debug] Error detected:', ...args)
        // Envoyer à un endpoint de logging si nécessaire
        try {
          fetch('/api/auth/debug-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: message,
              url: window.location.href,
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {
            // Ignore fetch errors
          })
        } catch (e) {
          // Ignore
        }
      }
      originalError.apply(console, args)
    }

    // Intercepter les erreurs de navigation NextAuth
    const handlePopState = () => {
      const url = new URL(window.location.href)
      if (url.pathname === '/api/auth/error') {
        const error = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')
        console.log('🔍 [Auth Debug] Error page detected:', {
          error,
          errorDescription,
          fullUrl: window.location.href,
          referrer: document.referrer,
        })
      }
    }

    // Vérifier si on est sur la page d'erreur au chargement
    if (window.location.pathname === '/api/auth/error') {
      const url = new URL(window.location.href)
      const error = url.searchParams.get('error')
      const errorDescription = url.searchParams.get('error_description')
      console.log('🔍 [Auth Debug] Error page on load:', {
        error,
        errorDescription,
        fullUrl: window.location.href,
        referrer: document.referrer,
        allParams: Object.fromEntries(url.searchParams),
      })
    }

    // Intercepter les changements d'URL
    window.addEventListener('popstate', handlePopState)

    // Log session status changes (seulement côté client)
    if (typeof window !== 'undefined') {
      console.log('🔍 [Auth Debug] Session status:', status, {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      })
    }

    return () => {
      console.error = originalError
      window.removeEventListener('popstate', handlePopState)
    }
  }, [session, status])

  // Ce composant ne rend rien
  return null
}

