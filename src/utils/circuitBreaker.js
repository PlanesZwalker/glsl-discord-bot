/**
 * Circuit Breaker Pattern - Protège contre les cascades de défaillances
 * État: CLOSED (normal), OPEN (bloqué), HALF_OPEN (test)
 */

const { Logger } = require('./logger');

class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000; // 1 minute par défaut
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = Date.now();
        this.name = options.name || 'circuit-breaker';
        this.onStateChange = options.onStateChange || null;
    }

    /**
     * Exécute une fonction avec protection circuit breaker
     */
    async execute(fn, ...args) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                const error = new Error(`Circuit breaker is OPEN. Service temporarily unavailable. Retry after ${new Date(this.nextAttempt).toISOString()}`);
                error.code = 'CIRCUIT_BREAKER_OPEN';
                throw error;
            }
            // Passer en HALF_OPEN pour tester
            this.state = 'HALF_OPEN';
            Logger.info(`[${this.name}] Circuit breaker entering HALF_OPEN state`);
            if (this.onStateChange) {
                this.onStateChange('HALF_OPEN', this.name);
            }
        }

        try {
            const result = await fn(...args);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Appelé en cas de succès
     */
    onSuccess() {
        this.failures = 0;
        this.successes++;

        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            Logger.info(`[${this.name}] Circuit breaker closed after successful attempt`);
            if (this.onStateChange) {
                this.onStateChange('CLOSED', this.name);
            }
        }
    }

    /**
     * Appelé en cas d'échec
     */
    onFailure(error) {
        this.failures++;
        this.successes = 0;

        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.resetTimeout;
            Logger.warn(`[${this.name}] Circuit breaker opened after ${this.failures} failures. Will retry after ${new Date(this.nextAttempt).toISOString()}`);
            if (this.onStateChange) {
                this.onStateChange('OPEN', this.name);
            }
        }
    }

    /**
     * Obtient l'état actuel du circuit breaker
     */
    getState() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt) : null,
            resetTimeout: this.resetTimeout
        };
    }

    /**
     * Réinitialise manuellement le circuit breaker
     */
    reset() {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = Date.now();
        Logger.info(`[${this.name}] Circuit breaker manually reset`);
        if (this.onStateChange) {
            this.onStateChange('CLOSED', this.name);
        }
    }
}

module.exports = { CircuitBreaker };

