/**
 * Admin Commands - Commandes administrateur pour gérer le bot
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Logger } = require('../src/utils/logger');
const { getMetrics } = require('../src/metrics');
const { getBrowserPool } = require('../src/browser-pool');
const { getShaderCache } = require('../src/shader-cache');
const { getRateLimiter } = require('../src/utils/rateLimiter');
const { getShaderQueue } = require('../src/shader-queue');

// IDs des administrateurs (à mettre dans .env)
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').filter(id => id.trim());

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Commandes administrateur')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Statistiques détaillées du bot'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Nettoyer les vieux shaders et le cache'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restart-pool')
                .setDescription('Redémarrer le pool de browsers'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset-rate-limit')
                .setDescription('Réinitialiser les rate limits d\'un utilisateur')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Utilisateur (optionnel, tous si non spécifié)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cache-stats')
                .setDescription('Statistiques du cache')),

    async execute(interaction, { database }) {
        await interaction.deferReply({ ephemeral: true });

        // Vérifier si admin
        if (!ADMIN_IDS.includes(interaction.user.id)) {
            return interaction.editReply({
                content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'stats':
                    await this.handleStats(interaction, database);
                    break;

                case 'cleanup':
                    await this.handleCleanup(interaction, database);
                    break;

                case 'restart-pool':
                    await this.handleRestartPool(interaction);
                    break;

                case 'reset-rate-limit':
                    await this.handleResetRateLimit(interaction);
                    break;

                case 'cache-stats':
                    await this.handleCacheStats(interaction);
                    break;

                default:
                    await interaction.editReply({
                        content: '❌ Sous-commande inconnue.',
                    });
            }
        } catch (error) {
            Logger.error('Admin command failed', error);
            await interaction.editReply({
                content: `❌ Erreur: ${error.message}`,
            });
        }
    },

    async handleStats(interaction, database) {
        const metrics = getMetrics();
        const browserPool = getBrowserPool();
        const shaderCache = getShaderCache();
        const rateLimiter = getRateLimiter();
        const shaderQueue = getShaderQueue();

        const metricsStats = metrics.getStats();
        const poolStats = browserPool.getStats();
        const cacheStats = shaderCache.getStats();
        const rateLimitStats = rateLimiter.getStats();
        const queueStats = shaderQueue.getStats();

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📊 Statistiques Détaillées du Bot')
            .addFields(
                { name: '🎨 Compilations', value: `Total: ${metricsStats.totalCompilations}\nSuccès: ${metricsStats.successCount}\nÉchecs: ${metricsStats.failureCount}\nTaux: ${metricsStats.successRate}`, inline: true },
                { name: '⏱️ Performance', value: `Temps moyen: ${metricsStats.averageCompilationTime}\nActives: ${metricsStats.activeCompilations}`, inline: true },
                { name: '🌐 Browser Pool', value: `Pool: ${poolStats.poolSize}\nActifs: ${poolStats.activeInstances}/${poolStats.maxInstances}\nEn attente: ${poolStats.waitingQueue}`, inline: true },
                { name: '💾 Cache', value: `Fichiers: ${cacheStats.fileCount}\nTaille: ${cacheStats.totalSizeMB} MB\nMémoire: ${cacheStats.memoryCacheSize}`, inline: true },
                { name: '⏱️ Rate Limiting', value: `Utilisateurs actifs: ${rateLimitStats.activeUsers}\nGlobal: ${rateLimitStats.globalCount}/${rateLimitStats.globalResetIn}s`, inline: true },
                { name: '🔄 Queue', value: `En file: ${queueStats.queueLength}\nTraitement: ${queueStats.processing}\nTemps attente: ${queueStats.avgWaitTime}s`, inline: true }
            )
            .setFooter({ text: 'GLSL Discord Bot - Admin' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleCleanup(interaction, database) {
        const shaderCache = getShaderCache();
        const cleaned = shaderCache.cleanExpired();

        await interaction.editReply({
            content: `✅ Nettoyage effectué!\n🧹 ${cleaned} fichiers de cache expirés supprimés.`,
        });
    },

    async handleRestartPool(interaction) {
        const browserPool = getBrowserPool();
        await browserPool.closeAll();

        await interaction.editReply({
            content: '✅ Pool de browsers redémarré! Les prochaines compilations créeront de nouveaux browsers.',
        });
    },

    async handleResetRateLimit(interaction) {
        const user = interaction.options.getUser('user');
        const rateLimiter = getRateLimiter();

        if (user) {
            rateLimiter.resetUser(user.id);
            await interaction.editReply({
                content: `✅ Rate limits réinitialisés pour ${user.username}.`,
            });
        } else {
            // Réinitialiser tous les rate limits
            rateLimiter.userLimits.clear();
            await interaction.editReply({
                content: '✅ Tous les rate limits ont été réinitialisés.',
            });
        }
    },

    async handleCacheStats(interaction) {
        const shaderCache = getShaderCache();
        const stats = shaderCache.getStats();

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('💾 Statistiques du Cache')
            .addFields(
                { name: '📁 Fichiers', value: `${stats.fileCount}`, inline: true },
                { name: '💾 Taille Totale', value: `${stats.totalSizeMB} MB`, inline: true },
                { name: '🧠 Cache Mémoire', value: `${stats.memoryCacheSize} entrées`, inline: true },
                { name: '📂 Répertoire', value: stats.cacheDir, inline: false }
            )
            .setFooter({ text: 'GLSL Discord Bot - Admin' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

