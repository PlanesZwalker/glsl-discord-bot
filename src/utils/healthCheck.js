/**
 * Health Check Avancé - Vérifie l'état de tous les composants critiques
 */

const os = require('os');
const fs = require('fs').promises;
const { Logger } = require('./logger');

/**
 * Vérifie l'état de santé complet du système
 */
async function checkHealth(dependencies = {}) {
    const { database, browserPool, cacheManager, bot } = dependencies;

    const checks = await Promise.allSettled([
        checkDatabase(database),
        checkBrowserPool(browserPool),
        checkDiskSpace(),
        checkMemory(),
        checkCache(cacheManager),
        checkBot(bot)
    ]);

    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || 'unknown',
        checks: {}
    };

    const checkNames = ['database', 'browserPool', 'disk', 'memory', 'cache', 'bot'];

    checks.forEach((result, index) => {
        const name = checkNames[index];
        health.checks[name] = result.status === 'fulfilled'
            ? result.value
            : {
                status: 'unhealthy',
                error: result.reason?.message || 'Unknown error'
            };

        if (result.status === 'rejected') {
            health.status = 'degraded';
        } else if (result.value?.status === 'unhealthy' || result.value?.status === 'warning') {
            if (health.status === 'healthy') {
                health.status = result.value.status;
            }
        }
    });

    return health;
}

/**
 * Vérifie la base de données
 */
async function checkDatabase(database) {
    if (!database) {
        return { status: 'unhealthy', error: 'Database not initialized' };
    }

    try {
        const start = Date.now();
        // Test simple de connexion
        await database.getStats();
        const responseTime = Date.now() - start;

        return {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            type: 'SQLite'
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

/**
 * Vérifie le browser pool
 */
async function checkBrowserPool(browserPool) {
    if (!browserPool) {
        return { status: 'unhealthy', error: 'Browser pool not initialized' };
    }

    try {
        const stats = browserPool.getStats();
        const hasAvailable = stats.activeInstances < stats.maxInstances;

        return {
            status: hasAvailable ? 'healthy' : 'warning',
            available: stats.maxInstances - stats.activeInstances,
            total: stats.maxInstances,
            active: stats.activeInstances,
            waiting: stats.waitingQueue
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

/**
 * Vérifie l'espace disque
 */
async function checkDiskSpace() {
    try {
        const stats = await fs.statfs ? await fs.statfs('.') : null;
        
        // Fallback pour Windows/autres systèmes
        if (!stats) {
            return {
                status: 'healthy',
                note: 'Disk space check not available on this platform'
            };
        }

        const total = stats.blocks * stats.bsize;
        const available = stats.bavail * stats.bsize;
        const used = total - available;
        const percentUsed = (used / total) * 100;

        return {
            status: percentUsed < 90 ? 'healthy' : percentUsed < 95 ? 'warning' : 'unhealthy',
            used: `${(used / 1024 / 1024 / 1024).toFixed(2)} GB`,
            total: `${(total / 1024 / 1024 / 1024).toFixed(2)} GB`,
            available: `${(available / 1024 / 1024 / 1024).toFixed(2)} GB`,
            percentUsed: `${percentUsed.toFixed(2)}%`
        };
    } catch (error) {
        return {
            status: 'warning',
            error: error.message,
            note: 'Could not check disk space'
        };
    }
}

/**
 * Vérifie la mémoire
 */
async function checkMemory() {
    try {
        const used = process.memoryUsage();
        const total = os.totalmem();
        const percentUsed = (used.heapUsed / total) * 100;

        return {
            status: percentUsed < 80 ? 'healthy' : percentUsed < 90 ? 'warning' : 'unhealthy',
            heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`,
            external: `${(used.external / 1024 / 1024).toFixed(2)} MB`,
            percentUsed: `${percentUsed.toFixed(2)}%`,
            systemTotal: `${(total / 1024 / 1024 / 1024).toFixed(2)} GB`
        };
    } catch (error) {
        return {
            status: 'warning',
            error: error.message
        };
    }
}

/**
 * Vérifie le cache
 */
async function checkCache(cacheManager) {
    if (!cacheManager) {
        return { status: 'healthy', note: 'Cache not configured' };
    }

    try {
        const stats = cacheManager.getStats();
        return {
            status: 'healthy',
            hitRate: stats.hitRate,
            hits: stats.hits,
            misses: stats.misses,
            usingRedis: stats.usingRedis,
            memorySize: stats.memorySize || 0
        };
    } catch (error) {
        return {
            status: 'warning',
            error: error.message
        };
    }
}

/**
 * Vérifie l'état du bot Discord
 */
async function checkBot(bot) {
    if (!bot) {
        return { status: 'unhealthy', error: 'Bot not initialized' };
    }

    try {
        const isReady = bot.client?.isReady() || false;
        const user = bot.client?.user;

        return {
            status: isReady ? 'healthy' : 'warning',
            ready: isReady,
            user: user ? {
                username: user.username,
                id: user.id,
                tag: user.tag
            } : null,
            commands: bot.commands?.size || 0
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

module.exports = { checkHealth };

