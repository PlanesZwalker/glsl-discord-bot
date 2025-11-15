'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useLocale } from '@/hooks/useLocale'
import { useTheme } from '@/hooks/useTheme'
import { getTranslations } from '@/lib/i18n'

export function Navbar() {
  const { locale } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const t = getTranslations(locale)
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState('/dashboard')
  
  // Get callbackUrl from URL params to preserve it during sign-in (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const rawCallbackUrl = params.get('callbackUrl')
      if (rawCallbackUrl) {
        setCallbackUrl(decodeURIComponent(rawCallbackUrl))
      }
    }
  }, [])

  return (
    <nav className="bg-white dark:bg-discord-black border-b border-gray-200 dark:border-gray-800 transition-colors sticky top-0 z-50 shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center px-2 py-2 text-gray-900 dark:text-white font-bold text-xl hover:opacity-80 transition-opacity">
              🎨 GLSL Bot
            </Link>
            <div className="hidden md:ml-6 md:flex md:space-x-1">
              <Link 
                href="/" 
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t.nav.home}
              </Link>
              {session && (
                <Link 
                  href="/dashboard" 
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {t.nav.dashboard}
                </Link>
              )}
              <Link 
                href="/pricing" 
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Pricing
              </Link>
              <Link 
                href="/install" 
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t.nav.install}
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            <LocaleSwitcher />
            {session ? (
              <div className="hidden sm:flex items-center space-x-3">
                <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="bg-discord-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t.common.signOut}
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  console.log('🔍 [Auth Debug] Sign-in button clicked:', { callbackUrl })
                  try {
                    const result = await signIn('discord', { 
                      callbackUrl,
                      redirect: true,
                    })
                    console.log('🔍 [Auth Debug] Sign-in result:', result)
                  } catch (error: any) {
                    console.error('🔍 [Auth Debug] Sign-in error:', error)
                    console.error('🔍 [Auth Debug] Error details:', {
                      message: error?.message,
                      stack: error?.stack,
                      name: error?.name,
                    })
                  }
                }}
                className="bg-discord-blurple hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {t.common.signIn}
              </button>
            )}
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 transition-colors">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t.nav.home}
            </Link>
            {session && (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t.nav.dashboard}
              </Link>
            )}
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/install"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t.nav.install}
            </Link>
            {session && (
              <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{session.user?.name}</span>
                </div>
                <button
                  onClick={() => {
                    signOut()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full bg-discord-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t.common.signOut}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-1 rounded text-sm transition-colors ${locale === 'en' ? 'bg-discord-blurple text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('fr')}
        className={`px-2 py-1 rounded text-sm transition-colors ${locale === 'fr' ? 'bg-discord-blurple text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
      >
        FR
      </button>
    </div>
  )
}

