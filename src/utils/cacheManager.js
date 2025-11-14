/**
 * Cache Manager - Cache intelligent avec Redis ou fallback mémoire
 * Supporte TTL, invalidation par pattern, et statistiques
 */

const { Logger } = require('./logger');
const crypto = require('crypto');

class CacheManager {
    constructor() {
        this.redis = null;
        this.memoryCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        this.maxMemorySize = 100; // Limite du cache mémoire
        
        this.initRedis();
    }

    /**
     * Initialise Redis si disponible
     */
    async initRedis() {
        try {
            if (process.env.REDIS_URL) {
                const Redis = require('ioredis');
                this.redis = new Redis(process.env.REDIS_URL, {
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                    maxRetriesPerRequest: 3
                });

                this.redis.on('error', (err) => {
                    Logger.warn('Redis connection error, falling back to memory cache', err);
                    this.redis = null;
                });

                this.redis.on('connect', () => {
                    Logger.info('✅ Redis connected');
                });

                // Tester la connexion
                await this.redis.ping();
                Logger.info('✅ Redis cache enabled');
            } else {
                Logger.info('Redis not configured, using memory cache');
            }
        } catch (error) {
            Logger.warn('Redis initialization failed, using memory cache', error);
            this.redis = null;
        }
    }

    /**
     * Génère une clé de cache à partir d'une chaîne
     */
    generateKey(prefix, data) {
        const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
        return `${prefix}:${hash}`;
    }

    /**
     * Récupère une valeur du cache
     */
    async get(key) {
        try {
            if (this.redis) {
                const value = await this.redis.get(key);
                if (value) {
                    this.cacheStats.hits++;
                    return JSON.parse(value);
                }
            } else {
                // Fallback to memory cache
                if (this.memoryCache.has(key)) {
                    const cached = this.memoryCache.get(key);
                    if (Date.now() < cached.expiresAt) {
                        this.cacheStats.hits++;
                        return cached.value;
                    }
                    // Expiré, supprimer
                    this.memoryCache.delete(key);
                }
            }
            this.cacheStats.misses++;
            return null;
        } catch (error) {
            Logger.error('Cache get error', error);
            this.cacheStats.misses++;
            return null;
        }
    }

    /**
     * Stocke une valeur dans le cache
     */
    async set(key, value, ttl = 3600) {
        try {
            if (this.redis) {
                await this.redis.setex(key, ttl, JSON.stringify(value));
            } else {
                // Memory cache with TTL
                this.memoryCache.set(key, {
                    value,
                    expiresAt: Date.now() + (ttl * 1000)
                });

                // Limiter la taille du cache mémoire
                if (this.memoryCache.size > this.maxMemorySize) {
                    // Supprimer le plus ancien (FIFO)
                    const firstKey = this.memoryCache.keys().next().value;
                    this.memoryCache.delete(firstKey);
                }
            }
            this.cacheStats.sets++;
        } catch (error) {
            Logger.error('Cache set error', error);
        }
    }

    /**
     * Supprime une clé du cache
     */
    async delete(key) {
        try {
            if (this.redis) {
                await this.redis.del(key);
            } else {
                this.memoryCache.delete(key);
            }
            this.cacheStats.deletes++;
        } catch (error) {
            Logger.error('Cache delete error', error);
        }
    }

    /**
     * Invalide les clés correspondant à un pattern
     */
    async invalidate(pattern) {
        try {
            if (this.redis) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    Logger.info(`Invalidated ${keys.length} cache keys matching ${pattern}`);
                }
            } else {
                let deleted = 0;
                const patternStr = pattern.replace(/\*/g, '.*');
                const regex = new RegExp(`^${patternStr}$`);
                
                for (const key of this.memoryCache.keys()) {
                    if (regex.test(key)) {
                        this.memoryCache.delete(key);
                        deleted++;
                    }
                }
                Logger.info(`Invalidated ${deleted} cache keys matching ${pattern}`);
            }
        } catch (error) {
            Logger.error('Cache invalidate error', error);
        }
    }

    /**
     * Nettoie les entrées expirées du cache mémoire
     */
    cleanExpired() {
        if (this.redis) return 0; // Redis gère automatiquement

        let cleaned = 0;
        const now = Date.now();

        for (const [key, cached] of this.memoryCache.entries()) {
            if (now >= cached.expiresAt) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            Logger.info(`Cleaned ${cleaned} expired cache entries`);
        }

        return cleaned;
    }

    /**
     * Obtient les statistiques du cache
     */
    getStats() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        const hitRate = total > 0 
            ? ((this.cacheStats.hits / total) * 100).toFixed(2)
            : '0.00';

        return {
            ...this.cacheStats,
            hitRate: `${hitRate}%`,
            memorySize: this.memoryCache.size,
            usingRedis: this.redis !== null
        };
    }

    /**
     * Réinitialise les statistiques
     */
    resetStats() {
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }
}

// Singleton instance
let cacheManagerInstance = null;

function getCacheManager() {
    if (!cacheManagerInstance) {
        cacheManagerInstance = new CacheManager();
        
        // Nettoyer les entrées expirées toutes les 5 minutes
        setInterval(() => {
            cacheManagerInstance.cleanExpired();
        }, 300000);
    }
    return cacheManagerInstance;
}

module.exports = { CacheManager, getCacheManager };

