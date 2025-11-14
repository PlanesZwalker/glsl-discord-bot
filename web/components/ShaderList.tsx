'use client'

import { useState } from 'react'

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

interface ShaderListProps {
  shaders: Shader[]
  loading: boolean
  error: string | null
  onDelete: (id: number) => void
  onRefresh: () => void
  t: any
  locale: string
}

export function ShaderList({ shaders, loading, error, onDelete, onRefresh, t, locale }: ShaderListProps) {
  const [selectedShader, setSelectedShader] = useState<Shader | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredShaders = shaders.filter(shader => {
    const search = searchTerm.toLowerCase()
    return (
      (shader.name || '').toLowerCase().includes(search) ||
      shader.code.toLowerCase().includes(search) ||
      shader.id.toString().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-900 dark:text-white text-xl transition-colors">{t.dashboard.loading}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors shadow-sm">
        <p className="text-red-600 dark:text-red-400 text-xl font-semibold mb-2 transition-colors">
          {locale === 'fr' ? 'Erreur de chargement' : 'Error loading shaders'}
        </p>
        <p className="text-red-500 dark:text-red-500 text-sm transition-colors">{error}</p>
        <button
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-discord-blurple hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
        >
          {locale === 'fr' ? 'Réessayer' : 'Retry'}
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder={locale === 'fr' ? 'Rechercher un shader...' : 'Search shaders...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-discord-blurple"
        />
      </div>

      {/* Shader Count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 transition-colors">
        {locale === 'fr' 
          ? `${filteredShaders.length} shader${filteredShaders.length > 1 ? 's' : ''} trouvé${filteredShaders.length > 1 ? 's' : ''}`
          : `${filteredShaders.length} shader${filteredShaders.length !== 1 ? 's' : ''} found`}
      </div>

      {filteredShaders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm dark:shadow-none">
          <p className="text-gray-600 dark:text-gray-400 text-xl transition-colors">
            {searchTerm ? (locale === 'fr' ? 'Aucun shader trouvé' : 'No shaders found') : t.dashboard.empty}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShaders.map((shader) => (
            <ShaderCard
              key={shader.id}
              shader={shader}
              onDelete={onDelete}
              onView={() => setSelectedShader(shader)}
              t={t}
              locale={locale}
            />
          ))}
        </div>
      )}

      {/* Shader Detail Modal */}
      {selectedShader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  {selectedShader.name || `Shader #${selectedShader.id}`}
                </h2>
                <button
                  onClick={() => setSelectedShader(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {selectedShader.image_path && (
                <div className="mb-4">
                  <img
                    src={`/api/shaders/${selectedShader.id}/image`}
                    alt={selectedShader.name || 'Shader'}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                  />
                </div>
              )}

              <div className="mb-4 flex gap-4 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                <span>{t.dashboard.views}: {selectedShader.views}</span>
                <span>{t.dashboard.likes}: {selectedShader.likes}</span>
                <span>{t.dashboard.createdAt}: {new Date(selectedShader.created_at).toLocaleDateString()}</span>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                  {locale === 'fr' ? 'Code Source' : 'Source Code'}
                </label>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm transition-colors">
                  <code className="text-gray-900 dark:text-gray-100">{selectedShader.code}</code>
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedShader.code)
                    alert(t.common.codeCopied)
                  }}
                  className="mt-2 px-4 py-2 bg-discord-blurple hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                >
                  {locale === 'fr' ? 'Copier le code' : 'Copy Code'}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onDelete(selectedShader.id)
                    setSelectedShader(null)
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                >
                  {t.dashboard.delete}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShaderCard({ shader, onDelete, onView, t, locale }: {
  shader: Shader
  onDelete: (id: number) => void
  onView: () => void
  t: any
  locale: string
}) {
  const gifUrl = shader.image_path ? `/api/shaders/${shader.id}/image` : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-discord-blurple transition-colors shadow-sm dark:shadow-none">
      {gifUrl && (
        <div className="aspect-video bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors cursor-pointer" onClick={onView}>
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
            onClick={onView}
            className="flex-1 bg-discord-blurple hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            {t.dashboard.view}
          </button>
          <button
            onClick={() => onDelete(shader.id)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
            title={t.dashboard.delete}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

