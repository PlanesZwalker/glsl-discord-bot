/**
 * Configuration de Production pour ShaderBot
 * Optimisé pour Render.com et déploiement en ligne
 */

module.exports = {
  // Configuration Discord
  discord: {
    intents: ['Guilds', 'GuildMessages', 'MessageContent'],
    presence: {
      activity: {
        name: '!shader help',
        type: 'PLAYING'
      }
    }
  },

  // Configuration WebGL
  webgl: {
    canvasWidth: 800,
    canvasHeight: 600,
    frameRate: 30,
    duration: 3, // secondes
    outputDir: './output'
  },

  // Configuration Base de Données
  database: {
    path: './data/shaders.db',
    maxConnections: 10,
    timeout: 30000
  },

  // Configuration Puppeteer (optimisé pour Render.com)
  puppeteer: {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process',
      '--disable-extensions'
    ],
    timeout: 30000
  },

  // Configuration des Logs
  logging: {
    level: 'info',
    maxFiles: 5,
    maxSize: '10m'
  },

  // Configuration de Sécurité
  security: {
    maxShaderLength: 10000,
    maxCompilationTime: 30000,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // max 100 requêtes par fenêtre
    }
  },

  // Configuration des Commandes
  commands: {
    prefix: '!shader',
    cooldown: 5000, // 5 secondes entre commandes
    maxArgs: 20
  }
};
