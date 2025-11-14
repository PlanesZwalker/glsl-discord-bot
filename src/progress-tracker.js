/**
 * Progress Tracker - Suit la progression des compilations
 * Peut être utilisé avec WebSocket pour notifications en temps réel
 */

class ProgressTracker {
    constructor() {
        this.tracking = new Map(); // jobId -> progress data
    }

    /**
     * Démarre le suivi d'un job
     */
    startTracking(jobId, metadata = {}) {
        this.tracking.set(jobId, {
            jobId,
            status: 'started',
            progress: 0,
            step: 'Initialisation...',
            startTime: Date.now(),
            ...metadata
        });
    }

    /**
     * Met à jour la progression
     */
    updateProgress(jobId, progress, step) {
        const track = this.tracking.get(jobId);
        if (track) {
            track.progress = Math.min(100, Math.max(0, progress));
            track.step = step || track.step;
            track.lastUpdate = Date.now();
        }
    }

    /**
     * Marque un job comme terminé
     */
    complete(jobId, result = null) {
        const track = this.tracking.get(jobId);
        if (track) {
            track.status = 'completed';
            track.progress = 100;
            track.endTime = Date.now();
            track.duration = track.endTime - track.startTime;
            track.result = result;
        }
    }

    /**
     * Marque un job comme échoué
     */
    fail(jobId, error = null) {
        const track = this.tracking.get(jobId);
        if (track) {
            track.status = 'failed';
            track.endTime = Date.now();
            track.duration = track.endTime - track.startTime;
            track.error = error?.message || String(error);
        }
    }

    /**
     * Obtient la progression d'un job
     */
    getProgress(jobId) {
        return this.tracking.get(jobId) || null;
    }

    /**
     * Supprime le suivi d'un job (nettoyage)
     */
    remove(jobId) {
        this.tracking.delete(jobId);
    }

    /**
     * Nettoie les anciens jobs (plus de 1h)
     */
    cleanOldJobs(maxAge = 60 * 60 * 1000) {
        const now = Date.now();
        for (const [jobId, track] of this.tracking.entries()) {
            if (track.endTime && (now - track.endTime) > maxAge) {
                this.tracking.delete(jobId);
            }
        }
    }

    /**
     * Obtient toutes les progressions actives
     */
    getActiveJobs() {
        return Array.from(this.tracking.values())
            .filter(track => track.status === 'started' || track.status === 'processing');
    }
}

// Singleton instance
let progressTrackerInstance = null;

function getProgressTracker() {
    if (!progressTrackerInstance) {
        progressTrackerInstance = new ProgressTracker();
    }
    return progressTrackerInstance;
}

module.exports = { ProgressTracker, getProgressTracker };

