/**
 * API Rate Limiter - Rate limiting spécifique pour l'API v1
 * Limite: 100 requêtes/jour pour les utilisateurs Studio
 */

class APIRateLimiter {
    constructor(database) {
        this.database = database;
        this.memoryCache = new Map(); // Cache en mémoire pour les requêtes récentes
        this.limitPerDay = 100; // Limite par défaut: 100 requêtes/jour
    }

    /**
     * Vérifie si une requête API est autorisée
     * @param {string} userId - ID de l'utilisateur (via API key)
     * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
     */
    async checkLimit(userId) {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                // Fallback sur cache mémoire si DB non disponible
                return this.checkMemoryLimit(userId);
            }

            const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

            // Vérifier dans la table usage_stats
            this.database.db.get(
                `SELECT compilations_count 
                 FROM usage_stats 
                 WHERE user_id = ? AND date = ?`,
                [userId, today],
                (err, row) => {
                    if (err) {
                        // En cas d'erreur, utiliser le cache mémoire
                        this.checkMemoryLimit(userId).then(resolve).catch(reject);
                        return;
                    }

                    const count = row ? row.compilations_count : 0;
                    const remaining = Math.max(0, this.limitPerDay - count);
                    const allowed = count < this.limitPerDay;

                    // Calculer la date de réinitialisation (minuit du jour suivant)
                    const resetAt = new Date();
                    resetAt.setHours(24, 0, 0, 0);

                    resolve({
                        allowed: allowed,
                        remaining: remaining,
                        resetAt: resetAt
                    });
                }
            );
        });
    }

    /**
     * Incrémente le compteur de requêtes API pour un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<void>}
     */
    async incrementCount(userId) {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                // Fallback sur cache mémoire
                this.incrementMemoryCount(userId);
                resolve();
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            // Insérer ou mettre à jour le compteur
            this.database.db.run(
                `INSERT INTO usage_stats (user_id, date, compilations_count)
                 VALUES (?, ?, 1)
                 ON CONFLICT(user_id, date) 
                 DO UPDATE SET compilations_count = compilations_count + 1`,
                [userId, today],
                (err) => {
                    if (err) {
                        console.warn('⚠️ Erreur incrémentation compteur API:', err.message);
                        // Ne pas rejeter, juste logger l'erreur
                    }
                    resolve();
                }
            );
        });
    }

    /**
     * Vérifie la limite en utilisant le cache mémoire (fallback)
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
     */
    async checkMemoryLimit(userId) {
        const key = `api_${userId}_${new Date().toISOString().split('T')[0]}`;
        const cached = this.memoryCache.get(key) || { count: 0, resetAt: new Date() };
        
        // Réinitialiser si la date a changé
        const today = new Date().toISOString().split('T')[0];
        const cachedDate = cached.resetAt.toISOString().split('T')[0];
        if (today !== cachedDate) {
            cached.count = 0;
            cached.resetAt = new Date();
            cached.resetAt.setHours(24, 0, 0, 0);
        }

        const remaining = Math.max(0, this.limitPerDay - cached.count);
        const allowed = cached.count < this.limitPerDay;

        return {
            allowed: allowed,
            remaining: remaining,
            resetAt: cached.resetAt
        };
    }

    /**
     * Incrémente le compteur en mémoire (fallback)
     * @param {string} userId - ID de l'utilisateur
     */
    incrementMemoryCount(userId) {
        const key = `api_${userId}_${new Date().toISOString().split('T')[0]}`;
        const cached = this.memoryCache.get(key) || { count: 0, resetAt: new Date() };
        
        // Réinitialiser si la date a changé
        const today = new Date().toISOString().split('T')[0];
        const cachedDate = cached.resetAt.toISOString().split('T')[0];
        if (today !== cachedDate) {
            cached.count = 0;
            cached.resetAt = new Date();
            cached.resetAt.setHours(24, 0, 0, 0);
        }

        cached.count++;
        this.memoryCache.set(key, cached);

        // Nettoyer les anciennes entrées (garder seulement les 7 derniers jours)
        if (this.memoryCache.size > 1000) {
            const keysToDelete = [];
            for (const [k, v] of this.memoryCache.entries()) {
                const daysDiff = (new Date() - v.resetAt) / (1000 * 60 * 60 * 24);
                if (daysDiff > 7) {
                    keysToDelete.push(k);
                }
            }
            keysToDelete.forEach(k => this.memoryCache.delete(k));
        }
    }
}

module.exports = { APIRateLimiter };

