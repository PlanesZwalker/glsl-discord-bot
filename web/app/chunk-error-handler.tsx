'use client'

import { useEffect } from 'react'

// Script pour gérer les erreurs de chunks Next.js
// Ce composant doit être monté une seule fois dans le layout
export function ChunkErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Stocker les tentatives de retry pour éviter les boucles infinies
    const retryAttempts = new Map<string, number>()
    const MAX_RETRIES = 3
    const RETRY_DELAY = 2000 // 2 secondes

    // Fonction pour retry un chunk
    const retryChunk = (chunkUrl: string, attempt: number = 1): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (attempt > MAX_RETRIES) {
          console.error(`❌ Chunk failed after ${MAX_RETRIES} attempts: ${chunkUrl}`)
          reject(new Error(`Chunk failed after ${MAX_RETRIES} attempts`))
          return
        }

        console.log(`🔄 Retrying chunk (attempt ${attempt}/${MAX_RETRIES}): ${chunkUrl}`)
        
        // Ajouter un timestamp pour bypass le cache
        const urlWithCacheBust = `${chunkUrl}?retry=${Date.now()}`
        
        // Essayer de charger le chunk
        fetch(urlWithCacheBust, { cache: 'no-store' })
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }
            return response.text()
          })
          .then(() => {
            console.log(`✅ Chunk loaded successfully: ${chunkUrl}`)
            // Recharger la page pour appliquer le chunk
            setTimeout(() => {
              window.location.reload()
            }, 500)
            resolve()
          })
          .catch(error => {
            console.error(`❌ Chunk retry ${attempt} failed:`, error)
            // Retry après un délai
            setTimeout(() => {
              retryChunk(chunkUrl, attempt + 1).then(resolve).catch(reject)
            }, RETRY_DELAY * attempt) // Délai exponentiel
          })
      })
    }

    // Intercepter les erreurs de chargement de scripts
    const handleScriptError = (event: ErrorEvent) => {
      const source = event.filename || event.target?.src || ''
      const message = event.message || ''
      
      // Détecter les erreurs de chunks Next.js
      if (source.includes('_next/static/chunks') || source.includes('_next/static/chunks/app')) {
        const chunkUrl = source
        console.error(`❌ Chunk loading failed: ${chunkUrl}`, message)
        
        // Vérifier si on a déjà tenté de retry ce chunk
        const attempts = retryAttempts.get(chunkUrl) || 0
        if (attempts < MAX_RETRIES) {
          retryAttempts.set(chunkUrl, attempts + 1)
          retryChunk(chunkUrl, attempts + 1).catch(() => {
            // Si tous les retries échouent, recharger la page
            console.error(`❌ All retries failed for chunk: ${chunkUrl}, reloading page`)
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          })
        } else {
          // Tous les retries ont échoué, recharger la page
          console.error(`❌ Max retries reached for chunk: ${chunkUrl}, reloading page`)
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
        return true
      }
      return false
    }
    
    // Intercepter les erreurs de chunks Next.js
    const handleChunkError = (error: any) => {
      const errorMessage = error?.message || String(error)
      const errorStack = error?.stack || ''
      
      // Ignorer les erreurs NS_BINDING_ABORTED (requêtes annulées - souvent bénignes)
      if (errorMessage.includes('NS_BINDING_ABORTED') || errorMessage.includes('AbortError')) {
        // Ces erreurs sont souvent causées par la navigation ou l'annulation de requêtes
        // Elles sont généralement bénignes et ne nécessitent pas de retry
        return false
      }
      
      // Ignorer les erreurs CSP (Content Security Policy) - Next.js gère les nonces automatiquement
      if (errorMessage.includes('Content-Security-Policy') || errorMessage.includes('script-src')) {
        // Next.js génère automatiquement les nonces pour les scripts inline
        // Ces erreurs peuvent être ignorées sauf si elles bloquent réellement le fonctionnement
        console.warn('⚠️ CSP warning (peut être ignoré):', errorMessage)
        return false
      }
      
      // Détecter les erreurs de chunks et RSC
      const isChunkError = 
        errorMessage.includes('chunk') ||
        errorMessage.includes('ChunkLoadError') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('Loading failed for the <script>') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Failed to fetch RSC payload') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('when attempting to fetch resource') ||
        errorStack.includes('_next/static/chunks') ||
        errorStack.includes('_next/data') ||
        errorStack.includes('chunk') ||
        errorStack.includes('RSC')

      if (isChunkError) {
        console.error('❌ Chunk loading error detected:', errorMessage)
        
        // Extraire l'URL du chunk si possible
        let chunkUrl: string | null = null
        
        // Chercher l'URL dans le message d'erreur (format: "Loading failed for the <script> with source "URL"")
        const urlMatch = errorMessage.match(/["'](https?:\/\/[^"']+)["']/) || errorMessage.match(/(https?:\/\/[^\s)]+)/)
        if (urlMatch) {
          chunkUrl = urlMatch[1] || urlMatch[0]
        } else if (errorStack) {
          const stackUrlMatch = errorStack.match(/["'](https?:\/\/[^"']+)["']/) || errorStack.match(/(https?:\/\/[^\s)]+)/)
          if (stackUrlMatch) {
            chunkUrl = stackUrlMatch[1] || stackUrlMatch[0]
          }
        }
        
        // Si on n'a toujours pas d'URL, chercher dans les propriétés de l'erreur
        if (!chunkUrl && error && typeof error === 'object') {
          const errorObj = error as any
          if (errorObj.filename) {
            chunkUrl = errorObj.filename
          } else if (errorObj.source) {
            chunkUrl = errorObj.source
          } else if (errorObj.url) {
            chunkUrl = errorObj.url
          }
        }

        // Si on a une URL, retry le chunk
        if (chunkUrl) {
          const attempts = retryAttempts.get(chunkUrl) || 0
          if (attempts < MAX_RETRIES) {
            retryAttempts.set(chunkUrl, attempts + 1)
            retryChunk(chunkUrl).catch(() => {
              // Si tous les retries échouent, recharger la page
              console.error('❌ All chunk retries failed, reloading page...')
              setTimeout(() => {
                window.location.reload()
              }, 1000)
            })
          } else {
            // Trop de tentatives, recharger la page
            console.error('❌ Max retries reached, reloading page...')
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          }
        } else {
          // Pas d'URL trouvée, recharger la page directement
          console.error('❌ Chunk error without URL, reloading page...')
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      }
    }

    // Intercepter les erreurs globales
    const errorHandler = (event: ErrorEvent) => {
      // D'abord, essayer de gérer les erreurs de scripts spécifiquement
      if (handleScriptError(event)) {
        return // L'erreur a été gérée
      }
      // Sinon, utiliser le gestionnaire générique
      handleChunkError(event.error || event.message)
    }

    // Intercepter les rejets de promesses non gérés
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      handleChunkError(event.reason)
    }

    // Intercepter les erreurs Next.js spécifiques
    const nextErrorHandler = () => {
      // Next.js expose parfois les erreurs via window.__NEXT_DATA__
      if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
        // Écouter les erreurs de navigation Next.js
        const originalPushState = history.pushState
        history.pushState = function(...args) {
          try {
            return originalPushState.apply(history, args)
          } catch (error) {
            handleChunkError(error)
            throw error
          }
        }
      }
    }

    // Ajouter les listeners
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', rejectionHandler)
    nextErrorHandler()

    // Nettoyer les listeners au démontage
    return () => {
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', rejectionHandler)
    }
  }, [])

  // Ce composant ne rend rien
  return null
}

