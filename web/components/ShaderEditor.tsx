'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface ShaderEditorProps {
  onShaderCreated: () => void
  t: any
  locale: string
}

export function ShaderEditor({ onShaderCreated, t, locale }: ShaderEditorProps) {
  const { data: session } = useSession()
  const [code, setCode] = useState(`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}`)
  const [name, setName] = useState('')
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
        setError(locale === 'fr' ? 'Vous devez être connecté pour compiler un shader' : 'You must be logged in to compile a shader')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/shaders/compile?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          name: name || null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        setName('')
        setCode(`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}`)
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {locale === 'fr' ? 'Créer un Shader Personnalisé' : 'Create Custom Shader'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors">
        {locale === 'fr'
          ? 'Écrivez votre code GLSL ou WGSL. Le shader sera compilé et un GIF animé sera généré.'
          : 'Write your GLSL or WGSL code. The shader will be compiled and an animated GIF will be generated.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            {locale === 'fr' ? 'Nom du shader (optionnel)' : 'Shader Name (optional)'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={locale === 'fr' ? 'Mon shader personnalisé' : 'My custom shader'}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-discord-blurple"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            {locale === 'fr' ? 'Code Shader' : 'Shader Code'}
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={15}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            placeholder={locale === 'fr' ? 'Entrez votre code GLSL ou WGSL...' : 'Enter your GLSL or WGSL code...'}
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
              {locale === 'fr' ? 'Shader créé avec succès !' : 'Shader created successfully!'}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-discord-blurple hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {loading
            ? (locale === 'fr' ? 'Compilation en cours...' : 'Compiling...')
            : (locale === 'fr' ? 'Compiler le Shader' : 'Compile Shader')}
        </button>
      </form>

    </div>
  )
}

