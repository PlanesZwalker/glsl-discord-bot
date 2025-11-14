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
  const { data: session, status } = useSession()
  const router = useRouter()
  const { locale } = useLocale()
  const t = getTranslations(locale)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black flex items-center justify-center transition-colors">
        <div className="text-gray-900 dark:text-white text-xl transition-colors">{t.dashboard.loading}</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

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

