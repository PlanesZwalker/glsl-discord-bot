/**
 * A/B Testing Framework - Tests A/B pour optimiser l'expérience utilisateur
 * Permet de tester différentes variantes et mesurer les conversions
 */

class ABTest {
    constructor() {
        this.experiments = new Map([
            ['gif-quality', {
                variants: ['standard', 'optimized', 'premium'],
                weights: [33, 34, 33],
                description: 'Test de qualité GIF'
            }],
            ['cache-strategy', {
                variants: ['aggressive', 'moderate', 'conservative'],
                weights: [25, 50, 25],
                description: 'Test de stratégie de cache'
            }]
        ]);

        this.results = new Map();
    }

    /**
     * Obtient la variante pour un utilisateur (déterministe)
     */
    getVariant(experimentName, userId) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) {
            console.warn(`Experiment "${experimentName}" not found`);
            return null;
        }

        const hash = this.hashUserId(userId);
        let cumulative = 0;

        for (let i = 0; i < experiment.variants.length; i++) {
            cumulative += experiment.weights[i];
            if (hash < cumulative) {
                return experiment.variants[i];
            }
        }

        return experiment.variants[0];
    }

    /**
     * Enregistre une conversion
     */
    trackConversion(experimentName, userId, variant, metric, value = 1) {
        const key = `${experimentName}:${variant}`;

        if (!this.results.has(key)) {
            this.results.set(key, {
                users: new Set(),
                conversions: 0,
                totalValue: 0,
                metrics: {}
            });
        }

        const result = this.results.get(key);
        result.users.add(userId);
        result.conversions += value;
        result.totalValue += value;

        // Tracker les métriques spécifiques
        if (!result.metrics[metric]) {
            result.metrics[metric] = { count: 0, totalValue: 0 };
        }
        result.metrics[metric].count += value;
        result.metrics[metric].totalValue += value;
    }

    /**
     * Obtient les résultats d'un test
     */
    getResults(experimentName) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) return null;

        const results = {};

        for (const variant of experiment.variants) {
            const key = `${experimentName}:${variant}`;
            const data = this.results.get(key) || { 
                users: new Set(), 
                conversions: 0, 
                totalValue: 0,
                metrics: {}
            };

            const userCount = data.users.size;
            const conversionRate = userCount > 0 
                ? ((data.conversions / userCount) * 100).toFixed(2)
                : '0.00';

            results[variant] = {
                users: userCount,
                conversions: data.conversions,
                conversionRate: `${conversionRate}%`,
                avgValue: data.conversions > 0 
                    ? (data.totalValue / data.conversions).toFixed(2)
                    : 0,
                metrics: data.metrics
            };
        }

        return results;
    }

    /**
     * Hash un userId pour un assignment déterministe
     */
    hashUserId(userId) {
        let hash = 0;
        const str = String(userId);
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) % 100;
    }

    /**
     * Crée un nouveau test
     */
    createExperiment(name, variants, weights, description = '') {
        if (variants.length !== weights.length) {
            throw new Error('Variants and weights must have the same length');
        }

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
            throw new Error('Weights must sum to 100');
        }

        this.experiments.set(name, {
            variants,
            weights,
            description
        });
    }

    /**
     * Obtient tous les tests
     */
    getAllExperiments() {
        return Object.fromEntries(this.experiments);
    }
}

// Singleton instance
let abTestInstance = null;

function getABTest() {
    if (!abTestInstance) {
        abTestInstance = new ABTest();
    }
    return abTestInstance;
}

module.exports = { ABTest, getABTest };

