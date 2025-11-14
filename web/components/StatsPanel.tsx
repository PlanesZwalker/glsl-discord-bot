'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface StatsPanelProps {
  stats: any
  loading: boolean
  t: any
  locale: string
}

export function StatsPanel({ stats, loading, t, locale }: StatsPanelProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-900 dark:text-white text-xl transition-colors">
          {locale === 'fr' ? 'Chargement des statistiques...' : 'Loading statistics...'}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm">
        <p className="text-gray-600 dark:text-gray-400 transition-colors">
          {locale === 'fr' ? 'Aucune statistique disponible' : 'No statistics available'}
        </p>
      </div>
    )
  }

  // Format data for charts
  const chartData = stats.shadersByDate?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' }),
    count: item.count
  })) || []

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">
            {locale === 'fr' ? 'Total Shaders' : 'Total Shaders'}
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">
            {stats.totalShaders || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 transition-colors">
            {locale === 'fr' ? 'Vos shaders' : 'Your shaders'}: {stats.userShaders || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">
            {locale === 'fr' ? 'Total Likes' : 'Total Likes'}
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">
            {stats.totalLikes || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 transition-colors">
            {locale === 'fr' ? 'Vos likes' : 'Your likes'}: {stats.userLikes || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">
            {locale === 'fr' ? 'Total Vues' : 'Total Views'}
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">
            {stats.totalViews || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 transition-colors">
            {locale === 'fr' ? 'Vos vues' : 'Your views'}: {stats.userViews || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">
            {locale === 'fr' ? 'Shaders (30j)' : 'Shaders (30d)'}
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">
            {stats.shadersByDate?.reduce((sum: number, item: any) => sum + item.count, 0) || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 transition-colors">
            {locale === 'fr' ? '30 derniers jours' : 'Last 30 days'}
          </div>
        </div>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">
            {locale === 'fr' ? 'Shaders créés (30 derniers jours)' : 'Shaders Created (Last 30 Days)'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#5865F2" strokeWidth={2} name={locale === 'fr' ? 'Shaders' : 'Shaders'} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Shaders */}
      {stats.topShaders && stats.topShaders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors">
            {locale === 'fr' ? 'Top Shaders' : 'Top Shaders'}
          </h3>
          <div className="space-y-2">
            {stats.topShaders.map((shader: any, index: number) => (
              <div
                key={shader.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-discord-blurple">#{index + 1}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white transition-colors">
                      {shader.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 transition-colors">
                      {new Date(shader.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400 transition-colors">
                    ❤️ {shader.likes}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 transition-colors">
                    👁️ {shader.views}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

