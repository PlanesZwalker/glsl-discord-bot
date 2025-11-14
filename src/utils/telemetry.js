/**
 * Telemetry & APM - Application Performance Monitoring
 * Suit les performances des opérations critiques
 */

const { Logger } = require('./logger');

class Telemetry {
    constructor(options = {}) {
        this.maxMetrics = options.maxMetrics || 1000; // Limiter la taille de la mémoire
        this.spans = new Map();
        this.metrics = {
            compilations: [],
            apiCalls: [],
            dbQueries: []
        };
        this.thresholds = options.thresholds || {
            'compile-shader': 30000,  // 30s
            'db-query': 1000,         // 1s
            'api-call': 5000          // 5s
        };
    }

    /**
     * Démarre un span (opération à mesurer)
     */
    startSpan(name, metadata = {}) {
        const spanId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.spans.set(spanId, {
            name,
            startTime: Date.now(),
            metadata
        });
        return spanId;
    }

    /**
     * Termine un span et enregistre les métriques
     */
    endSpan(spanId, result = 'success', error = null) {
        const span = this.spans.get(spanId);
        if (!span) {
            Logger.warn(`Span ${spanId} not found`);
            return;
        }

        const duration = Date.now() - span.startTime;
        const metricType = this.getMetricType(span.name);

        const metric = {
            name: span.name,
            duration,
            result,
            timestamp: Date.now(),
            error: error ? error.message : null,
            ...span.metadata
        };

        // Ajouter la métrique
        this.metrics[metricType].push(metric);

        // Limiter la taille pour éviter les fuites mémoire
        if (this.metrics[metricType].length > this.maxMetrics) {
            this.metrics[metricType].shift();
        }

        this.spans.delete(spanId);

        // Alerter si trop lent
        const threshold = this.getThreshold(span.name);
        if (duration > threshold) {
            Logger.warn(`⚠️ Slow operation: ${span.name} took ${duration}ms (threshold: ${threshold}ms)`);
        }

        return metric;
    }

    /**
     * Détermine le type de métrique selon le nom
     */
    getMetricType(name) {
        if (name.includes('compile') || name.includes('shader')) return 'compilations';
        if (name.includes('api') || name.includes('http')) return 'apiCalls';
        if (name.includes('db') || name.includes('database') || name.includes('query')) return 'dbQueries';
        return 'compilations';
    }

    /**
     * Obtient le seuil pour une opération
     */
    getThreshold(name) {
        for (const [key, value] of Object.entries(this.thresholds)) {
            if (name.includes(key)) {
                return value;
            }
        }
        return 10000; // Default 10s
    }

    /**
     * Génère un rapport des métriques
     */
    async getReport(timeWindow = 300000) { // 5 minutes par défaut
        const now = Date.now();
        const since = now - timeWindow;

        const recentCompilations = this.metrics.compilations.filter(m => m.timestamp > since);
        const recentApiCalls = this.metrics.apiCalls.filter(m => m.timestamp > since);
        const recentDbQueries = this.metrics.dbQueries.filter(m => m.timestamp > since);

        return {
            compilations: this.summarize(recentCompilations, 'compilations'),
            apiCalls: this.summarize(recentApiCalls, 'apiCalls'),
            dbQueries: this.summarize(recentDbQueries, 'dbQueries'),
            timestamp: new Date().toISOString(),
            timeWindow: `${timeWindow / 1000}s`
        };
    }

    /**
     * Résume un ensemble de métriques
     */
    summarize(metrics, type) {
        if (metrics.length === 0) {
            return {
                count: 0,
                avgDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                successRate: 0
            };
        }

        const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
        const successes = metrics.filter(m => m.result === 'success').length;

        return {
            count: metrics.length,
            avgDuration: Math.round(this.avg(durations)),
            minDuration: durations[0],
            maxDuration: durations[durations.length - 1],
            p50: this.percentile(durations, 50),
            p95: this.percentile(durations, 95),
            p99: this.percentile(durations, 99),
            successRate: Math.round((successes / metrics.length) * 100 * 100) / 100
        };
    }

    /**
     * Calcule la moyenne
     */
    avg(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Calcule un percentile
     */
    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const index = Math.ceil((arr.length * p) / 100) - 1;
        return arr[Math.max(0, Math.min(index, arr.length - 1))];
    }

    /**
     * Obtient les métriques brutes (pour export)
     */
    getRawMetrics() {
        return {
            compilations: [...this.metrics.compilations],
            apiCalls: [...this.metrics.apiCalls],
            dbQueries: [...this.metrics.dbQueries],
            activeSpans: Array.from(this.spans.values())
        };
    }

    /**
     * Réinitialise les métriques
     */
    reset() {
        this.metrics = {
            compilations: [],
            apiCalls: [],
            dbQueries: []
        };
        this.spans.clear();
        Logger.info('Telemetry metrics reset');
    }
}

// Singleton instance
let telemetryInstance = null;

function getTelemetry(options) {
    if (!telemetryInstance) {
        telemetryInstance = new Telemetry(options);
    }
    return telemetryInstance;
}

module.exports = { Telemetry, getTelemetry };

