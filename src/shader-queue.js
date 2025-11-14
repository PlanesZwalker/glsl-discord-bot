/**
 * Shader Queue System - Gère les compilations avec priorités et retry
 * Permet de gérer les pics de charge et les priorités
 */

// Note: Bull nécessite Redis. Pour l'instant, on crée une queue simple sans Redis
// qui peut être facilement migrée vers Bull plus tard

class ShaderQueue {
    constructor(maxConcurrent = 2) {
        this.queue = [];
        this.processing = new Set();
        this.maxConcurrent = maxConcurrent;
        this.stats = {
            total: 0,
            completed: 0,
            failed: 0,
            waiting: 0
        };
        this.priorityValues = {
            high: 3,
            normal: 2,
            low: 1
        };
    }

    /**
     * Ajoute un job à la queue
     */
    async add(jobData, options = {}) {
        return new Promise((resolve, reject) => {
            const priority = options.priority || 'normal';
            const priorityValue = this.priorityValues[priority] || this.priorityValues.normal;

            const job = {
                id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                data: jobData,
                priority: priorityValue,
                priorityName: priority,
                attempts: options.attempts || 1,
                maxAttempts: options.attempts || 1,
                backoff: options.backoff || { type: 'exponential', delay: 2000 },
                createdAt: Date.now(),
                status: 'waiting',
                resolve,
                reject
            };

            // Insérer selon la priorité
            const index = this.queue.findIndex(item => item.priority < priorityValue);
            if (index === -1) {
                this.queue.push(job);
            } else {
                this.queue.splice(index, 0, job);
            }

            this.stats.total++;
            this.stats.waiting = this.queue.length;

            // Traiter immédiatement si possible
            this.processQueue();
        });
    }

    /**
     * Obtient la valeur de priorité
     */
    getPriorityValue(priority) {
        return this.priorityValues[priority] || this.priorityValues.normal;
    }

    /**
     * Traite la queue
     */
    async processQueue() {
        // Ne pas dépasser le maximum de jobs simultanés
        if (this.processing.size >= this.maxConcurrent) {
            return;
        }

        // Prendre le prochain job de la queue (déjà trié par priorité)
        const job = this.queue.shift();
        if (!job) {
            return;
        }

        this.processing.add(job.id);
        this.stats.waiting = this.queue.length;
        job.status = 'processing';

        try {
            // Exécuter le job
            const result = await this.executeJob(job);
            
            job.status = 'completed';
            job.result = result;
            this.stats.completed++;
            
            // Résoudre la promesse
            if (job.resolve) {
                job.resolve(result);
            }
        } catch (error) {
            job.attempts--;
            job.lastError = error.message;

            if (job.attempts > 0) {
                // Réessayer avec backoff
                const delay = this.calculateBackoff(job.backoff, job.maxAttempts - job.attempts + 1);
                job.status = 'waiting';
                
                setTimeout(() => {
                    // Réinsérer selon la priorité
                    const index = this.queue.findIndex(item => item.priority < job.priority);
                    if (index === -1) {
                        this.queue.push(job);
                    } else {
                        this.queue.splice(index, 0, job);
                    }
                    this.processQueue();
                }, delay);
            } else {
                // Échec définitif
                job.status = 'failed';
                this.stats.failed++;
                
                // Rejeter la promesse
                if (job.reject) {
                    job.reject(error);
                }
            }
        } finally {
            this.processing.delete(job.id);
            // Traiter le prochain job
            this.processQueue();
        }
    }

    /**
     * Exécute un job
     */
    async executeJob(job) {
        const { compiler, shaderCode, options } = job.data;
        
        if (!compiler || !shaderCode) {
            throw new Error('Invalid job data: compiler and shaderCode required');
        }

        return await compiler.compileShader(shaderCode, options);
    }

    /**
     * Calcule le délai de backoff
     */
    calculateBackoff(backoff, attemptNumber) {
        if (backoff.type === 'exponential') {
            return backoff.delay * Math.pow(2, attemptNumber - 1);
        } else if (backoff.type === 'fixed') {
            return backoff.delay;
        }
        return 2000; // Default
    }

    /**
     * Calcule le temps d'attente moyen
     */
    calculateAvgWaitTime() {
        if (this.queue.length === 0) return 0;
        const now = Date.now();
        const totalWait = this.queue.reduce((sum, item) => sum + (now - item.createdAt), 0);
        return Math.round(totalWait / this.queue.length / 1000);
    }

    /**
     * Obtient les statistiques de la queue
     */
    getStats() {
        return {
            ...this.stats,
            processing: this.processing.size,
            queueLength: this.queue.length,
            maxConcurrent: this.maxConcurrent,
            avgWaitTime: this.calculateAvgWaitTime()
        };
    }

    /**
     * Obtient le statut de la queue
     */
    getStatus() {
        return {
            queued: this.queue.length,
            processing: this.processing.size,
            avgWaitTime: this.calculateAvgWaitTime()
        };
    }

    /**
     * Vide la queue
     */
    clear() {
        this.queue = [];
        this.stats.waiting = 0;
    }

    /**
     * Obtient un job par ID
     */
    getJob(jobId) {
        // Chercher dans la queue
        const queuedJob = this.queue.find(j => j.id === jobId);
        if (queuedJob) return queuedJob;

        // Chercher dans les jobs en cours
        // Note: Dans une vraie implémentation avec Bull, on utiliserait Bull.getJob()
        return null;
    }
}

// Singleton instance
let shaderQueueInstance = null;

function getShaderQueue(maxConcurrent = 2) {
    if (!shaderQueueInstance) {
        const max = parseInt(process.env.MAX_CONCURRENT_COMPILATIONS || '2');
        shaderQueueInstance = new ShaderQueue(max);
    }
    return shaderQueueInstance;
}

module.exports = { ShaderQueue, getShaderQueue };

