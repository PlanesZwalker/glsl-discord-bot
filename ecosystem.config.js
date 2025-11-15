/**
 * Configuration PM2 pour ShaderBot
 * Utilisation: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'glsl-discord-bot',
    script: 'bot.js',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};

