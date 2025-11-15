/**
 * Advanced Rate Limiter
 * Rate limiting avancé avec Redis et détection d'abus
 */

const Redis = require('ioredis');

class AdvancedRateLimiter {
    constructor(database) {
        this.redis = process.env.REDIS_URL 
            ? new Redis(process.env.REDIS_URL)
            : null;
        
        this.memoryCache = new Map(); // Fallback si pas de Redis
        this.database = database;
        
        // Limites par endpoint et par niveau
        this.limits = {
            'shader-compile': {
                free: { requests: 5, window: 86400 }, // 5/jour
                pro: { requests: -1, window: 86400 }, // Illimité
                studio: { requests: -1, window: 86400 }
            },
            'shader-preset': {
                free: { requests: 10, window: 86400 },
                pro: { requests: -1, window: 86400 },
                studio: { requests: -1, window: 86400 }
            },
            'api': {
                free: { requests: 100, window: 86400 },
                starter: { requests: 1000, window: 86400 },
                pro: { requests: 10000, window: 86400 },
                unlimited: { requests: -1, window: 86400 }
            }
        };
    }

    async checkLimit(userId, endpoint, userTier = 'free') {
        const limit = this.limits[endpoint]?.[userTier];
        if (!limit) {
            return { allowed: false, error: 'Invalid endpoint or tier' };
        }
        
        // Si illimité
        if (limit.requests === -1) {
            return { allowed: true, remaining: -1 };
        }
        
        const key = `ratelimit:${endpoint}:${userId}`;
        
        if (this.redis) {
            return await this.checkRedis(key, limit);
        } else {
            return this.checkMemory(key, limit);
        }
    }

    async checkRedis(key, limit) {
        const current = await this.redis.incr(key);
        
        // Définir l'expiration lors de la première requête
        if (current === 1) {
            await this.redis.expire(key, limit.window);
        }
        
        if (current > limit.requests) {
            const ttl = await this.redis.ttl(key);
            return {
                allowed: false,
                error: 'Rate limit exceeded',
                retryAfter: ttl,
                remaining: 0
            };
        }
        
        return {
            allowed: true,
            remaining: limit.requests - current,
            resetAt: Date.now() + (await this.redis.ttl(key)) * 1000
        };
    }

    checkMemory(key, limit) {
        const now = Date.now();
        
        if (!this.memoryCache.has(key)) {
            this.memoryCache.set(key, {
                count: 1,
                resetAt: now + (limit.window * 1000)
            });
            return { allowed: true, remaining: limit.requests - 1 };
        }
        
        const data = this.memoryCache.get(key);
        
        // Reset si la fenêtre est expirée
        if (now > data.resetAt) {
            this.memoryCache.set(key, {
                count: 1,
                resetAt: now + (limit.window * 1000)
            });
            return { allowed: true, remaining: limit.requests - 1 };
        }
        
        // Incrémenter
        data.count++;
        
        if (data.count > limit.requests) {
            return {
                allowed: false,
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil((data.resetAt - now) / 1000),
                remaining: 0
            };
        }
        
        return {
            allowed: true,
            remaining: limit.requests - data.count,
            resetAt: data.resetAt
        };
    }

    // Détecter les abus
    async detectAbuse(userId, ip = null) {
        const key = `abuse:${userId}`;
        
        if (this.redis) {
            const count = await this.redis.incr(key);
            await this.redis.expire(key, 3600); // 1 heure
            
            // Si plus de 100 requêtes rejetées en 1h = abus
            if (count > 100) {
                await this.banUser(userId, 'Abuse detected: Too many rejected requests', ip);
                return true;
            }
        }
        
        return false;
    }

    async banUser(userId, reason, ip = null) {
        if (!this.database) {
            console.warn('🚫 User banned (no database):', userId, reason);
            return;
        }

        try {
            await this.database.banUser(userId, reason, null, ip, 24); // 24 heures
            
            console.warn(`🚫 User banned: ${userId} - ${reason}`);
            
            // Logger dans audit
            const { getAuditLogger } = require('./auditLogger');
            const auditLogger = getAuditLogger();
            await auditLogger.log('USER_BANNED', {
                userId,
                reason,
                ip,
                severity: 'HIGH'
            });
        } catch (error) {
            console.error('❌ Erreur bannissement utilisateur:', error);
        }
    }

    async isBanned(userId) {
        if (!this.database) {
            return { banned: false };
        }

        try {
            const ban = await this.database.isUserBanned(userId);
            if (ban) {
                return { 
                    banned: true, 
                    reason: ban.reason,
                    bannedAt: ban.banned_at,
                    bannedUntil: ban.banned_until
                };
            }
        } catch (error) {
            console.error('❌ Erreur vérification ban:', error);
        }
        
        return { banned: false };
    }
}

// Singleton
let rateLimiterInstance = null;

function getAdvancedRateLimiter(database) {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new AdvancedRateLimiter(database);
    }
    return rateLimiterInstance;
}

module.exports = { AdvancedRateLimiter, getAdvancedRateLimiter };

