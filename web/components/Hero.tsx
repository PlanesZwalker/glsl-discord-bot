'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [callbackUrl, setCallbackUrl] = useState('/dashboard')
  const hasRedirected = useRef(false) // Prevent multiple redirects
  
  // Get callbackUrl from URL params to preserve it (client-side only)
  useEffect(() => {
    // Only run this effect once and only when session status is determined
    if (status === 'loading' || hasRedirected.current) {
      return
    }
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const rawCallbackUrl = params.get('callbackUrl')
      if (rawCallbackUrl) {
        const decoded = decodeURIComponent(rawCallbackUrl)
        setCallbackUrl(decoded)
        
        // If user is already logged in, redirect directly to callbackUrl
        // But only if we're not already on that page to avoid loops
        if (status === 'authenticated' && session && decoded) {
          const currentPath = window.location.pathname
          const targetPath = decoded.startsWith('/') ? decoded : `/${decoded}`
          
          // Only redirect if we're not already on the target page
          // And make sure we're on the home page (/) to avoid loops
          if (currentPath === '/' && currentPath !== targetPath) {
            hasRedirected.current = true
            console.log('✅ User logged in, redirecting to:', decoded)
            // Use router.replace to avoid adding to history and prevent loops
            router.replace(decoded)
          }
          return
        }
        
        // Don't auto-trigger sign-in - let user click the button manually
        // Auto-triggering can cause issues with OAuth flow and callbackUrl preservation
      }
    }
  }, [session, status, router])
  
  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (session && status === 'authenticated') {
      // User is logged in, redirect directly using router
      router.push(callbackUrl)
    } else {
      // User is not logged in, trigger sign-in with callbackUrl
      try {
        console.log('🔍 [Auth Debug] Dashboard click sign-in:', { callbackUrl })
        const result = await signIn('discord', { callbackUrl, redirect: true })
        console.log('🔍 [Auth Debug] Dashboard sign-in result:', result)
      } catch (error: any) {
        console.error('🔍 [Auth Debug] Dashboard sign-in error:', error)
      }
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
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
            {t.hero.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto transition-colors">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {isInviteUrlValid ? (
              <a
                href={botInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-discord-blurple hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
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
              className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
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
        <div className="absolute inset-0 bg-gradient-to-r from-discord-blurple/10 via-purple-500/10 to-pink-500/10 dark:from-discord-blurple/20 dark:via-purple-500/20 dark:to-pink-500/20 blur-3xl transition-opacity"></div>
      </div>
    </section>
  )
}

