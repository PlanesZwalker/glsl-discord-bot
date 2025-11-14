/**
 * Prometheus Metrics - Format Prometheus pour monitoring avancé
 * Compatible avec Grafana et autres outils de monitoring
 */

class PrometheusMetrics {
    constructor() {
        this.metrics = {
            compilations_total: 0,
            compilations_success: 0,
            compilations_failed: 0,
            compilation_duration_seconds: [],
            active_compilations: 0,
            browser_pool_size: 0,
            browser_pool_active: 0,
            cache_hits: 0,
            cache_misses: 0,
            queue_length: 0,
            rate_limit_hits: 0
        };
    }

    /**
     * Enregistre une compilation
     */
    recordCompilation(success, durationMs) {
        this.metrics.compilations_total++;
        if (success) {
            this.metrics.compilations_success++;
        } else {
            this.metrics.compilations_failed++;
        }
        this.metrics.compilation_duration_seconds.push(durationMs / 1000);
        
        // Garder seulement les 100 dernières durées
        if (this.metrics.compilation_duration_seconds.length > 100) {
            this.metrics.compilation_duration_seconds.shift();
        }
    }

    /**
     * Met à jour les métriques du browser pool
     */
    updateBrowserPool(size, active) {
        this.metrics.browser_pool_size = size;
        this.metrics.browser_pool_active = active;
    }

    /**
     * Met à jour les métriques du cache
     */
    recordCacheHit() {
        this.metrics.cache_hits++;
    }

    recordCacheMiss() {
        this.metrics.cache_misses++;
    }

    /**
     * Met à jour la longueur de la queue
     */
    updateQueueLength(length) {
        this.metrics.queue_length = length;
    }

    /**
     * Enregistre un rate limit hit
     */
    recordRateLimitHit() {
        this.metrics.rate_limit_hits++;
    }

    /**
     * Calcule la moyenne des durées
     */
    getAverageDuration() {
        if (this.metrics.compilation_duration_seconds.length === 0) return 0;
        const sum = this.metrics.compilation_duration_seconds.reduce((a, b) => a + b, 0);
        return sum / this.metrics.compilation_duration_seconds.length;
    }

    /**
     * Génère le format Prometheus
     */
    getPrometheusFormat() {
        const avgDuration = this.getAverageDuration();
        const successRate = this.metrics.compilations_total > 0 
            ? (this.metrics.compilations_success / this.metrics.compilations_total) * 100 
            : 0;

        return `# HELP glsl_bot_compilations_total Total number of shader compilations
# TYPE glsl_bot_compilations_total counter
glsl_bot_compilations_total ${this.metrics.compilations_total}

# HELP glsl_bot_compilations_success Total number of successful compilations
# TYPE glsl_bot_compilations_success counter
glsl_bot_compilations_success ${this.metrics.compilations_success}

# HELP glsl_bot_compilations_failed Total number of failed compilations
# TYPE glsl_bot_compilations_failed counter
glsl_bot_compilations_failed ${this.metrics.compilations_failed}

# HELP glsl_bot_compilation_duration_seconds Average compilation duration in seconds
# TYPE glsl_bot_compilation_duration_seconds gauge
glsl_bot_compilation_duration_seconds ${avgDuration.toFixed(3)}

# HELP glsl_bot_compilation_success_rate Success rate percentage
# TYPE glsl_bot_compilation_success_rate gauge
glsl_bot_compilation_success_rate ${successRate.toFixed(2)}

# HELP glsl_bot_active_compilations Number of currently active compilations
# TYPE glsl_bot_active_compilations gauge
glsl_bot_active_compilations ${this.metrics.active_compilations}

# HELP glsl_bot_browser_pool_size Total browser pool size
# TYPE glsl_bot_browser_pool_size gauge
glsl_bot_browser_pool_size ${this.metrics.browser_pool_size}

# HELP glsl_bot_browser_pool_active Number of active browsers in pool
# TYPE glsl_bot_browser_pool_active gauge
glsl_bot_browser_pool_active ${this.metrics.browser_pool_active}

# HELP glsl_bot_cache_hits Total cache hits
# TYPE glsl_bot_cache_hits counter
glsl_bot_cache_hits ${this.metrics.cache_hits}

# HELP glsl_bot_cache_misses Total cache misses
# TYPE glsl_bot_cache_misses counter
glsl_bot_cache_misses ${this.metrics.cache_misses}

# HELP glsl_bot_queue_length Current queue length
# TYPE glsl_bot_queue_length gauge
glsl_bot_queue_length ${this.metrics.queue_length}

# HELP glsl_bot_rate_limit_hits Total rate limit hits
# TYPE glsl_bot_rate_limit_hits counter
glsl_bot_rate_limit_hits ${this.metrics.rate_limit_hits}
`;
    }
}

// Singleton instance
let prometheusMetricsInstance = null;

function getPrometheusMetrics() {
    if (!prometheusMetricsInstance) {
        prometheusMetricsInstance = new PrometheusMetrics();
    }
    return prometheusMetricsInstance;
}

module.exports = { PrometheusMetrics, getPrometheusMetrics };

