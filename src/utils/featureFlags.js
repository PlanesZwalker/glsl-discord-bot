/**
 * Feature Flags System - Gestion des fonctionnalités avec rollout progressif
 * Permet d'activer/désactiver des fonctionnalités sans redéploiement
 */

class FeatureFlags {
    constructor() {
        this.flags = new Map([
            ['webgpu-support', { enabled: false, rollout: 0, description: 'Support WebGPU (expérimental)' }],
            ['advanced-cache', { enabled: true, rollout: 100, description: 'Cache avancé avec Redis' }],
            ['gif-optimization', { enabled: true, rollout: 100, description: 'Optimisation GIF adaptative' }],
            ['preview-mode', { enabled: false, rollout: 0, description: 'Mode aperçu avant compilation' }],
            ['telemetry', { enabled: true, rollout: 100, description: 'Télémétrie et APM' }],
            ['circuit-breaker', { enabled: true, rollout: 100, description: 'Circuit breaker pour Puppeteer' }]
        ]);
    }

    /**
     * Vérifie si un flag est activé pour un utilisateur
     */
    isEnabled(flagName, userId = null) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            console.warn(`Feature flag "${flagName}" not found`);
            return false;
        }

        if (!flag.enabled) return false;
        if (flag.rollout === 100) return true;
        if (flag.rollout === 0) return false;

        // Rollout progressif basé sur l'ID utilisateur
        if (userId) {
            const hash = this.hashUserId(userId);
            return hash < flag.rollout;
        }

        // Sans userId, utiliser un pourcentage aléatoire
        return Math.random() * 100 < flag.rollout;
    }

    /**
     * Hash un userId pour un rollout déterministe
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
     * Définit un flag
     */
    setFlag(name, enabled, rollout = 100, description = '') {
        const existing = this.flags.get(name);
        this.flags.set(name, {
            enabled: Boolean(enabled),
            rollout: Math.max(0, Math.min(100, rollout)),
            description: description || (existing?.description || '')
        });
        console.log(`Feature flag "${name}" updated: enabled=${enabled}, rollout=${rollout}%`);
    }

    /**
     * Obtient tous les flags
     */
    getAllFlags() {
        return Object.fromEntries(this.flags);
    }

    /**
     * Obtient un flag spécifique
     */
    getFlag(name) {
        return this.flags.get(name) || null;
    }

    /**
     * Charge les flags depuis l'environnement
     */
    loadFromEnv() {
        const prefix = 'FEATURE_FLAG_';
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(prefix)) {
                const flagName = key.slice(prefix.length).toLowerCase().replace(/_/g, '-');
                const parts = value.split(',');
                const enabled = parts[0] === 'true';
                const rollout = parts[1] ? parseInt(parts[1], 10) : (enabled ? 100 : 0);
                this.setFlag(flagName, enabled, rollout);
            }
        }
    }
}

// Singleton instance
let featureFlagsInstance = null;

function getFeatureFlags() {
    if (!featureFlagsInstance) {
        featureFlagsInstance = new FeatureFlags();
        // Charger depuis l'environnement au démarrage
        featureFlagsInstance.loadFromEnv();
    }
    return featureFlagsInstance;
}

module.exports = { FeatureFlags, getFeatureFlags };

