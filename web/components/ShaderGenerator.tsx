'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface ShaderGeneratorProps {
  onShaderCreated: () => void
  t: any
  locale: string
}

const shapes = ['circle', 'square', 'triangle', 'star', 'heart', 'hexagon', 'diamond', 'line', 'grid', 'voronoi']
const colors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'white', 'black', 'rainbow', 'warm', 'cool']
const animations = ['rotation', 'pulse', 'wave', 'zoom', 'translate', 'color_shift', 'twinkle', 'none']

export function ShaderGenerator({ onShaderCreated, t, locale }: ShaderGeneratorProps) {
  const { data: session } = useSession()
  const [shape, setShape] = useState('circle')
  const [color, setColor] = useState('blue')
  const [animation, setAnimation] = useState('rotation')
  const [speed, setSpeed] = useState('normal')
  const [size, setSize] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      const userId = session?.user?.id || (isLocalDev ? '123456789012345678' : null)

      if (!userId) {
        setError(locale === 'fr' ? 'Vous devez être connecté pour générer un shader' : 'You must be logged in to generate a shader')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/shaders/generate?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shape,
          color,
          animation,
          speed,
          size,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        onShaderCreated()
        setTimeout(() => setSuccess(false), 5000)
      } else {
        setError(data.error || data.message || (locale === 'fr' ? 'Erreur lors de la génération' : 'Error generating shader'))
      }
    } catch (err: any) {
      setError(err.message || (locale === 'fr' ? 'Erreur lors de la génération' : 'Error generating shader'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {locale === 'fr' ? 'Générer un Shader' : 'Generate Shader'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors">
        {locale === 'fr'
          ? 'Créez un shader sans coder en choisissant une forme, une couleur et une animation.'
          : 'Create a shader without coding by choosing a shape, color, and animation.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            {locale === 'fr' ? 'Forme' : 'Shape'}
          </label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-discord-blurple"
          >
            {shapes.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            {locale === 'fr' ? 'Couleur' : 'Color'}
          </label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-discord-blurple"
          >
            {colors.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            {locale === 'fr' ? 'Animation' : 'Animation'}
          </label>
          <select
            value={animation}
            onChange={(e) => setAnimation(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-discord-blurple"
          >
            {animations.map(a => (
              <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1).replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            {locale === 'fr' ? 'Vitesse' : 'Speed'} ({speed})
          </label>
          <input
            type="range"
            min="1"
            max="3"
            value={speed === 'slow' ? 1 : speed === 'normal' ? 2 : 3}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              setSpeed(val === 1 ? 'slow' : val === 2 ? 'normal' : 'fast')
            }}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            {locale === 'fr' ? 'Taille' : 'Size'} ({size})
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors">
            <p className="text-red-600 dark:text-red-400 text-sm transition-colors">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 transition-colors">
            <p className="text-green-600 dark:text-green-400 text-sm transition-colors">
              {locale === 'fr' ? 'Shader généré avec succès !' : 'Shader generated successfully!'}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-discord-blurple hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {loading
            ? (locale === 'fr' ? 'Génération en cours...' : 'Generating...')
            : (locale === 'fr' ? 'Générer le Shader' : 'Generate Shader')}
        </button>
      </form>

    </div>
  )
}

