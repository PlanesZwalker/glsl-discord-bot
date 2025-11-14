'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface PresetBrowserProps {
  onShaderCreated: () => void
  t: any
  locale: string
}

const PRESET_SHADERS = [
  'rainbow', 'spiral', 'plasma', 'tunnel', 'starfield', 'gradient', 'sine', 'waves', 'spiral2', 'rings',
  'water', 'fire', 'smoke', 'snow', 'clouds', 'lava', 'lavaflow', 'aurora', 'rain', 'thunder', 'wind', 'fog', 'mist', 'haze', 'storm', 'cyclone', 'tornado',
  'mandelbrot', 'mandelbulb', 'mandelbulb2', 'mandelbulb3', 'mandelbulb4', 'julia', 'fractal', 'tree',
  'raymarching', 'metaballs', 'crystal', 'bubbles',
  'voronoi', 'hexagon', 'grid', 'geometric', 'maze', 'moire', 'dots', 'lines', 'checkerboard', 'stripes', 'zebra', 'diamond', 'triangle', 'circle', 'square', 'star', 'heart', 'flower',
  'galaxy', 'spiralgalaxy', 'nebula', 'cosmic', 'sun', 'moon', 'planet', 'comet', 'asteroid', 'nebula2', 'supernova', 'blackhole', 'wormhole',
  'noise', 'kaleidoscope', 'ripple', 'particles', 'matrix', 'electric', 'dna', 'circuit', 'lightrays', 'turbulence', 'morphing', 'swirl', 'energy', 'lens', 'kaleidoscope2', 'distortion', 'mirror', 'reflection', 'glitch', 'pixelate', 'chromatic', 'bloom', 'vignette', 'scanlines', 'noise2', 'cells', 'warp', 'radial', 'lightning2'
]

export function PresetBrowser({ onShaderCreated, t, locale }: PresetBrowserProps) {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const filteredPresets = PRESET_SHADERS.filter(preset =>
    preset.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleCompilePreset(presetName: string) {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const userId = session?.user?.id || (isLocalDev ? '123456789012345678' : null)

      if (!userId) {
        setError(locale === 'fr' ? 'Vous devez être connecté pour compiler un shader' : 'You must be logged in to compile a shader')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/shaders/preset?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preset: presetName,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        setSelectedPreset(null)
        onShaderCreated()
        setTimeout(() => setSuccess(false), 5000)
      } else {
        setError(data.error || data.message || (locale === 'fr' ? 'Erreur lors de la compilation' : 'Error compiling shader'))
      }
    } catch (err: any) {
      setError(err.message || (locale === 'fr' ? 'Erreur lors de la compilation' : 'Error compiling shader'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">
          {locale === 'fr' ? 'Shaders Prédéfinis' : 'Preset Shaders'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 transition-colors">
          {locale === 'fr'
            ? 'Choisissez parmi 100+ shaders prédéfinis. Cliquez sur un shader pour voir son code ou le compiler.'
            : 'Choose from 100+ preset shaders. Click on a shader to view its code or compile it.'}
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder={locale === 'fr' ? 'Rechercher un shader prédéfini...' : 'Search preset shaders...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-discord-blurple"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredPresets.map((preset) => (
          <button
            key={preset}
            onClick={() => setSelectedPreset(preset)}
            className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-discord-blurple hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <div className="font-medium text-gray-900 dark:text-white transition-colors">
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </div>
          </button>
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
            {locale === 'fr' ? 'Aucun shader trouvé' : 'No shaders found'}
          </p>
        </div>
      )}

      {/* Preset Detail Modal */}
      {selectedPreset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  {selectedPreset.charAt(0).toUpperCase() + selectedPreset.slice(1)}
                </h3>
                <button
                  onClick={() => setSelectedPreset(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors">
                    <p className="text-red-600 dark:text-red-400 text-sm transition-colors">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 transition-colors">
                    <p className="text-green-600 dark:text-green-400 text-sm transition-colors">
                      {locale === 'fr' ? 'Shader compilé avec succès !' : 'Shader compiled successfully!'}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCompilePreset(selectedPreset)}
                    disabled={loading}
                    className="flex-1 bg-discord-blurple hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    {loading
                      ? (locale === 'fr' ? 'Compilation...' : 'Compiling...')
                      : (locale === 'fr' ? 'Compiler le Shader' : 'Compile Shader')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

