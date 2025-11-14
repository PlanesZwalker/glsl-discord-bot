/**
 * Metrics System - Surveille les performances et les statistiques du bot
 */

class Metrics {
    constructor() {
        this.compilationTimes = [];
        this.compilationCount = 0;
        this.successCount = 0;
        this.failureCount = 0;
        this.activeCompilations = 0;
        this.maxHistorySize = 1000;
        this.errors = [];
        this.maxErrors = 100;
        
        // Statistiques par type de shader
        this.shaderTypeStats = new Map();
        
        // Statistiques par utilisateur
        this.userStats = new Map();
    }

    /**
     * Enregistre une compilation
     */
    recordCompilation(duration, success, shaderType = 'custom', userId = null) {
        this.compilationCount++;
        
        if (success) {
            this.successCount++;
        } else {
            this.failureCount++;
        }

        // Enregistrer le temps de compilation
        this.compilationTimes.push(duration);
        if (this.compilationTimes.length > this.maxHistorySize) {
            this.compilationTimes.shift();
        }

        // Statistiques par type
        if (!this.shaderTypeStats.has(shaderType)) {
            this.shaderTypeStats.set(shaderType, {
                count: 0,
                totalTime: 0,
                successes: 0,
                failures: 0
            });
        }
        
        const typeStats = this.shaderTypeStats.get(shaderType);
        typeStats.count++;
        typeStats.totalTime += duration;
        if (success) {
            typeStats.successes++;
        } else {
            typeStats.failures++;
        }

        // Statistiques par utilisateur
        if (userId) {
            if (!this.userStats.has(userId)) {
                this.userStats.set(userId, {
                    count: 0,
                    totalTime: 0,
                    successes: 0,
                    failures: 0
                });
            }
            
            const userStats = this.userStats.get(userId);
            userStats.count++;
            userStats.totalTime += duration;
            if (success) {
                userStats.successes++;
            } else {
                userStats.failures++;
            }
        }
    }

    /**
     * Enregistre une erreur
     */
    recordError(error, context = {}) {
        const errorRecord = {
            message: error.message || String(error),
            stack: error.stack,
            context,
            timestamp: Date.now()
        };

        this.errors.push(errorRecord);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    }

    /**
     * Démarre une compilation
     */
    startCompilation() {
        this.activeCompilations++;
    }

    /**
     * Termine une compilation
     */
    endCompilation() {
        if (this.activeCompilations > 0) {
            this.activeCompilations--;
        }
    }

    /**
     * Calcule le temps moyen de compilation
     */
    getAverageCompilationTime() {
        if (this.compilationTimes.length === 0) return 0;
        const sum = this.compilationTimes.reduce((a, b) => a + b, 0);
        return sum / this.compilationTimes.length;
    }

    /**
     * Calcule le taux de succès
     */
    getSuccessRate() {
        if (this.compilationCount === 0) return 0;
        return (this.successCount / this.compilationCount) * 100;
    }

    /**
     * Obtient les statistiques complètes
     */
    getStats() {
        return {
            totalCompilations: this.compilationCount,
            successCount: this.successCount,
            failureCount: this.failureCount,
            successRate: this.getSuccessRate().toFixed(2) + '%',
            averageCompilationTime: this.getAverageCompilationTime().toFixed(2) + 'ms',
            activeCompilations: this.activeCompilations,
            recentErrors: this.errors.slice(-10),
            shaderTypeStats: Object.fromEntries(this.shaderTypeStats),
            topUsers: Array.from(this.userStats.entries())
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10)
                .map(([userId, stats]) => ({
                    userId,
                    ...stats,
                    averageTime: (stats.totalTime / stats.count).toFixed(2) + 'ms'
                }))
        };
    }

    /**
     * Réinitialise les métriques
     */
    reset() {
        this.compilationTimes = [];
        this.compilationCount = 0;
        this.successCount = 0;
        this.failureCount = 0;
        this.errors = [];
        this.shaderTypeStats.clear();
        this.userStats.clear();
    }
}

// Singleton instance
let metricsInstance = null;

function getMetrics() {
    if (!metricsInstance) {
        metricsInstance = new Metrics();
    }
    return metricsInstance;
}

module.exports = { Metrics, getMetrics };

