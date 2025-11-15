/**
 * Backup Manager - Sauvegarde automatique de la base de données et métriques
 * Supporte backup local et upload S3 (optionnel)
 */

const fs = require('fs').promises;
const path = require('path');
const { Logger } = require('./logger');

class BackupManager {
    constructor(options = {}) {
        this.backupDir = options.backupDir || './backups';
        this.maxBackups = options.maxBackups || 30; // Garder 30 backups max
        this.s3Client = null;
        this.s3Bucket = process.env.S3_BUCKET;
        this.setupS3();
    }

    /**
     * Configure S3 si les credentials sont disponibles
     */
    setupS3() {
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            try {
                const { S3Client } = require('@aws-sdk/client-s3');
                this.s3Client = new S3Client({
                    region: process.env.AWS_REGION || 'us-east-1',
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                    }
                });
                Logger.info('✅ S3 client configured for backups');
            } catch (error) {
                Logger.warn('S3 SDK not available, backups will be local only', error.message);
            }
        }
    }

    /**
     * Crée le répertoire de backup s'il n'existe pas
     */
    async ensureBackupDir() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            Logger.error('Failed to create backup directory', error);
            throw error;
        }
    }

    /**
     * Crée un backup de la base de données
     */
    async createDatabaseBackup(dbPath) {
        try {
            await this.ensureBackupDir();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `db-backup-${timestamp}.db`;
            const backupPath = path.join(this.backupDir, backupName);

            // Copier la base de données
            await fs.copyFile(dbPath, backupPath);

            Logger.info(`✅ Database backup created: ${backupName}`);

            // Uploader sur S3 si configuré
            if (this.s3Client && this.s3Bucket) {
                await this.uploadToS3(backupPath, `backups/${backupName}`);
            }

            return backupPath;
        } catch (error) {
            Logger.error('Database backup failed', error);
            throw error;
        }
    }

    /**
     * Exporte les métriques dans un fichier JSON
     */
    async exportMetrics(dependencies = {}) {
        try {
            await this.ensureBackupDir();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const metricsName = `metrics-${timestamp}.json`;
            const metricsPath = path.join(this.backupDir, metricsName);

            const metrics = {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.npm_package_version || 'unknown'
            };

            // Ajouter les métriques du bot si disponibles
            if (dependencies.database) {
                try {
                    metrics.database = await dependencies.database.getStats();
                } catch (err) {
                    Logger.warn('Could not get database stats', err.message);
                }
            }

            if (dependencies.metrics) {
                try {
                    metrics.botMetrics = dependencies.metrics.getStats();
                } catch (err) {
                    Logger.warn('Could not get bot metrics', err.message);
                }
            }

            if (dependencies.cacheManager) {
                try {
                    metrics.cache = dependencies.cacheManager.getStats();
                } catch (err) {
                    Logger.warn('Could not get cache stats', err.message);
                }
            }

            if (dependencies.telemetry) {
                try {
                    metrics.telemetry = await dependencies.telemetry.getReport();
                } catch (err) {
                    Logger.warn('Could not get telemetry report', err.message);
                }
            }

            await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));

            Logger.info(`✅ Metrics exported: ${metricsName}`);

            // Uploader sur S3 si configuré
            if (this.s3Client && this.s3Bucket) {
                await this.uploadToS3(metricsPath, `backups/${metricsName}`);
            }

            return metricsPath;
        } catch (error) {
            Logger.error('Metrics export failed', error);
            throw error;
        }
    }

    /**
     * Upload un fichier sur S3
     */
    async uploadToS3(filePath, key) {
        if (!this.s3Client || !this.s3Bucket) return;

        try {
            const { PutObjectCommand } = require('@aws-sdk/client-s3');
            const fileContent = await fs.readFile(filePath);

            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.s3Bucket,
                Key: key,
                Body: fileContent,
                ContentType: key.endsWith('.json') ? 'application/json' : 'application/octet-stream'
            }));

            Logger.info(`✅ Backup uploaded to S3: ${key}`);
        } catch (error) {
            Logger.error('S3 upload failed', error);
            // Ne pas faire échouer le backup si S3 échoue
        }
    }

    /**
     * Nettoie les vieux backups (garde seulement les N plus récents)
     */
    async cleanOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter(f => f.startsWith('db-backup-') || f.startsWith('metrics-'))
                .map(f => ({
                    name: f,
                    path: path.join(this.backupDir, f)
                }));

            // Trier par date de modification (plus récent en premier)
            const stats = await Promise.all(
                backupFiles.map(async (f) => ({
                    ...f,
                    stats: await fs.stat(f.path)
                }))
            );

            stats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

            // Supprimer les fichiers en excès
            if (stats.length > this.maxBackups) {
                const toDelete = stats.slice(this.maxBackups);
                for (const file of toDelete) {
                    await fs.unlink(file.path);
                    Logger.info(`🗑️ Deleted old backup: ${file.name}`);
                }
                Logger.info(`✅ Cleaned ${toDelete.length} old backups`);
            }

            return stats.length - Math.min(stats.length, this.maxBackups);
        } catch (error) {
            Logger.error('Cleanup old backups failed', error);
            return 0;
        }
    }

    /**
     * Crée un backup complet (DB + métriques)
     */
    async createFullBackup(dependencies = {}) {
        try {
            Logger.info('📦 Creating full backup...');

            // Utiliser la configuration centralisée si dbPath n'est pas fourni
            const pathConfig = require('../config/paths');
            const dbPath = dependencies.dbPath || pathConfig.dbPath;
            const results = {
                database: null,
                metrics: null,
                cleaned: 0
            };

            // Backup de la base de données si elle existe
            try {
                await fs.access(dbPath);
                results.database = await this.createDatabaseBackup(dbPath);
            } catch (error) {
                Logger.warn('Database file not found, skipping database backup', error.message);
            }

            // Export des métriques
            results.metrics = await this.exportMetrics(dependencies);

            // Nettoyer les vieux backups
            results.cleaned = await this.cleanOldBackups();

            Logger.info('✅ Full backup completed successfully');

            return results;
        } catch (error) {
            Logger.error('Full backup failed', error);
            throw error;
        }
    }

    /**
     * Démarre les backups automatiques avec cron
     */
    startAutoBackups(schedule = '0 3 * * *', dependencies = {}) {
        try {
            const cron = require('node-cron');

            // Backup quotidien
            cron.schedule(schedule, async () => {
                try {
                    await this.createFullBackup(dependencies);
                } catch (error) {
                    Logger.error('Scheduled backup failed', error);
                    // Envoyer une notification webhook si configuré
                    if (dependencies.webhookManager) {
                        await dependencies.webhookManager.sendError(error, { context: 'scheduled-backup' });
                    }
                }
            });

            Logger.info(`🔄 Auto backups scheduled: ${schedule}`);

            // Nettoyer les vieux backups chaque semaine (dimanche à 4h)
            cron.schedule('0 4 * * 0', async () => {
                try {
                    await this.cleanOldBackups();
                } catch (error) {
                    Logger.error('Scheduled cleanup failed', error);
                }
            });

            Logger.info('🔄 Auto cleanup scheduled: weekly on Sunday at 4am');
        } catch (error) {
            Logger.warn('node-cron not available, auto backups disabled', error.message);
            Logger.info('💡 Install node-cron to enable automatic backups: npm install node-cron');
        }
    }
}

// Singleton instance
let backupManagerInstance = null;

function getBackupManager(options) {
    if (!backupManagerInstance) {
        backupManagerInstance = new BackupManager(options);
    }
    return backupManagerInstance;
}

module.exports = { BackupManager, getBackupManager };

