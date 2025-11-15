'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/useLocale'
import { getTranslations } from '@/lib/i18n'

export function Hero() {
  const { locale } = useLocale()
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = getTranslations(locale)
  const [showCommands, setShowCommands] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)
  
  useEffect(() => {
    // Éviter les redirections multiples
    if (hasRedirected) return
    
    // Lire les paramètres de l'URL côté client uniquement
    if (typeof window === 'undefined') return
    
    // Attendre que le statut soit déterminé
    if (status === 'loading') return
    
    // Si on n'est pas sur la page d'accueil, ne pas rediriger
    if (window.location.pathname !== '/') return
    
    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get('callbackUrl')
    
    console.log('Hero - Status:', status, 'Session:', !!session, 'CallbackUrl:', callbackUrl, 'HasRedirected:', hasRedirected, 'Pathname:', window.location.pathname)
    
    // Si authentifié ET callbackUrl présent ET pas encore redirigé ET on est sur la page d'accueil
    if (status === 'authenticated' && session && callbackUrl && !hasRedirected && window.location.pathname === '/') {
      console.log('Hero - Redirection vers:', callbackUrl)
      setHasRedirected(true)
      
      // Décoder l'URL si nécessaire
      const decodedUrl = decodeURIComponent(callbackUrl)
      
      // Vérifier que decodedUrl est valide et différent de la page actuelle
      if (decodedUrl && decodedUrl !== '/' && decodedUrl.startsWith('/')) {
        // Nettoyer le callbackUrl de l'URL AVANT la redirection pour éviter les boucles
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('callbackUrl')
        window.history.replaceState({}, '', newUrl.toString())
        
        // Utiliser replace pour éviter d'ajouter à l'historique
        router.replace(decodedUrl)
        
        // Fallback avec window.location si router ne fonctionne pas après 200ms
        setTimeout(() => {
          // Vérifier qu'on est toujours sur la page d'accueil
          if (window.location.pathname === '/') {
            console.log('Hero - Fallback: redirection directe avec window.location')
            window.location.replace(decodedUrl) // Utiliser replace au lieu de href pour éviter l'historique
          }
        }, 200)
      } else {
        console.warn('Hero - URL de callback invalide:', decodedUrl)
        setHasRedirected(false) // Réinitialiser si l'URL est invalide
        // Nettoyer le callbackUrl de l'URL si invalide
        if (window.location.search.includes('callbackUrl')) {
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('callbackUrl')
          window.history.replaceState({}, '', newUrl.toString())
        }
      }
    }
    
    // Nettoyer le callbackUrl de l'URL si on est authentifié et qu'il n'y a pas de callbackUrl valide
    if (status === 'authenticated' && session && !callbackUrl && window.location.search.includes('callbackUrl')) {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('callbackUrl')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [status, session, router, hasRedirected])
  
  const handleDashboardClick = async () => {
    if (status === 'authenticated') {
      // Déjà authentifié, aller directement au dashboard
      console.log('Hero - User authenticated, redirecting to dashboard')
      router.push('/dashboard')
    } else {
      // Non authentifié, déclencher le sign-in
      console.log('Hero - User not authenticated, triggering sign-in')
      await signIn('discord', { 
        callbackUrl: '/dashboard',
        redirect: true 
      })
    }
  }

  const getBotInviteUrl = () => {
    // Priorité 1: URL personnalisée si définie
    const inviteUrl = process.env.NEXT_PUBLIC_BOT_INVITE_URL
    if (inviteUrl) return inviteUrl
    
    // Priorité 2: Générer l'URL avec le Client ID
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    if (clientId) {
      // Permissions: Send Messages (2048) + Attach Files (32768) + Embed Links (16384) = 51200
      // Ou utiliser 8454144 pour inclure Read Message History aussi
      const permissions = '8454144' // Send Messages + Attach Files + Embed Links + Read Message History
      return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`
    }
    
    // Fallback: return a placeholder that will show an error message
    return '#'
  }
  
  const botInviteUrl = getBotInviteUrl()
  const isInviteUrlValid = botInviteUrl !== '#' && process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID

  const commands = [
    { name: '/shader', desc: locale === 'fr' ? 'Compiler un shader GLSL/WGSL personnalisé' : 'Compile a custom GLSL/WGSL shader' },
    { name: '/shader-preset', desc: locale === 'fr' ? 'Compiler un shader prédéfini (100 disponibles)' : 'Compile a preset shader (100 available)' },
    { name: '/shader-generate', desc: locale === 'fr' ? 'Générer un shader via paramètres' : 'Generate a shader via parameters' },
    { name: '/shader-code', desc: locale === 'fr' ? 'Voir le code source d\'un shader' : 'View shader source code' },
    { name: '/help', desc: locale === 'fr' ? 'Afficher l\'aide complète' : 'Show complete help' },
  ]

  return (
    <section className="relative overflow-hidden pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 transition-colors animate-fadeIn">
            {t.hero.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto transition-colors animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            {t.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            {isInviteUrlValid ? (
              <a
                href={botInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-discord-blurple hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md"
              >
                {t.hero.cta}
              </a>
            ) : (
              <div className="bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-8 py-4 rounded-lg text-lg font-semibold cursor-not-allowed transition-colors" title={locale === 'fr' ? 'NEXT_PUBLIC_DISCORD_CLIENT_ID doit être configuré dans Vercel' : 'NEXT_PUBLIC_DISCORD_CLIENT_ID must be configured in Vercel'}>
                {t.hero.cta}
              </div>
            )}
            <button
              onClick={handleDashboardClick}
              className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md"
            >
              {t.hero.ctaSecondary}
            </button>
          </div>

          {/* Commands Section */}
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowCommands(!showCommands)}
              className="text-discord-blurple hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium mb-4 transition-colors"
            >
              {showCommands
                ? locale === 'fr'
                  ? 'Masquer les commandes'
                  : 'Hide commands'
                : locale === 'fr'
                ? 'Voir les commandes disponibles'
                : 'View available commands'}
              <span className="ml-2">{showCommands ? '▲' : '▼'}</span>
            </button>

            {showCommands && (
              <div className="bg-white/80 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 animate-fadeIn backdrop-blur-sm transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">
                  {locale === 'fr' ? 'Commandes disponibles' : 'Available Commands'}
                </h3>
                <div className="space-y-2 text-left">
                  {commands.map((cmd, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <code className="text-discord-blurple font-mono text-sm flex-shrink-0">
                        {cmd.name}
                      </code>
                      <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors">{cmd.desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-xs mt-4 transition-colors">
                  {locale === 'fr'
                    ? 'Toutes les commandes génèrent des GIFs animés de 3 secondes à 30 FPS'
                    : 'All commands generate 3-second animated GIFs at 30 FPS'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-discord-blurple/20 via-purple-500/20 to-pink-500/20 dark:from-discord-blurple/30 dark:via-purple-500/30 dark:to-pink-500/30 blur-3xl animate-pulse-glow"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 blur-3xl animate-float"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-discord-blurple/20 dark:bg-discord-blurple/30 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 dark:bg-pink-500/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/20 dark:bg-purple-500/30 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
      </div>
    </section>
  )
}

