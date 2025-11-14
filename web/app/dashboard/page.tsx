'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { DashboardContent } from '@/components/DashboardContent'
import { useLocale } from '@/hooks/useLocale'
import { getTranslations } from '@/lib/i18n'

export default function DashboardPage() {
  console.log('📊 Dashboard Page rendering')
  
  const { data: session, status } = useSession()
  const router = useRouter()
  const { locale } = useLocale()
  const t = getTranslations(locale)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    console.log('Dashboard - Status:', status, 'Session:', !!session)
    
    if (status === 'loading') {
      // Encore en chargement
      return
    }
    
    if (status === 'unauthenticated') {
      // Non authentifié, redirection immédiate
      console.log('Dashboard - Non authentifié, redirection vers /')
      router.push('/?callbackUrl=/dashboard')
      return
    }
    
    if (status === 'authenticated' && session) {
      // Authentifié, afficher le dashboard
      console.log('Dashboard - Authentifié, affichage du contenu')
      setIsReady(true)
    }
  }, [status, session, router])

  // Affichage du loader pendant le chargement
  if (status === 'loading' || !isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-gray-900 dark:text-white text-xl transition-colors">{t.dashboard.loading}</div>
        </div>
      </div>
    )
  }

  // Affichage du dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black transition-colors">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <DashboardContent />
      </main>
      <Footer />
    </div>
  )
}

