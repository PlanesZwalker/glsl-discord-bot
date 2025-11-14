/**
 * Graceful Shutdown Handler - Arrêt propre du serveur
 * Gère SIGTERM, SIGINT, et les exceptions non capturées
 */

const { Logger } = require('./logger');

class GracefulShutdown {
    constructor(options = {}) {
        this.isShuttingDown = false;
        this.activeRequests = new Set();
        this.shutdownTimeout = options.shutdownTimeout || 30000; // 30 secondes par défaut
        this.cleanupFunctions = [];
        this.setupHandlers();
    }

    /**
     * Configure les handlers de signaux
     */
    setupHandlers() {
        process.on('SIGTERM', () => this.shutdown('SIGTERM'));
        process.on('SIGINT', () => this.shutdown('SIGINT'));
        
        process.on('uncaughtException', (error) => {
            Logger.error('Uncaught exception', error);
            this.shutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            Logger.error('Unhandled rejection', reason);
            // Ne pas arrêter le processus pour les rejections non gérées
            // mais logger l'erreur
        });
    }

    /**
     * Enregistre une fonction de nettoyage
     */
    registerCleanup(name, cleanupFn) {
        this.cleanupFunctions.push({ name, fn: cleanupFn });
        Logger.info(`Registered cleanup function: ${name}`);
    }

    /**
     * Démarre l'arrêt gracieux
     */
    async shutdown(signal) {
        if (this.isShuttingDown) {
            Logger.warn('Shutdown already in progress, forcing exit');
            process.exit(1);
            return;
        }

        Logger.info(`\n🛑 Received ${signal}, starting graceful shutdown...`);
        this.isShuttingDown = true;

        // Arrêter d'accepter de nouvelles requêtes
        if (global.server) {
            global.server.close(() => {
                Logger.info('✅ HTTP server closed');
            });
        }

        // Attendre que les requêtes en cours se terminent
        Logger.info(`⏳ Waiting for ${this.activeRequests.size} active requests...`);

        const timeout = setTimeout(() => {
            Logger.warn('⚠️ Force shutdown after timeout');
            process.exit(1);
        }, this.shutdownTimeout);

        // Attendre que les requêtes se terminent
        while (this.activeRequests.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        clearTimeout(timeout);
        Logger.info('✅ All active requests completed');

        // Nettoyer les ressources
        await this.cleanup();

        Logger.info('✅ Graceful shutdown completed');
        process.exit(0);
    }

    /**
     * Nettoie toutes les ressources enregistrées
     */
    async cleanup() {
        Logger.info('🧹 Cleaning up resources...');

        for (const { name, fn } of this.cleanupFunctions) {
            try {
                Logger.info(`Cleaning up: ${name}`);
                await fn();
                Logger.info(`✅ ${name} cleaned up`);
            } catch (error) {
                Logger.error(`Error cleaning up ${name}`, error);
            }
        }
    }

    /**
     * Suit une requête active
     */
    trackRequest(requestId) {
        if (this.isShuttingDown) {
            return () => {}; // Ne pas tracker si on est en train de s'arrêter
        }

        this.activeRequests.add(requestId);
        return () => {
            this.activeRequests.delete(requestId);
        };
    }

    /**
     * Crée un middleware Express pour tracker les requêtes
     */
    middleware() {
        return (req, res, next) => {
            if (this.isShuttingDown) {
                return res.status(503).json({
                    error: 'Service is shutting down',
                    retryAfter: Math.ceil(this.shutdownTimeout / 1000)
                });
            }

            const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const done = this.trackRequest(requestId);

            res.on('finish', done);
            res.on('close', done);

            next();
        };
    }
}

// Singleton instance
let gracefulShutdownInstance = null;

function getGracefulShutdown(options) {
    if (!gracefulShutdownInstance) {
        gracefulShutdownInstance = new GracefulShutdown(options);
    }
    return gracefulShutdownInstance;
}

module.exports = { GracefulShutdown, getGracefulShutdown };

