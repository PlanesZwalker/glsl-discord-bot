'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { getTranslations } from '@/lib/i18n'

interface Shader {
  id: number
  code: string
  user_id: string
  user_name: string
  image_path: string | null
  gif_path: string | null
  name: string | null
  likes: number
  views: number
  created_at: string
}

export function DashboardContent() {
  const { locale } = useLocale()
  const t = getTranslations(locale)
  const { data: session } = useSession()
  const [shaders, setShaders] = useState<Shader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // En local, récupérer les shaders même sans session
    const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    if (session?.user?.id || isLocalDev) {
      fetchShaders()
    }
  }, [session])

  async function fetchShaders() {
    try {
      setLoading(true)
      setError(null)
      // En local, utiliser un userId par défaut ou récupérer tous les shaders
      const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const userId = session?.user?.id || (isLocalDev ? '123456789012345678' : null)
      const response = await fetch(`/api/shaders?userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        // Handle both array and error object responses
        if (Array.isArray(data)) {
          setShaders(data)
        } else if (data.error) {
          setError(data.error)
          setShaders([])
        } else {
          setShaders([])
        }
      } else {
        // Handle non-ok responses
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch shaders' }))
        setError(errorData.error || `Error ${response.status}: ${response.statusText}`)
        setShaders([])
      }
    } catch (error: any) {
      console.error('Error fetching shaders:', error)
      setError(error.message || 'Failed to fetch shaders. Please check your connection and try again.')
      setShaders([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-900 dark:text-white text-xl transition-colors">{t.dashboard.loading}</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 transition-colors">{t.dashboard.title}</h1>
      
      {error ? (
        <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors shadow-sm">
          <p className="text-red-600 dark:text-red-400 text-xl font-semibold mb-2 transition-colors">
            Error loading shaders
          </p>
          <p className="text-red-500 dark:text-red-500 text-sm transition-colors">{error}</p>
          {error.includes('BOT_API_URL') || error.includes('Database not found') ? (
            <p className="text-red-500 dark:text-red-500 text-xs mt-4 transition-colors">
              Please configure BOT_API_URL in Vercel environment variables to connect to the bot API.
            </p>
          ) : null}
          <button
            onClick={fetchShaders}
            className="mt-4 px-4 py-2 bg-discord-blurple hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      ) : shaders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm dark:shadow-none">
          <p className="text-gray-600 dark:text-gray-400 text-xl transition-colors">{t.dashboard.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shaders.map((shader) => (
            <ShaderCard key={shader.id} shader={shader} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function ShaderCard({ shader, t }: { shader: Shader; t: any }) {
  const gifUrl = shader.gif_path 
    ? `/api/shaders/${shader.id}/gif`
    : shader.image_path
    ? `/api/shaders/${shader.id}/image`
    : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-discord-blurple transition-colors shadow-sm dark:shadow-none">
      {gifUrl && (
        <div className="aspect-video bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors">
          <img
            src={gifUrl}
            alt={shader.name || 'Shader'}
            className="w-full h-full object-contain"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
          {shader.name || `Shader #${shader.id}`}
        </h3>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors">
          <span>{t.dashboard.views}: {shader.views}</span>
          <span>{t.dashboard.likes}: {shader.likes}</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 transition-colors">
          {t.dashboard.createdAt}: {new Date(shader.created_at).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(shader.code)
              alert(t.common.codeCopied)
            }}
            className="flex-1 bg-discord-blurple hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
          >
            {t.dashboard.view}
          </button>
        </div>
      </div>
    </div>
  )
}

