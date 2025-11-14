'use client'

import { SessionProvider } from 'next-auth/react'
import { LocaleProvider } from '@/hooks/useLocale'
import { ThemeProvider } from '@/hooks/useTheme'
import { AuthDebug } from './auth-debug'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthDebug />
      <ThemeProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
