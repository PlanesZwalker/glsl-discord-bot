/**
 * Webhook Manager - Envoie des notifications via webhooks Discord
 * Support pour erreurs, statistiques, et analytics
 */

const { Logger } = require('./logger');

class WebhookManager {
    constructor() {
        this.webhooks = {
            errors: process.env.WEBHOOK_ERRORS,
            compilations: process.env.WEBHOOK_COMPILATIONS,
            analytics: process.env.WEBHOOK_ANALYTICS
        };
        this.enabled = Object.values(this.webhooks).some(url => url);
    }

    /**
     * Envoie une erreur via webhook
     */
    async sendError(error, context = {}) {
        if (!this.webhooks.errors) return;

        try {
            const embed = {
                title: '🚨 Erreur Détectée',
                color: 0xFF0000,
                fields: [
                    { name: 'Message', value: error.message || 'Unknown error', inline: false },
                    { name: 'Timestamp', value: new Date().toISOString(), inline: true }
                ],
                timestamp: new Date().toISOString()
            };

            // Ajouter la stack trace si disponible
            if (error.stack) {
                const stack = error.stack.length > 1000 
                    ? error.stack.slice(0, 1000) + '...'
                    : error.stack;
                embed.fields.push({ 
                    name: 'Stack', 
                    value: `\`\`\`${stack}\`\`\``, 
                    inline: false 
                });
            }

            // Ajouter le contexte si disponible
            if (Object.keys(context).length > 0) {
                const contextStr = JSON.stringify(context, null, 2);
                const truncated = contextStr.length > 1000 
                    ? contextStr.slice(0, 1000) + '...'
                    : contextStr;
                embed.fields.push({ 
                    name: 'Context', 
                    value: `\`\`\`json\n${truncated}\n\`\`\``, 
                    inline: false 
                });
            }

            await this.send(this.webhooks.errors, { embeds: [embed] });
        } catch (err) {
            Logger.error('Failed to send error webhook', err);
        }
    }

    /**
     * Envoie des statistiques de compilation
     */
    async sendCompilationStats(stats) {
        if (!this.webhooks.compilations) return;

        try {
            const embed = {
                title: '📊 Statistiques de Compilation',
                color: 0x00FF00,
                fields: [
                    { name: 'Total', value: stats.total?.toString() || '0', inline: true },
                    { name: 'Réussis', value: stats.success?.toString() || '0', inline: true },
                    { name: 'Échoués', value: stats.failed?.toString() || '0', inline: true },
                    { name: 'Temps Moyen', value: `${stats.avgDuration || 0}ms`, inline: true },
                    { name: 'Taux de Réussite', value: `${stats.successRate || 0}%`, inline: true }
                ],
                timestamp: new Date().toISOString()
            };

            await this.send(this.webhooks.compilations, { embeds: [embed] });
        } catch (error) {
            Logger.error('Failed to send compilation stats webhook', error);
        }
    }

    /**
     * Envoie des analytics
     */
    async sendAnalytics(analytics) {
        if (!this.webhooks.analytics) return;

        try {
            const embed = {
                title: '📈 Analytics Report',
                color: 0x3498DB,
                fields: [
                    { name: 'Total Compilations', value: analytics.totalCompilations?.toString() || '0', inline: true },
                    { name: 'Active Users', value: analytics.activeUsers?.toString() || '0', inline: true },
                    { name: 'Avg Response Time', value: `${analytics.avgResponseTime || 0}ms`, inline: true },
                    { name: 'Success Rate', value: `${analytics.successRate || 0}%`, inline: true }
                ],
                timestamp: new Date().toISOString()
            };

            await this.send(this.webhooks.analytics, { embeds: [embed] });
        } catch (error) {
            Logger.error('Failed to send analytics webhook', error);
        }
    }

    /**
     * Envoie un message personnalisé
     */
    async send(url, data) {
        if (!url) return;

        try {
            const fetch = require('node-fetch');
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Webhook returned ${response.status}`);
            }
        } catch (error) {
            Logger.error('Webhook send failed', error);
            throw error;
        }
    }

    /**
     * Vérifie si les webhooks sont configurés
     */
    isEnabled() {
        return this.enabled;
    }
}

// Singleton instance
let webhookManagerInstance = null;

function getWebhookManager() {
    if (!webhookManagerInstance) {
        webhookManagerInstance = new WebhookManager();
    }
    return webhookManagerInstance;
}

module.exports = { WebhookManager, getWebhookManager };

