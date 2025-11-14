'use client'

import { useLocale } from '@/hooks/useLocale'
import { getTranslations } from '@/lib/i18n'

export function Footer() {
  const { locale } = useLocale()
  const t = getTranslations(locale)
  const currentYear = new Date().getFullYear()

  // Replace the year in the footer text with the current year
  const footerText = t.common.footer.replace('2024', currentYear.toString())

  return (
    <footer className="bg-white dark:bg-discord-black border-t border-gray-200 dark:border-gray-800 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-600 dark:text-gray-400 transition-colors">
          <p>{footerText}</p>
        </div>
      </div>
    </footer>
  )
}

