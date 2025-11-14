'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, defaultLocale } from '@/lib/i18n'

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (locale: Locale) => void
}>({
  locale: defaultLocale,
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null
    if (saved && (saved === 'en' || saved === 'fr')) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}

