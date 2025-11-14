/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.discordapp.com', 'discord.com'],
  },
  // Exclure les GIFs du bundle serverless (ils sont servis depuis GitHub raw)
  // Note: outputFileTracingExcludes ne fonctionne pas toujours correctement
  // Les GIFs sont servis depuis GitHub raw dans ShaderGallery, pas depuis le système de fichiers
  experimental: {
    outputFileTracingExcludes: {
      // Exclure pour toutes les routes API
      '/api/**': [
        '../docs/**/*',
        '../data/**/*',
        '../output/**/*',
        '../cache/**/*',
        'docs/**/*',
        'data/**/*',
        'output/**/*',
        'cache/**/*',
      ],
      // Exclure spécifiquement pour la route image qui cause le problème
      '/api/shaders/[id]/image': [
        '../docs/**/*',
        '../data/**/*',
        '../output/**/*',
        '../cache/**/*',
      ],
    },
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    BOT_INVITE_URL: process.env.BOT_INVITE_URL || (process.env.DISCORD_CLIENT_ID ? `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8454144&scope=bot%20applications.commands` : ''),
  },
  // Note: Les variables NEXT_PUBLIC_* sont automatiquement exposées par Next.js
  // Assurez-vous que NEXT_PUBLIC_DISCORD_CLIENT_ID est défini dans Vercel
  // Optimize chunk loading to reduce NS_BINDING_ABORTED errors
  // Note: optimizeCss requires 'critters' package and can cause build errors
  // experimental: {
  //   optimizeCss: true,
  // },
  // Improve script loading
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Optimize webpack for better chunk loading
  webpack: (config, { isServer, dev }) => {
    // Improve chunk loading reliability
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      }
      
      // Améliorer la gestion des erreurs de chunks
      if (!dev) {
        // En production, utiliser des noms de chunks stables
        config.output = {
          ...config.output,
          chunkFilename: 'static/chunks/[name]-[contenthash].js',
        }
      }
    }
    return config
  },
  // Headers to improve caching and reduce abort errors
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/_next/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Note: Next.js gère automatiquement les nonces CSP pour les scripts inline
        // On n'a pas besoin de configurer CSP manuellement sauf pour des cas spécifiques
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  // Improve error handling for chunk loading
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig

