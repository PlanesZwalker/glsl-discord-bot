/**
 * Admin Routes - Endpoints pour gérer les feature flags, A/B tests, et autres fonctionnalités admin
 */

const express = require('express');
const router = express.Router();
const { Logger } = require('../src/utils/logger');

// Middleware pour vérifier les permissions admin
function requireAdmin(req, res, next) {
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
    const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;

    if (!userId || !adminIds.includes(userId)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
}

/**
 * GET /admin/feature-flags - Liste tous les feature flags
 */
router.get('/feature-flags', requireAdmin, (req, res) => {
    try {
        const { getFeatureFlags } = require('../src/utils/featureFlags');
        const flags = getFeatureFlags();
        const allFlags = flags.getAllFlags();

        res.json({
            success: true,
            flags: allFlags
        });
    } catch (error) {
        Logger.error('Failed to get feature flags', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /admin/feature-flags/:flagName - Modifier un feature flag
 */
router.post('/feature-flags/:flagName', requireAdmin, (req, res) => {
    try {
        const { flagName } = req.params;
        const { enabled, rollout } = req.body;

        const { getFeatureFlags } = require('../src/utils/featureFlags');
        const flags = getFeatureFlags();

        if (enabled !== undefined) {
            flags.setEnabled(flagName, enabled);
        }

        if (rollout !== undefined) {
            flags.setRollout(flagName, rollout);
        }

        res.json({
            success: true,
            flag: flags.getFlag(flagName)
        });
    } catch (error) {
        Logger.error('Failed to update feature flag', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/ab-tests - Liste tous les tests A/B
 */
router.get('/ab-tests', requireAdmin, (req, res) => {
    try {
        const { getABTest } = require('../src/utils/abTesting');
        const abTest = getABTest();
        const experiments = abTest.getAllExperiments();

        res.json({
            success: true,
            experiments
        });
    } catch (error) {
        Logger.error('Failed to get A/B tests', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/ab-tests/:experimentName/results - Obtient les résultats d'un test A/B
 */
router.get('/ab-tests/:experimentName/results', requireAdmin, (req, res) => {
    try {
        const { experimentName } = req.params;
        const { getABTest } = require('../src/utils/abTesting');
        const abTest = getABTest();
        const results = abTest.getResults(experimentName);

        if (!results) {
            return res.status(404).json({ error: 'Experiment not found' });
        }

        res.json({
            success: true,
            experiment: experimentName,
            results
        });
    } catch (error) {
        Logger.error('Failed to get A/B test results', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /admin/ab-tests/:experimentName/track - Track une conversion pour un test A/B
 */
router.post('/ab-tests/:experimentName/track', (req, res) => {
    try {
        const { experimentName } = req.params;
        const { userId, variant, metric, value } = req.body;

        if (!userId || !variant || !metric) {
            return res.status(400).json({ error: 'userId, variant, and metric are required' });
        }

        const { getABTest } = require('../src/utils/abTesting');
        const abTest = getABTest();
        abTest.trackConversion(experimentName, userId, variant, metric, value || 1);

        res.json({ success: true });
    } catch (error) {
        Logger.error('Failed to track conversion', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/telemetry - Obtient le rapport de télémetry
 */
router.get('/telemetry', requireAdmin, async (req, res) => {
    try {
        const { getTelemetry } = require('../src/utils/telemetry');
        const telemetry = getTelemetry();
        const report = await telemetry.getReport();

        res.json({
            success: true,
            report
        });
    } catch (error) {
        Logger.error('Failed to get telemetry report', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /admin/cache/stats - Statistiques du cache
 */
router.get('/cache/stats', requireAdmin, (req, res) => {
    try {
        const { getCacheManager } = require('../src/utils/cacheManager');
        const cache = getCacheManager();
        const stats = cache.getStats();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        Logger.error('Failed to get cache stats', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /admin/cache/invalidate - Invalide le cache selon un pattern
 */
router.post('/cache/invalidate', requireAdmin, async (req, res) => {
    try {
        const { pattern } = req.body;

        if (!pattern) {
            return res.status(400).json({ error: 'pattern is required' });
        }

        const { getCacheManager } = require('../src/utils/cacheManager');
        const cache = getCacheManager();
        await cache.invalidate(pattern);

        res.json({
            success: true,
            message: `Cache invalidated for pattern: ${pattern}`
        });
    } catch (error) {
        Logger.error('Failed to invalidate cache', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /admin/backup - Crée un backup manuel
 */
router.post('/backup', requireAdmin, async (req, res) => {
    try {
        const { getBackupManager } = require('../src/utils/backupManager');
        const backupManager = getBackupManager();

        // Récupérer les dépendances nécessaires
        const dependencies = {
            database: req.app.locals.database,
            metrics: req.app.locals.metrics,
            cacheManager: req.app.locals.cacheManager,
            telemetry: req.app.locals.telemetry,
            dbPath: process.env.DB_PATH || './data/shaders.db'
        };

        const result = await backupManager.createFullBackup(dependencies);

        res.json({
            success: true,
            backup: result
        });
    } catch (error) {
        Logger.error('Failed to create backup', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

