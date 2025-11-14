'use client'

import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useLocale } from '@/hooks/useLocale'
import { getTranslations } from '@/lib/i18n'

export default function InstallPage() {
  const { locale } = useLocale()
  const t = getTranslations(locale)

  const getBotInviteUrl = () => {
    // Priorité 1: URL personnalisée si définie
    const inviteUrl = process.env.NEXT_PUBLIC_BOT_INVITE_URL
    if (inviteUrl) return inviteUrl
    
    // Priorité 2: Générer l'URL avec le Client ID
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    if (clientId) {
      // Permissions: Send Messages (2048) + Attach Files (32768) + Embed Links (16384) + Read Message History (65536) = 8454144
      const permissions = '8454144' // Permissions recommandées pour le bot
      return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`
    }
    
    // Fallback: return a placeholder that will show an error message
    return '#'
  }
  
  const botInviteUrl = getBotInviteUrl()
  const isInviteUrlValid = botInviteUrl !== '#' && process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID

  const steps = [
    t.install.steps.step1,
    t.install.steps.step2,
    t.install.steps.step3,
    t.install.steps.step4,
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black transition-colors">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
            {t.install.title}
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 transition-colors">
            {t.install.subtitle}
          </p>
          {t.install.description && (
            <p className="text-base text-gray-600 dark:text-gray-400 mt-4 max-w-2xl mx-auto transition-colors">
              {t.install.description}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 mb-8 transition-colors shadow-sm dark:shadow-none">
          {isInviteUrlValid ? (
            <a
              href={botInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-discord-blurple hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold text-center transition-colors mb-8"
            >
              {t.install.button}
            </a>
          ) : (
            <div className="mb-8">
              <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-8 py-4 rounded-lg text-lg font-semibold text-center cursor-not-allowed mb-4 transition-colors">
                {t.install.button}
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 transition-colors">
                <p className="text-yellow-800 dark:text-yellow-300 text-sm transition-colors">
                  {locale === 'fr' 
                    ? '⚠️ NEXT_PUBLIC_DISCORD_CLIENT_ID n\'est pas configuré. Veuillez ajouter cette variable d\'environnement dans Vercel.'
                    : '⚠️ NEXT_PUBLIC_DISCORD_CLIENT_ID is not configured. Please add this environment variable in Vercel.'}
                </p>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
            {t.install.steps.title}
          </h2>
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-discord-blurple text-white rounded-full flex items-center justify-center font-bold mr-4">
                  {index + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300 text-lg transition-colors">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </main>
      <Footer />
    </div>
  )
}

