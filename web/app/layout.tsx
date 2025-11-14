import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorBoundaryWrapper } from './error-boundary-wrapper'
import { ChunkErrorHandler } from './chunk-error-handler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GLSL Discord Bot - Shader Compiler',
  description: 'Professional GLSL/WGSL shader compiler for Discord. Compile custom shaders, explore 100+ preset shaders, or generate shaders without coding. All with beautiful animated GIFs, web dashboard, and REST API.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ChunkErrorHandler />
        <ErrorBoundaryWrapper>
          <Providers>{children}</Providers>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  )
}

