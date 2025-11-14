'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { getTranslations } from '@/lib/i18n'
import { StatsPanel } from './StatsPanel'
import { ShaderList } from './ShaderList'
import { ShaderEditor } from './ShaderEditor'
import { ShaderGenerator } from './ShaderGenerator'
import { PresetBrowser } from './PresetBrowser'

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

type Tab = 'list' | 'create' | 'generate' | 'presets' | 'stats'

export function DashboardContent() {
  const { locale } = useLocale()
  const t = getTranslations(locale)
  const { data: session } = useSession()
  const [shaders, setShaders] = useState<Shader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    if (session?.user?.id || isLocalDev) {
      fetchShaders()
      fetchStats()
    }
  }, [session])

  async function fetchShaders() {
    try {
      setLoading(true)
      setError(null)
      const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const userId = session?.user?.id || (isLocalDev ? '123456789012345678' : null)
      const response = await fetch(`/api/shaders?userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setShaders(data)
        } else if (data.error) {
          setError(data.error)
          setShaders([])
        } else {
          setShaders([])
        }
      } else {
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

  async function fetchStats() {
    try {
      const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const userId = session?.user?.id || (isLocalDev ? '123456789012345678' : null)
      const response = await fetch(`/api/stats?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  async function handleDeleteShader(shaderId: number) {
    if (!confirm(locale === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce shader ?' : 'Are you sure you want to delete this shader?')) {
      return
    }

    try {
      const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const userId = session?.user?.id || (isLocalDev ? '123456789012345678' : null)
      const response = await fetch(`/api/shaders/${shaderId}?userId=${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShaders(shaders.filter(s => s.id !== shaderId))
        fetchStats() // Refresh stats
      } else {
        alert(locale === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting shader')
      }
    } catch (error) {
      console.error('Error deleting shader:', error)
      alert(locale === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting shader')
    }
  }

  const tabs = [
    { id: 'list' as Tab, label: locale === 'fr' ? 'Mes Shaders' : 'My Shaders', icon: '📋' },
    { id: 'create' as Tab, label: locale === 'fr' ? 'Créer un Shader' : 'Create Shader', icon: '✏️' },
    { id: 'generate' as Tab, label: locale === 'fr' ? 'Générer un Shader' : 'Generate Shader', icon: '🎨' },
    { id: 'presets' as Tab, label: locale === 'fr' ? 'Shaders Prédéfinis' : 'Preset Shaders', icon: '⭐' },
    { id: 'stats' as Tab, label: locale === 'fr' ? 'Statistiques' : 'Statistics', icon: '📊' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">
          {locale === 'fr' ? 'Tableau de Bord' : 'Dashboard'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 transition-colors">
          {locale === 'fr' 
            ? 'Gérez vos shaders, créez-en de nouveaux et consultez vos statistiques'
            : 'Manage your shaders, create new ones, and view your statistics'}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 transition-colors">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-discord-blurple text-discord-blurple'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <ShaderList
          shaders={shaders}
          loading={loading}
          error={error}
          onDelete={handleDeleteShader}
          onRefresh={fetchShaders}
          t={t}
          locale={locale}
        />
      )}

      {activeTab === 'create' && (
        <ShaderEditor
          onShaderCreated={fetchShaders}
          t={t}
          locale={locale}
        />
      )}

      {activeTab === 'generate' && (
        <ShaderGenerator
          onShaderCreated={fetchShaders}
          t={t}
          locale={locale}
        />
      )}

      {activeTab === 'presets' && (
        <PresetBrowser
          onShaderCreated={fetchShaders}
          t={t}
          locale={locale}
        />
      )}

      {activeTab === 'stats' && (
        <StatsPanel
          stats={stats}
          loading={!stats}
          t={t}
          locale={locale}
        />
      )}
    </div>
  )
}
