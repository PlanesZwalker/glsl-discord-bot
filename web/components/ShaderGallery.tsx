'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { getTranslations } from '@/lib/i18n'

interface Shader {
  name: string
  category: string
  description: string
}

const getShaderCategories = (locale: 'en' | 'fr') => ({
  animated: {
    name: locale === 'fr' ? '🎨 Effets Animés' : '🎨 Animated Effects',
    shaders: [
      { name: 'rainbow', description: locale === 'fr' ? 'Arc-en-ciel animé rotatif' : 'Animated rotating rainbow' },
      { name: 'spiral', description: locale === 'fr' ? 'Spirale multicolore animée' : 'Animated multicolor spiral' },
      { name: 'plasma', description: locale === 'fr' ? 'Effet plasma coloré animé' : 'Animated colorful plasma effect' },
      { name: 'tunnel', description: locale === 'fr' ? 'Effet tunnel rotatif' : 'Rotating tunnel effect' },
      { name: 'starfield', description: locale === 'fr' ? 'Champ d\'étoiles animé' : 'Animated starfield' },
      { name: 'gradient', description: locale === 'fr' ? 'Dégradé animé' : 'Animated gradient' },
      { name: 'sine', description: locale === 'fr' ? 'Ondes sinusoïdales' : 'Sine waves' },
      { name: 'waves', description: locale === 'fr' ? 'Vagues animées' : 'Animated waves' },
      { name: 'spiral2', description: locale === 'fr' ? 'Spirale alternative' : 'Alternative spiral' },
      { name: 'rings', description: locale === 'fr' ? 'Anneaux concentriques' : 'Concentric rings' },
    ],
  },
  natural: {
    name: locale === 'fr' ? '🌊 Effets Naturels' : '🌊 Natural Phenomena',
    shaders: [
      { name: 'water', description: locale === 'fr' ? 'Ondes aquatiques avec reflets' : 'Water waves with reflections' },
      { name: 'fire', description: locale === 'fr' ? 'Effet de feu animé' : 'Animated fire effect' },
      { name: 'smoke', description: locale === 'fr' ? 'Fumée montante' : 'Rising smoke' },
      { name: 'snow', description: locale === 'fr' ? 'Neige' : 'Snow' },
      { name: 'clouds', description: locale === 'fr' ? 'Nuages' : 'Clouds' },
      { name: 'lava', description: locale === 'fr' ? 'Lampe à lave' : 'Lava lamp' },
      { name: 'lavaflow', description: locale === 'fr' ? 'Coulée de lave' : 'Lava flow' },
      { name: 'aurora', description: locale === 'fr' ? 'Aurore boréale' : 'Aurora borealis' },
      { name: 'rain', description: locale === 'fr' ? 'Pluie' : 'Rain' },
      { name: 'thunder', description: locale === 'fr' ? 'Tonnerre' : 'Thunder' },
      { name: 'wind', description: locale === 'fr' ? 'Vent' : 'Wind' },
      { name: 'fog', description: locale === 'fr' ? 'Brouillard' : 'Fog' },
      { name: 'mist', description: locale === 'fr' ? 'Brume' : 'Mist' },
      { name: 'haze', description: locale === 'fr' ? 'Brume légère' : 'Haze' },
      { name: 'storm', description: locale === 'fr' ? 'Tempête' : 'Storm' },
    ],
  },
  fractals: {
    name: locale === 'fr' ? '🌀 Fractales' : '🌀 Fractals',
    shaders: [
      { name: 'mandelbrot', description: locale === 'fr' ? 'Fractale Mandelbrot avec zoom' : 'Mandelbrot fractal with zoom' },
      { name: 'mandelbulb', description: locale === 'fr' ? 'Fractale 3D Mandelbulb améliorée (raymarching, éclairage réaliste)' : 'Improved 3D Mandelbulb fractal (raymarching, realistic lighting)' },
      { name: 'mandelbulb2', description: locale === 'fr' ? 'Mandelbulb variation power 6.0 avec palette colorée' : 'Mandelbulb variation power 6.0 with colorful palette' },
      { name: 'mandelbulb3', description: locale === 'fr' ? 'Mandelbulb variation power 10.0 avec éclairage dramatique' : 'Mandelbulb variation power 10.0 with dramatic lighting' },
      { name: 'mandelbulb4', description: locale === 'fr' ? 'Mandelbulb variation power 4.0 style minimaliste' : 'Mandelbulb variation power 4.0 minimalist style' },
      { name: 'julia', description: locale === 'fr' ? 'Fractale Julia Set' : 'Julia Set fractal' },
      { name: 'fractal', description: locale === 'fr' ? 'Fractale animée' : 'Animated fractal' },
      { name: 'tree', description: locale === 'fr' ? 'Arbre réaliste avec feuilles détaillées' : 'Realistic tree with detailed leaves' },
    ],
  },
  '3d': {
    name: locale === 'fr' ? '🎯 Effets 3D' : '🎯 3D Effects',
    shaders: [
      { name: 'raymarching', description: locale === 'fr' ? 'Sphère 3D avec raymarching' : '3D sphere with raymarching' },
      { name: 'metaballs', description: locale === 'fr' ? 'Sphères qui fusionnent' : 'Metaballs that merge' },
      { name: 'crystal', description: locale === 'fr' ? 'Cristal' : 'Crystal' },
      { name: 'bubbles', description: locale === 'fr' ? 'Bulles' : 'Bubbles' },
    ],
  },
  geometric: {
    name: locale === 'fr' ? '🔷 Effets Géométriques' : '🔷 Geometric Patterns',
    shaders: [
      { name: 'voronoi', description: locale === 'fr' ? 'Diagramme de Voronoi animé' : 'Animated Voronoi diagram' },
      { name: 'hexagon', description: locale === 'fr' ? 'Motif hexagonal animé' : 'Animated hexagonal pattern' },
      { name: 'grid', description: locale === 'fr' ? 'Grille animée' : 'Animated grid' },
      { name: 'geometric', description: locale === 'fr' ? 'Formes géométriques' : 'Geometric shapes' },
      { name: 'maze', description: locale === 'fr' ? 'Labyrinthe généré avec algorithme réaliste' : 'Maze generated with realistic algorithm' },
      { name: 'moire', description: locale === 'fr' ? 'Motif de Moiré' : 'Moiré pattern' },
      { name: 'dots', description: locale === 'fr' ? 'Points animés' : 'Animated dots' },
      { name: 'lines', description: locale === 'fr' ? 'Lignes animées' : 'Animated lines' },
      { name: 'checkerboard', description: locale === 'fr' ? 'Damier' : 'Checkerboard' },
      { name: 'stripes', description: locale === 'fr' ? 'Rayures' : 'Stripes' },
      { name: 'zebra', description: locale === 'fr' ? 'Motif zèbre' : 'Zebra pattern' },
      { name: 'diamond', description: locale === 'fr' ? 'Diamant' : 'Diamond' },
      { name: 'triangle', description: locale === 'fr' ? 'Triangle' : 'Triangle' },
      { name: 'circle', description: locale === 'fr' ? 'Cercle' : 'Circle' },
      { name: 'square', description: locale === 'fr' ? 'Carré' : 'Square' },
      { name: 'star', description: locale === 'fr' ? 'Étoile' : 'Star' },
      { name: 'heart', description: locale === 'fr' ? 'Cœur réaliste avec pulsation et lueur' : 'Realistic heart with pulse and glow' },
      { name: 'flower', description: locale === 'fr' ? 'Fleur' : 'Flower' },
    ],
  },
  space: {
    name: locale === 'fr' ? '🌌 Effets Spatiaux' : '🌌 Space Effects',
    shaders: [
      { name: 'galaxy', description: locale === 'fr' ? 'Galaxie spirale' : 'Spiral galaxy' },
      { name: 'spiralgalaxy', description: locale === 'fr' ? 'Galaxie spirale détaillée' : 'Detailed spiral galaxy' },
      { name: 'nebula', description: locale === 'fr' ? 'Nébuleuse' : 'Nebula' },
      { name: 'cosmic', description: locale === 'fr' ? 'Effet cosmique' : 'Cosmic effect' },
      { name: 'sun', description: locale === 'fr' ? 'Soleil' : 'Sun' },
      { name: 'moon', description: locale === 'fr' ? 'Lune réaliste avec cratères détaillés et phases' : 'Realistic moon with detailed craters and phases' },
      { name: 'planet', description: locale === 'fr' ? 'Planète réaliste avec continents, océans et atmosphère' : 'Realistic planet with continents, oceans and atmosphere' },
      { name: 'comet', description: locale === 'fr' ? 'Comète' : 'Comet' },
      { name: 'asteroid', description: locale === 'fr' ? 'Astéroïdes 3D réalistes avec rotation et cratères' : 'Realistic 3D asteroids with rotation and craters' },
      { name: 'nebula2', description: locale === 'fr' ? 'Nébuleuse 2' : 'Nebula 2' },
      { name: 'supernova', description: locale === 'fr' ? 'Supernova' : 'Supernova' },
      { name: 'blackhole', description: locale === 'fr' ? 'Trou Noir' : 'Black hole' },
      { name: 'wormhole', description: locale === 'fr' ? 'Trou de Ver' : 'Wormhole' },
    ],
  },
  effects: {
    name: locale === 'fr' ? '⚡ Effets Visuels Avancés' : '⚡ Advanced Visual Effects',
    shaders: [
      { name: 'noise', description: locale === 'fr' ? 'Noise/Perlin noise multi-octave' : 'Multi-octave Perlin noise' },
      { name: 'kaleidoscope', description: locale === 'fr' ? 'Kaléidoscope rotatif' : 'Rotating kaleidoscope' },
      { name: 'ripple', description: locale === 'fr' ? 'Ondes concentriques' : 'Concentric ripples' },
      { name: 'particles', description: locale === 'fr' ? 'Système de particules' : 'Particle system' },
      { name: 'matrix', description: locale === 'fr' ? 'Pluie de code Matrix' : 'Matrix code rain' },
      { name: 'electric', description: locale === 'fr' ? 'Éclairs/orage' : 'Lightning/storm' },
      { name: 'dna', description: locale === 'fr' ? 'Double hélice d\'ADN' : 'DNA double helix' },
      { name: 'circuit', description: locale === 'fr' ? 'Circuit électronique' : 'Electronic circuit' },
      { name: 'lightrays', description: locale === 'fr' ? 'Rayons de lumière' : 'Light rays' },
      { name: 'turbulence', description: locale === 'fr' ? 'Turbulence' : 'Turbulence' },
      { name: 'morphing', description: locale === 'fr' ? 'Morphing de formes' : 'Shape morphing' },
      { name: 'swirl', description: locale === 'fr' ? 'Tourbillon' : 'Swirl' },
      { name: 'energy', description: locale === 'fr' ? 'Énergie' : 'Energy' },
      { name: 'lens', description: locale === 'fr' ? 'Effet de lentille' : 'Lens effect' },
      { name: 'kaleidoscope2', description: locale === 'fr' ? 'Kaléidoscope 2' : 'Kaleidoscope 2' },
      { name: 'distortion', description: locale === 'fr' ? 'Distorsion' : 'Distortion' },
      { name: 'mirror', description: locale === 'fr' ? 'Miroir' : 'Mirror' },
      { name: 'reflection', description: locale === 'fr' ? 'Réflexion' : 'Reflection' },
      { name: 'glitch', description: locale === 'fr' ? 'Effet Glitch' : 'Glitch effect' },
      { name: 'pixelate', description: locale === 'fr' ? 'Pixelisation' : 'Pixelation' },
      { name: 'chromatic', description: locale === 'fr' ? 'Aberration chromatique' : 'Chromatic aberration' },
      { name: 'bloom', description: locale === 'fr' ? 'Effet Bloom' : 'Bloom effect' },
      { name: 'vignette', description: locale === 'fr' ? 'Vignettage' : 'Vignette' },
      { name: 'scanlines', description: locale === 'fr' ? 'Lignes de balayage' : 'Scanlines' },
      { name: 'noise2', description: locale === 'fr' ? 'Noise 2' : 'Noise 2' },
      { name: 'cells', description: locale === 'fr' ? 'Cellules' : 'Cells' },
      { name: 'warp', description: locale === 'fr' ? 'Warp' : 'Warp' },
      { name: 'radial', description: locale === 'fr' ? 'Motif radial' : 'Radial pattern' },
      { name: 'lightning2', description: locale === 'fr' ? 'Éclair 2' : 'Lightning 2' },
      { name: 'tornado', description: locale === 'fr' ? 'Tornade' : 'Tornado' },
      { name: 'cyclone', description: locale === 'fr' ? 'Cyclone' : 'Cyclone' },
    ],
  },
})

export function ShaderGallery() {
  const { locale } = useLocale()
  const t = getTranslations(locale)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedShader, setSelectedShader] = useState<{ name: string; code: string } | null>(null)
  const [loadingCode, setLoadingCode] = useState(false)

  const shaderCategories = getShaderCategories(locale)

  const getGifUrl = (shaderName: string) => {
    return `https://raw.githubusercontent.com/PlanesZwalker/glsl-discord-bot/master/docs/gifs/${shaderName}.gif`
  }

  const fetchShaderCode = async (shaderName: string) => {
    setLoadingCode(true)
    try {
      const response = await fetch(`/api/shaders/code/${shaderName}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedShader({ name: shaderName, code: data.code })
      } else {
        setSelectedShader({ 
          name: shaderName, 
          code: `// Shader code not available via API.\n// Use /shader-code ${shaderName} in Discord to view the code.\n// Or visit: https://github.com/PlanesZwalker/glsl-discord-bot` 
        })
      }
    } catch (error) {
      console.error('Error fetching shader code:', error)
      setSelectedShader({ 
        name: shaderName, 
        code: `// Error loading shader code.\n// Use /shader-code ${shaderName} in Discord to view the code.\n// Or visit: https://github.com/PlanesZwalker/glsl-discord-bot` 
      })
    } finally {
      setLoadingCode(false)
    }
  }

  const handleShaderClick = (shaderName: string) => {
    fetchShaderCode(shaderName)
  }

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
            {locale === 'fr' ? 'Galerie de Shaders' : 'Shader Gallery'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors">
            {locale === 'fr'
              ? 'Découvrez tous nos 100 shaders prédéfinis'
              : 'Discover all our 100 preset shaders'}
          </p>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-6 py-3 bg-discord-blurple hover:bg-discord-blurple-dark text-white font-semibold rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            {isOpen
              ? locale === 'fr'
                ? 'Masquer la galerie'
                : 'Hide gallery'
              : locale === 'fr'
              ? 'Afficher la galerie'
              : 'Show gallery'}
            <span className="text-xl">{isOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {isOpen && (
          <div className="mt-8 space-y-12">
            {Object.entries(shaderCategories).map(([key, category]) => (
              <div key={key}>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
                  {category.name}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {category.shaders.map((shader) => (
                    <div
                      key={shader.name}
                      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-discord-blurple transition-colors cursor-pointer shadow-sm dark:shadow-none"
                      onClick={() => handleShaderClick(shader.name)}
                    >
                      <div className="aspect-square bg-gray-100 dark:bg-gray-900 relative flex items-center justify-center group transition-colors">
                        {isOpen ? (
                          <>
                            <img
                              src={getGifUrl(shader.name)}
                              alt={shader.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {locale === 'fr' ? 'Cliquez pour voir le code' : 'Click to view code'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-gray-600 dark:text-gray-400 text-sm transition-colors">
                            {locale === 'fr' ? 'Cliquez pour voir' : 'Click to view'}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="text-gray-900 dark:text-white font-semibold mb-1 transition-colors">
                          {shader.name}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors">
                          {shader.description}
                        </p>
                        <p className="text-discord-blurple text-xs mt-2">
                          {locale === 'fr' ? 'Cliquez pour voir le code' : 'Click to view code'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code Modal */}
      {selectedShader && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedShader(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 transition-colors">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">
                {locale === 'fr' ? 'Code du shader' : 'Shader Code'}: {selectedShader.name}
              </h3>
              <button
                onClick={() => setSelectedShader(null)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {loadingCode ? (
                <div className="text-center py-8">
                  <div className="text-gray-600 dark:text-gray-400 transition-colors">
                    {locale === 'fr' ? 'Chargement du code...' : 'Loading code...'}
                  </div>
                </div>
              ) : (
                <pre className="bg-gray-50 dark:bg-gray-900 rounded p-4 overflow-x-auto border border-gray-200 dark:border-gray-700 transition-colors">
                  <code className="text-gray-800 dark:text-gray-300 text-sm font-mono whitespace-pre transition-colors">
                    {selectedShader.code}
                  </code>
                </pre>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center transition-colors">
              <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors">
                {locale === 'fr' 
                  ? `Utilisez \`/shader-preset ${selectedShader.name}\` dans Discord pour compiler ce shader`
                  : `Use \`/shader-preset ${selectedShader.name}\` in Discord to compile this shader`}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedShader.code)
                  alert(t.common.codeCopied)
                }}
                className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple-dark text-white rounded transition-colors text-sm"
              >
                {locale === 'fr' ? 'Copier le code' : 'Copy code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
