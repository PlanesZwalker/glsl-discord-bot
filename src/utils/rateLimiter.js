/**
 * RateLimiter - Système de rate limiting amélioré par utilisateur et global
 */

class RateLimiter {
    constructor() {
        this.userLimits = new Map();
        this.globalLimit = { count: 0, resetAt: Date.now() + 60000 };
        this.commandLimits = {
            'shader': 3,           // 3 compilations custom par minute
            'shader-preset': 5,    // 5 presets par minute
            'shader-generate': 2,  // 2 générations par minute
            'shader-code': 10,     // 10 consultations de code par minute
            'help': 20,            // 20 helps par minute
            'reuse': 5,            // 5 réutilisations par minute
            'gallery': 5,          // 5 galeries par minute
            'stats': 10            // 10 stats par minute
        };
        this.globalMaxPerMinute = 50;

        // Nettoyer les anciennes entrées toutes les 5 minutes
        this.startCleanup();
    }

    /**
     * Vérifie si une requête est autorisée
     */
    checkLimit(userId, commandName) {
        const now = Date.now();

        // Vérifier limite globale
        if (this.globalLimit.count >= this.globalMaxPerMinute) {
            if (now < this.globalLimit.resetAt) {
                return {
                    allowed: false,
                    reason: 'Le bot est surchargé. Réessayez dans quelques secondes.',
                    retryAfter: Math.ceil((this.globalLimit.resetAt - now) / 1000)
                };
            }
            // Reset global limit
            this.globalLimit = { count: 0, resetAt: now + 60000 };
        }

        // Vérifier limite par utilisateur
        const userKey = `${userId}-${commandName}`;
        const userLimit = this.userLimits.get(userKey);
        const commandLimit = this.getCommandLimit(commandName);

        if (userLimit) {
            if (now < userLimit.resetAt) {
                if (userLimit.count >= commandLimit) {
                    return {
                        allowed: false,
                        reason: `Vous avez atteint la limite de ${commandLimit} utilisations de \`/${commandName}\` par minute.`,
                        retryAfter: Math.ceil((userLimit.resetAt - now) / 1000)
                    };
                }
                userLimit.count++;
            } else {
                // Reset user limit
                this.userLimits.set(userKey, { count: 1, resetAt: now + 60000 });
            }
        } else {
            // Nouvelle entrée
            this.userLimits.set(userKey, { count: 1, resetAt: now + 60000 });
        }

        // Incrémenter le compteur global
        this.globalLimit.count++;

        return { allowed: true };
    }

    /**
     * Obtient la limite pour une commande
     */
    getCommandLimit(commandName) {
        return this.commandLimits[commandName] || 5;
    }

    /**
     * Démarre le nettoyage automatique
     */
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;

            for (const [key, value] of this.userLimits.entries()) {
                // Supprimer les entrées expirées depuis plus d'une minute
                if (now > value.resetAt + 60000) {
                    this.userLimits.delete(key);
                    cleaned++;
                }
            }

            if (cleaned > 0) {
                console.log(`🧹 RateLimiter: ${cleaned} entrées expirées supprimées`);
            }
        }, 300000); // Toutes les 5 minutes
    }

    /**
     * Obtient les statistiques du rate limiter
     */
    getStats() {
        return {
            activeUsers: this.userLimits.size,
            globalCount: this.globalLimit.count,
            globalResetIn: Math.ceil((this.globalLimit.resetAt - Date.now()) / 1000),
            commandLimits: { ...this.commandLimits }
        };
    }

    /**
     * Réinitialise les limites pour un utilisateur (admin)
     */
    resetUser(userId, commandName = null) {
        if (commandName) {
            const key = `${userId}-${commandName}`;
            this.userLimits.delete(key);
        } else {
            // Supprimer toutes les limites de cet utilisateur
            for (const [key] of this.userLimits.entries()) {
                if (key.startsWith(`${userId}-`)) {
                    this.userLimits.delete(key);
                }
            }
        }
    }
}

// Singleton instance
let rateLimiterInstance = null;

function getRateLimiter() {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new RateLimiter();
    }
    return rateLimiterInstance;
}

module.exports = { RateLimiter, getRateLimiter };

