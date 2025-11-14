'use client'

import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { ShaderGuide } from '@/components/ShaderGuide'
import { ShaderGallery } from '@/components/ShaderGallery'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black transition-colors">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <ShaderGuide />
        <ShaderGallery />
      </main>
      <Footer />
    </div>
  )
}

