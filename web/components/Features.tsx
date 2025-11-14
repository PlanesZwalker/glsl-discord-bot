'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { getTranslations } from '@/lib/i18n'

export function Features() {
  const { locale } = useLocale()
  const t = getTranslations(locale)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const features = [
    {
      icon: '⚡',
      title: t.features.compile.title,
      description: t.features.compile.desc,
      details: t.features.compile.details,
      command: t.features.compile.command,
      example: t.features.compile.example,
    },
    {
      icon: '🎨',
      title: t.features.presets.title,
      description: t.features.presets.desc,
      details: t.features.presets.details,
      command: t.features.presets.command,
      example: t.features.presets.example,
    },
    {
      icon: '✨',
      title: t.features.generate.title,
      description: t.features.generate.desc,
      details: t.features.generate.details,
      command: t.features.generate.command,
      example: t.features.generate.example,
    },
    {
      icon: '📝',
      title: t.features.code.title,
      description: t.features.code.desc,
      details: t.features.code.details,
      command: t.features.code.command,
      example: t.features.code.example,
    },
  ]

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-12 transition-colors">
          {t.features.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-discord-blurple transition-colors shadow-sm dark:shadow-none"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{feature.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3 transition-colors">{feature.description}</p>
                  
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    className="text-discord-blurple hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium mb-3 transition-colors"
                  >
                    {expandedIndex === index
                      ? locale === 'fr'
                        ? 'Masquer les détails'
                        : 'Hide details'
                      : locale === 'fr'
                      ? 'Voir les détails'
                      : 'Show details'}
                  </button>

                  {expandedIndex === index && (
                    <div className="mt-4 space-y-3 animate-fadeIn">
                      <div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 transition-colors">{feature.details}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700 transition-colors">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 transition-colors">
                          {locale === 'fr' ? 'Commande:' : 'Command:'}
                        </p>
                        <code className="text-discord-blurple text-sm font-mono">
                          {feature.command}
                        </code>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700 transition-colors">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 transition-colors">
                          {locale === 'fr' ? 'Exemple:' : 'Example:'}
                        </p>
                        <code className="text-gray-800 dark:text-gray-300 text-xs font-mono break-all transition-colors">
                          {feature.example}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

